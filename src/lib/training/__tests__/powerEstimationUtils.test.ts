import { describe, it, expect } from 'vitest';
import {
  estimateRunningPower,
  calculateTrainingZones,
  analyzeZoneDistribution,
  shouldRecalculateZones,
  recalculateZones,
  type RunningPowerEstimate,
  type TrainingZones,
  type ZoneDistributionAnalysis,
  type UserPhysiologyData
} from '../powerEstimationUtils';
import { EnrichedRun } from '../../../types';

// Helper function to create mock runs
const createMockRun = (overrides: Partial<EnrichedRun> = {}): EnrichedRun => ({
  id: Math.random().toString(),
  strava_id: Math.floor(Math.random() * 1000000),
  name: 'Test Run',
  distance: 10000, // 10km default
  moving_time: 2400, // 40 minutes default (4:00/km pace)
  elapsed_time: 2400,
  start_date: new Date().toISOString(),
  start_date_local: new Date().toISOString(),
  start_latlng: null,
  end_latlng: null,
  average_speed: 4.17, // m/s (4:00/km pace)
  max_speed: 5.0,
  average_heartrate: 150,
  max_heartrate: 180,
  total_elevation_gain: 100,
  user_id: 'test-user',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

// Helper to create a sequence of runs with varying characteristics
const createRunSequence = (count: number, baseDistance: number = 10000): EnrichedRun[] => {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - i));
    
    return createMockRun({
      distance: baseDistance + (Math.random() - 0.5) * 2000,
      moving_time: (baseDistance / 1000) * (240 + Math.random() * 60), // 4:00-5:00/km pace
      start_date: date.toISOString(),
      average_heartrate: 145 + Math.random() * 20,
      max_heartrate: 175 + Math.random() * 15,
      total_elevation_gain: Math.random() * 200
    });
  });
};

const createMockPhysiology = (overrides: Partial<UserPhysiologyData> = {}): UserPhysiologyData => ({
  bodyWeight: 70,
  maxHeartRate: 190,
  restingHeartRate: 60,
  age: 30,
  gender: 'male',
  fitnessLevel: 'intermediate',
  lastUpdated: new Date().toISOString(),
  ...overrides
});

describe('Power Estimation Utils', () => {
  describe('estimateRunningPower', () => {
    it('should calculate basic power estimate for flat run', () => {
      const run = createMockRun({
        distance: 10000,
        moving_time: 2400, // 4:00/km pace
        total_elevation_gain: 0
      });
      
      const result = estimateRunningPower(run, 70);
      
      expect(result.estimatedPower).toBeGreaterThan(0);
      expect(result.powerPerKg).toBeGreaterThan(0);
      expect(result.confidence).toBeOneOf(['high', 'medium', 'low']);
      expect(result.calculationMethod).toBeOneOf(['elevation-pace', 'pace-only', 'estimated']);
      expect(result.factors.paceComponent).toBeGreaterThan(0);
      expect(result.factors.elevationComponent).toBe(0); // No elevation
      expect(result.factors.totalEfficiency).toBe(0.25);
    });

    it('should include elevation component for hilly runs', () => {
      const run = createMockRun({
        distance: 10000,
        moving_time: 2400,
        total_elevation_gain: 200 // Significant elevation
      });
      
      const result = estimateRunningPower(run, 70);
      
      expect(result.factors.elevationComponent).toBeGreaterThan(0);
      expect(result.confidence).toBeOneOf(['high', 'medium']);
      expect(result.calculationMethod).toBe('elevation-pace');
      expect(result.estimatedPower).toBeGreaterThan(200); // Should be higher with elevation
    });

    it('should include wind component when provided', () => {
      const run = createMockRun({
        distance: 10000,
        moving_time: 2400,
        total_elevation_gain: 50
      });
      
      const result = estimateRunningPower(run, 70, 5); // 5 m/s headwind
      
      expect(result.factors.windComponent).toBeGreaterThan(0);
      expect(result.estimatedPower).toBeGreaterThan(200);
    });

    it('should adjust confidence based on data quality', () => {
      const shortRun = createMockRun({
        distance: 2000,
        moving_time: 480, // 8 minutes
        average_heartrate: undefined,
        total_elevation_gain: 0 // No elevation data
      });
      
      const result = estimateRunningPower(shortRun, 70);
      
      expect(result.confidence).toBe('low');
    });

    it('should handle different body weights', () => {
      const run = createMockRun({
        distance: 10000,
        moving_time: 2400,
        total_elevation_gain: 100
      });
      
      const lightRunner = estimateRunningPower(run, 60);
      const heavyRunner = estimateRunningPower(run, 80);
      
      expect(heavyRunner.estimatedPower).toBeGreaterThan(lightRunner.estimatedPower);
      expect(lightRunner.powerPerKg).toBeGreaterThanOrEqual(heavyRunner.powerPerKg);
    });

    it('should handle edge cases gracefully', () => {
      const extremeRun = createMockRun({
        distance: 100, // Very short
        moving_time: 30, // Very fast
        total_elevation_gain: 1000 // Impossible elevation
      });
      
      expect(() => estimateRunningPower(extremeRun, 70)).not.toThrow();
      const result = estimateRunningPower(extremeRun, 70);
      expect(result.estimatedPower).toBeGreaterThan(0);
    });
  });

  describe('calculateTrainingZones', () => {
    it('should calculate zones with complete physiology data', () => {
      const runs = createRunSequence(20, 10000);
      const physiology = createMockPhysiology();
      
      const zones = calculateTrainingZones(runs, physiology);
      
      expect(zones.heartRateZones).toBeDefined();
      expect(zones.paceZones).toBeDefined();
      expect(zones.basedOn.maxHeartRate).toBe(190);
      expect(zones.basedOn.restingHeartRate).toBe(60);
      expect(zones.basedOn.recentPerformance).toBe(true);
      
      // Check heart rate zones are logical
      expect(zones.heartRateZones.zone1.min).toBeLessThan(zones.heartRateZones.zone1.max);
      expect(zones.heartRateZones.zone1.max).toBeLessThanOrEqual(zones.heartRateZones.zone2.min);
      expect(zones.heartRateZones.zone5.max).toBe(190);
      
      // Check pace zones are logical (slower pace = higher number)
      expect(zones.paceZones.recovery.min).toBeGreaterThanOrEqual(zones.paceZones.easy.max);
      expect(zones.paceZones.repetition.max).toBeLessThanOrEqual(zones.paceZones.interval.min);
    });

    it('should estimate missing heart rate data', () => {
      const runs = createRunSequence(15, 8000);
      const physiology = createMockPhysiology({
        maxHeartRate: undefined,
        restingHeartRate: undefined,
        age: 25
      });
      
      const zones = calculateTrainingZones(runs, physiology);
      
      expect(zones.basedOn.maxHeartRate).toBe(195); // 220 - 25
      expect(zones.heartRateZones.zone5.max).toBe(195);
    });

    it('should use observed max HR when age not available', () => {
      const runs = createRunSequence(15, 8000).map(run => ({
        ...run,
        max_heartrate: 185 + Math.random() * 10
      }));
      
      const physiology = createMockPhysiology({
        maxHeartRate: undefined,
        age: undefined
      });
      
      const zones = calculateTrainingZones(runs, physiology);
      
      expect(zones.basedOn.maxHeartRate).toBeGreaterThan(185);
      expect(zones.basedOn.maxHeartRate).toBeLessThanOrEqual(200);
    });

    it('should calculate power zones when sufficient data available', () => {
      const runs = createRunSequence(15, 8000).map(run => ({
        ...run,
        total_elevation_gain: 50 + Math.random() * 100 // Ensure elevation data
      }));
      
      const physiology = createMockPhysiology({ bodyWeight: 75 });
      
      const zones = calculateTrainingZones(runs, physiology);
      
      expect(zones.powerZones).toBeDefined();
      if (zones.powerZones) {
        expect(zones.powerZones.zone1.max).toBeLessThanOrEqual(zones.powerZones.zone2.min);
        expect(zones.powerZones.zone5.min).toBeGreaterThanOrEqual(zones.powerZones.zone4.max);
      }
    });

    it('should not calculate power zones with insufficient data', () => {
      const runs = createRunSequence(3, 8000); // Too few runs
      const physiology = createMockPhysiology();
      
      const zones = calculateTrainingZones(runs, physiology);
      
      expect(zones.powerZones).toBeUndefined();
    });

    it('should set appropriate recalculation date', () => {
      const runs = createRunSequence(15, 10000);
      const physiology = createMockPhysiology();
      
      const zones = calculateTrainingZones(runs, physiology);
      
      const lastCalc = new Date(zones.lastCalculated);
      const nextRecalc = new Date(zones.nextRecalculation);
      const expectedNext = new Date(lastCalc);
      expectedNext.setDate(expectedNext.getDate() + 28);
      
      expect(nextRecalc.getTime()).toBeCloseTo(expectedNext.getTime(), -2); // Within ~10ms
    });
  });

  describe('analyzeZoneDistribution', () => {
    it('should analyze zone distribution with heart rate data', () => {
      const zones = calculateTrainingZones(createRunSequence(20, 10000), createMockPhysiology());
      
      // Create runs with varied heart rates
      const runs = Array.from({ length: 20 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Distribute across zones
        let avgHR = 130; // Zone 1 default
        if (i % 5 === 0) avgHR = 160; // Zone 3
        if (i % 10 === 0) avgHR = 175; // Zone 4
        
        return createMockRun({
          start_date: date.toISOString(),
          average_heartrate: avgHR,
          moving_time: 3600 // 1 hour runs
        });
      });
      
      const analysis = analyzeZoneDistribution(runs, zones);
      
      expect(analysis.currentDistribution).toBeDefined();
      expect(analysis.optimalDistribution).toBeDefined();
      expect(analysis.recommendations).toBeInstanceOf(Array);
      expect(analysis.polarizationIndex).toBeGreaterThanOrEqual(0);
      expect(analysis.polarizationIndex).toBeLessThanOrEqual(1);
      expect(analysis.trainingStress).toBeOneOf(['low', 'moderate', 'high', 'excessive']);
      
      // Check distribution adds up to 100%
      const totalPercentage = Object.values(analysis.currentDistribution)
        .reduce((sum, zone) => sum + zone.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 0);
    });

    it('should provide recommendations for imbalanced training', () => {
      const zones = calculateTrainingZones(createRunSequence(20, 10000), createMockPhysiology());
      
      // Create runs heavily skewed to high intensity
      const runs = Array.from({ length: 10 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        return createMockRun({
          start_date: date.toISOString(),
          average_heartrate: 180, // Zone 5 - too much high intensity
          moving_time: 3600
        });
      });
      
      const analysis = analyzeZoneDistribution(runs, zones);
      
      expect(analysis.recommendations.length).toBeGreaterThan(0);
      expect(analysis.recommendations.some(rec => 
        rec.toLowerCase().includes('reduce') || rec.toLowerCase().includes('increase')
      )).toBe(true);
    });

    it('should handle runs without heart rate data', () => {
      const zones = calculateTrainingZones(createRunSequence(20, 10000), createMockPhysiology());
      
      // Create runs with pace that should fall in zone 1 (easy pace)
      const runs = Array.from({ length: 15 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        return createMockRun({
          start_date: date.toISOString(),
          average_heartrate: undefined, // No HR data
          distance: 10000,
          moving_time: 10000 / 1000 * 360 // 6:00/km pace - should be easy/recovery pace
        });
      });
      
      const analysis = analyzeZoneDistribution(runs, zones);
      
      // Should classify most runs in zone 1 or 2 based on pace
      const easyZonePercentage = analysis.currentDistribution.zone1.percentage + 
                                analysis.currentDistribution.zone2.percentage;
      expect(easyZonePercentage).toBeGreaterThan(0);
      expect(analysis.recommendations).toBeInstanceOf(Array);
    });

    it('should calculate polarization index correctly', () => {
      const zones = calculateTrainingZones(createRunSequence(20, 10000), createMockPhysiology());
      
      // Create perfectly polarized training (80% easy, 20% hard)
      const easyRuns = Array.from({ length: 8 }, (_, i) => 
        createMockRun({
          start_date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          average_heartrate: 130, // Zone 1
          moving_time: 3600
        })
      );
      
      const hardRuns = Array.from({ length: 2 }, (_, i) => 
        createMockRun({
          start_date: new Date(Date.now() - (i + 8) * 24 * 60 * 60 * 1000).toISOString(),
          average_heartrate: 180, // Zone 5
          moving_time: 3600
        })
      );
      
      const analysis = analyzeZoneDistribution([...easyRuns, ...hardRuns], zones);
      
      expect(analysis.polarizationIndex).toBeGreaterThan(0.7); // Should be highly polarized
    });

    it('should determine training stress appropriately', () => {
      const zones = calculateTrainingZones(createRunSequence(20, 10000), createMockPhysiology());
      
      // Low volume training
      const lowVolumeRuns = Array.from({ length: 3 }, (_, i) => 
        createMockRun({
          start_date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString(),
          moving_time: 1800 // 30 minutes
        })
      );
      
      const lowAnalysis = analyzeZoneDistribution(lowVolumeRuns, zones);
      expect(lowAnalysis.trainingStress).toBe('low');
      
      // High intensity training - more runs and longer duration
      const highIntensityRuns = Array.from({ length: 15 }, (_, i) => 
        createMockRun({
          start_date: new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000).toISOString(),
          average_heartrate: 180, // Zone 5
          moving_time: 4800 // 80 minutes each
        })
      );
      
      const highAnalysis = analyzeZoneDistribution(highIntensityRuns, zones);
      expect(highAnalysis.trainingStress).toBeOneOf(['high', 'excessive']);
    });
  });

  describe('shouldRecalculateZones', () => {
    it('should recommend recalculation for old zones', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35); // 5 weeks ago
      
      const zones: TrainingZones = {
        heartRateZones: {} as any,
        paceZones: {} as any,
        basedOn: { recentPerformance: true },
        lastCalculated: oldDate.toISOString(),
        nextRecalculation: new Date().toISOString()
      };
      
      const result = shouldRecalculateZones(zones, []);
      
      expect(result.shouldRecalculate).toBe(true);
      expect(result.reasons).toContain('Zones are more than 4 weeks old');
    });

    it('should recommend recalculation for performance improvements', () => {
      const zones: TrainingZones = {
        heartRateZones: {} as any,
        paceZones: {} as any,
        basedOn: { 
          recentPerformance: true,
          thresholdPace: 240 // 4:00/km threshold
        },
        lastCalculated: new Date().toISOString(),
        nextRecalculation: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      // Recent fast runs
      const fastRuns = createRunSequence(5, 8000).map(run => ({
        ...run,
        moving_time: run.distance / 1000 * 220 // 3:40/km - much faster than threshold
      }));
      
      const result = shouldRecalculateZones(zones, fastRuns);
      
      expect(result.shouldRecalculate).toBe(true);
      expect(result.reasons.some(r => r.includes('fitness improvement'))).toBe(true);
    });

    it('should not recommend recalculation for recent zones with stable performance', () => {
      const zones: TrainingZones = {
        heartRateZones: {} as any,
        paceZones: {} as any,
        basedOn: { 
          recentPerformance: true,
          thresholdPace: 240
        },
        lastCalculated: new Date().toISOString(),
        nextRecalculation: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      const stableRuns = createRunSequence(5, 8000).map(run => ({
        ...run,
        moving_time: run.distance / 1000 * 245 // Similar to threshold pace
      }));
      
      const result = shouldRecalculateZones(zones, stableRuns);
      
      expect(result.shouldRecalculate).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });
  });

  describe('recalculateZones', () => {
    it('should recalculate zones with new data', () => {
      const runs = createRunSequence(20, 10000);
      const physiology = createMockPhysiology();
      
      const oldZones: TrainingZones = {
        heartRateZones: {} as any,
        paceZones: {} as any,
        basedOn: { recentPerformance: false },
        lastCalculated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        nextRecalculation: new Date().toISOString()
      };
      
      const newZones = recalculateZones(runs, physiology, oldZones);
      
      expect(newZones.heartRateZones).toBeDefined();
      expect(newZones.paceZones).toBeDefined();
      expect(newZones.basedOn.recentPerformance).toBe(true);
      expect(new Date(newZones.lastCalculated).getTime()).toBeGreaterThan(
        new Date(oldZones.lastCalculated).getTime()
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty run arrays', () => {
      const emptyRuns: EnrichedRun[] = [];
      const physiology = createMockPhysiology();
      
      expect(() => calculateTrainingZones(emptyRuns, physiology)).not.toThrow();
      expect(() => analyzeZoneDistribution(emptyRuns, {} as TrainingZones)).not.toThrow();
    });

    it('should handle missing physiology data', () => {
      const runs = createRunSequence(10, 8000);
      const minimalPhysiology: UserPhysiologyData = {};
      
      expect(() => calculateTrainingZones(runs, minimalPhysiology)).not.toThrow();
      
      const zones = calculateTrainingZones(runs, minimalPhysiology);
      expect(zones.heartRateZones).toBeDefined();
      expect(zones.paceZones).toBeDefined();
    });

    it('should handle runs with missing data', () => {
      const incompleteRuns = createRunSequence(10, 8000).map(run => ({
        ...run,
        average_heartrate: undefined,
        max_heartrate: undefined,
        total_elevation_gain: undefined
      }));
      
      const physiology = createMockPhysiology();
      
      expect(() => calculateTrainingZones(incompleteRuns, physiology)).not.toThrow();
      expect(() => estimateRunningPower(incompleteRuns[0], 70)).not.toThrow();
    });

    it('should handle extreme values gracefully', () => {
      const extremeRun = createMockRun({
        distance: 1000000, // 1000km
        moving_time: 36000, // 10 hours
        total_elevation_gain: 0, // No elevation data
        average_heartrate: undefined // No HR data
      });
      
      expect(() => estimateRunningPower(extremeRun, 70)).not.toThrow();
      
      const result = estimateRunningPower(extremeRun, 70);
      expect(result.estimatedPower).toBeGreaterThan(0);
      expect(result.confidence).toBe('low');
    });
  });
});