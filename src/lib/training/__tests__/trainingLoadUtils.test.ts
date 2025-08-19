// Unit tests for TRIMP calculations
import { calculateTRIMP, getDefaultPhysiologyData, validatePhysiologyData, interpretTRIMP, calculateWeeklyTRIMP } from '../trainingLoadUtils';
import { EnrichedRun, UserPhysiologyData } from '../../../types';

// Mock run data helper
const createMockRun = (overrides: Partial<EnrichedRun> = {}): EnrichedRun => ({
  id: 'test-run-1',
  user_id: 'test-user',
  strava_id: 12345,
  name: 'Test Run',
  distance: 5000, // 5km
  moving_time: 1800, // 30 minutes
  elapsed_time: 1900,
  start_date: '2025-08-12T06:00:00Z',
  start_date_local: '2025-08-12T06:00:00Z',
  average_speed: 2.78, // ~5:00/km pace
  average_heartrate: 150,
  max_heartrate: 165,
  total_elevation_gain: 50,
  weather_data: null,
  strava_data: null,
  created_at: '2025-08-12T06:00:00Z',
  updated_at: '2025-08-12T06:00:00Z',
  ...overrides
});

const mockPhysiology: UserPhysiologyData = {
  restingHeartRate: 60,
  maxHeartRate: 190,
  estimatedWeight: 70,
  lastUpdated: '2025-08-12T00:00:00Z'
};

describe('TRIMP Calculations', () => {
  describe('calculateTRIMP with heart rate data', () => {
    it('should calculate TRIMP correctly with full HR data', () => {
      const run = createMockRun({ 
        average_heartrate: 150, 
        moving_time: 3600 // 60 minutes
      });
      
      const result = calculateTRIMP(run, mockPhysiology);
      
      expect(result.value).toBeGreaterThan(0);
      expect(result.confidence).toBe(0.9);
      expect(result.calculationMethod).toBe('Banister TRIMP with heart rate data');
      expect(result.dataQuality.heartRateDataAvailable).toBe(true);
    });

    it('should handle edge case heart rates correctly', () => {
      const run = createMockRun({ 
        average_heartrate: 65, // Just above resting
        moving_time: 1800 
      });
      
      const result = calculateTRIMP(run, mockPhysiology);
      
      expect(result.value).toBeGreaterThan(0);
      expect(result.value).toBeLessThan(100); // Should be low TRIMP for low intensity
    });

    it('should handle high intensity correctly', () => {
      const run = createMockRun({ 
        average_heartrate: 180, // High intensity
        moving_time: 1800 
      });
      
      const result = calculateTRIMP(run, mockPhysiology);
      
      expect(result.value).toBeGreaterThan(50); // Should be higher TRIMP
    });

    it('should fallback to estimation with invalid HR data', () => {
      const run = createMockRun({ 
        average_heartrate: 200, // Above max HR
        moving_time: 1800 
      });
      
      const result = calculateTRIMP(run, mockPhysiology);
      
      expect(result.calculationMethod).toBe('Estimated TRIMP from pace and duration');
      expect(result.confidence).toBe(0.6);
    });
  });

  describe('calculateTRIMP without heart rate data', () => {
    it('should estimate TRIMP when HR data is missing', () => {
      const run = createMockRun({ 
        average_heartrate: null,
        moving_time: 1800 
      });
      
      const result = calculateTRIMP(run, mockPhysiology);
      
      expect(result.value).toBeGreaterThan(0);
      expect(result.confidence).toBe(0.6);
      expect(result.calculationMethod).toBe('Estimated TRIMP from pace and duration');
      expect(result.dataQuality.heartRateDataAvailable).toBe(false);
      expect(result.dataQuality.missingDataImpact).toContain('Heart rate data unavailable - using pace-based estimation');
    });

    it('should estimate higher TRIMP for faster paces', () => {
      const slowRun = createMockRun({ 
        average_heartrate: null,
        moving_time: 3600, // 60 minutes
        distance: 8000, // 8km = 7.5 min/km pace
        average_speed: 2.22 // 7.5 min/km
      });
      
      const fastRun = createMockRun({ 
        average_heartrate: null,
        moving_time: 1800, // 30 minutes  
        distance: 7500, // 7.5km = 4 min/km pace
        average_speed: 4.17 // 4 min/km
      });
      
      const slowResult = calculateTRIMP(slowRun, mockPhysiology);
      const fastResult = calculateTRIMP(fastRun, mockPhysiology);
      
      expect(fastResult.value).toBeGreaterThan(slowResult.value);
    });
  });

  describe('getDefaultPhysiologyData', () => {
    it('should provide reasonable defaults for unknown age/gender', () => {
      const defaults = getDefaultPhysiologyData();
      
      expect(defaults.maxHeartRate).toBe(185); // 220 - 35
      expect(defaults.restingHeartRate).toBe(60);
      expect(defaults.estimatedWeight).toBe(75);
    });

    it('should adjust for age', () => {
      const young = getDefaultPhysiologyData(25);
      const old = getDefaultPhysiologyData(50);
      
      expect(young.maxHeartRate).toBeGreaterThan(old.maxHeartRate!);
      expect(young.maxHeartRate).toBe(195); // 220 - 25
      expect(old.maxHeartRate).toBe(170); // 220 - 50
    });

    it('should adjust for gender', () => {
      const male = getDefaultPhysiologyData(30, 'male');
      const female = getDefaultPhysiologyData(30, 'female');
      
      expect(male.restingHeartRate).toBe(60);
      expect(female.restingHeartRate).toBe(65);
      expect(male.estimatedWeight).toBe(75);
      expect(female.estimatedWeight).toBe(65);
    });
  });

  describe('validatePhysiologyData', () => {
    it('should validate normal physiological data', () => {
      const result = validatePhysiologyData(mockPhysiology);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn about unusual but valid values', () => {
      const unusualData: UserPhysiologyData = {
        restingHeartRate: 35, // Low but valid for athletes
        maxHeartRate: 215, // High but valid
        estimatedWeight: 50
      };
      
      const result = validatePhysiologyData(unusualData);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should reject invalid values', () => {
      const invalidData: UserPhysiologyData = {
        restingHeartRate: 25, // Too low
        maxHeartRate: 260, // Too high
        estimatedWeight: 25 // Too low
      };
      
      const result = validatePhysiologyData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should catch resting HR >= max HR', () => {
      const invalidData: UserPhysiologyData = {
        restingHeartRate: 180,
        maxHeartRate: 170
      };
      
      const result = validatePhysiologyData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain('Resting heart rate should be lower than maximum heart rate');
    });
  });

  describe('interpretTRIMP', () => {
    it('should categorize TRIMP values correctly', () => {
      expect(interpretTRIMP(20).level).toBe('very-easy');
      expect(interpretTRIMP(45).level).toBe('easy');
      expect(interpretTRIMP(80).level).toBe('moderate');
      expect(interpretTRIMP(120).level).toBe('hard');
      expect(interpretTRIMP(180).level).toBe('very-hard');
    });

    it('should provide appropriate descriptions', () => {
      const easy = interpretTRIMP(25);
      const hard = interpretTRIMP(140);
      
      expect(easy.description).toContain('recovery');
      expect(hard.description).toContain('Hard');
      expect(easy.color).toBe('#22c55e');
      expect(hard.color).toBe('#f97316');
    });
  });

  describe('calculateWeeklyTRIMP', () => {
    it('should aggregate daily TRIMP into weekly totals', () => {
      const dailyData = [
        { date: '2025-08-11', trimp: 50 }, // Monday
        { date: '2025-08-12', trimp: 60 }, // Tuesday  
        { date: '2025-08-13', trimp: 40 }, // Wednesday
        { date: '2025-08-15', trimp: 80 }, // Friday
        { date: '2025-08-18', trimp: 70 }, // Next Monday
      ];
      
      const weeklyData = calculateWeeklyTRIMP(dailyData);
      
      expect(weeklyData).toHaveLength(2); // Two weeks
      expect(weeklyData[0].totalTRIMP).toBe(230); // First week: 50+60+40+80
      expect(weeklyData[0].runDays).toBe(4);
      expect(weeklyData[1].totalTRIMP).toBe(70); // Second week: 70
      expect(weeklyData[1].runDays).toBe(1);
    });

    it('should calculate averages correctly', () => {
      const dailyData = [
        { date: '2025-08-11', trimp: 70 },
        { date: '2025-08-13', trimp: 70 },
      ];
      
      const weeklyData = calculateWeeklyTRIMP(dailyData);
      
      expect(weeklyData[0].totalTRIMP).toBe(140);
      expect(weeklyData[0].avgDaily).toBe(20); // 140 / 7 days
      expect(weeklyData[0].runDays).toBe(2);
    });

    it('should handle empty data', () => {
      const weeklyData = calculateWeeklyTRIMP([]);
      
      expect(weeklyData).toHaveLength(0);
    });
  });
});