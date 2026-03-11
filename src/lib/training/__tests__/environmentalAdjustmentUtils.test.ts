// Unit tests for Environmental Performance Adjustment System
import {
  calculateAdjustedPace,
  calculateAdjustedPacesForRuns,
  compareEnvironmentalPerformance,
  formatPace,
  formatAdjustment,
  getEnvironmentalImpactSummary
} from '../environmentalAdjustmentUtils';
import { EnrichedRun } from '../../../types';

// Mock run data helper
const createMockRun = (overrides: Partial<EnrichedRun> = {}): EnrichedRun => ({
  id: `test-run-${Math.random()}`,
  user_id: 'test-user',
  strava_id: Math.floor(Math.random() * 100000),
  name: 'Test Run',
  distance: 5000,
  moving_time: 1800, // 30 minutes = 6:00/km pace
  elapsed_time: 1900,
  start_date: '2025-08-12T06:00:00Z',
  start_date_local: '2025-08-12T06:00:00Z',
  average_speed: 2.78, // ~6:00/km pace
  average_heartrate: 150,
  max_heartrate: 165,
  total_elevation_gain: 50,
  weather_data: {
    temperature: 20,
    humidity: 60,
    wind_speed: 10,
    weather: {
      main: 'Clear',
      description: 'clear sky'
    }
  },
  strava_data: null,
  created_at: '2025-08-12T06:00:00Z',
  updated_at: '2025-08-12T06:00:00Z',
  ...overrides
});

describe('Environmental Performance Adjustment System', () => {
  describe('calculateAdjustedPace', () => {
    it('should return original pace when no weather data is available', () => {
      const run = createMockRun({
        weather_data: null
      });

      const result = calculateAdjustedPace(run);

      expect(result.originalPace).toBe(360); // 6:00/km
      expect(result.adjustedPace).toBe(360);
      expect(result.adjustments.totalAdjustment).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.explanation[0]).toContain('No weather data available');
    });

    it('should calculate adjusted pace with ideal conditions', () => {
      const run = createMockRun({
        weather_data: {
          temperature: 15, // Ideal
          humidity: 50,    // Ideal
          wind_speed: 5,   // Calm
          weather: { main: 'Clear', description: 'clear' }
        }
      });

      const result = calculateAdjustedPace(run);

      expect(result.originalPace).toBe(360); // 6:00/km
      expect(Math.abs(result.adjustments.totalAdjustment)).toBeLessThan(1); // Minimal adjustment
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.explanation.some(exp => exp.includes('Ideal conditions'))).toBe(true);
    });

    it('should apply temperature adjustments for hot weather', () => {
      const hotRun = createMockRun({
        weather_data: {
          temperature: 30, // 10°C above optimal (20°C)
          humidity: 50,
          wind_speed: 5,
          weather: { main: 'Clear', description: 'hot' }
        }
      });

      const result = calculateAdjustedPace(hotRun);

      expect(result.adjustments.temperatureAdjustment).toBeGreaterThan(0);
      expect(result.adjustments.temperatureAdjustment).toBeCloseTo(25, 1); // 10°C * 2.5s/km
      expect(result.adjustedPace).toBeLessThan(result.originalPace); // Adjusted pace is faster (normalized)
      expect(result.explanation.some(exp => exp.includes('Temperature'))).toBe(true);
    });

    it('should apply temperature adjustments for cold weather', () => {
      const coldRun = createMockRun({
        weather_data: {
          temperature: 0, // 10°C below optimal (10°C)
          humidity: 50,
          wind_speed: 5,
          weather: { main: 'Clear', description: 'cold' }
        }
      });

      const result = calculateAdjustedPace(coldRun);

      expect(result.adjustments.temperatureAdjustment).toBeLessThan(0);
      expect(result.adjustments.temperatureAdjustment).toBeCloseTo(-15, 1); // 10°C * -1.5s/km
      expect(result.adjustedPace).toBeGreaterThan(result.originalPace); // Adjusted pace is slower
    });

    it('should apply humidity adjustments', () => {
      const humidRun = createMockRun({
        weather_data: {
          temperature: 20,
          humidity: 80, // 20% above optimal (60%)
          wind_speed: 5,
          weather: { main: 'Clear', description: 'humid' }
        }
      });

      const result = calculateAdjustedPace(humidRun);

      expect(result.adjustments.humidityAdjustment).toBeGreaterThan(0);
      expect(result.adjustments.humidityAdjustment).toBeCloseTo(3, 1); // 20% / 10% * 1.5s/km
      expect(result.explanation.some(exp => exp.includes('Humidity'))).toBe(true);
    });

    it('should apply wind adjustments', () => {
      const windyRun = createMockRun({
        weather_data: {
          temperature: 20,
          humidity: 50,
          wind_speed: 25, // 10 km/h above threshold (15 km/h)
          weather: { main: 'Clear', description: 'windy' }
        }
      });

      const result = calculateAdjustedPace(windyRun);

      expect(result.adjustments.windAdjustment).toBeGreaterThan(0);
      expect(result.adjustments.windAdjustment).toBeCloseTo(4, 1); // 10 km/h * 0.4s/km
      expect(result.explanation.some(exp => exp.includes('Wind'))).toBe(true);
    });

    it('should apply elevation adjustments for uphill runs', () => {
      const hillRun = createMockRun({
        total_elevation_gain: 250, // 50m/km for 5km run
        weather_data: {
          temperature: 20,
          humidity: 50,
          wind_speed: 5,
          weather: { main: 'Clear', description: 'clear' }
        }
      });

      const result = calculateAdjustedPace(hillRun);

      expect(result.adjustments.elevationAdjustment).toBeGreaterThan(0);
      expect(result.explanation.some(exp => exp.includes('Elevation'))).toBe(true);
    });

    it('should combine multiple environmental factors', () => {
      const challengingRun = createMockRun({
        weather_data: {
          temperature: 28, // Hot
          humidity: 75,    // Humid
          wind_speed: 20,  // Windy
          weather: { main: 'Clear', description: 'challenging' }
        },
        total_elevation_gain: 150 // Hilly
      });

      const result = calculateAdjustedPace(challengingRun);

      expect(result.adjustments.totalAdjustment).toBeGreaterThan(10); // Significant adjustment
      expect(result.adjustedPace).toBeLessThan(result.originalPace); // Much faster normalized pace
      expect(result.explanation.length).toBeGreaterThan(3); // Multiple factors explained
    });

    it('should calculate confidence based on data quality', () => {
      const goodDataRun = createMockRun({
        weather_data: {
          temperature: 18,
          humidity: 55,
          wind_speed: 8,
          weather: { main: 'Clear', description: 'good' }
        }
      });

      const extremeDataRun = createMockRun({
        weather_data: {
          temperature: 45, // Extreme temperature
          humidity: 95,    // Very high humidity
          wind_speed: 60,  // Extreme wind
          weather: { main: 'Storm', description: 'extreme' }
        }
      });

      const goodResult = calculateAdjustedPace(goodDataRun);
      const extremeResult = calculateAdjustedPace(extremeDataRun);

      expect(goodResult.confidence).toBeGreaterThan(extremeResult.confidence);
      expect(goodResult.confidence).toBeGreaterThan(0.8);
      expect(extremeResult.confidence).toBeLessThan(0.71); // Account for floating point precision
    });

    it('should enforce minimum pace limit', () => {
      const extremeRun = createMockRun({
        moving_time: 300, // 1:00/km - very fast
        weather_data: {
          temperature: 40, // Very hot
          humidity: 90,    // Very humid
          wind_speed: 30,  // Very windy
          weather: { main: 'Storm', description: 'extreme' }
        }
      });

      const result = calculateAdjustedPace(extremeRun);

      expect(result.adjustedPace).toBeGreaterThanOrEqual(60); // Minimum 1:00/km
    });
  });

  describe('calculateAdjustedPacesForRuns', () => {
    it('should calculate adjusted paces for multiple runs', () => {
      const runs = [
        createMockRun({
          weather_data: {
            temperature: 15,
            humidity: 50,
            wind_speed: 5,
            weather: { main: 'Clear', description: 'ideal' }
          }
        }),
        createMockRun({
          weather_data: {
            temperature: 30,
            humidity: 80,
            wind_speed: 20,
            weather: { main: 'Hot', description: 'challenging' }
          }
        })
      ];

      const results = calculateAdjustedPacesForRuns(runs);

      expect(results.length).toBe(2);
      expect(results[0].adjustments.totalAdjustment).toBeLessThan(results[1].adjustments.totalAdjustment);
      expect(results[1].adjustedPace).toBeLessThan(results[1].originalPace);
    });

    it('should handle empty run array', () => {
      const results = calculateAdjustedPacesForRuns([]);

      expect(results).toEqual([]);
    });
  });

  describe('compareEnvironmentalPerformance', () => {
    it('should compare performance across different conditions', () => {
      const runs = [
        createMockRun({
          moving_time: 1800, // 6:00/km
          weather_data: {
            temperature: 15, // Ideal
            humidity: 50,
            wind_speed: 5,
            weather: { main: 'Clear', description: 'ideal' }
          }
        }),
        createMockRun({
          moving_time: 1980, // 6:36/km - slower in hot weather
          weather_data: {
            temperature: 30, // Hot
            humidity: 75,
            wind_speed: 15,
            weather: { main: 'Hot', description: 'hot' }
          }
        }),
        createMockRun({
          moving_time: 1740, // 5:48/km - faster in cool weather
          weather_data: {
            temperature: 8, // Cool
            humidity: 45,
            wind_speed: 3,
            weather: { main: 'Cool', description: 'cool' }
          }
        })
      ];

      const comparison = compareEnvironmentalPerformance(runs);

      expect(comparison.bestConditions).toBeDefined();
      expect(comparison.worstConditions).toBeDefined();
      expect(comparison.optimalConditions.length).toBeGreaterThan(0);
      expect(comparison.performanceByCondition.length).toBeGreaterThan(0);
      
      // Best conditions should have faster adjusted pace than worst
      expect(comparison.bestConditions.avgPace).toBeLessThan(comparison.worstConditions.avgPace);
    });

    it('should handle runs without weather data', () => {
      const runs = [
        createMockRun({ weather_data: null }),
        createMockRun({ weather_data: null })
      ];

      const comparison = compareEnvironmentalPerformance(runs);

      expect(comparison.optimalConditions).toContain('No weather data available');
      expect(comparison.performanceByCondition).toEqual([]);
    });

    it('should group runs by temperature ranges', () => {
      const runs = [
        createMockRun({
          weather_data: { temperature: 5, humidity: 50, wind_speed: 5, weather: { main: 'Cold', description: 'cold' } }
        }),
        createMockRun({
          weather_data: { temperature: 12, humidity: 50, wind_speed: 5, weather: { main: 'Cool', description: 'cool' } }
        }),
        createMockRun({
          weather_data: { temperature: 18, humidity: 50, wind_speed: 5, weather: { main: 'Optimal', description: 'optimal' } }
        }),
        createMockRun({
          weather_data: { temperature: 23, humidity: 50, wind_speed: 5, weather: { main: 'Warm', description: 'warm' } }
        }),
        createMockRun({
          weather_data: { temperature: 32, humidity: 50, wind_speed: 5, weather: { main: 'Hot', description: 'hot' } }
        })
      ];

      const comparison = compareEnvironmentalPerformance(runs);

      expect(comparison.performanceByCondition.length).toBeGreaterThan(3);
      expect(comparison.performanceByCondition.some(p => p.conditionRange.includes('Cold'))).toBe(true);
      expect(comparison.performanceByCondition.some(p => p.conditionRange.includes('Hot'))).toBe(true);
    });
  });

  describe('utility functions', () => {
    it('should format pace correctly', () => {
      expect(formatPace(300)).toBe('5:00'); // 5:00/km
      expect(formatPace(360)).toBe('6:00'); // 6:00/km
      expect(formatPace(450)).toBe('7:30'); // 7:30/km
      expect(formatPace(330)).toBe('5:30'); // 5:30/km
    });

    it('should format adjustments correctly', () => {
      expect(formatAdjustment(0)).toBe('No adjustment');
      expect(formatAdjustment(0.05)).toBe('No adjustment'); // Below threshold
      expect(formatAdjustment(5.7)).toBe('+5.7s/km');
      expect(formatAdjustment(-3.2)).toBe('-3.2s/km');
    });

    it('should provide environmental impact summaries', () => {
      const minimalImpact = {
        originalPace: 360,
        adjustedPace: 360.5,
        adjustments: {
          totalAdjustment: 0.5,
          temperatureAdjustment: 0.5,
          humidityAdjustment: 0,
          windAdjustment: 0,
          elevationAdjustment: 0,
          adjustmentFactors: {
            temperature: { value: 21, impact: 'slight', adjustment: 0.5 },
            humidity: { value: 50, impact: 'optimal', adjustment: 0 },
            wind: { value: 5, impact: 'calm', adjustment: 0 },
            elevation: { value: 0, impact: 'flat', adjustment: 0 }
          }
        },
        confidence: 0.8,
        explanation: []
      };

      const significantImpact = {
        originalPace: 360,
        adjustedPace: 340,
        adjustments: {
          totalAdjustment: 20,
          temperatureAdjustment: 15,
          humidityAdjustment: 3,
          windAdjustment: 2,
          elevationAdjustment: 0,
          adjustmentFactors: {
            temperature: { value: 30, impact: 'hot', adjustment: 15 },
            humidity: { value: 80, impact: 'high', adjustment: 3 },
            wind: { value: 20, impact: 'windy', adjustment: 2 },
            elevation: { value: 0, impact: 'flat', adjustment: 0 }
          }
        },
        confidence: 0.7,
        explanation: []
      };

      const favorableImpact = {
        originalPace: 360,
        adjustedPace: 370,
        adjustments: {
          totalAdjustment: -10,
          temperatureAdjustment: -10,
          humidityAdjustment: 0,
          windAdjustment: 0,
          elevationAdjustment: 0,
          adjustmentFactors: {
            temperature: { value: 5, impact: 'cold', adjustment: -10 },
            humidity: { value: 50, impact: 'optimal', adjustment: 0 },
            wind: { value: 5, impact: 'calm', adjustment: 0 },
            elevation: { value: 0, impact: 'flat', adjustment: 0 }
          }
        },
        confidence: 0.8,
        explanation: []
      };

      expect(getEnvironmentalImpactSummary(minimalImpact)).toContain('Minimal environmental impact');
      expect(getEnvironmentalImpactSummary(significantImpact)).toContain('Challenging conditions slowed');
      expect(getEnvironmentalImpactSummary(favorableImpact)).toContain('Favorable conditions helped');
    });
  });

  describe('edge cases', () => {
    it('should handle extreme temperature values', () => {
      const extremeHotRun = createMockRun({
        weather_data: {
          temperature: 50, // Extreme heat
          humidity: 50,
          wind_speed: 5,
          weather: { main: 'Extreme', description: 'extreme heat' }
        }
      });

      const extremeColdRun = createMockRun({
        weather_data: {
          temperature: -30, // Extreme cold
          humidity: 50,
          wind_speed: 5,
          weather: { main: 'Extreme', description: 'extreme cold' }
        }
      });

      const hotResult = calculateAdjustedPace(extremeHotRun);
      const coldResult = calculateAdjustedPace(extremeColdRun);

      expect(hotResult.adjustments.temperatureAdjustment).toBeGreaterThan(50);
      expect(coldResult.adjustments.temperatureAdjustment).toBeLessThan(-50);
      expect(hotResult.confidence).toBeLessThanOrEqual(0.8); // Lower confidence for extreme values
      expect(coldResult.confidence).toBeLessThanOrEqual(0.8);
    });

    it('should handle invalid humidity values', () => {
      const invalidHumidityRun = createMockRun({
        weather_data: {
          temperature: 20,
          humidity: 150, // Invalid humidity
          wind_speed: 5,
          weather: { main: 'Invalid', description: 'invalid data' }
        }
      });

      const result = calculateAdjustedPace(invalidHumidityRun);

      expect(result.confidence).toBeLessThan(0.7); // Lower confidence for invalid data
    });

    it('should handle very fast original paces', () => {
      const fastRun = createMockRun({
        moving_time: 900, // 3:00/km - very fast
        weather_data: {
          temperature: 20,
          humidity: 50,
          wind_speed: 5,
          weather: { main: 'Clear', description: 'clear' }
        }
      });

      const result = calculateAdjustedPace(fastRun);

      expect(result.originalPace).toBe(180); // 3:00/km
      expect(result.adjustedPace).toBeGreaterThan(0);
    });

    it('should handle runs with zero elevation gain', () => {
      const flatRun = createMockRun({
        total_elevation_gain: 0,
        weather_data: {
          temperature: 20,
          humidity: 50,
          wind_speed: 5,
          weather: { main: 'Clear', description: 'clear' }
        }
      });

      const result = calculateAdjustedPace(flatRun);

      expect(result.adjustments.elevationAdjustment).toBe(0);
      // For zero elevation, the explanation should indicate ideal conditions or no elevation impact
      expect(result.explanation.some(exp => 
        exp.includes('Ideal conditions') || 
        exp.includes('flat terrain') || 
        exp.includes('minimal elevation') ||
        exp.includes('No adjustment')
      )).toBe(true);
    });

    it('should handle missing elevation data', () => {
      const noElevationRun = createMockRun({
        total_elevation_gain: undefined,
        weather_data: {
          temperature: 20,
          humidity: 50,
          wind_speed: 5,
          weather: { main: 'Clear', description: 'clear' }
        }
      });

      const result = calculateAdjustedPace(noElevationRun);

      expect(result.adjustments.elevationAdjustment).toBe(0);
    });
  });
});