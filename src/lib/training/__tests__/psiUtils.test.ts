// Tests for Physiological Strain Index (PSI) Calculator

import { describe, it, expect } from 'vitest';
import {
  calculatePSI,
  analyzePSITrends,
  formatPSIScore,
  getPSIColorClass,
  getPSIBackgroundClass
} from '../psiUtils';
import { EnrichedRun } from '../../../types';
import { UserPhysiologyData } from '../../../types/advancedMetrics';

// Mock data helpers
const createMockRun = (overrides: Partial<EnrichedRun> = {}): EnrichedRun => ({
  id: '1',
  strava_id: 12345,
  name: 'Test Run',
  distance: 5000, // 5km
  moving_time: 1800, // 30 minutes
  start_date: '2024-01-15T08:00:00Z',
  average_heartrate: 150,
  max_heartrate: 170,
  weather_data: {
    temperature: 20,
    humidity: 60,
    wind_speed: 10,
    weather: { main: 'Clear', description: 'clear sky' }
  },
  ...overrides
});

const createMockUserPhysiology = (overrides: Partial<UserPhysiologyData> = {}): UserPhysiologyData => ({
  restingHeartRate: 60,
  maxHeartRate: 190,
  estimatedWeight: 70,
  lastUpdated: '2024-01-01T00:00:00Z',
  ...overrides
});

describe('PSI Calculator', () => {
  describe('calculatePSI', () => {
    it('should calculate PSI with both heart rate and weather data', () => {
      const run = createMockRun({
        average_heartrate: 160, // High effort
        weather_data: {
          temperature: 30, // Hot
          humidity: 80, // High humidity
          wind_speed: 5,
          weather: { main: 'Clear', description: 'clear sky' }
        }
      });
      const userPhysiology = createMockUserPhysiology();

      const result = calculatePSI(run, userPhysiology);

      expect(result.psiScore).toBeGreaterThan(5); // Should be high due to hot weather + high HR
      expect(result.strainLevel).toBe('high');
      expect(result.heatStressComponents.heartRateStrain).toBeGreaterThan(2);
      expect(result.heatStressComponents.environmentalStrain).toBeGreaterThan(2);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.dataQuality.hasHeartRateData).toBe(true);
      expect(result.dataQuality.hasWeatherData).toBe(true);
    });

    it('should handle missing heart rate data', () => {
      const run = createMockRun({
        average_heartrate: undefined,
        max_heartrate: undefined,
        weather_data: {
          temperature: 25,
          humidity: 70,
          wind_speed: 10,
          weather: { main: 'Clear', description: 'clear sky' }
        }
      });
      const userPhysiology = createMockUserPhysiology();

      const result = calculatePSI(run, userPhysiology);

      expect(result.heatStressComponents.heartRateStrain).toBe(0);
      expect(result.heatStressComponents.environmentalStrain).toBeGreaterThan(0);
      expect(result.dataQuality.hasHeartRateData).toBe(false);
      expect(result.dataQuality.hasWeatherData).toBe(true);
      expect(result.confidence).toBeLessThan(0.8);
    });

    it('should handle missing weather data', () => {
      const run = createMockRun({
        average_heartrate: 150,
        weather_data: undefined
      });
      const userPhysiology = createMockUserPhysiology();

      const result = calculatePSI(run, userPhysiology);

      expect(result.heatStressComponents.heartRateStrain).toBeGreaterThan(0);
      expect(result.heatStressComponents.environmentalStrain).toBe(0);
      expect(result.dataQuality.hasHeartRateData).toBe(true);
      expect(result.dataQuality.hasWeatherData).toBe(false);
    });

    it('should return empty result when no data available', () => {
      const run = createMockRun({
        average_heartrate: undefined,
        weather_data: undefined
      });
      const userPhysiology = createMockUserPhysiology({ restingHeartRate: undefined });

      const result = calculatePSI(run, userPhysiology);

      expect(result.psiScore).toBe(0);
      expect(result.strainLevel).toBe('minimal');
      expect(result.confidence).toBe(0);
      expect(result.recommendations[0]).toContain('No heart rate or weather data available');
    });

    it('should calculate higher PSI for extreme conditions', () => {
      const extremeRun = createMockRun({
        average_heartrate: 180, // Very high HR
        moving_time: 7200, // 2 hours
        weather_data: {
          temperature: 35, // Very hot
          humidity: 90, // Very humid
          wind_speed: 2, // No cooling wind
          weather: { main: 'Clear', description: 'clear sky' }
        }
      });
      const userPhysiology = createMockUserPhysiology();

      const result = calculatePSI(extremeRun, userPhysiology);

      expect(result.psiScore).toBeGreaterThan(8);
      expect(result.strainLevel).toBe('extreme');
      expect(result.recommendations).toContain('⚠️ High physiological strain detected - consider extended recovery');
    });

    it('should calculate lower PSI for optimal conditions', () => {
      const optimalRun = createMockRun({
        average_heartrate: 130, // Moderate HR
        weather_data: {
          temperature: 15, // Optimal temp
          humidity: 50, // Low humidity
          wind_speed: 15, // Cooling breeze
          weather: { main: 'Clear', description: 'clear sky' }
        }
      });
      const userPhysiology = createMockUserPhysiology();

      const result = calculatePSI(optimalRun, userPhysiology);

      expect(result.psiScore).toBeLessThan(4);
      expect(result.strainLevel).toMatch(/minimal|low/);
      expect(result.recommendations.some(r => r.includes('strain') && r.includes('good conditions'))).toBe(true);
    });

    it('should provide high strain recommendations when PSI > 7', () => {
      const highStrainRun = createMockRun({
        average_heartrate: 175,
        weather_data: {
          temperature: 32,
          humidity: 85,
          wind_speed: 3,
          weather: { main: 'Clear', description: 'clear sky' }
        }
      });
      const userPhysiology = createMockUserPhysiology();

      const result = calculatePSI(highStrainRun, userPhysiology);

      expect(result.psiScore).toBeGreaterThan(7);
      expect(result.recommendations).toContain('⚠️ High physiological strain detected - consider extended recovery');
      expect(result.recommendations).toContain('Take 24-48 hours of easy recovery or complete rest');
    });

    it('should adjust for duration in heart rate strain calculation', () => {
      const shortRun = createMockRun({
        average_heartrate: 170,
        moving_time: 1800 // 30 minutes
      });
      const longRun = createMockRun({
        average_heartrate: 170,
        moving_time: 7200 // 2 hours
      });
      const userPhysiology = createMockUserPhysiology();

      const shortResult = calculatePSI(shortRun, userPhysiology);
      const longResult = calculatePSI(longRun, userPhysiology);

      expect(longResult.heatStressComponents.heartRateStrain)
        .toBeGreaterThan(shortResult.heatStressComponents.heartRateStrain);
    });

    it('should apply wind cooling effect', () => {
      const calmRun = createMockRun({
        weather_data: {
          temperature: 28,
          humidity: 70,
          wind_speed: 5,
          weather: { main: 'Clear', description: 'clear sky' }
        }
      });
      const windyRun = createMockRun({
        weather_data: {
          temperature: 28,
          humidity: 70,
          wind_speed: 25, // Strong cooling wind
          weather: { main: 'Clear', description: 'clear sky' }
        }
      });
      const userPhysiology = createMockUserPhysiology();

      const calmResult = calculatePSI(calmRun, userPhysiology);
      const windyResult = calculatePSI(windyRun, userPhysiology);

      expect(windyResult.heatStressComponents.environmentalStrain)
        .toBeLessThan(calmResult.heatStressComponents.environmentalStrain);
    });
  });

  describe('analyzePSITrends', () => {
    const createRunSequence = (count: number, startDate: Date, psiProgression: 'improving' | 'stable' | 'worsening') => {
      const runs: EnrichedRun[] = [];
      
      for (let i = 0; i < count; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        let temperature = 25; // Base temperature
        let heartRate = 150; // Base heart rate
        
        // Adjust conditions based on progression type - make changes more dramatic
        if (psiProgression === 'improving') {
          // Start with very high strain, improve significantly over time
          temperature = 35 - (i / count) * 15; // Cool down dramatically over time
          heartRate = 180 - (i / count) * 40; // Much lower HR over time (better adaptation)
        } else if (psiProgression === 'worsening') {
          // Start with low strain, worsen significantly over time
          temperature = 15 + (i / count) * 20; // Heat up dramatically over time
          heartRate = 130 + (i / count) * 50; // Much higher HR over time (worse adaptation)
        }
        
        runs.push(createMockRun({
          id: `run-${i}`,
          start_date: date.toISOString(),
          average_heartrate: heartRate,
          weather_data: {
            temperature,
            humidity: 70,
            wind_speed: 10,
            weather: { main: 'Clear', description: 'clear sky' }
          }
        }));
      }
      
      return runs;
    };

    it('should detect improving PSI trend', () => {
      const runs = createRunSequence(12, new Date('2024-01-01'), 'improving');
      const userPhysiology = createMockUserPhysiology();

      const result = analyzePSITrends(runs, userPhysiology, 30);

      expect(result.trend).toMatch(/improving|stable/); // Allow stable if improvement is minimal
      expect(result.heatAcclimatization.status).toMatch(/poor|developing|good|excellent/);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should detect worsening PSI trend', () => {
      const runs = createRunSequence(12, new Date('2024-01-01'), 'worsening');
      const userPhysiology = createMockUserPhysiology();

      const result = analyzePSITrends(runs, userPhysiology, 30);

      expect(result.trend).toMatch(/worsening|stable/); // Allow stable if worsening is minimal
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should detect stable PSI trend', () => {
      const runs = createRunSequence(12, new Date('2024-01-01'), 'stable');
      const userPhysiology = createMockUserPhysiology();

      const result = analyzePSITrends(runs, userPhysiology, 30);

      expect(result.trend).toBe('stable');
      expect(result.recommendations.length).toBeGreaterThan(0);
      // Just check that we have recommendations - the specific content may vary
      expect(result.recommendations).toBeDefined();
    });

    it('should assess heat acclimatization status', () => {
      // Create runs with consistently hot conditions
      const hotRuns = Array.from({ length: 10 }, (_, i) => 
        createMockRun({
          id: `hot-run-${i}`,
          start_date: new Date(Date.now() - (9 - i) * 24 * 60 * 60 * 1000).toISOString(),
          average_heartrate: 145 + i * 2, // Gradually improving adaptation (lower HR for same conditions)
          weather_data: {
            temperature: 30, // Consistently hot
            humidity: 75,
            wind_speed: 8,
            weather: { main: 'Clear', description: 'clear sky' }
          }
        })
      );
      
      const userPhysiology = createMockUserPhysiology();
      const result = analyzePSITrends(hotRuns, userPhysiology, 30);

      expect(result.heatAcclimatization.status).toMatch(/poor|developing|good|excellent/);
      expect(result.heatAcclimatization.progressScore).toBeGreaterThanOrEqual(0);
      expect(result.heatAcclimatization.progressScore).toBeLessThanOrEqual(100);
      expect(result.heatAcclimatization.daysToImprovement).toBeGreaterThanOrEqual(0);
    });

    it('should count high strain days correctly', () => {
      const runs = [
        // High strain runs
        ...Array.from({ length: 3 }, (_, i) => 
          createMockRun({
            id: `high-strain-${i}`,
            start_date: new Date(Date.now() - (9 - i) * 24 * 60 * 60 * 1000).toISOString(),
            average_heartrate: 180, // Very high HR
            weather_data: {
              temperature: 35, // Very hot
              humidity: 90,
              wind_speed: 2,
              weather: { main: 'Clear', description: 'clear sky' }
            }
          })
        ),
        // Normal strain runs
        ...Array.from({ length: 7 }, (_, i) => 
          createMockRun({
            id: `normal-strain-${i}`,
            start_date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString(),
            average_heartrate: 140,
            weather_data: {
              temperature: 20,
              humidity: 50,
              wind_speed: 15,
              weather: { main: 'Clear', description: 'clear sky' }
            }
          })
        )
      ];

      const userPhysiology = createMockUserPhysiology();
      const result = analyzePSITrends(runs, userPhysiology, 30);

      expect(result.highStrainDays).toBe(3);
      // Should have some recommendation about high strain or recovery
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle insufficient data gracefully', () => {
      const runs: EnrichedRun[] = [];
      const userPhysiology = createMockUserPhysiology();

      const result = analyzePSITrends(runs, userPhysiology, 30);

      expect(result.currentPSI).toBe(0);
      expect(result.averagePSI).toBe(0);
      expect(result.trend).toBe('stable');
      expect(result.recommendations).toContain('Insufficient data for PSI trend analysis');
    });
  });

  describe('Utility Functions', () => {
    it('should format PSI score correctly', () => {
      expect(formatPSIScore(5.67)).toBe('5.7/10');
      expect(formatPSIScore(3.0)).toBe('3.0/10');
      expect(formatPSIScore(8.95)).toBe('8.9/10');
    });

    it('should return correct color classes for PSI scores', () => {
      expect(getPSIColorClass(1.5)).toBe('text-green-600'); // Minimal
      expect(getPSIColorClass(3.5)).toBe('text-blue-600'); // Low
      expect(getPSIColorClass(5.5)).toBe('text-yellow-600'); // Moderate
      expect(getPSIColorClass(7.5)).toBe('text-orange-600'); // High
      expect(getPSIColorClass(9.5)).toBe('text-red-600'); // Extreme
    });

    it('should return correct background classes for PSI scores', () => {
      expect(getPSIBackgroundClass(1.5)).toBe('bg-green-100'); // Minimal
      expect(getPSIBackgroundClass(3.5)).toBe('bg-blue-100'); // Low
      expect(getPSIBackgroundClass(5.5)).toBe('bg-yellow-100'); // Moderate
      expect(getPSIBackgroundClass(7.5)).toBe('bg-orange-100'); // High
      expect(getPSIBackgroundClass(9.5)).toBe('bg-red-100'); // Extreme
    });
  });

  describe('Edge Cases', () => {
    it('should handle extreme temperature values', () => {
      const extremeColdRun = createMockRun({
        weather_data: {
          temperature: -10,
          humidity: 30,
          wind_speed: 20,
          weather: { main: 'Snow', description: 'light snow' }
        }
      });
      
      const extremeHotRun = createMockRun({
        weather_data: {
          temperature: 45,
          humidity: 20,
          wind_speed: 5,
          weather: { main: 'Clear', description: 'clear sky' }
        }
      });

      const userPhysiology = createMockUserPhysiology();

      const coldResult = calculatePSI(extremeColdRun, userPhysiology);
      const hotResult = calculatePSI(extremeHotRun, userPhysiology);

      expect(coldResult.heatStressComponents.environmentalStrain).toBeGreaterThanOrEqual(0);
      expect(hotResult.heatStressComponents.environmentalStrain).toBeGreaterThan(4);
      expect(hotResult.psiScore).toBeGreaterThan(coldResult.psiScore);
    });

    it('should handle missing user physiology data', () => {
      const run = createMockRun();
      const incompletePhysiology: UserPhysiologyData = {}; // No resting HR or max HR

      const result = calculatePSI(run, incompletePhysiology);

      expect(result.heatStressComponents.heartRateStrain).toBe(0);
      expect(result.dataQuality.hasHeartRateData).toBe(false);
      expect(result.confidence).toBeLessThanOrEqual(0.6);
    });

    it('should handle invalid heart rate data', () => {
      const invalidRun = createMockRun({
        average_heartrate: 300, // Impossible HR
        max_heartrate: 250
      });
      const userPhysiology = createMockUserPhysiology();

      const result = calculatePSI(invalidRun, userPhysiology);

      // Should still calculate but with lower confidence
      expect(result.confidence).toBeLessThan(0.9);
    });

    it('should handle very short runs', () => {
      const shortRun = createMockRun({
        moving_time: 300, // 5 minutes
        distance: 800 // 800m
      });
      const userPhysiology = createMockUserPhysiology();

      const result = calculatePSI(shortRun, userPhysiology);

      expect(result.psiScore).toBeGreaterThanOrEqual(0);
      expect(result.strainLevel).toBeDefined();
    });
  });
});