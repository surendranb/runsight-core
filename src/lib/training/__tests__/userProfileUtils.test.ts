import { describe, it, expect } from 'vitest';
import {
  createOrUpdatePhysiologyProfile,
  estimatePhysiologyData,
  checkDataFreshness,
  triggerHistoricalRecalculation,
  generateUpdatePrompts,
  type UserPhysiologyProfile,
  type PhysiologyEstimation,
  type ProfileUpdateResult,
  type DataFreshnessCheck
} from '../userProfileUtils';
import { EnrichedRun } from '../../../types';

// Helper function to create mock runs
const createMockRun = (overrides: Partial<EnrichedRun> = {}): EnrichedRun => ({
  id: Math.random().toString(),
  strava_id: Math.floor(Math.random() * 1000000),
  name: 'Test Run',
  distance: 10000,
  moving_time: 2400,
  elapsed_time: 2400,
  start_date: new Date().toISOString(),
  start_date_local: new Date().toISOString(),
  start_latlng: null,
  end_latlng: null,
  average_speed: 4.17,
  max_speed: 5.0,
  average_heartrate: 150,
  max_heartrate: 180,
  total_elevation_gain: 100,
  user_id: 'test-user',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

const createMockProfile = (overrides: Partial<UserPhysiologyProfile> = {}): UserPhysiologyProfile => ({
  userId: 'test-user',
  restingHeartRate: 60,
  maxHeartRate: 190,
  bodyWeight: 70,
  height: 175,
  age: 30,
  gender: 'male',
  fitnessLevel: 'intermediate',
  runningExperience: 5,
  weeklyMileage: 50,
  maxHREstimated: false,
  restingHREstimated: false,
  estimationMethod: 'user-input',
  lastUpdated: new Date().toISOString(),
  dataFreshness: 'fresh',
  dataQuality: 'high',
  validationErrors: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

describe('User Profile Utils', () => {
  describe('createOrUpdatePhysiologyProfile', () => {
    it('should create new profile with valid data', () => {
      const profileData = {
        restingHeartRate: 55,
        maxHeartRate: 195,
        bodyWeight: 75,
        age: 25,
        fitnessLevel: 'advanced' as const
      };
      
      const result = createOrUpdatePhysiologyProfile('user-123', profileData);
      
      expect(result.success).toBe(true);
      expect(result.profile.userId).toBe('user-123');
      expect(result.profile.restingHeartRate).toBe(55);
      expect(result.profile.maxHeartRate).toBe(195);
      expect(result.profile.dataFreshness).toBe('fresh');
      expect(result.profile.dataQuality).toBe('high');
      expect(result.profile.maxHREstimated).toBe(false);
      expect(result.profile.restingHREstimated).toBe(false);
      expect(result.recalculationNeeded).toBe(true);
      expect(result.affectedMetrics.length).toBeGreaterThan(0);
    });

    it('should update existing profile', () => {
      const existingProfile = createMockProfile({
        restingHeartRate: 60,
        maxHeartRate: 190
      });
      
      const updates = {
        restingHeartRate: 55,
        bodyWeight: 72
      };
      
      const result = createOrUpdatePhysiologyProfile('test-user', updates, existingProfile);
      
      expect(result.success).toBe(true);
      expect(result.profile.restingHeartRate).toBe(55);
      expect(result.profile.bodyWeight).toBe(72);
      expect(result.profile.maxHeartRate).toBe(190); // Unchanged
      expect(result.recalculationNeeded).toBe(true);
      expect(result.affectedMetrics).toContain('Training Zones');
    });

    it('should handle validation errors', () => {
      const invalidData = {
        restingHeartRate: 150, // Invalid: higher than max
        maxHeartRate: 100,
        bodyWeight: 300 // Invalid: too high
      };
      
      const result = createOrUpdatePhysiologyProfile('user-123', invalidData);
      
      expect(result.success).toBe(false);
      expect(result.profile.validationErrors.length).toBeGreaterThan(0);
      expect(result.profile.dataQuality).toBe('low');
    });

    it('should set estimation flags correctly', () => {
      const profileData = {
        bodyWeight: 70,
        age: 30
        // No heart rate data provided
      };
      
      const result = createOrUpdatePhysiologyProfile('user-123', profileData);
      
      expect(result.profile.maxHREstimated).toBe(true);
      expect(result.profile.restingHREstimated).toBe(true);
    });

    it('should set next update reminder', () => {
      const profileData = {
        restingHeartRate: 60,
        maxHeartRate: 190
      };
      
      const result = createOrUpdatePhysiologyProfile('user-123', profileData);
      
      expect(result.profile.nextUpdateReminder).toBeDefined();
      const reminderDate = new Date(result.profile.nextUpdateReminder!);
      const now = new Date();
      expect(reminderDate.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe('estimatePhysiologyData', () => {
    it('should estimate max HR from age', () => {
      const profile = { age: 30 };
      
      const estimation = estimatePhysiologyData(profile);
      
      expect(estimation.estimatedMaxHR).toBe(187); // 208 - (0.7 * 30)
      expect(estimation.method).toBe('age-based');
      expect(estimation.confidence).toBe('medium');
      expect(estimation.disclaimers.some(d => d.includes('age-based'))).toBe(true);
    });

    it('should estimate max HR from observed data', () => {
      const profile = {}; // No age provided
      const runs = Array.from({ length: 6 }, (_, i) => 
        createMockRun({ max_heartrate: 180 + i })
      );
      
      const estimation = estimatePhysiologyData(profile, runs);
      
      expect(estimation.estimatedMaxHR).toBe(190); // 185 + 5 buffer
      expect(estimation.method).toBe('observed-max');
      expect(estimation.confidence).toBe('medium');
    });

    it('should use conservative default with insufficient data', () => {
      const profile = {}; // No age or runs
      
      const estimation = estimatePhysiologyData(profile, []);
      
      expect(estimation.estimatedMaxHR).toBe(185);
      expect(estimation.method).toBe('default');
      expect(estimation.confidence).toBe('low');
      expect(estimation.disclaimers.some(d => d.includes('conservative default'))).toBe(true);
    });

    it('should estimate resting HR from fitness level', () => {
      const profile = { fitnessLevel: 'elite' as const };
      
      const estimation = estimatePhysiologyData(profile);
      
      expect(estimation.estimatedRestingHR).toBe(45);
      expect(estimation.disclaimers.some(d => d.includes('fitness level'))).toBe(true);
    });

    it('should provide appropriate recommendations', () => {
      const profile = { age: 25 };
      
      const estimation = estimatePhysiologyData(profile);
      
      expect(estimation.recommendations.length).toBeGreaterThan(0);
      expect(estimation.recommendations.some(r => 
        r.includes('fitness test') || r.includes('measure')
      )).toBe(true);
    });
  });

  describe('checkDataFreshness', () => {
    it('should identify fresh data', () => {
      const profile = createMockProfile({
        lastUpdated: new Date().toISOString() // Just updated
      });
      
      const freshness = checkDataFreshness(profile);
      
      expect(freshness.isStale).toBe(false);
      expect(freshness.daysSinceUpdate).toBe(0);
      expect(freshness.criticalUpdatesNeeded).toHaveLength(0);
    });

    it('should identify stale data', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days ago
      
      const profile = createMockProfile({
        lastUpdated: oldDate.toISOString()
      });
      
      const freshness = checkDataFreshness(profile);
      
      expect(freshness.isStale).toBe(true);
      expect(freshness.daysSinceUpdate).toBe(100);
      expect(freshness.recommendedActions.length).toBeGreaterThan(0);
    });

    it('should identify critical updates needed', () => {
      const veryOldDate = new Date();
      veryOldDate.setDate(veryOldDate.getDate() - 400); // Over 1 year
      
      const profile = createMockProfile({
        lastUpdated: veryOldDate.toISOString(),
        maxHREstimated: true
      });
      
      const freshness = checkDataFreshness(profile);
      
      expect(freshness.isStale).toBe(true);
      expect(freshness.criticalUpdatesNeeded.length).toBeGreaterThan(0);
      expect(freshness.criticalUpdatesNeeded.some(u => 
        u.includes('Max heart rate')
      )).toBe(true);
    });

    it('should provide specific recommendations', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 95);
      
      const profile = createMockProfile({
        lastUpdated: oldDate.toISOString(),
        restingHREstimated: true
      });
      
      const freshness = checkDataFreshness(profile);
      
      expect(freshness.recommendedActions.some(a => 
        a.includes('weight') || a.includes('resting heart rate')
      )).toBe(true);
    });
  });

  describe('triggerHistoricalRecalculation', () => {
    it('should not require recalculation for non-critical changes', () => {
      const profile = createMockProfile();
      const changedFields = ['height', 'runningExperience'];
      
      const result = triggerHistoricalRecalculation(profile, changedFields);
      
      expect(result.shouldRecalculate).toBe(false);
      expect(result.affectedPeriod).toBe('none');
      expect(result.affectedMetrics).toHaveLength(0);
    });

    it('should require full recalculation for heart rate changes', () => {
      const profile = createMockProfile();
      const changedFields = ['maxHeartRate', 'restingHeartRate'];
      
      const result = triggerHistoricalRecalculation(profile, changedFields);
      
      expect(result.shouldRecalculate).toBe(true);
      expect(result.affectedPeriod).toBe('all');
      expect(result.estimatedDuration).toContain('5-10');
      expect(result.affectedMetrics).toContain('Training zones');
      expect(result.affectedMetrics).toContain('TRIMP calculations');
    });

    it('should require recent recalculation for body weight changes', () => {
      const profile = createMockProfile();
      const changedFields = ['bodyWeight'];
      
      const result = triggerHistoricalRecalculation(profile, changedFields);
      
      expect(result.shouldRecalculate).toBe(true);
      expect(result.affectedPeriod).toBe('recent');
      expect(result.estimatedDuration).toContain('1-2');
      expect(result.affectedMetrics).toContain('Power estimates');
    });

    it('should identify all affected metrics', () => {
      const profile = createMockProfile();
      const changedFields = ['maxHeartRate', 'bodyWeight'];
      
      const result = triggerHistoricalRecalculation(profile, changedFields);
      
      expect(result.affectedMetrics).toContain('Training zones');
      expect(result.affectedMetrics).toContain('Power estimates');
      expect(result.affectedMetrics.length).toBeGreaterThan(3);
    });
  });

  describe('generateUpdatePrompts', () => {
    it('should generate prompts for missing data', () => {
      const incompleteProfile = createMockProfile({
        maxHeartRate: undefined,
        restingHeartRate: undefined,
        bodyWeight: undefined
      });
      
      const result = generateUpdatePrompts(incompleteProfile);
      
      expect(result.prompts.length).toBeGreaterThan(0);
      expect(result.prompts.some(p => p.field === 'maxHeartRate')).toBe(true);
      expect(result.prompts.some(p => p.field === 'restingHeartRate')).toBe(true);
      expect(result.prompts.some(p => p.field === 'bodyWeight')).toBe(true);
      expect(result.overallScore).toBeLessThan(100);
    });

    it('should prioritize prompts correctly', () => {
      const incompleteProfile = createMockProfile({
        maxHeartRate: undefined,
        height: undefined
      });
      
      const result = generateUpdatePrompts(incompleteProfile);
      
      const maxHRPrompt = result.prompts.find(p => p.field === 'maxHeartRate');
      const heightPrompt = result.prompts.find(p => p.field === 'height');
      
      expect(maxHRPrompt?.priority).toBe('high');
      expect(heightPrompt?.priority).toBe('low');
      
      // High priority should come first
      const maxHRIndex = result.prompts.findIndex(p => p.field === 'maxHeartRate');
      const heightIndex = result.prompts.findIndex(p => p.field === 'height');
      expect(maxHRIndex).toBeLessThan(heightIndex);
    });

    it('should calculate completeness score correctly', () => {
      const completeProfile = createMockProfile();
      const incompleteProfile = createMockProfile({
        maxHeartRate: undefined,
        restingHeartRate: undefined,
        bodyWeight: undefined,
        age: undefined
      });
      
      const completeResult = generateUpdatePrompts(completeProfile);
      const incompleteResult = generateUpdatePrompts(incompleteProfile);
      
      expect(completeResult.overallScore).toBeGreaterThan(incompleteResult.overallScore);
      expect(completeResult.overallScore).toBe(100);
      expect(incompleteResult.overallScore).toBeLessThan(60);
    });

    it('should provide helpful messages and help text', () => {
      const incompleteProfile = createMockProfile({
        maxHeartRate: undefined
      });
      
      const result = generateUpdatePrompts(incompleteProfile);
      const maxHRPrompt = result.prompts.find(p => p.field === 'maxHeartRate');
      
      expect(maxHRPrompt?.message).toContain('maximum heart rate');
      expect(maxHRPrompt?.helpText).toContain('220 minus your age');
      expect(maxHRPrompt?.helpText.length).toBeGreaterThan(20);
    });
  });

  describe('Data Validation', () => {
    it('should validate heart rate ranges', () => {
      const invalidData = {
        maxHeartRate: 250, // Too high
        restingHeartRate: 25 // Too low
      };
      
      const result = createOrUpdatePhysiologyProfile('user-123', invalidData);
      
      expect(result.success).toBe(false);
      expect(result.profile.validationErrors.some(e => 
        e.includes('Maximum heart rate')
      )).toBe(true);
      expect(result.profile.validationErrors.some(e => 
        e.includes('Resting heart rate')
      )).toBe(true);
    });

    it('should validate heart rate relationship', () => {
      const invalidData = {
        maxHeartRate: 150,
        restingHeartRate: 160 // Higher than max
      };
      
      const result = createOrUpdatePhysiologyProfile('user-123', invalidData);
      
      expect(result.success).toBe(false);
      expect(result.profile.validationErrors.some(e => 
        e.includes('higher than resting')
      )).toBe(true);
    });

    it('should warn about narrow heart rate range', () => {
      const narrowRangeData = {
        maxHeartRate: 150,
        restingHeartRate: 140 // Only 10 bpm difference
      };
      
      const result = createOrUpdatePhysiologyProfile('user-123', narrowRangeData);
      
      expect(result.warnings.some(w => 
        w.includes('narrow')
      )).toBe(true);
    });

    it('should validate body measurements', () => {
      const invalidData = {
        bodyWeight: 300, // Too high
        height: 50, // Too low
        age: 150 // Too high
      };
      
      const result = createOrUpdatePhysiologyProfile('user-123', invalidData);
      
      expect(result.success).toBe(false);
      expect(result.profile.validationErrors.length).toBe(3);
    });

    it('should validate experience and mileage', () => {
      const invalidData = {
        runningExperience: 60, // Too high
        weeklyMileage: 400 // Too high
      };
      
      const result = createOrUpdatePhysiologyProfile('user-123', invalidData);
      
      expect(result.success).toBe(false);
      expect(result.profile.validationErrors.some(e => 
        e.includes('Running experience')
      )).toBe(true);
      expect(result.profile.validationErrors.some(e => 
        e.includes('Weekly mileage')
      )).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty profile data', () => {
      const result = createOrUpdatePhysiologyProfile('user-123', {});
      
      expect(result.success).toBe(true);
      expect(result.profile.userId).toBe('user-123');
      expect(result.profile.dataQuality).toBe('high');
    });

    it('should handle profile with all estimated values', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days ago
      
      const profile = createMockProfile({
        maxHeartRate: undefined,
        restingHeartRate: undefined,
        maxHREstimated: true,
        restingHREstimated: true,
        lastUpdated: oldDate.toISOString()
      });
      
      const freshness = checkDataFreshness(profile);
      expect(freshness.recommendedActions.length).toBeGreaterThan(0);
    });

    it('should handle missing timestamps gracefully', () => {
      const profile = createMockProfile({
        lastUpdated: new Date(0).toISOString() // Very old date
      });
      
      const freshness = checkDataFreshness(profile);
      expect(freshness.daysSinceUpdate).toBeGreaterThan(1000);
      expect(freshness.isStale).toBe(true);
    });

    it('should handle estimation with no data', () => {
      const estimation = estimatePhysiologyData({}, []);
      
      expect(estimation.estimatedMaxHR).toBe(185);
      expect(estimation.estimatedRestingHR).toBe(60);
      expect(estimation.confidence).toBe('low');
      expect(estimation.disclaimers.length).toBeGreaterThan(0);
    });

    it('should handle runs with missing heart rate data', () => {
      const runsWithoutHR = Array.from({ length: 10 }, () => 
        createMockRun({ max_heartrate: undefined })
      );
      
      const estimation = estimatePhysiologyData({}, runsWithoutHR);
      
      expect(estimation.estimatedMaxHR).toBe(185);
      expect(estimation.method).toBe('default');
    });
  });
});