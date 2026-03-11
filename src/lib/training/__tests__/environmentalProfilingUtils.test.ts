// Environmental Performance Profiling System Tests
import {
  buildEnvironmentalProfile,
  identifyWeatherPerformancePatterns,
  getEnvironmentalRecommendations,
  exportEnvironmentalProfileData,
  EnvironmentalProfile,
  TemperaturePerformanceData,
  HumidityPerformanceData,
  WindPerformanceData,
  AcclimatizationData
} from '../environmentalProfilingUtils';
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
    
    // Create varied weather conditions
    const temperature = 5 + (i % 30); // Range from 5°C to 35°C
    const humidity = 30 + (i % 60); // Range from 30% to 90%
    const windSpeed = i % 25; // Range from 0 to 25 km/h
    
    // Simulate performance variation based on conditions
    let basePace = 300; // 5:00/km in seconds
    
    // Temperature impact
    if (temperature > 25) basePace += (temperature - 25) * 2;
    if (temperature < 10) basePace += (10 - temperature) * 1;
    
    // Humidity impact
    if (humidity > 70) basePace += (humidity - 70) * 0.5;
    
    // Wind impact
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

describe('Environmental Performance Profiling System', () => {
  describe('buildEnvironmentalProfile', () => {
    it('should create minimal profile with insufficient data', () => {
      const runs = createRunsWithWeatherVariation(5); // Less than 10 runs
      const profile = buildEnvironmentalProfile(runs);
      
      expect(profile.dataQuality).toBe('low');
      expect(profile.totalRunsAnalyzed).toBe(5);
      expect(profile.heatTolerance.level).toBe('medium');
      expect(profile.coldAdaptation.level).toBe('medium');
      expect(profile.performanceByTemperature).toHaveLength(0);
    });

    it('should build comprehensive profile with sufficient data', () => {
      const runs = createRunsWithWeatherVariation(50);
      const profile = buildEnvironmentalProfile(runs);
      
      expect(profile.dataQuality).toBe('high');
      expect(profile.totalRunsAnalyzed).toBe(50);
      expect(profile.performanceByTemperature.length).toBeGreaterThan(0);
      expect(profile.performanceByHumidity.length).toBeGreaterThan(0);
      expect(profile.performanceByWind.length).toBeGreaterThan(0);
      
      // Check that optimal conditions are identified
      expect(profile.optimalConditions.temperatureRange.min).toBeGreaterThan(0);
      expect(profile.optimalConditions.temperatureRange.max).toBeGreaterThan(profile.optimalConditions.temperatureRange.min);
      expect(profile.optimalConditions.confidenceScore).toBeGreaterThan(0);
    });

    it('should handle runs without weather data', () => {
      const runsWithoutWeather = [
        createMockRun({ weather_data: undefined }),
        createMockRun({ weather_data: undefined })
      ];
      
      const profile = buildEnvironmentalProfile(runsWithoutWeather);
      
      expect(profile.totalRunsAnalyzed).toBe(0);
      expect(profile.dataQuality).toBe('low');
    });

    it('should calculate heat tolerance correctly', () => {
      const runs = createRunsWithWeatherVariation(30);
      const profile = buildEnvironmentalProfile(runs);
      
      expect(profile.heatTolerance.level).toMatch(/^(low|medium|high)$/);
      expect(profile.heatTolerance.optimalTemperature).toBeGreaterThan(0);
      expect(profile.heatTolerance.maxComfortableTemp).toBeGreaterThan(profile.heatTolerance.optimalTemperature);
      expect(profile.heatTolerance.heatAdaptationScore).toBeGreaterThanOrEqual(0);
      expect(profile.heatTolerance.heatAdaptationScore).toBeLessThanOrEqual(100);
    });

    it('should calculate cold adaptation correctly', () => {
      const runs = createRunsWithWeatherVariation(30);
      const profile = buildEnvironmentalProfile(runs);
      
      expect(profile.coldAdaptation.level).toMatch(/^(low|medium|high)$/);
      expect(profile.coldAdaptation.minComfortableTemp).toBeLessThan(profile.heatTolerance.optimalTemperature);
      expect(profile.coldAdaptation.coldAdaptationScore).toBeGreaterThanOrEqual(0);
      expect(profile.coldAdaptation.coldAdaptationScore).toBeLessThanOrEqual(100);
    });

    it('should track acclimatization progress', () => {
      const runs = createRunsWithWeatherVariation(40);
      const profile = buildEnvironmentalProfile(runs);
      
      expect(profile.acclimatization.heatAcclimatization.currentLevel).toBeGreaterThanOrEqual(0);
      expect(profile.acclimatization.heatAcclimatization.currentLevel).toBeLessThanOrEqual(100);
      expect(profile.acclimatization.heatAcclimatization.trend).toMatch(/^(improving|stable|declining)$/);
      
      expect(profile.acclimatization.coldAcclimatization.currentLevel).toBeGreaterThanOrEqual(0);
      expect(profile.acclimatization.coldAcclimatization.currentLevel).toBeLessThanOrEqual(100);
      expect(profile.acclimatization.coldAcclimatization.trend).toMatch(/^(improving|stable|declining)$/);
    });
  });

  describe('Temperature Performance Analysis', () => {
    it('should categorize temperature ranges correctly', () => {
      const runs = createRunsWithWeatherVariation(35);
      const profile = buildEnvironmentalProfile(runs);
      
      const tempData = profile.performanceByTemperature;
      expect(tempData.length).toBeGreaterThan(0);
      
      // Check that temperature ranges are properly ordered
      for (let i = 1; i < tempData.length; i++) {
        expect(tempData[i].minTemp).toBeGreaterThanOrEqual(tempData[i - 1].minTemp);
      }
      
      // Check that performance indices are calculated
      tempData.forEach(data => {
        expect(data.performanceIndex).toBeGreaterThanOrEqual(0);
        expect(data.performanceIndex).toBeLessThanOrEqual(100);
        expect(data.runCount).toBeGreaterThan(0);
        expect(data.confidenceLevel).toBeGreaterThan(0);
        expect(data.confidenceLevel).toBeLessThanOrEqual(1);
      });
    });

    it('should identify optimal temperature range', () => {
      const runs = createRunsWithWeatherVariation(30);
      const profile = buildEnvironmentalProfile(runs);
      
      const bestTempData = profile.performanceByTemperature.reduce((best, current) => 
        current.performanceIndex > best.performanceIndex ? current : best
      );
      
      expect(bestTempData.performanceIndex).toBeGreaterThan(0);
      expect(profile.optimalConditions.temperatureRange.min).toBe(bestTempData.minTemp);
      expect(profile.optimalConditions.temperatureRange.max).toBe(bestTempData.maxTemp);
    });
  });

  describe('Humidity Performance Analysis', () => {
    it('should categorize humidity ranges correctly', () => {
      const runs = createRunsWithWeatherVariation(35);
      const profile = buildEnvironmentalProfile(runs);
      
      const humidityData = profile.performanceByHumidity;
      expect(humidityData.length).toBeGreaterThan(0);
      
      // Check that humidity ranges are properly ordered
      for (let i = 1; i < humidityData.length; i++) {
        expect(humidityData[i].minHumidity).toBeGreaterThanOrEqual(humidityData[i - 1].minHumidity);
      }
      
      // Check performance calculations
      humidityData.forEach(data => {
        expect(data.performanceIndex).toBeGreaterThanOrEqual(0);
        expect(data.performanceIndex).toBeLessThanOrEqual(100);
        expect(data.runCount).toBeGreaterThan(0);
      });
    });
  });

  describe('Wind Performance Analysis', () => {
    it('should categorize wind ranges correctly', () => {
      const runs = createRunsWithWeatherVariation(35);
      const profile = buildEnvironmentalProfile(runs);
      
      const windData = profile.performanceByWind;
      expect(windData.length).toBeGreaterThan(0);
      
      // Check that wind ranges are properly ordered
      for (let i = 1; i < windData.length; i++) {
        expect(windData[i].minWindSpeed).toBeGreaterThanOrEqual(windData[i - 1].minWindSpeed);
      }
      
      // Check performance calculations
      windData.forEach(data => {
        expect(data.performanceIndex).toBeGreaterThanOrEqual(0);
        expect(data.performanceIndex).toBeLessThanOrEqual(100);
        expect(data.runCount).toBeGreaterThan(0);
      });
    });
  });

  describe('identifyWeatherPerformancePatterns', () => {
    it('should identify temperature patterns', () => {
      const runs = createRunsWithWeatherVariation(30);
      const profile = buildEnvironmentalProfile(runs);
      const patterns = identifyWeatherPerformancePatterns(profile);
      
      expect(patterns.length).toBeGreaterThan(0);
      
      const tempPattern = patterns.find(p => p.conditionType === 'temperature');
      if (tempPattern) {
        expect(tempPattern.pattern).toBeTruthy();
        expect(tempPattern.strength).toMatch(/^(weak|moderate|strong)$/);
        expect(tempPattern.confidence).toBeGreaterThanOrEqual(0);
        expect(tempPattern.confidence).toBeLessThanOrEqual(1);
        expect(tempPattern.recommendation).toBeTruthy();
      }
    });

    it('should identify humidity patterns', () => {
      const runs = createRunsWithWeatherVariation(30);
      const profile = buildEnvironmentalProfile(runs);
      const patterns = identifyWeatherPerformancePatterns(profile);
      
      const humidityPattern = patterns.find(p => p.conditionType === 'humidity');
      if (humidityPattern) {
        expect(humidityPattern.pattern).toBeTruthy();
        expect(humidityPattern.strength).toMatch(/^(weak|moderate|strong)$/);
        expect(humidityPattern.recommendation).toBeTruthy();
      }
    });

    it('should identify combined patterns', () => {
      const runs = createRunsWithWeatherVariation(30);
      const profile = buildEnvironmentalProfile(runs);
      const patterns = identifyWeatherPerformancePatterns(profile);
      
      const combinedPattern = patterns.find(p => p.conditionType === 'combined');
      expect(combinedPattern).toBeTruthy();
      if (combinedPattern) {
        expect(combinedPattern.pattern).toContain('Optimal conditions');
        expect(combinedPattern.recommendation).toBeTruthy();
      }
    });
  });

  describe('getEnvironmentalRecommendations', () => {
    let profile: EnvironmentalProfile;

    beforeEach(() => {
      const runs = createRunsWithWeatherVariation(30);
      profile = buildEnvironmentalProfile(runs);
    });

    it('should provide excellent rating for optimal conditions', () => {
      const currentConditions = {
        temperature: (profile.optimalConditions.temperatureRange.min + profile.optimalConditions.temperatureRange.max) / 2,
        humidity: (profile.optimalConditions.humidityRange.min + profile.optimalConditions.humidityRange.max) / 2,
        windSpeed: profile.optimalConditions.windSpeedMax - 2
      };
      
      const recommendations = getEnvironmentalRecommendations(profile, currentConditions);
      
      expect(recommendations.overallRating).toBe('excellent');
      expect(recommendations.specificAdvice.length).toBeGreaterThan(0);
    });

    it('should provide challenging rating for poor conditions', () => {
      const currentConditions = {
        temperature: profile.heatTolerance.maxComfortableTemp + 10,
        humidity: 90,
        windSpeed: profile.optimalConditions.windSpeedMax + 10
      };
      
      const recommendations = getEnvironmentalRecommendations(profile, currentConditions);
      
      expect(recommendations.overallRating).toBe('challenging');
      expect(recommendations.paceAdjustment).toContain('slowing pace');
      expect(recommendations.hydrationAdvice).toContain('fluid intake');
      expect(recommendations.specificAdvice.length).toBeGreaterThan(0);
    });

    it('should provide cold weather advice', () => {
      const currentConditions = {
        temperature: profile.coldAdaptation.minComfortableTemp - 5,
        humidity: 50,
        windSpeed: 10
      };
      
      const recommendations = getEnvironmentalRecommendations(profile, currentConditions);
      
      expect(recommendations.clothingAdvice).toContain('Layer');
      expect(recommendations.specificAdvice.some(advice => 
        advice.includes('warm-up') || advice.includes('extremities')
      )).toBe(true);
    });

    it('should provide hot weather advice', () => {
      const currentConditions = {
        temperature: profile.heatTolerance.maxComfortableTemp + 8,
        humidity: 80,
        windSpeed: 5
      };
      
      const recommendations = getEnvironmentalRecommendations(profile, currentConditions);
      
      expect(recommendations.paceAdjustment).toContain('slowing pace');
      expect(recommendations.hydrationAdvice).toContain('fluid intake');
      expect(recommendations.clothingAdvice).toContain('Light-colored');
      expect(recommendations.specificAdvice.some(advice => 
        advice.includes('early morning') || advice.includes('shaded')
      )).toBe(true);
    });

    it('should provide high humidity advice', () => {
      const currentConditions = {
        temperature: 20,
        humidity: 85,
        windSpeed: 8
      };
      
      const recommendations = getEnvironmentalRecommendations(profile, currentConditions);
      
      expect(recommendations.hydrationAdvice).toContain('humidity');
      expect(recommendations.specificAdvice.some(advice => 
        advice.includes('cooling')
      )).toBe(true);
    });

    it('should provide windy conditions advice', () => {
      const currentConditions = {
        temperature: 18,
        humidity: 55,
        windSpeed: profile.optimalConditions.windSpeedMax + 8
      };
      
      const recommendations = getEnvironmentalRecommendations(profile, currentConditions);
      
      expect(recommendations.specificAdvice.some(advice => 
        advice.includes('wind')
      )).toBe(true);
    });
  });

  describe('Acclimatization Tracking', () => {
    it('should track heat acclimatization progress', () => {
      // Create runs with increasing heat tolerance over time
      const runs: EnrichedRun[] = [];
      const baseDate = new Date('2024-01-01');
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);
        
        // Simulate improving performance in heat over time
        const temperature = 28; // Hot conditions
        let basePace = 320; // Start slower in heat
        
        // Simulate gradual improvement (acclimatization)
        basePace -= i * 0.5; // Gradual improvement
        
        runs.push(createMockRun({
          start_date: date.toISOString(),
          moving_time: 5000 / 1000 * basePace,
          weather_data: {
            temperature,
            humidity: 70,
            wind_speed: 8,
            weather: { main: 'Clear', description: 'clear sky' }
          }
        }));
      }
      
      const profile = buildEnvironmentalProfile(runs);
      
      expect(profile.acclimatization.heatAcclimatization.currentLevel).toBeGreaterThan(0);
      expect(profile.acclimatization.heatAcclimatization.progressHistory.length).toBeGreaterThan(0);
      
      // Check that progress history is properly formatted
      profile.acclimatization.heatAcclimatization.progressHistory.forEach(progress => {
        expect(progress.date).toBeTruthy();
        expect(progress.level).toBeGreaterThanOrEqual(0);
        expect(progress.level).toBeLessThanOrEqual(100);
        expect(progress.triggerConditions.temperature).toBeGreaterThan(0);
      });
    });

    it('should track cold acclimatization progress', () => {
      // Create runs with cold conditions
      const runs: EnrichedRun[] = [];
      const baseDate = new Date('2024-01-01');
      
      for (let i = 0; i < 25; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);
        
        const temperature = 5; // Cold conditions
        let basePace = 310; // Start slower in cold
        basePace -= i * 0.3; // Gradual improvement
        
        runs.push(createMockRun({
          start_date: date.toISOString(),
          moving_time: 5000 / 1000 * basePace,
          weather_data: {
            temperature,
            humidity: 60,
            wind_speed: 12,
            weather: { main: 'Clear', description: 'clear sky' }
          }
        }));
      }
      
      const profile = buildEnvironmentalProfile(runs);
      
      expect(profile.acclimatization.coldAcclimatization.currentLevel).toBeGreaterThan(0);
      expect(profile.acclimatization.coldAcclimatization.progressHistory.length).toBeGreaterThan(0);
    });
  });

  describe('Data Quality Assessment', () => {
    it('should assess high data quality correctly', () => {
      const runs = createRunsWithWeatherVariation(60);
      const profile = buildEnvironmentalProfile(runs);
      
      expect(profile.dataQuality).toBe('high');
      expect(profile.totalRunsAnalyzed).toBe(60);
    });

    it('should assess medium data quality correctly', () => {
      const runs = createRunsWithWeatherVariation(25);
      const profile = buildEnvironmentalProfile(runs);
      
      expect(profile.dataQuality).toBe('medium');
      expect(profile.totalRunsAnalyzed).toBe(25);
    });

    it('should assess low data quality correctly', () => {
      const runs = createRunsWithWeatherVariation(15);
      const profile = buildEnvironmentalProfile(runs);
      
      expect(profile.dataQuality).toBe('low');
      expect(profile.totalRunsAnalyzed).toBe(15);
    });
  });

  describe('exportEnvironmentalProfileData', () => {
    it('should export profile data as valid JSON', () => {
      const runs = createRunsWithWeatherVariation(30);
      const profile = buildEnvironmentalProfile(runs);
      const exportedData = exportEnvironmentalProfileData(profile);
      
      expect(() => JSON.parse(exportedData)).not.toThrow();
      
      const parsedData = JSON.parse(exportedData);
      expect(parsedData.summary).toBeTruthy();
      expect(parsedData.optimalConditions).toBeTruthy();
      expect(parsedData.temperaturePerformance).toBeTruthy();
      expect(parsedData.humidityPerformance).toBeTruthy();
      expect(parsedData.windPerformance).toBeTruthy();
      expect(parsedData.acclimatization).toBeTruthy();
    });

    it('should include all necessary data fields', () => {
      const runs = createRunsWithWeatherVariation(25);
      const profile = buildEnvironmentalProfile(runs);
      const exportedData = exportEnvironmentalProfileData(profile);
      const parsedData = JSON.parse(exportedData);
      
      // Check summary data
      expect(parsedData.summary.totalRuns).toBe(25);
      expect(parsedData.summary.dataQuality).toBe('medium');
      expect(parsedData.summary.heatTolerance).toMatch(/^(low|medium|high)$/);
      expect(parsedData.summary.coldAdaptation).toMatch(/^(low|medium|high)$/);
      
      // Check that performance data is included
      expect(Array.isArray(parsedData.temperaturePerformance)).toBe(true);
      expect(Array.isArray(parsedData.humidityPerformance)).toBe(true);
      expect(Array.isArray(parsedData.windPerformance)).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty run array', () => {
      const profile = buildEnvironmentalProfile([]);
      
      expect(profile.totalRunsAnalyzed).toBe(0);
      expect(profile.dataQuality).toBe('low');
      expect(profile.performanceByTemperature).toHaveLength(0);
    });

    it('should handle runs with invalid weather data', () => {
      const invalidRuns = [
        createMockRun({ weather_data: { temperature: null, humidity: 50, wind_speed: 10 } as any }),
        createMockRun({ weather_data: { temperature: 20, humidity: null, wind_speed: 10 } as any }),
        createMockRun({ weather_data: { temperature: 20, humidity: 50, wind_speed: null } as any })
      ];
      
      const profile = buildEnvironmentalProfile(invalidRuns);
      
      expect(profile.totalRunsAnalyzed).toBe(0);
      expect(profile.dataQuality).toBe('low');
    });

    it('should handle extreme weather values gracefully', () => {
      const extremeRuns = [
        createMockRun({ weather_data: { temperature: -30, humidity: 10, wind_speed: 5 } }),
        createMockRun({ weather_data: { temperature: 50, humidity: 95, wind_speed: 60 } }),
        createMockRun({ weather_data: { temperature: 20, humidity: 50, wind_speed: 10 } })
      ];
      
      const profile = buildEnvironmentalProfile(extremeRuns);
      
      expect(profile.totalRunsAnalyzed).toBe(3);
      // Should still create a profile but with lower confidence
      expect(profile.optimalConditions.confidenceScore).toBeLessThan(0.8);
    });

    it('should handle single temperature/humidity/wind range', () => {
      // All runs in same conditions
      const sameConditionRuns = Array(15).fill(null).map(() => 
        createMockRun({
          weather_data: { temperature: 20, humidity: 60, wind_speed: 10 }
        })
      );
      
      const profile = buildEnvironmentalProfile(sameConditionRuns);
      
      expect(profile.totalRunsAnalyzed).toBe(15);
      expect(profile.performanceByTemperature.length).toBe(1);
      expect(profile.performanceByHumidity.length).toBe(1);
      expect(profile.performanceByWind.length).toBe(1);
    });
  });
});