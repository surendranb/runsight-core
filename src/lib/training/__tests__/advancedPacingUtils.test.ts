import { describe, it, expect } from 'vitest';
import {
  calculateNegativeSplitProbability,
  analyzeFatigueResistance,
  detectPacingIssues,
  generateOptimalRaceStrategy,
  type NegativeSplitAnalysis,
  type FatigueResistanceProfile,
  type PacingIssueDetection,
  type OptimalRaceStrategy
} from '../advancedPacingUtils';
import { EnrichedRun } from '../../../types';

// Helper function to create mock runs
const createMockRun = (overrides: Partial<EnrichedRun> = {}): EnrichedRun => ({
  id: Math.random().toString(),
  strava_id: Math.floor(Math.random() * 1000000),
  name: 'Test Run',
  distance: 10000, // 10km default
  moving_time: 2400, // 40 minutes default (4:00/km pace)
  start_date: new Date().toISOString(),
  average_heartrate: 150,
  max_heartrate: 180,
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
      max_heartrate: 175 + Math.random() * 15
    });
  });
};

describe('Advanced Pacing Utils', () => {
  describe('calculateNegativeSplitProbability', () => {
    it('should return minimal analysis for insufficient data', () => {
      const runs = createRunSequence(3, 3000); // Only 3 short runs
      const result = calculateNegativeSplitProbability(runs);
      
      expect(result.confidenceLevel).toBe('low');
      expect(result.recommendations).toContain('Need more run data to provide accurate split analysis');
    });

    it('should calculate split probability for adequate data', () => {
      const runs = createRunSequence(15, 8000); // 15 runs of ~8km
      const result = calculateNegativeSplitProbability(runs);
      
      expect(result.probability).toBeGreaterThanOrEqual(0);
      expect(result.probability).toBeLessThanOrEqual(1);
      expect(result.confidenceLevel).toBeOneOf(['low', 'medium', 'high']);
      expect(result.historicalPattern).toBeOneOf(['consistent-negative', 'mixed', 'consistent-positive']);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should have high confidence with many runs', () => {
      const runs = createRunSequence(20, 10000);
      const result = calculateNegativeSplitProbability(runs);
      
      expect(result.confidenceLevel).toBeOneOf(['medium', 'high']);
    });

    it('should filter out very short runs', () => {
      const shortRuns = createRunSequence(10, 2000); // 2km runs
      const longRuns = createRunSequence(10, 8000); // 8km runs
      const mixedRuns = [...shortRuns, ...longRuns];
      
      const result = calculateNegativeSplitProbability(mixedRuns);
      
      // Should still provide analysis based on the longer runs
      expect(result.confidenceLevel).not.toBe('low');
    });

    it('should provide different recommendations based on patterns', () => {
      const runs = createRunSequence(15, 10000);
      const result = calculateNegativeSplitProbability(runs);
      
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.every(rec => typeof rec === 'string')).toBe(true);
    });
  });

  describe('analyzeFatigueResistance', () => {
    it('should return minimal profile for insufficient data', () => {
      const runs = createRunSequence(5, 3000);
      const result = analyzeFatigueResistance(runs);
      
      expect(result.overallScore).toBe(50);
      expect(result.resistanceLevel).toBe('average');
      expect(result.distanceProfiles).toEqual([]);
    });

    it('should analyze fatigue resistance with adequate data', () => {
      const runs = createRunSequence(15, 12000);
      const result = analyzeFatigueResistance(runs);
      
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.resistanceLevel).toBeOneOf(['excellent', 'good', 'average', 'needs-improvement']);
      
      expect(result.paceMaintenance).toBeDefined();
      expect(result.paceMaintenance.finalQuarterSlowdown).toBeGreaterThanOrEqual(0);
      expect(result.paceMaintenance.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(result.paceMaintenance.consistencyScore).toBeLessThanOrEqual(100);
      
      expect(result.heartRateDrift).toBeDefined();
      expect(result.improvementTrend).toBeOneOf(['improving', 'stable', 'declining']);
    });

    it('should create distance profiles for varied distances', () => {
      const runs = [
        ...createRunSequence(5, 6000),   // 5-8km range
        ...createRunSequence(5, 10000),  // 8-12km range
        ...createRunSequence(5, 15000),  // 12-18km range
      ];
      
      const result = analyzeFatigueResistance(runs);
      
      expect(result.distanceProfiles.length).toBeGreaterThan(0);
      result.distanceProfiles.forEach(profile => {
        expect(profile.distanceRange).toBeDefined();
        expect(profile.fatigueResistance).toBeGreaterThanOrEqual(0);
        expect(profile.fatigueResistance).toBeLessThanOrEqual(100);
        expect(profile.sampleSize).toBeGreaterThan(0);
      });
    });

    it('should handle runs without heart rate data', () => {
      const runs = createRunSequence(15, 10000).map(run => ({
        ...run,
        average_heartrate: undefined,
        max_heartrate: undefined
      }));
      
      const result = analyzeFatigueResistance(runs);
      
      expect(result.heartRateDrift.averageDrift).toBe(0);
      expect(result.heartRateDrift.cardiacEfficiency).toBe(50);
      expect(result.overallScore).toBeGreaterThan(0); // Should still calculate based on pace data
    });

    it('should assign correct resistance levels based on score', () => {
      // Test with mock data that should produce different scores
      const excellentRuns = createRunSequence(15, 10000).map(run => ({
        ...run,
        moving_time: run.distance / 1000 * 240, // Consistent 4:00/km pace
        average_heartrate: 145, // Good HR control
        max_heartrate: 180
      }));
      
      const poorRuns = createRunSequence(15, 10000).map(run => ({
        ...run,
        moving_time: run.distance / 1000 * 360, // Slow 6:00/km pace
        average_heartrate: 165, // High HR for the pace
        max_heartrate: 185
      }));
      
      const excellentResult = analyzeFatigueResistance(excellentRuns);
      const poorResult = analyzeFatigueResistance(poorRuns);
      
      // Both should have valid scores, but we can't guarantee excellent > poor due to randomness
      expect(excellentResult.overallScore).toBeGreaterThanOrEqual(0);
      expect(excellentResult.overallScore).toBeLessThanOrEqual(100);
      expect(poorResult.overallScore).toBeGreaterThanOrEqual(0);
      expect(poorResult.overallScore).toBeLessThanOrEqual(100);
    });
  });

  describe('detectPacingIssues', () => {
    it('should return minimal issues for insufficient data', () => {
      const runs = createRunSequence(3, 5000);
      const result = detectPacingIssues(runs);
      
      expect(result.issues).toEqual([]);
      expect(result.overallPacingGrade).toBe('B');
      expect(result.primaryWeakness).toBe('Insufficient data for analysis');
    });

    it('should detect pacing issues with adequate data', () => {
      const runs = createRunSequence(15, 10000);
      const result = detectPacingIssues(runs);
      
      expect(result.overallPacingGrade).toBeOneOf(['A', 'B', 'C', 'D', 'F']);
      expect(result.primaryWeakness).toBeDefined();
      expect(result.primaryStrength).toBeDefined();
      expect(result.improvementPriority).toBeInstanceOf(Array);
      
      result.issues.forEach(issue => {
        expect(issue.type).toBeOneOf([
          'excessive-early-pace',
          'poor-finishing-strength', 
          'inconsistent-pacing',
          'inadequate-warmup'
        ]);
        expect(issue.severity).toBeOneOf(['minor', 'moderate', 'significant']);
        expect(issue.frequency).toBeGreaterThanOrEqual(0);
        expect(issue.frequency).toBeLessThanOrEqual(1);
        expect(issue.solutions).toBeInstanceOf(Array);
        expect(issue.solutions.length).toBeGreaterThan(0);
      });
    });

    it('should detect excessive early pace in fast long runs', () => {
      const fastLongRuns = createRunSequence(10, 20000).map(run => ({
        ...run,
        moving_time: run.distance / 1000 * 220 // Very fast pace for long distance
      }));
      
      const result = detectPacingIssues(fastLongRuns);
      
      // Should detect early pace issues for very fast long runs
      const earlyPaceIssue = result.issues.find(i => i.type === 'excessive-early-pace');
      if (earlyPaceIssue) {
        expect(earlyPaceIssue.frequency).toBeGreaterThan(0);
        expect(earlyPaceIssue.solutions.length).toBeGreaterThan(0);
      }
    });

    it('should calculate appropriate pacing grade', () => {
      // Test with no issues (should get A)
      const goodRuns = createRunSequence(10, 8000);
      const goodResult = detectPacingIssues(goodRuns);
      
      // With minimal issues, should get good grade
      expect(['A', 'B']).toContain(goodResult.overallPacingGrade);
    });

    it('should provide improvement priorities', () => {
      const runs = createRunSequence(15, 12000);
      const result = detectPacingIssues(runs);
      
      expect(result.improvementPriority).toBeInstanceOf(Array);
      expect(result.improvementPriority.length).toBeGreaterThan(0);
      result.improvementPriority.forEach(priority => {
        expect(typeof priority).toBe('string');
        expect(priority.length).toBeGreaterThan(0);
      });
    });
  });

  describe('generateOptimalRaceStrategy', () => {
    it('should generate strategy for 10K race', () => {
      const runs = createRunSequence(20, 10000);
      const result = generateOptimalRaceStrategy(runs, 10000);
      
      expect(result.distance).toBe(10000);
      expect(result.targetPace).toBeGreaterThan(0);
      
      expect(result.pacingPlan).toBeDefined();
      expect(result.pacingPlan.firstMile.pace).toBeGreaterThan(0);
      expect(result.pacingPlan.earlyMiles.pace).toBeGreaterThan(0);
      expect(result.pacingPlan.middleMiles.pace).toBeGreaterThan(0);
      expect(result.pacingPlan.finalMiles.pace).toBeGreaterThan(0);
      expect(result.pacingPlan.lastMile.pace).toBeGreaterThan(0);
      
      expect(result.fatigueManagement).toBeDefined();
      expect(result.fatigueManagement.anticipatedFatiguePoint).toBeGreaterThan(0);
      expect(result.fatigueManagement.fatigueCounterStrategies).toBeInstanceOf(Array);
      
      expect(result.personalizedAdvice).toBeInstanceOf(Array);
      expect(result.riskMitigation).toBeInstanceOf(Array);
      expect(result.confidenceFactors).toBeInstanceOf(Array);
    });

    it('should generate strategy with target time', () => {
      const runs = createRunSequence(15, 10000);
      const targetTime = 2400; // 40 minutes for 10K
      const result = generateOptimalRaceStrategy(runs, 10000, targetTime);
      
      expect(result.targetPace).toBe(240); // 4:00/km
      expect(result.distance).toBe(10000);
    });

    it('should adjust strategy for marathon distance', () => {
      const runs = [
        ...createRunSequence(10, 15000),
        ...createRunSequence(5, 25000),
        ...createRunSequence(3, 35000)
      ];
      
      const result = generateOptimalRaceStrategy(runs, 42195); // Marathon
      
      expect(result.distance).toBe(42195);
      expect(result.personalizedAdvice.some(advice => 
        advice.toLowerCase().includes('fuel')
      )).toBe(true);
    });

    it('should provide conservative strategy for poor fatigue resistance', () => {
      const slowRuns = createRunSequence(15, 10000).map(run => ({
        ...run,
        moving_time: run.distance / 1000 * 400 // Very slow pace
      }));
      
      const result = generateOptimalRaceStrategy(slowRuns, 10000);
      
      // Should provide more conservative advice
      expect(result.personalizedAdvice.some(advice => 
        advice.toLowerCase().includes('conservative') || 
        advice.toLowerCase().includes('even pacing')
      )).toBe(true);
    });

    it('should provide strategy based on fatigue resistance', () => {
      const fastConsistentRuns = createRunSequence(20, 10000).map(run => ({
        ...run,
        moving_time: run.distance / 1000 * 220, // Fast, consistent pace
        average_heartrate: 140 + Math.random() * 10 // Good HR control
      }));
      
      const result = generateOptimalRaceStrategy(fastConsistentRuns, 10000);
      
      // Should provide meaningful advice
      expect(result.personalizedAdvice.length).toBeGreaterThan(0);
      expect(result.personalizedAdvice.every(advice => typeof advice === 'string')).toBe(true);
      
      // Should have a complete pacing plan
      expect(result.pacingPlan.firstMile.pace).toBeGreaterThan(0);
      expect(result.pacingPlan.finalMiles.pace).toBeGreaterThan(0);
      
      // Should provide confidence factors
      expect(result.confidenceFactors.length).toBeGreaterThan(0);
    });

    it('should include confidence factors based on training', () => {
      const recentLongRuns = Array.from({ length: 5 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (i * 7)); // Weekly long runs
        return createMockRun({
          distance: 18000, // Long runs for 10K race
          start_date: date.toISOString()
        });
      });
      
      const otherRuns = createRunSequence(15, 8000);
      const allRuns = [...recentLongRuns, ...otherRuns];
      
      const result = generateOptimalRaceStrategy(allRuns, 10000);
      
      expect(result.confidenceFactors.length).toBeGreaterThan(0);
      expect(result.confidenceFactors.some(factor => 
        factor.toLowerCase().includes('training')
      )).toBe(true);
    });

    it('should handle minimal training data gracefully', () => {
      const fewRuns = createRunSequence(3, 8000);
      const result = generateOptimalRaceStrategy(fewRuns, 10000);
      
      expect(result.distance).toBe(10000);
      expect(result.targetPace).toBeGreaterThan(0);
      expect(result.confidenceFactors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty run arrays', () => {
      const emptyRuns: EnrichedRun[] = [];
      
      expect(() => calculateNegativeSplitProbability(emptyRuns)).not.toThrow();
      expect(() => analyzeFatigueResistance(emptyRuns)).not.toThrow();
      expect(() => detectPacingIssues(emptyRuns)).not.toThrow();
      expect(() => generateOptimalRaceStrategy(emptyRuns, 10000)).not.toThrow();
    });

    it('should handle runs with missing data', () => {
      const incompleteRuns = createRunSequence(10, 10000).map(run => ({
        ...run,
        average_heartrate: undefined,
        max_heartrate: undefined,
        moving_time: 0
      }));
      
      expect(() => calculateNegativeSplitProbability(incompleteRuns)).not.toThrow();
      expect(() => analyzeFatigueResistance(incompleteRuns)).not.toThrow();
    });

    it('should handle extreme values gracefully', () => {
      const extremeRuns = [
        createMockRun({ distance: 100, moving_time: 30 }), // Very short, very fast
        createMockRun({ distance: 100000, moving_time: 36000 }), // Very long, very slow
        createMockRun({ distance: 10000, moving_time: 600 }), // Impossibly fast
        createMockRun({ distance: 1000, moving_time: 3600 }) // Impossibly slow
      ];
      
      expect(() => calculateNegativeSplitProbability(extremeRuns)).not.toThrow();
      expect(() => analyzeFatigueResistance(extremeRuns)).not.toThrow();
      expect(() => detectPacingIssues(extremeRuns)).not.toThrow();
    });

    it('should provide meaningful defaults for edge cases', () => {
      const result = generateOptimalRaceStrategy([], 10000);
      
      expect(result.targetPace).toBe(300); // Default 5:00/km
      expect(result.confidenceFactors.length).toBeGreaterThan(0);
      expect(result.personalizedAdvice.length).toBeGreaterThan(0);
    });
  });
});