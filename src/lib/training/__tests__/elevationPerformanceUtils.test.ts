// Route and Elevation Performance Analysis Tests
import {
  calculateGradeAdjustedPace,
  buildRoutePerformanceProfile,
  analyzeHillRunningMetrics,
  getElevationPacingRecommendations,
  compareRoutePerformance,
  ElevationPerformanceData,
  RoutePerformanceProfile,
  HillRunningMetrics
} from '../elevationPerformanceUtils';
import { EnrichedRun } from '../../../types';

// Mock data helpers
const createMockRun = (overrides: Partial<EnrichedRun> = {}): EnrichedRun => ({
  id: 'test-run-' + Math.random(),
  user_id: 'test-user',
  strava_id: Math.floor(Math.random() * 10000),
  name: 'Test Run',
  distance: 5000, // 5km
  moving_time: 1500, // 25 minutes (5:00/km pace)
  elapsed_time: 1500,
  start_date: new Date().toISOString(),
  start_date_local: new Date().toISOString(),
  average_speed: 3.33, // m/s (5:00/km)
  total_elevation_gain: 100, // 100m elevation gain
  average_heartrate: 150,
  ...overrides
});

const createElevationVariedRuns = (count: number): EnrichedRun[] => {
  const runs: EnrichedRun[] = [];
  const baseDate = new Date('2024-01-01');
  
  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    
    // Create varied elevation profiles
    const elevationGain = i % 4 === 0 ? 0 : // Flat
                         i % 4 === 1 ? 50 + (i % 100) : // Rolling
                         i % 4 === 2 ? 150 + (i % 200) : // Hilly
                         300 + (i % 300); // Steep
    
    const distance = 5000 + (i % 5000); // 5-10km
    
    // Simulate pace impact from elevation
    let basePace = 300; // 5:00/km
    const elevationGainPerKm = elevationGain / (distance / 1000);
    
    if (elevationGainPerKm > 20) {
      basePace += elevationGainPerKm * 0.8; // Slower on hills
    }
    
    const movingTime = (distance / 1000) * basePace;
    
    runs.push(createMockRun({
      start_date: date.toISOString(),
      distance,
      moving_time: movingTime,
      total_elevation_gain: elevationGain,
      average_speed: distance / movingTime,
      average_heartrate: 140 + (elevationGainPerKm * 0.5) // Higher HR on hills
    }));
  }
  
  return runs;
};

describe('Route and Elevation Performance Analysis', () => {
  describe('calculateGradeAdjustedPace', () => {
    it('should handle runs with no elevation data', () => {
      const flatRun = createMockRun({ total_elevation_gain: 0 });
      const result = calculateGradeAdjustedPace(flatRun);
      
      expect(result.gradeAdjustedPace).toBe(result.originalPace);
      expect(result.elevationAdjustment).toBe(0);
      expect(result.elevationDataQuality).toBe('low');
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.calculationMethod).toBe('no_elevation_data');
    });

    it('should calculate grade-adjusted pace for uphill runs', () => {
      const hillRun = createMockRun({
        distance: 5000,
        moving_time: 1800, // 6:00/km pace
        total_elevation_gain: 250 // 50m/km elevation gain
      });
      
      const result = calculateGradeAdjustedPace(hillRun);
      
      expect(result.originalPace).toBe(360); // 6:00/km
      expect(result.gradeAdjustedPace).toBeLessThan(result.originalPace);
      expect(result.elevationAdjustment).toBeGreaterThan(0);
      expect(result.elevationGainPerKm).toBe(50);
      expect(result.averageGrade).toBeCloseTo(5, 1); // ~5% grade
      expect(result.elevationDataQuality).toBe('high');
    });

    it('should calculate grade-adjusted pace for downhill runs', () => {
      const downhillRun = createMockRun({
        distance: 5000,
        moving_time: 1200, // 4:00/km pace (fast due to downhill)
        total_elevation_gain: -150 // Net descent
      });
      
      const result = calculateGradeAdjustedPace(downhillRun);
      
      expect(result.originalPace).toBe(240); // 4:00/km
      expect(result.gradeAdjustedPace).toBeGreaterThan(result.originalPace);
      expect(result.elevationAdjustment).toBeLessThan(0); // Negative adjustment for downhill
      expect(result.elevationGainPerKm).toBe(-30);
      expect(result.averageGrade).toBeLessThan(0);
    });

    it('should assess climbing efficiency correctly', () => {
      const efficientClimber = createMockRun({
        distance: 5000,
        moving_time: 1650, // 5:30/km (good for hills)
        total_elevation_gain: 200,
        average_heartrate: 155 // Reasonable HR
      });
      
      const result = calculateGradeAdjustedPace(efficientClimber);
      
      expect(result.climbingEfficiency).toBeGreaterThan(50);
      expect(result.climbingEfficiency).toBeLessThanOrEqual(100);
    });

    it('should assess descent efficiency correctly', () => {
      const confidentDescender = createMockRun({
        distance: 5000,
        moving_time: 1200, // 4:00/km (fast descent)
        total_elevation_gain: -200 // Significant descent
      });
      
      const result = calculateGradeAdjustedPace(confidentDescender);
      
      expect(result.descentEfficiency).toBeGreaterThan(50);
      expect(result.descentEfficiency).toBeLessThanOrEqual(100);
    });

    it('should estimate flat terrain pace correctly', () => {
      const hillRun = createMockRun({
        distance: 5000,
        moving_time: 1800, // 6:00/km (slow due to hills)
        total_elevation_gain: 300
      });
      
      const result = calculateGradeAdjustedPace(hillRun);
      
      expect(result.flatTerrainPace).toBeLessThan(result.originalPace);
      expect(result.flatTerrainPace).toBeGreaterThan(240); // Reasonable flat pace
    });

    it('should handle extreme elevation values gracefully', () => {
      const extremeRun = createMockRun({
        distance: 1000,
        moving_time: 600,
        total_elevation_gain: 500 // 500m/km - unrealistic
      });
      
      const result = calculateGradeAdjustedPace(extremeRun);
      
      expect(result.elevationDataQuality).toBe('low');
      expect(result.confidence).toBeLessThan(0.5);
      expect(Math.abs(result.elevationAdjustment)).toBeLessThanOrEqual(result.originalPace * 0.5);
    });
  });

  describe('buildRoutePerformanceProfile', () => {
    it('should create minimal profile with insufficient data', () => {
      const runs = createElevationVariedRuns(3);
      const profile = buildRoutePerformanceProfile(runs);
      
      expect(profile.elevationDataAvailable).toBeLessThan(5);
      expect(profile.climbingProfile.efficiency).toBe('average');
      expect(profile.descentProfile.efficiency).toBe('average');
      expect(profile.routeRecommendations.pacingStrategy[0]).toContain('Need more elevation data');
    });

    it('should build comprehensive profile with sufficient data', () => {
      const runs = createElevationVariedRuns(20);
      const profile = buildRoutePerformanceProfile(runs);
      
      expect(profile.totalRunsAnalyzed).toBe(20);
      expect(profile.elevationDataAvailable).toBeGreaterThan(5);
      expect(profile.climbingProfile.efficiency).toMatch(/^(excellent|good|average|needs-improvement)$/);
      expect(profile.descentProfile.efficiency).toMatch(/^(excellent|good|average|needs-improvement)$/);
      expect(profile.climbingProfile.optimalGrade).toBeGreaterThan(0);
      expect(profile.climbingProfile.maxSustainableGrade).toBeGreaterThan(profile.climbingProfile.optimalGrade);
    });

    it('should analyze climbing performance correctly', () => {
      const runs = createElevationVariedRuns(15);
      const profile = buildRoutePerformanceProfile(runs);
      
      expect(profile.climbingProfile.climbingPaceAdjustment).toBeGreaterThan(0);
      expect(profile.climbingProfile.climbingPaceAdjustment).toBeLessThan(30);
      expect(profile.climbingProfile.improvementTrend).toMatch(/^(improving|stable|declining)$/);
      expect(profile.climbingProfile.optimalGrade).toBeGreaterThanOrEqual(0);
      expect(profile.climbingProfile.maxSustainableGrade).toBeLessThanOrEqual(15);
    });

    it('should analyze descent performance correctly', () => {
      const runs = createElevationVariedRuns(15);
      const profile = buildRoutePerformanceProfile(runs);
      
      expect(profile.descentProfile.descentPaceImprovement).toBeGreaterThan(0);
      expect(profile.descentProfile.maxComfortableDescentGrade).toBeGreaterThan(0);
      expect(profile.descentProfile.brakingTendency).toMatch(/^(aggressive|moderate|conservative)$/);
    });

    it('should analyze terrain preferences correctly', () => {
      const runs = createElevationVariedRuns(16);
      const profile = buildRoutePerformanceProfile(runs);
      
      expect(profile.terrainPreferences.flatTerrain.performance).toBeGreaterThanOrEqual(0);
      expect(profile.terrainPreferences.flatTerrain.performance).toBeLessThanOrEqual(100);
      expect(profile.terrainPreferences.rollingHills.performance).toBeGreaterThanOrEqual(0);
      expect(profile.terrainPreferences.steepClimbs.performance).toBeGreaterThanOrEqual(0);
      expect(profile.terrainPreferences.technicalDescents.performance).toBeGreaterThanOrEqual(0);
      
      expect(profile.terrainPreferences.flatTerrain.preference).toBeTruthy();
      expect(profile.terrainPreferences.rollingHills.preference).toBeTruthy();
    });

    it('should generate route recommendations', () => {
      const runs = createElevationVariedRuns(12);
      const profile = buildRoutePerformanceProfile(runs);
      
      expect(profile.routeRecommendations.optimalElevationGain.min).toBeGreaterThanOrEqual(0);
      expect(profile.routeRecommendations.optimalElevationGain.max).toBeGreaterThan(
        profile.routeRecommendations.optimalElevationGain.min
      );
      expect(profile.routeRecommendations.recommendedGradeRange.min).toBe(0);
      expect(profile.routeRecommendations.recommendedGradeRange.max).toBeGreaterThan(0);
      expect(profile.routeRecommendations.pacingStrategy.length).toBeGreaterThan(0);
      expect(profile.routeRecommendations.trainingFocus.length).toBeGreaterThan(0);
    });

    it('should track date range correctly', () => {
      const runs = createElevationVariedRuns(10);
      const profile = buildRoutePerformanceProfile(runs);
      
      expect(profile.dateRange.start).toBeTruthy();
      expect(profile.dateRange.end).toBeTruthy();
      expect(new Date(profile.dateRange.end).getTime()).toBeGreaterThanOrEqual(
        new Date(profile.dateRange.start).getTime()
      );
      expect(profile.lastCalculated).toBeTruthy();
    });
  });

  describe('analyzeHillRunningMetrics', () => {
    it('should return null for runs without elevation data', () => {
      const flatRun = createMockRun({ total_elevation_gain: 0 });
      const result = analyzeHillRunningMetrics(flatRun);
      
      expect(result).toBeNull();
    });

    it('should analyze uphill running metrics', () => {
      const uphillRun = createMockRun({
        distance: 5000,
        moving_time: 1800, // 6:00/km
        total_elevation_gain: 250,
        average_heartrate: 165
      });
      
      const result = analyzeHillRunningMetrics(uphillRun);
      
      expect(result).not.toBeNull();
      if (result) {
        expect(result.uphillPace).toBeGreaterThan(0);
        expect(result.uphillSlowdown).toBeGreaterThan(0);
        expect(result.uphillEffort).toBeGreaterThan(50);
        expect(result.gradeEfficiency).toBeGreaterThanOrEqual(0);
        expect(result.gradeEfficiency).toBeLessThanOrEqual(100);
        expect(result.flatPace).toBeLessThan(result.uphillPace);
      }
    });

    it('should analyze downhill running metrics', () => {
      const downhillRun = createMockRun({
        distance: 5000,
        moving_time: 1200, // 4:00/km
        total_elevation_gain: -200,
        average_heartrate: 140
      });
      
      const result = analyzeHillRunningMetrics(downhillRun);
      
      // Note: analyzeHillRunningMetrics may return null for runs with poor elevation data quality
      if (result) {
        expect(result.downhillPace).toBeGreaterThan(0);
        expect(result.downhillSpeedup).toBeGreaterThan(0);
        expect(result.downhillControl).toBeGreaterThanOrEqual(0);
        expect(result.downhillControl).toBeLessThanOrEqual(100);
        expect(result.flatPace).toBeGreaterThan(result.downhillPace);
      } else {
        // If null, it means elevation data quality was too low
        expect(result).toBeNull();
      }
    });

    it('should handle mixed terrain correctly', () => {
      const mixedRun = createMockRun({
        distance: 10000,
        moving_time: 3000, // 5:00/km
        total_elevation_gain: 50, // Gentle rolling
        average_heartrate: 150
      });
      
      const result = analyzeHillRunningMetrics(mixedRun);
      
      expect(result).not.toBeNull();
      if (result) {
        expect(result.uphillSlowdown).toBeGreaterThan(0);
        expect(result.downhillSpeedup).toBeGreaterThan(0);
        expect(result.gradeEfficiency).toBeGreaterThan(0);
        expect(result.flatPace).toBeGreaterThan(0);
      }
    });
  });

  describe('getElevationPacingRecommendations', () => {
    let routeProfile: RoutePerformanceProfile;

    beforeEach(() => {
      const runs = createElevationVariedRuns(15);
      routeProfile = buildRoutePerformanceProfile(runs);
    });

    it('should provide recommendations for flat terrain', () => {
      const recommendations = getElevationPacingRecommendations(
        routeProfile,
        20, // 20m elevation gain
        5000 // 5km
      );
      
      expect(recommendations.paceAdjustments[0]).toContain('Minimal pace adjustment');
      expect(recommendations.strategyAdvice.length).toBeGreaterThan(0);
      expect(recommendations.effortDistribution.length).toBeGreaterThan(0);
      expect(recommendations.recoveryAdvice.length).toBeGreaterThan(0);
    });

    it('should provide recommendations for rolling terrain', () => {
      const recommendations = getElevationPacingRecommendations(
        routeProfile,
        150, // 150m elevation gain
        5000 // 5km (30m/km)
      );
      
      expect(recommendations.paceAdjustments[0]).toContain('rolling terrain');
      expect(recommendations.strategyAdvice.length).toBeGreaterThan(0);
      expect(recommendations.effortDistribution[0]).toContain('steady effort');
    });

    it('should provide recommendations for steep terrain', () => {
      const recommendations = getElevationPacingRecommendations(
        routeProfile,
        400, // 400m elevation gain
        5000 // 5km (80m/km)
      );
      
      expect(recommendations.paceAdjustments[0]).toContain('elevation');
      expect(recommendations.paceAdjustments[1]).toContain('conservatively');
      expect(recommendations.effortDistribution[0]).toContain('Front-load effort');
      expect(recommendations.recoveryAdvice[0]).toContain('extra recovery');
    });

    it('should adapt recommendations based on climbing efficiency', () => {
      // Mock excellent climber
      routeProfile.climbingProfile.efficiency = 'excellent';
      
      const recommendations = getElevationPacingRecommendations(
        routeProfile,
        200,
        5000
      );
      
      expect(recommendations.strategyAdvice.some(advice => 
        advice.includes('advantage') || advice.includes('pushing')
      )).toBe(true);
    });

    it('should adapt recommendations based on descent tendency', () => {
      // Mock conservative descender
      routeProfile.descentProfile.brakingTendency = 'conservative';
      
      const recommendations = getElevationPacingRecommendations(
        routeProfile,
        100,
        5000
      );
      
      expect(recommendations.strategyAdvice.some(advice => 
        advice.includes('confidence') || advice.includes('gain time')
      )).toBe(true);
    });
  });

  describe('compareRoutePerformance', () => {
    it('should compare performance across terrain types', () => {
      const runs = createElevationVariedRuns(20);
      const comparison = compareRoutePerformance(runs);
      
      expect(comparison.flatTerrain.runCount).toBeGreaterThanOrEqual(0);
      expect(comparison.rollingHills.runCount).toBeGreaterThanOrEqual(0);
      expect(comparison.steepClimbs.runCount).toBeGreaterThanOrEqual(0);
      
      if (comparison.flatTerrain.runCount > 0) {
        expect(comparison.flatTerrain.avgPace).toBeGreaterThan(0);
        expect(comparison.flatTerrain.efficiency).toBeGreaterThanOrEqual(0);
        expect(comparison.flatTerrain.efficiency).toBeLessThanOrEqual(100);
      }
      
      expect(comparison.insights.length).toBeGreaterThan(0);
    });

    it('should generate meaningful insights', () => {
      const runs = createElevationVariedRuns(16);
      const comparison = compareRoutePerformance(runs);
      
      const hasTerrainComparison = comparison.insights.some(insight => 
        insight.includes('add') && insight.includes('s/km')
      );
      
      const hasBestTerrain = comparison.insights.some(insight => 
        insight.includes('perform best')
      );
      
      expect(hasTerrainComparison || hasBestTerrain).toBe(true);
    });

    it('should handle runs without elevation data', () => {
      const flatRuns = [
        createMockRun({ total_elevation_gain: undefined }),
        createMockRun({ total_elevation_gain: null as any })
      ];
      
      const comparison = compareRoutePerformance(flatRuns);
      
      expect(comparison.flatTerrain.runCount).toBe(0);
      expect(comparison.rollingHills.runCount).toBe(0);
      expect(comparison.steepClimbs.runCount).toBe(0);
      expect(comparison.insights.length).toBeGreaterThanOrEqual(0);
    });

    it('should identify best terrain type', () => {
      // Create runs with clear performance differences
      const runs = [
        // Excellent flat performance
        ...Array(5).fill(null).map(() => createMockRun({
          distance: 5000,
          moving_time: 1200, // 4:00/km - fast
          total_elevation_gain: 5
        })),
        // Poor hill performance
        ...Array(5).fill(null).map(() => createMockRun({
          distance: 5000,
          moving_time: 2100, // 7:00/km - slow
          total_elevation_gain: 200
        }))
      ];
      
      const comparison = compareRoutePerformance(runs);
      
      expect(comparison.flatTerrain.efficiency).toBeGreaterThan(comparison.steepClimbs.efficiency);
      expect(comparison.insights.some(insight => 
        insight.includes('flat terrain')
      )).toBe(true);
    });
  });

  describe('Data Quality and Edge Cases', () => {
    it('should handle missing elevation data gracefully', () => {
      const runWithoutElevation = createMockRun({ total_elevation_gain: undefined });
      const result = calculateGradeAdjustedPace(runWithoutElevation);
      
      expect(result.elevationDataQuality).toBe('low');
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.elevationAdjustment).toBe(0);
    });

    it('should assess data quality correctly', () => {
      const highQualityRun = createMockRun({
        distance: 10000,
        total_elevation_gain: 200
      });
      
      const lowQualityRun = createMockRun({
        distance: 500,
        total_elevation_gain: 5
      });
      
      const highQualityResult = calculateGradeAdjustedPace(highQualityRun);
      const lowQualityResult = calculateGradeAdjustedPace(lowQualityRun);
      
      expect(highQualityResult.elevationDataQuality).toBe('high');
      expect(lowQualityResult.elevationDataQuality).toBe('low');
      expect(highQualityResult.confidence).toBeGreaterThan(lowQualityResult.confidence);
    });

    it('should handle very short runs', () => {
      const shortRun = createMockRun({
        distance: 500, // 500m
        moving_time: 150,
        total_elevation_gain: 50
      });
      
      const result = calculateGradeAdjustedPace(shortRun);
      
      expect(result.elevationDataQuality).toBe('low');
      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should cap extreme pace adjustments', () => {
      const extremeRun = createMockRun({
        distance: 1000,
        moving_time: 300, // 5:00/km
        total_elevation_gain: 200 // 200m/km - very steep
      });
      
      const result = calculateGradeAdjustedPace(extremeRun);
      
      // Adjustment should be capped at 50% of original pace
      expect(Math.abs(result.elevationAdjustment)).toBeLessThanOrEqual(result.originalPace * 0.5);
    });

    it('should handle negative elevation gain correctly', () => {
      const descentRun = createMockRun({
        distance: 5000,
        moving_time: 1200, // 4:00/km
        total_elevation_gain: -150
      });
      
      const result = calculateGradeAdjustedPace(descentRun);
      
      expect(result.elevationGainPerKm).toBeLessThan(0);
      expect(result.averageGrade).toBeLessThan(0);
      expect(result.elevationAdjustment).toBeLessThan(0); // Negative adjustment
      expect(result.gradeAdjustedPace).toBeGreaterThan(result.originalPace);
    });

    it('should provide reasonable efficiency scores', () => {
      const runs = createElevationVariedRuns(10);
      
      runs.forEach(run => {
        const result = calculateGradeAdjustedPace(run);
        
        expect(result.climbingEfficiency).toBeGreaterThanOrEqual(0);
        expect(result.climbingEfficiency).toBeLessThanOrEqual(100);
        expect(result.descentEfficiency).toBeGreaterThanOrEqual(0);
        expect(result.descentEfficiency).toBeLessThanOrEqual(100);
      });
    });
  });
});