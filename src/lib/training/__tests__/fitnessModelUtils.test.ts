// Unit tests for Fitness & Fatigue Model (CTL/ATL/TSB)
import { 
  calculateFitnessMetrics, 
  calculateFitnessMetricsFromRuns,
  getFitnessTrend,
  predictOptimalTrainingWindows,
  getFitnessStatusColor,
  formatFitnessMetrics,
  DailyTRIMPData
} from '../fitnessModelUtils';
import { EnrichedRun } from '../../../types';

// Mock daily TRIMP data helper
const createDailyTRIMPData = (days: number, avgTRIMP: number = 50): DailyTRIMPData[] => {
  const data: DailyTRIMPData[] = [];
  const baseDate = new Date('2025-08-12');
  
  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() - (days - 1 - i)); // Chronological order
    
    // Add some variation to TRIMP scores
    const variation = (Math.random() - 0.5) * 20; // ±10 variation
    const trimp = Math.max(0, avgTRIMP + variation);
    
    data.push({
      date: date.toISOString().split('T')[0],
      trimp: Math.round(trimp)
    });
  }
  
  return data;
};

// Mock run data helper
const createMockRun = (overrides: Partial<EnrichedRun> = {}): EnrichedRun => ({
  id: `test-run-${Math.random()}`,
  user_id: 'test-user',
  strava_id: Math.floor(Math.random() * 100000),
  name: 'Test Run',
  distance: 5000,
  moving_time: 1800,
  elapsed_time: 1900,
  start_date: '2025-08-12T06:00:00Z',
  start_date_local: '2025-08-12T06:00:00Z',
  average_speed: 2.78,
  average_heartrate: 150,
  max_heartrate: 165,
  total_elevation_gain: 50,
  weather_data: null,
  strava_data: null,
  advanced_metrics: { trimp: 85, dataQuality: 'high', calculatedAt: '2025-08-12T06:00:00Z', calculationVersion: '1.0.0' },
  created_at: '2025-08-12T06:00:00Z',
  updated_at: '2025-08-12T06:00:00Z',
  ...overrides
});

describe('Fitness & Fatigue Model (CTL/ATL/TSB)', () => {
  describe('calculateFitnessMetrics', () => {
    it('should return insufficient data message with less than 7 days', () => {
      const data = createDailyTRIMPData(5);
      const result = calculateFitnessMetrics(data);
      
      expect(result.value.ctl).toBe(0);
      expect(result.value.atl).toBe(0);
      expect(result.value.tsb).toBe(0);
      expect(result.value.status).toBe('neutral');
      expect(result.confidence).toBe(0);
      expect(result.value.recommendation).toContain('7 days');
    });

    it('should calculate CTL/ATL/TSB correctly with sufficient data', () => {
      const data = createDailyTRIMPData(42, 50); // 42 days of ~50 TRIMP
      const result = calculateFitnessMetrics(data);
      
      expect(result.value.ctl).toBeGreaterThan(0);
      expect(result.value.atl).toBeGreaterThan(0);
      expect(result.value.tsb).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(['fresh', 'neutral', 'fatigued', 'very-fatigued']).toContain(result.value.status);
    });

    it('should detect fresh status with high TSB', () => {
      // Create data with recent low training (high TSB)
      const data = createDailyTRIMPData(30, 60);
      // Add recent low training days
      for (let i = 0; i < 7; i++) {
        data[data.length - 1 - i].trimp = 10; // Very low recent training
      }
      
      const result = calculateFitnessMetrics(data);
      
      expect(result.value.tsb).toBeGreaterThan(0);
      expect(result.value.status).toBe('fresh');
      expect(result.value.recommendation).toContain('ready for high-intensity');
    });

    it('should detect fatigued status with negative TSB', () => {
      // Create data with recent high training (negative TSB)
      const data = createDailyTRIMPData(30, 30);
      // Add recent high training days
      for (let i = 0; i < 7; i++) {
        data[data.length - 1 - i].trimp = 100; // Very high recent training
      }
      
      const result = calculateFitnessMetrics(data);
      
      expect(result.value.tsb).toBeLessThan(0);
      expect(['fatigued', 'very-fatigued']).toContain(result.value.status);
      expect(result.value.recommendation).toContain('recovery');
    });

    it('should handle consistent training load', () => {
      // Create perfectly consistent training
      const data: DailyTRIMPData[] = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date('2025-08-12');
        date.setDate(date.getDate() - (29 - i));
        data.push({
          date: date.toISOString().split('T')[0],
          trimp: 50 // Exactly 50 every day
        });
      }
      
      const result = calculateFitnessMetrics(data);
      
      expect(result.value.ctl).toBeCloseTo(50, 5); // Should approach 50
      expect(result.value.atl).toBeCloseTo(50, 5); // Should approach 50
      expect(Math.abs(result.value.tsb)).toBeLessThan(5); // Should be near 0
      expect(result.value.status).toBe('neutral');
    });
  });

  describe('calculateFitnessMetricsFromRuns', () => {
    it('should calculate fitness metrics from run data', () => {
      const runs: EnrichedRun[] = [];
      
      // Create 30 days of runs
      for (let i = 0; i < 30; i++) {
        const date = new Date('2025-08-12');
        date.setDate(date.getDate() - i);
        
        runs.push(createMockRun({
          start_date_local: date.toISOString(),
          advanced_metrics: { 
            trimp: 60, 
            dataQuality: 'high', 
            calculatedAt: date.toISOString(),
            calculationVersion: '1.0.0'
          }
        }));
      }
      
      const result = calculateFitnessMetricsFromRuns(runs);
      
      expect(result.value.ctl).toBeGreaterThan(0);
      expect(result.value.atl).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should handle runs without TRIMP data', () => {
      const runs: EnrichedRun[] = [];
      
      for (let i = 0; i < 10; i++) {
        runs.push(createMockRun({
          advanced_metrics: null // No TRIMP data
        }));
      }
      
      const result = calculateFitnessMetricsFromRuns(runs);
      
      expect(result.value.ctl).toBe(0);
      expect(result.value.atl).toBe(0);
      expect(result.value.tsb).toBe(0);
    });

    it('should aggregate multiple runs on same day', () => {
      const runs: EnrichedRun[] = [];
      const sameDate = '2025-08-12T06:00:00Z';
      
      // Two runs on same day
      runs.push(createMockRun({
        start_date_local: sameDate,
        advanced_metrics: { trimp: 40, dataQuality: 'high', calculatedAt: sameDate, calculationVersion: '1.0.0' }
      }));
      runs.push(createMockRun({
        start_date_local: sameDate,
        advanced_metrics: { trimp: 30, dataQuality: 'high', calculatedAt: sameDate, calculationVersion: '1.0.0' }
      }));
      
      // Add more days to meet minimum requirement
      for (let i = 1; i < 10; i++) {
        const date = new Date('2025-08-12');
        date.setDate(date.getDate() - i);
        runs.push(createMockRun({
          start_date_local: date.toISOString(),
          advanced_metrics: { trimp: 50, dataQuality: 'high', calculatedAt: date.toISOString(), calculationVersion: '1.0.0' }
        }));
      }
      
      const result = calculateFitnessMetricsFromRuns(runs);
      
      // Should aggregate the two runs (40 + 30 = 70 TRIMP for that day)
      expect(result.value.ctl).toBeGreaterThan(0);
      expect(result.value.atl).toBeGreaterThan(0);
    });
  });

  describe('getFitnessTrend', () => {
    it('should return empty array with insufficient data', () => {
      const data = createDailyTRIMPData(5);
      const trend = getFitnessTrend(data);
      
      expect(trend).toHaveLength(0);
    });

    it('should calculate fitness trend over time', () => {
      const data = createDailyTRIMPData(30, 50);
      const trend = getFitnessTrend(data, 10); // Last 10 days
      
      expect(trend).toHaveLength(10);
      expect(trend[0]).toHaveProperty('date');
      expect(trend[0]).toHaveProperty('ctl');
      expect(trend[0]).toHaveProperty('atl');
      expect(trend[0]).toHaveProperty('tsb');
      
      // Trend should be chronological
      expect(trend[0].date < trend[trend.length - 1].date).toBe(true);
    });

    it('should show progressive fitness building', () => {
      // Create increasing training load
      const data: DailyTRIMPData[] = [];
      for (let i = 0; i < 20; i++) {
        const date = new Date('2025-08-12');
        date.setDate(date.getDate() - (19 - i));
        data.push({
          date: date.toISOString().split('T')[0],
          trimp: 30 + i * 2 // Gradually increasing load
        });
      }
      
      const trend = getFitnessTrend(data, 10);
      
      expect(trend).toHaveLength(10);
      // CTL should generally increase over time with increasing load
      expect(trend[trend.length - 1].ctl).toBeGreaterThan(trend[0].ctl);
    });
  });

  describe('predictOptimalTrainingWindows', () => {
    it('should predict recovery time for fatigued athlete', () => {
      const metrics = {
        ctl: 60,
        atl: 90,
        tsb: -30, // Very fatigued
        status: 'very-fatigued' as const,
        recommendation: 'Rest needed',
        confidence: 0.8
      };
      
      const prediction = predictOptimalTrainingWindows(metrics, []);
      
      expect(prediction.recoveryNeeded).toBeGreaterThan(0);
      expect(prediction.nextOptimalWindow).toBeTruthy();
      expect(prediction.peakReadiness).toBeTruthy();
    });

    it('should indicate peak readiness for fresh athlete', () => {
      const metrics = {
        ctl: 60,
        atl: 30,
        tsb: 30, // Very fresh
        status: 'fresh' as const,
        recommendation: 'Ready to race',
        confidence: 0.9
      };
      
      const prediction = predictOptimalTrainingWindows(metrics, []);
      
      expect(prediction.recoveryNeeded).toBe(0);
      expect(prediction.peakReadiness).toBeTruthy();
      expect(prediction.peakReadiness?.confidence).toBeGreaterThan(0.8);
    });

    it('should handle neutral fitness state', () => {
      const metrics = {
        ctl: 50,
        atl: 45,
        tsb: 5, // Neutral
        status: 'neutral' as const,
        recommendation: 'Balanced state',
        confidence: 0.8
      };
      
      const prediction = predictOptimalTrainingWindows(metrics, []);
      
      expect(prediction.recoveryNeeded).toBe(0);
      expect(prediction.nextOptimalWindow).toBeNull();
    });
  });

  describe('utility functions', () => {
    it('should return correct status colors', () => {
      expect(getFitnessStatusColor('fresh')).toBe('#22c55e');
      expect(getFitnessStatusColor('neutral')).toBe('#3b82f6');
      expect(getFitnessStatusColor('fatigued')).toBe('#eab308');
      expect(getFitnessStatusColor('very-fatigued')).toBe('#ef4444');
    });

    it('should format fitness metrics correctly', () => {
      const metrics = {
        ctl: 45.67,
        atl: 52.34,
        tsb: -6.67,
        status: 'fatigued' as const,
        recommendation: 'Rest',
        confidence: 0.8
      };
      
      const formatted = formatFitnessMetrics(metrics);
      
      expect(formatted.ctlDisplay).toBe('45.7');
      expect(formatted.atlDisplay).toBe('52.3');
      expect(formatted.tsbDisplay).toBe('-6.7');
      expect(formatted.statusDisplay).toBe('Fatigued');
    });

    it('should format positive TSB with plus sign', () => {
      const metrics = {
        ctl: 50,
        atl: 40,
        tsb: 10,
        status: 'fresh' as const,
        recommendation: 'Ready',
        confidence: 0.9
      };
      
      const formatted = formatFitnessMetrics(metrics);
      
      expect(formatted.tsbDisplay).toBe('+10.0');
    });
  });

  describe('edge cases', () => {
    it('should handle zero TRIMP values', () => {
      const data: DailyTRIMPData[] = [];
      for (let i = 0; i < 10; i++) {
        const date = new Date('2025-08-12');
        date.setDate(date.getDate() - i);
        data.push({
          date: date.toISOString().split('T')[0],
          trimp: 0
        });
      }
      
      const result = calculateFitnessMetrics(data);
      
      expect(result.value.ctl).toBe(0);
      expect(result.value.atl).toBe(0);
      expect(result.value.tsb).toBe(0);
      expect(result.value.status).toBe('neutral');
    });

    it('should handle unsorted date data', () => {
      const data = createDailyTRIMPData(10, 50);
      // Shuffle the data
      data.sort(() => Math.random() - 0.5);
      
      const result = calculateFitnessMetrics(data);
      
      // Should still calculate correctly despite unsorted input
      expect(result.value.ctl).toBeGreaterThan(0);
      expect(result.value.atl).toBeGreaterThan(0);
    });
  });
});