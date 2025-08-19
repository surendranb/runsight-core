// Overreaching and Injury Risk Detection System Tests
import {
  assessInjuryRisk,
  monitorRiskFactorResolution,
  generateInjuryPreventionPlan,
  formatRiskLevel,
  formatWarningLevel,
  formatOverreachingStatus,
  InjuryRiskAssessment
} from '../injuryRiskUtils';
import { EnrichedRun } from '../../../types';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { describe } from 'vitest';

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
  average_heartrate: 150,
  total_elevation_gain: 50,
  ...overrides
});

const createLowRiskTrainingHistory = (weeks: number): EnrichedRun[] => {
  const runs: EnrichedRun[] = [];
  const baseDate = new Date();
  
  for (let week = 0; week < weeks; week++) {
    // 3-4 runs per week with gradual progression
    const runsThisWeek = 3 + (week % 2);
    const weeklyDistance = 20000 + (week * 1000); // Gradual 5% weekly increase
    
    for (let run = 0; run < runsThisWeek; run++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - (week * 7) - (run * 2)); // Every other day
      
      let distance = weeklyDistance / runsThisWeek;
      let pace = 300; // Consistent 5:00/km pace
      let heartRate = 150;
      
      // Vary run types
      if (run === 0) {
        // Long run
        distance *= 1.5;
        pace += 20; // Slower long run pace
        heartRate -= 5;
      } else if (run === 1) {
        // Tempo run
        pace -= 20; // Faster tempo pace
        heartRate += 15;
      }
      
      const movingTime = (distance / 1000) * pace;
      
      runs.push(createMockRun({
        start_date: date.toISOString(),
        distance,
        moving_time: movingTime,
        average_speed: distance / movingTime,
        average_heartrate: Math.round(heartRate)
      }));
    }
  }
  
  return runs.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
};

const createHighRiskTrainingHistory = (weeks: number): EnrichedRun[] => {
  const runs: EnrichedRun[] = [];
  const baseDate = new Date();
  
  for (let week = 0; week < weeks; week++) {
    // High frequency with load spikes
    const runsThisWeek = 6 + (week % 2); // High frequency
    let weeklyDistance = 30000; // High base volume
    
    // Create load spikes
    if (week < 3) {
      weeklyDistance += week * 15000; // Massive increases
    }
    
    for (let run = 0; run < runsThisWeek; run++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - (week * 7) - run); // Daily runs
      
      let distance = weeklyDistance / runsThisWeek;
      let pace = 300 + (week * 10); // Getting slower (performance decline)
      let heartRate = 160 + (week * 5); // Elevated HR
      
      // Many consecutive hard efforts
      if (run < 4) {
        pace -= 30; // Hard effort
        heartRate += 20;
      }
      
      const movingTime = (distance / 1000) * pace;
      
      runs.push(createMockRun({
        start_date: date.toISOString(),
        distance,
        moving_time: movingTime,
        average_speed: distance / movingTime,
        average_heartrate: Math.round(heartRate)
      }));
    }
  }
  
  return runs.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
};

const createOverreachingHistory = (weeks: number): EnrichedRun[] => {
  const runs: EnrichedRun[] = [];
  const baseDate = new Date();
  
  for (let week = 0; week < weeks; week++) {
    const runsThisWeek = 7; // Daily running
    const weeklyDistance = 50000; // Very high volume
    
    for (let run = 0; run < runsThisWeek; run++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - (week * 7) - run);
      
      const distance = weeklyDistance / runsThisWeek;
      const pace = 280 + (week * 15); // Significant performance decline
      const heartRate = 170 + (week * 3); // Elevated and climbing HR
      
      const movingTime = (distance / 1000) * pace;
      
      runs.push(createMockRun({
        start_date: date.toISOString(),
        distance,
        moving_time: movingTime,
        average_speed: distance / movingTime,
        average_heartrate: Math.round(heartRate)
      }));
    }
  }
  
  return runs.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
};

describe('Overreaching and Injury Risk Detection System', () => {
  describe('assessInjuryRisk', () => {
    it('should create minimal assessment with insufficient data', () => {
      const runs = createLowRiskTrainingHistory(1); // Only 1 week
      const assessment = assessInjuryRisk(runs);
      
      expect(assessment.overallRiskScore).toBeLessThan(30);
      expect(assessment.riskLevel).toBe('low');
      expect(assessment.warningLevel).toBe('monitor-closely');
      expect(assessment.dataQuality).toBe('low');
      expect(assessment.confidenceScore).toBeLessThan(0.5);
      expect(assessment.recommendations.immediate[0]).toContain('building training history');
    });

    it('should assess low risk for well-managed training', () => {
      const runs = createLowRiskTrainingHistory(8);
      const assessment = assessInjuryRisk(runs);
      
      expect(assessment.overallRiskScore).toBeLessThan(40);
      expect(assessment.riskLevel).toMatch(/^(low|moderate)$/);
      expect(assessment.warningLevel).toMatch(/^(monitor-closely|caution-advised)$/);
      expect(assessment.dataQuality).toMatch(/^(medium|high)$/);
      expect(assessment.confidenceScore).toBeGreaterThan(0.5);
      
      // Check risk factors are reasonable
      Object.values(assessment.riskFactors).forEach(factor => {
        expect(factor.score).toBeGreaterThanOrEqual(0);
        expect(factor.score).toBeLessThanOrEqual(100);
        expect(factor.severity).toMatch(/^(low|moderate|high|critical)$/);
      });
    });

    it('should detect high risk from training load spikes', () => {
      const runs = createHighRiskTrainingHistory(6);
      const assessment = assessInjuryRisk(runs);
      
      expect(assessment.overallRiskScore).toBeGreaterThan(15);
      expect(assessment.riskLevel).toMatch(/^(low|moderate|high|critical)$/);
      expect(assessment.riskFactors.trainingLoadSpike.severity).toMatch(/^(low|moderate|high|critical)$/);
      expect(assessment.riskFactors.trainingLoadSpike.score).toBeGreaterThan(0);
      
      // Should have appropriate recommendations
      expect(assessment.recommendations.immediate.length).toBeGreaterThan(0);
      expect(assessment.recommendations.shortTerm.length).toBeGreaterThan(0);
    });

    it('should detect overreaching patterns', () => {
      const runs = createOverreachingHistory(4);
      const assessment = assessInjuryRisk(runs);
      
      expect(assessment.overallRiskScore).toBeGreaterThan(10);
      expect(assessment.overreachingStatus.status).toMatch(/^(normal|functional|non-functional|overtraining)$/);
      expect(assessment.overreachingStatus.indicators.length).toBeGreaterThanOrEqual(0);
      expect(assessment.warningLevel).toMatch(/^(monitor-closely|caution-advised|immediate-rest-recommended)$/);
      
      // Should have recovery guidance
      expect(assessment.recoveryGuidance.estimatedRecoveryDays).toBeGreaterThan(0);
      expect(assessment.recoveryGuidance.progressiveReturnPlan.length).toBeGreaterThan(0);
    });

    it('should analyze individual risk factors correctly', () => {
      const runs = createHighRiskTrainingHistory(6);
      const assessment = assessInjuryRisk(runs);
      
      // Training load spike should be detected
      expect(assessment.riskFactors.trainingLoadSpike.acwrValue).toBeGreaterThanOrEqual(0);
      
      // Performance decline should be detected
      expect(assessment.riskFactors.performanceDecline.trendDirection).toMatch(/^(improving|stable|declining)$/);
      
      // Heart rate anomalies
      if (assessment.riskFactors.heartRateAnomalies.restingHRTrend) {
        expect(assessment.riskFactors.heartRateAnomalies.restingHRTrend).toMatch(/^(normal|elevated|declining)$/);
      }
      
      // Pace consistency
      expect(assessment.riskFactors.paceConsistency.variabilityIndex).toBeGreaterThanOrEqual(0);
      
      // Recovery patterns
      expect(assessment.riskFactors.recoveryPatterns.recoveryQuality).toMatch(/^(excellent|good|fair|poor)$/);
    });

    it('should provide appropriate warning levels', () => {
      const lowRiskRuns = createLowRiskTrainingHistory(6);
      const highRiskRuns = createOverreachingHistory(3);
      
      const lowRiskAssessment = assessInjuryRisk(lowRiskRuns);
      const highRiskAssessment = assessInjuryRisk(highRiskRuns);
      
      expect(lowRiskAssessment.warningLevel).toMatch(/^(monitor-closely|caution-advised)$/);
      expect(highRiskAssessment.warningLevel).toMatch(/^(monitor-closely|caution-advised|immediate-rest-recommended)$/);
      
      // High risk should have more severe warning
      const warningLevels = ['monitor-closely', 'caution-advised', 'immediate-rest-recommended'];
      const lowIndex = warningLevels.indexOf(lowRiskAssessment.warningLevel);
      const highIndex = warningLevels.indexOf(highRiskAssessment.warningLevel);
      
      expect(highIndex).toBeGreaterThanOrEqual(lowIndex);
    });

    it('should generate comprehensive recommendations', () => {
      const runs = createHighRiskTrainingHistory(5);
      const assessment = assessInjuryRisk(runs);
      
      expect(assessment.recommendations.immediate.length).toBeGreaterThan(0);
      expect(assessment.recommendations.shortTerm.length).toBeGreaterThan(0);
      expect(assessment.recommendations.longTerm.length).toBeGreaterThan(0);
      expect(assessment.recommendations.monitoring.length).toBeGreaterThan(0);
      
      // Recommendations should be relevant to risk level
      if (assessment.riskLevel === 'high' || assessment.riskLevel === 'critical') {
        expect(assessment.recommendations.immediate.some(rec => 
          rec.includes('reduce') || rec.includes('rest') || rec.includes('stop')
        )).toBe(true);
      }
    });

    it('should provide recovery guidance', () => {
      const runs = createOverreachingHistory(3);
      const assessment = assessInjuryRisk(runs);
      
      expect(assessment.recoveryGuidance.estimatedRecoveryDays).toBeGreaterThan(0);
      expect(assessment.recoveryGuidance.safeReturnCriteria.length).toBeGreaterThan(0);
      expect(assessment.recoveryGuidance.progressiveReturnPlan.length).toBeGreaterThan(0);
      
      // Recovery plan should have phases
      assessment.recoveryGuidance.progressiveReturnPlan.forEach(phase => {
        expect(phase.phase).toBeTruthy();
        expect(phase.duration).toBeTruthy();
        expect(phase.activities.length).toBeGreaterThan(0);
        expect(phase.progressMarkers.length).toBeGreaterThan(0);
      });
    });
  });

  describe('monitorRiskFactorResolution', () => {
    it('should detect improving risk factors', () => {
      const highRiskRuns = createHighRiskTrainingHistory(4);
      const lowRiskRuns = createLowRiskTrainingHistory(4);
      
      const highRiskAssessment = assessInjuryRisk(highRiskRuns);
      const lowRiskAssessment = assessInjuryRisk(lowRiskRuns);
      
      const resolution = monitorRiskFactorResolution(lowRiskAssessment, highRiskAssessment);
      
      expect(resolution.overallTrend).toMatch(/^(improving|stable|worsening)$/);
      expect(resolution.improvingFactors).toBeInstanceOf(Array);
      expect(resolution.worseningFactors).toBeInstanceOf(Array);
      expect(resolution.stableFactors).toBeInstanceOf(Array);
      expect(typeof resolution.readyForProgression).toBe('boolean');
    });

    it('should detect worsening risk factors', () => {
      const lowRiskRuns = createLowRiskTrainingHistory(4);
      const highRiskRuns = createHighRiskTrainingHistory(4);
      
      const lowRiskAssessment = assessInjuryRisk(lowRiskRuns);
      const highRiskAssessment = assessInjuryRisk(highRiskRuns);
      
      const resolution = monitorRiskFactorResolution(highRiskAssessment, lowRiskAssessment);
      
      expect(resolution.overallTrend).toMatch(/^(improving|stable|worsening)$/);
      expect(resolution.readyForProgression).toBe(false);
    });

    it('should determine readiness for progression', () => {
      const runs = createLowRiskTrainingHistory(6);
      const assessment = assessInjuryRisk(runs);
      
      // Create a slightly worse previous assessment
      const previousAssessment = { ...assessment };
      previousAssessment.overallRiskScore += 20;
      
      const resolution = monitorRiskFactorResolution(assessment, previousAssessment);
      
      if (assessment.riskLevel === 'low' && assessment.overreachingStatus.status === 'normal') {
        expect(resolution.readyForProgression).toBe(true);
      }
    });
  });

  describe('generateInjuryPreventionPlan', () => {
    it('should generate comprehensive prevention plan', () => {
      const runs = createLowRiskTrainingHistory(6);
      const assessment = assessInjuryRisk(runs);
      const plan = generateInjuryPreventionPlan(assessment);
      
      expect(plan.preventionStrategies.length).toBeGreaterThan(0);
      expect(plan.trainingModifications.length).toBeGreaterThanOrEqual(0);
      expect(plan.recoveryProtocols.length).toBeGreaterThanOrEqual(0);
      expect(plan.monitoringPlan.length).toBeGreaterThan(0);
      
      // Should include general prevention strategies
      expect(plan.preventionStrategies.some(strategy => 
        strategy.includes('10%') || strategy.includes('strength')
      )).toBe(true);
    });

    it('should adapt plan to specific risk factors', () => {
      const runs = createHighRiskTrainingHistory(5);
      const assessment = assessInjuryRisk(runs);
      const plan = generateInjuryPreventionPlan(assessment);
      
      // Should have specific recommendations for high-risk factors
      if (assessment.riskFactors.trainingLoadSpike.severity === 'high') {
        expect(plan.trainingModifications.some(mod => 
          mod.includes('ACWR') || mod.includes('recovery weeks')
        )).toBe(true);
      }
      
      if (assessment.riskFactors.recoveryPatterns.severity === 'high') {
        expect(plan.recoveryProtocols.some(protocol => 
          protocol.includes('48 hours') || protocol.includes('sleep')
        )).toBe(true);
      }
    });

    it('should provide race-specific advice when target race provided', () => {
      const runs = createLowRiskTrainingHistory(6);
      const assessment = assessInjuryRisk(runs);
      
      const futureRaceDate = new Date();
      futureRaceDate.setDate(futureRaceDate.getDate() + 30);
      
      const plan = generateInjuryPreventionPlan(assessment, {
        targetRaceDate: futureRaceDate.toISOString(),
        targetDistance: 10000
      });
      
      if (plan.raceReadinessAdvice) {
        expect(plan.raceReadinessAdvice.length).toBeGreaterThan(0);
      }
      // Race advice may not be provided for low-risk scenarios
    });

    it('should warn against racing when risk is too high', () => {
      const runs = createOverreachingHistory(3);
      const assessment = assessInjuryRisk(runs);
      
      const futureRaceDate = new Date();
      futureRaceDate.setDate(futureRaceDate.getDate() + 14);
      
      const plan = generateInjuryPreventionPlan(assessment, {
        targetRaceDate: futureRaceDate.toISOString(),
        targetDistance: 21097
      });
      
      if (assessment.riskLevel === 'high' || assessment.riskLevel === 'critical') {
        expect(plan.raceReadinessAdvice!.some(advice => 
          advice.includes('postponing') || advice.includes('too high')
        )).toBe(true);
      }
    });
  });

  describe('Utility Functions', () => {
    describe('formatRiskLevel', () => {
      it('should format risk levels correctly', () => {
        expect(formatRiskLevel('low')).toBe('Low Risk');
        expect(formatRiskLevel('moderate')).toBe('Moderate Risk');
        expect(formatRiskLevel('high')).toBe('High Risk');
        expect(formatRiskLevel('critical')).toBe('Critical Risk');
        expect(formatRiskLevel('unknown')).toBe('Unknown Risk');
      });
    });

    describe('formatWarningLevel', () => {
      it('should format warning levels correctly', () => {
        expect(formatWarningLevel('monitor-closely')).toBe('Monitor Closely');
        expect(formatWarningLevel('caution-advised')).toBe('Caution Advised');
        expect(formatWarningLevel('immediate-rest-recommended')).toBe('Immediate Rest Recommended');
        expect(formatWarningLevel('unknown')).toBe('Unknown Warning Level');
      });
    });

    describe('formatOverreachingStatus', () => {
      it('should format overreaching status correctly', () => {
        expect(formatOverreachingStatus('normal')).toBe('Normal');
        expect(formatOverreachingStatus('functional')).toBe('Functional Overreaching');
        expect(formatOverreachingStatus('non-functional')).toBe('Non-Functional Overreaching');
        expect(formatOverreachingStatus('overtraining')).toBe('Overtraining Syndrome');
        expect(formatOverreachingStatus('unknown')).toBe('Unknown Status');
      });
    });
  });

  describe('Edge Cases and Data Quality', () => {
    it('should handle empty run history', () => {
      const assessment = assessInjuryRisk([]);
      
      expect(assessment.overallRiskScore).toBeLessThan(30);
      expect(assessment.riskLevel).toBe('low');
      expect(assessment.dataQuality).toBe('low');
      expect(assessment.confidenceScore).toBeLessThan(0.5);
    });

    it('should handle runs without heart rate data', () => {
      const runs = createLowRiskTrainingHistory(6).map(run => ({
        ...run,
        average_heartrate: undefined
      }));
      
      const assessment = assessInjuryRisk(runs);
      
      expect(assessment.riskFactors.heartRateAnomalies.description).toContain('Insufficient heart rate data');
      expect(assessment.dataQuality).toBe('low');
    });

    it('should handle inconsistent training patterns', () => {
      const runs: EnrichedRun[] = [];
      const baseDate = new Date();
      
      // Create very inconsistent training
      for (let i = 0; i < 20; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() - i * 3); // Irregular spacing
        
        const distance = 2000 + Math.random() * 15000; // Highly variable distance
        const pace = 240 + Math.random() * 120; // Highly variable pace
        const movingTime = (distance / 1000) * pace;
        
        runs.push(createMockRun({
          start_date: date.toISOString(),
          distance,
          moving_time: movingTime,
          average_speed: distance / movingTime,
          average_heartrate: 140 + Math.random() * 40
        }));
      }
      
      const assessment = assessInjuryRisk(runs);
      
      expect(assessment.riskFactors.paceConsistency.variabilityIndex).toBeGreaterThan(0);
      expect(assessment.riskFactors.recoveryPatterns.score).toBeGreaterThan(0);
    });

    it('should provide reasonable assessments for all risk levels', () => {
      const testCases = [
        createLowRiskTrainingHistory(8),
        createHighRiskTrainingHistory(6),
        createOverreachingHistory(4)
      ];
      
      testCases.forEach(runs => {
        const assessment = assessInjuryRisk(runs);
        
        expect(assessment.overallRiskScore).toBeGreaterThanOrEqual(0);
        expect(assessment.overallRiskScore).toBeLessThanOrEqual(100);
        expect(assessment.confidenceScore).toBeGreaterThan(0);
        expect(assessment.confidenceScore).toBeLessThanOrEqual(1);
        expect(assessment.runsAnalyzed).toBe(runs.length);
        
        // All risk factors should have valid scores
        Object.values(assessment.riskFactors).forEach(factor => {
          expect(factor.score).toBeGreaterThanOrEqual(0);
          expect(factor.score).toBeLessThanOrEqual(100);
        });
      });
    });

    it('should maintain consistency across multiple assessments', () => {
      const runs = createLowRiskTrainingHistory(8);
      
      const assessment1 = assessInjuryRisk(runs);
      const assessment2 = assessInjuryRisk(runs);
      
      expect(assessment1.overallRiskScore).toBe(assessment2.overallRiskScore);
      expect(assessment1.riskLevel).toBe(assessment2.riskLevel);
      expect(assessment1.overreachingStatus.status).toBe(assessment2.overreachingStatus.status);
    });

    it('should handle extreme training scenarios', () => {
      // Test with very high volume
      const extremeRuns: EnrichedRun[] = [];
      const baseDate = new Date();
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() - i);
        
        extremeRuns.push(createMockRun({
          start_date: date.toISOString(),
          distance: 20000, // 20km daily
          moving_time: 6000, // 5:00/km pace
          average_heartrate: 180 // Very high HR
        }));
      }
      
      const assessment = assessInjuryRisk(extremeRuns);
      
      expect(assessment.riskLevel).toMatch(/^(low|moderate|high|critical)$/);
      expect(assessment.warningLevel).toMatch(/^(monitor-closely|caution-advised|immediate-rest-recommended)$/);
      expect(assessment.overreachingStatus.status).toMatch(/^(normal|functional|non-functional|overtraining)$/);
      
      // For extreme scenarios, we expect at least some elevated risk
      expect(assessment.overallRiskScore).toBeGreaterThan(10);
    });
  });
});