// Environmental Profiling Integration Tests
import {
  getUserEnvironmentalProfile,
  getCurrentWeatherRecommendations,
  getEnvironmentalPerformanceSummary,
  getWeatherPerformanceInsights,
  exportEnvironmentalData
} from '../environmentalProfilingIntegration';
import { EnrichedRun } from '../../../types';

// Mock data helper
const createMockRun = (overrides: Partial<EnrichedRun> = {}): EnrichedRun => ({
  id: 'test-run-' + Math.random(),
  user_id: 'test-user',
  strava_id: Math.floor(Math.random() * 10000),
  name: 'Test Run',
  distance: 5000,
  moving_time: 1500,
  elapsed_time: 1500,
  start_date: new Date().toISOString(),
  start_date_local: new Date().toISOString(),
  average_speed: 3.33,
  weather_data: {
    temperature: 18,
    humidity: 55,
    wind_speed: 8,
    weather: { main: 'Clear', description: 'clear sky' }
  },
  ...overrides
});

const createRunsWithWeatherVariation = (count: number): EnrichedRun[] => {
  const runs: EnrichedRun[] = [];
  const baseDate = new Date('2024-01-01');
  
  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    
    const temperature = 5 + (i % 30);
    const humidity = 30 + (i % 60);
    const windSpeed = i % 25;
    
    let basePace = 300;
    if (temperature > 25) basePace += (temperature - 25) * 2;
    if (temperature < 10) basePace += (10 - temperature) * 1;
    if (humidity > 70) basePace += (humidity - 70) * 0.5;
    if (windSpeed > 15) basePace += (windSpeed - 15) * 0.3;
    
    const distance = 5000;
    const movingTime = (distance / 1000) * basePace;
    
    runs.push(createMockRun({
      start_date: date.toISOString(),
      distance,
      moving_time: movingTime,
      average_speed: distance / movingTime,
      weather_data: {
        temperature,
        humidity,
        wind_speed: windSpeed,
        weather: { main: 'Clear', description: 'clear sky' }
      }
    }));
  }
  
  return runs;
};

describe('Environmental Profiling Integration', () => {
  describe('getUserEnvironmentalProfile', () => {
    it('should return minimal profile with insufficient data', async () => {
      const runs = createRunsWithWeatherVariation(5);
      const result = await getUserEnvironmentalProfile(runs);
      
      expect(result.profile.dataQuality).toBe('low');
      expect(result.patterns).toHaveLength(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0]).toContain('Need at least');
    });

    it('should return comprehensive profile with sufficient data', async () => {
      const runs = createRunsWithWeatherVariation(30);
      const result = await getUserEnvironmentalProfile(runs);
      
      expect(result.profile.dataQuality).toBe('medium'); // 30 runs = medium quality
      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.profile.totalRunsAnalyzed).toBe(30);
    });

    it('should handle custom minimum runs requirement', async () => {
      const runs = createRunsWithWeatherVariation(15);
      const result = await getUserEnvironmentalProfile(runs, { minRunsRequired: 20 });
      
      expect(result.recommendations[0]).toContain('Need at least 20');
    });

    it('should filter out runs without weather data', async () => {
      const runsWithWeather = createRunsWithWeatherVariation(10);
      const runsWithoutWeather = [
        createMockRun({ weather_data: undefined }),
        createMockRun({ weather_data: undefined })
      ];
      
      const allRuns = [...runsWithWeather, ...runsWithoutWeather];
      const result = await getUserEnvironmentalProfile(allRuns);
      
      expect(result.profile.totalRunsAnalyzed).toBe(10);
    });
  });

  describe('getCurrentWeatherRecommendations', () => {
    let profile: any;

    beforeEach(async () => {
      const runs = createRunsWithWeatherVariation(25);
      const result = await getUserEnvironmentalProfile(runs);
      profile = result.profile;
    });

    it('should provide excellent rating for optimal conditions', () => {
      const currentConditions = {
        temperature: 18,
        humidity: 50,
        windSpeed: 8
      };
      
      const recommendations = getCurrentWeatherRecommendations(profile, currentConditions);
      
      expect(recommendations.overallRating).toMatch(/^(excellent|good)$/);
      expect(recommendations.specificAdvice.length).toBeGreaterThan(0);
    });

    it('should provide challenging rating for poor conditions', () => {
      const currentConditions = {
        temperature: 35,
        humidity: 90,
        windSpeed: 25
      };
      
      const recommendations = getCurrentWeatherRecommendations(profile, currentConditions);
      
      expect(recommendations.overallRating).toMatch(/^(challenging|fair)$/);
      expect(recommendations.paceAdjustment).toBeTruthy();
      expect(recommendations.hydrationAdvice).toBeTruthy();
    });
  });

  describe('getEnvironmentalPerformanceSummary', () => {
    it('should provide comprehensive performance summary', async () => {
      const runs = createRunsWithWeatherVariation(30);
      const result = await getUserEnvironmentalProfile(runs);
      const summary = getEnvironmentalPerformanceSummary(result.profile);
      
      expect(summary.heatTolerance.level).toMatch(/^(low|medium|high)$/);
      expect(summary.heatTolerance.description).toBeTruthy();
      expect(summary.heatTolerance.optimalTemp).toBeGreaterThan(0);
      
      expect(summary.coldAdaptation.level).toMatch(/^(low|medium|high)$/);
      expect(summary.coldAdaptation.description).toBeTruthy();
      
      expect(summary.optimalConditions.temperature).toContain('°C');
      expect(summary.optimalConditions.humidity).toContain('%');
      expect(summary.optimalConditions.wind).toContain('km/h');
      
      expect(summary.acclimatizationStatus.heat.level).toBeGreaterThanOrEqual(0);
      expect(summary.acclimatizationStatus.heat.level).toBeLessThanOrEqual(100);
      expect(summary.acclimatizationStatus.heat.trend).toMatch(/^(improving|stable|declining)$/);
      
      expect(summary.acclimatizationStatus.cold.level).toBeGreaterThanOrEqual(0);
      expect(summary.acclimatizationStatus.cold.level).toBeLessThanOrEqual(100);
      expect(summary.acclimatizationStatus.cold.trend).toMatch(/^(improving|stable|declining)$/);
      
      expect(summary.dataQuality.level).toMatch(/^(high|medium|low)$/);
      expect(summary.dataQuality.runsAnalyzed).toBeGreaterThan(0);
      expect(summary.dataQuality.description).toBeTruthy();
    });
  });

  describe('getWeatherPerformanceInsights', () => {
    let profile: any;

    beforeEach(async () => {
      const runs = createRunsWithWeatherVariation(25);
      const result = await getUserEnvironmentalProfile(runs);
      profile = result.profile;
    });

    it('should provide temperature performance insights', () => {
      const insights = getWeatherPerformanceInsights(profile, 'temperature');
      
      expect(insights.bestConditions).toBeTruthy();
      expect(insights.worstConditions).toBeTruthy();
      expect(insights.performanceRange).toContain('point difference');
      expect(insights.insights.length).toBeGreaterThan(0);
    });

    it('should provide humidity performance insights', () => {
      const insights = getWeatherPerformanceInsights(profile, 'humidity');
      
      expect(insights.bestConditions).toBeTruthy();
      expect(insights.worstConditions).toBeTruthy();
      expect(insights.performanceRange).toContain('point difference');
      expect(insights.insights.length).toBeGreaterThan(0);
    });

    it('should provide wind performance insights', () => {
      const insights = getWeatherPerformanceInsights(profile, 'wind');
      
      expect(insights.bestConditions).toBeTruthy();
      expect(insights.worstConditions).toBeTruthy();
      expect(insights.performanceRange).toContain('point difference');
      expect(insights.insights.length).toBeGreaterThan(0);
    });

    it('should handle invalid condition type', () => {
      const insights = getWeatherPerformanceInsights(profile, 'invalid' as any);
      
      expect(insights.bestConditions).toBe('Unknown');
      expect(insights.worstConditions).toBe('Unknown');
      expect(insights.performanceRange).toBe('Unknown');
      expect(insights.insights[0]).toContain('Invalid condition type');
    });
  });

  describe('exportEnvironmentalData', () => {
    it('should export data in multiple formats', async () => {
      const runs = createRunsWithWeatherVariation(20);
      const result = await getUserEnvironmentalProfile(runs);
      const exportData = exportEnvironmentalData(result.profile);
      
      // Test JSON data
      expect(() => JSON.parse(exportData.jsonData)).not.toThrow();
      const parsedJson = JSON.parse(exportData.jsonData);
      expect(parsedJson.summary).toBeTruthy();
      expect(parsedJson.optimalConditions).toBeTruthy();
      
      // Test CSV data
      expect(exportData.csvData).toContain('Condition Type');
      expect(exportData.csvData).toContain('Temperature');
      expect(exportData.csvData).toContain('Humidity');
      expect(exportData.csvData).toContain('Wind');
      
      const csvLines = exportData.csvData.split('\n');
      expect(csvLines.length).toBeGreaterThan(1); // Header + data rows
      
      // Test summary
      expect(exportData.summary).toContain('Environmental Performance Profile Summary');
      expect(exportData.summary).toContain('Data Quality:');
      expect(exportData.summary).toContain('Total Runs Analyzed:');
      expect(exportData.summary).toContain('Heat Tolerance:');
      expect(exportData.summary).toContain('Cold Adaptation:');
      expect(exportData.summary).toContain('Optimal Conditions:');
    });

    it('should handle profile with minimal data', async () => {
      const runs = createRunsWithWeatherVariation(5);
      const result = await getUserEnvironmentalProfile(runs);
      const exportData = exportEnvironmentalData(result.profile);
      
      expect(exportData.jsonData).toBeTruthy();
      expect(exportData.csvData).toBeTruthy();
      expect(exportData.summary).toBeTruthy();
      
      // Should still contain basic structure even with minimal data
      expect(exportData.summary).toContain('Data Quality: low');
      expect(exportData.summary).toContain('Total Runs Analyzed: 5');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty runs array', async () => {
      const result = await getUserEnvironmentalProfile([]);
      
      expect(result.profile.totalRunsAnalyzed).toBe(0);
      expect(result.profile.dataQuality).toBe('low');
      expect(result.patterns).toHaveLength(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle runs with invalid weather data', async () => {
      const invalidRuns = [
        createMockRun({ weather_data: { temperature: null, humidity: 50, wind_speed: 10 } as any }),
        createMockRun({ weather_data: { temperature: 20, humidity: null, wind_speed: 10 } as any })
      ];
      
      const result = await getUserEnvironmentalProfile(invalidRuns);
      
      expect(result.profile.totalRunsAnalyzed).toBe(0);
      expect(result.recommendations[0]).toContain('Need at least');
    });

    it('should provide meaningful insights even with limited data', async () => {
      const runs = createRunsWithWeatherVariation(12);
      const result = await getUserEnvironmentalProfile(runs);
      const summary = getEnvironmentalPerformanceSummary(result.profile);
      
      expect(summary.dataQuality.level).toBe('low');
      expect(summary.dataQuality.description).toContain('Need more weather data');
      expect(summary.heatTolerance.description).toBeTruthy();
      expect(summary.coldAdaptation.description).toBeTruthy();
    });
  });
});