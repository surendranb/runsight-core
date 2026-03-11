// Unit tests for ACWR calculations
import { calculateACWRFromRuns, getACWRStatusColor } from '../acwrUtils';
import { EnrichedRun } from '../../../types';

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
  advanced_metrics: { trimp: 85 },
  created_at: '2025-08-12T06:00:00Z',
  updated_at: '2025-08-12T06:00:00Z',
  ...overrides
});

// Create a sequence of runs over time
const createRunSequence = (days: number, dailyDistance: number = 5000, dailyTRIMP: number = 85): EnrichedRun[] => {
  const runs: EnrichedRun[] = [];
  const baseDate = new Date('2025-08-12');
  
  for (let i = 0; i < days; i++) {
    const runDate = new Date(baseDate);
    runDate.setDate(baseDate.getDate() - i);
    
    runs.push(createMockRun({
      start_date_local: runDate.toISOString(),
      distance: dailyDistance,
      advanced_metrics: { trimp: dailyTRIMP }
    }));
  }
  
  return runs;
};

describe('ACWR Calculations', () => {
  describe('calculateACWRFromRuns', () => {
    it('should return detraining status with insufficient data', () => {
      const runs = createRunSequence(10); // Only 10 days
      const result = calculateACWRFromRuns(runs, 'distance');
      
      expect(result.value.status).toBe('detraining');
      expect(result.value.acwr).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.value.recommendation).toContain('28 days');
    });

    it('should calculate ACWR correctly with sufficient data', () => {
      const runs = createRunSequence(35); // 35 days of data
      const result = calculateACWRFromRuns(runs, 'distance');
      
      expect(result.value.acwr).toBeCloseTo(1.0, 1); // Should be close to 1.0 for consistent training
      expect(result.value.status).toBe('optimal');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect high ACWR with recent training spike', () => {
      // Create base training for 28 days
      const baseRuns = createRunSequence(28, 3000, 50); // Lower baseline
      
      // Add high training in last 7 days
      const spikeRuns = createRunSequence(7, 8000, 120); // Higher recent load
      spikeRuns.forEach((run, index) => {
        const date = new Date('2025-08-12');
        date.setDate(date.getDate() - index);
        run.start_date_local = date.toISOString();
      });
      
      const allRuns = [...spikeRuns, ...baseRuns.slice(7)]; // Replace first 7 with spike
      const result = calculateACWRFromRuns(allRuns, 'distance');
      
      expect(result.value.acwr).toBeGreaterThan(1.5);
      expect(result.value.status).toBe('high-risk');
    });

    it('should calculate ACWR using TRIMP metric', () => {
      const runs = createRunSequence(35, 5000, 85);
      const result = calculateACWRFromRuns(runs, 'trimp');
      
      expect(result.value.acwr).toBeCloseTo(1.0, 1);
      expect(result.dataQuality.heartRateDataAvailable).toBe(true);
      expect(result.calculationMethod).toContain('trimp');
    });

    it('should handle missing TRIMP data gracefully', () => {
      const runs = createRunSequence(35, 5000);
      runs.forEach(run => {
        run.advanced_metrics = null; // Remove TRIMP data
      });
      
      const result = calculateACWRFromRuns(runs, 'trimp');
      
      expect(result.value.acwr).toBe(0); // Should be 0 when no TRIMP data
      expect(result.value.status).toBe('detraining');
    });

    it('should detect detraining with low recent activity', () => {
      // High training for first 21 days, then very low for last 7
      const highRuns = createRunSequence(21, 8000, 120);
      const lowRuns = createRunSequence(7, 1000, 20);
      
      // Adjust dates properly
      lowRuns.forEach((run, index) => {
        const date = new Date('2025-08-12');
        date.setDate(date.getDate() - index);
        run.start_date_local = date.toISOString();
      });
      
      highRuns.forEach((run, index) => {
        const date = new Date('2025-08-12');
        date.setDate(date.getDate() - (index + 7));
        run.start_date_local = date.toISOString();
      });
      
      const allRuns = [...lowRuns, ...highRuns];
      const result = calculateACWRFromRuns(allRuns, 'distance');
      
      expect(result.value.acwr).toBeLessThan(0.8);
      expect(result.value.status).toBe('detraining');
    });
  });

  describe('getACWRStatusColor', () => {
    it('should return correct colors for each status', () => {
      expect(getACWRStatusColor('optimal')).toBe('#22c55e');
      expect(getACWRStatusColor('caution')).toBe('#eab308');
      expect(getACWRStatusColor('high-risk')).toBe('#ef4444');
      expect(getACWRStatusColor('detraining')).toBe('#3b82f6');
    });
  });

  describe('ACWR interpretation', () => {
    it('should categorize ACWR values correctly', () => {
      // Test optimal range
      const optimalRuns = createRunSequence(35, 5000, 85);
      const optimalResult = calculateACWRFromRuns(optimalRuns, 'distance');
      expect(optimalResult.value.status).toBe('optimal');
      
      // Test caution range (create larger increase)
      const cautionRuns = createRunSequence(35, 5000, 85);
      // Increase recent 7 days by 60%
      for (let i = 0; i < 7; i++) {
        cautionRuns[i].distance = 8000;
      }
      const cautionResult = calculateACWRFromRuns(cautionRuns, 'distance');
      expect(cautionResult.value.acwr).toBeGreaterThan(1.3);
      expect(cautionResult.value.status).toBe('caution');
    });

    it('should provide appropriate recommendations', () => {
      const runs = createRunSequence(35, 5000, 85);
      const result = calculateACWRFromRuns(runs, 'distance');
      
      expect(result.value.recommendation).toContain('optimal');
      expect(result.value.recommendation).toContain('Maintain');
    });
  });

  describe('confidence calculation', () => {
    it('should have higher confidence with more data', () => {
      const shortRuns = createRunSequence(30);
      const longRuns = createRunSequence(50);
      
      const shortResult = calculateACWRFromRuns(shortRuns, 'distance');
      const longResult = calculateACWRFromRuns(longRuns, 'distance');
      
      expect(longResult.confidence).toBeGreaterThanOrEqual(shortResult.confidence);
    });

    it('should have lower confidence with sparse data', () => {
      // Create runs with gaps (only every 3rd day)
      const sparseRuns: EnrichedRun[] = [];
      for (let i = 0; i < 60; i += 3) { // 20 runs over 60 days
        const date = new Date('2025-08-12');
        date.setDate(date.getDate() - i);
        sparseRuns.push(createMockRun({
          start_date_local: date.toISOString(),
          distance: 5000
        }));
      }
      
      const denseRuns = createRunSequence(42); // Daily runs for 42 days
      
      const sparseResult = calculateACWRFromRuns(sparseRuns, 'distance');
      const denseResult = calculateACWRFromRuns(denseRuns, 'distance');
      
      expect(denseResult.confidence).toBeGreaterThan(sparseResult.confidence);
    });
  });

  describe('edge cases', () => {
    it('should handle empty run array', () => {
      const result = calculateACWRFromRuns([], 'distance');
      
      expect(result.value.acwr).toBe(0);
      expect(result.value.status).toBe('detraining');
      expect(result.confidence).toBe(0);
    });

    it('should handle runs with zero distance', () => {
      const runs = createRunSequence(35, 0, 0); // Zero distance/TRIMP
      const result = calculateACWRFromRuns(runs, 'distance');
      
      expect(result.value.acwr).toBe(0);
      expect(result.value.acuteLoad).toBe(0);
      expect(result.value.chronicLoad).toBe(0);
    });

    it('should handle runs on same date', () => {
      const runs: EnrichedRun[] = [];
      
      // Create runs over 35 different dates with consistent daily totals
      for (let i = 0; i < 35; i++) {
        const date = new Date('2025-08-12');
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString();
        
        // Two runs per day that total 5000m
        runs.push(createMockRun({
          start_date_local: dateStr,
          distance: 2500
        }));
        runs.push(createMockRun({
          start_date_local: dateStr,
          distance: 2500
        }));
      }
      
      const result = calculateACWRFromRuns(runs, 'distance');
      
      // Should aggregate runs from same date and have consistent ACWR
      expect(result.value.acwr).toBeCloseTo(1.0, 1);
    });
  });
});