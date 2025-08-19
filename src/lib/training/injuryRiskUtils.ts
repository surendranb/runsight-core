// Overreaching and Injury Risk Detection System
// Requirements: 13.1, 13.2, 13.3, 13.4, 13.5

import { EnrichedRun } from '../../types';
import { calculateTRIMP } from './trainingLoadUtils';
import { calculateACWRFromRuns } from './acwrUtils';
import { analyzeFitnessProgression } from './racePredictionUtils';

export interface InjuryRiskAssessment {
  overallRiskScore: number; // 0-100, higher = more risk
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  warningLevel: 'monitor-closely' | 'caution-advised' | 'immediate-rest-recommended';
  
  // Risk factors breakdown
  riskFactors: {
    trainingLoadSpike: {
      score: number; // 0-100
      severity: 'low' | 'moderate' | 'high' | 'critical';
      description: string;
      acwrValue: number;
    };
    performanceDecline: {
      score: number; // 0-100
      severity: 'low' | 'moderate' | 'high' | 'critical';
      description: string;
      trendDirection: 'improving' | 'stable' | 'declining';
    };
    heartRateAnomalies: {
      score: number; // 0-100
      severity: 'low' | 'moderate' | 'high' | 'critical';
      description: string;
      restingHRTrend?: 'normal' | 'elevated' | 'declining';
    };
    paceConsistency: {
      score: number; // 0-100
      severity: 'low' | 'moderate' | 'high' | 'critical';
      description: string;
      variabilityIndex: number;
    };
    recoveryPatterns: {
      score: number; // 0-100
      severity: 'low' | 'moderate' | 'high' | 'critical';
      description: string;
      recoveryQuality: 'excellent' | 'good' | 'fair' | 'poor';
    };
  };
  
  // Overreaching detection
  overreachingStatus: {
    status: 'normal' | 'functional' | 'non-functional' | 'overtraining';
    confidence: number; // 0-1
    indicators: Array<{
      indicator: string;
      severity: 'low' | 'medium' | 'high';
      trend: 'improving' | 'stable' | 'worsening';
      description: string;
    }>;
    daysInCurrentState: number;
  };
  
  // Recommendations and actions
  recommendations: {
    immediate: string[]; // Actions to take right now
    shortTerm: string[]; // Actions for next 1-2 weeks
    longTerm: string[]; // Actions for next month+
    monitoring: string[]; // What to watch for
  };
  
  // Recovery and return-to-training guidance
  recoveryGuidance: {
    estimatedRecoveryDays: number;
    safeReturnCriteria: string[];
    progressiveReturnPlan: Array<{
      phase: string;
      duration: string;
      activities: string[];
      progressMarkers: string[];
    }>;
  };
  
  // Metadata
  analysisDate: string;
  dataQuality: 'high' | 'medium' | 'low';
  confidenceScore: number; // 0-1
  runsAnalyzed: number;
}

export interface OverreachingIndicator {
  name: string;
  value: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high';
  trend: 'improving' | 'stable' | 'worsening';
  description: string;
}

export interface TrainingLoadPattern {
  weeklyDistances: number[]; // Last 8 weeks
  weeklyTRIMP: number[]; // Last 8 weeks
  acwrHistory: Array<{ date: string; value: number; status: string }>;
  loadSpikes: Array<{
    week: number;
    increase: number; // Percentage increase
    severity: 'minor' | 'moderate' | 'major' | 'extreme';
  }>;
  chronicLoadTrend: 'increasing' | 'stable' | 'decreasing';
}

/**
 * Comprehensive injury risk assessment using multiple factors
 * Requirements: 13.1, 13.2, 13.3
 */
export const assessInjuryRisk = (runs: EnrichedRun[]): InjuryRiskAssessment => {
  // Filter recent runs (last 90 days)
  const recentRuns = runs
    .filter(run => {
      const runDate = new Date(run.start_date);
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      return runDate >= ninetyDaysAgo;
    })
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

  if (recentRuns.length < 10) {
    return createMinimalRiskAssessment(recentRuns);
  }

  // Analyze training load patterns
  const trainingLoadPattern = analyzeTrainingLoadPattern(recentRuns);
  
  // Calculate individual risk factors
  const trainingLoadSpike = assessTrainingLoadSpike(trainingLoadPattern);
  const performanceDecline = assessPerformanceDecline(recentRuns);
  const heartRateAnomalies = assessHeartRateAnomalies(recentRuns);
  const paceConsistency = assessPaceConsistency(recentRuns);
  const recoveryPatterns = assessRecoveryPatterns(recentRuns);
  
  // Detect overreaching status
  const overreachingStatus = detectOverreaching(
    recentRuns,
    trainingLoadPattern,
    [trainingLoadSpike, performanceDecline, heartRateAnomalies, paceConsistency, recoveryPatterns]
  );
  
  // Calculate overall risk score
  const overallRiskScore = calculateOverallRiskScore([
    trainingLoadSpike.score,
    performanceDecline.score,
    heartRateAnomalies.score,
    paceConsistency.score,
    recoveryPatterns.score
  ]);
  
  // Determine risk level and warning level
  const riskLevel = determineRiskLevel(overallRiskScore);
  const warningLevel = determineWarningLevel(overallRiskScore, overreachingStatus.status);
  
  // Generate recommendations
  const recommendations = generateRecommendations(
    riskLevel,
    overreachingStatus,
    { trainingLoadSpike, performanceDecline, heartRateAnomalies, paceConsistency, recoveryPatterns }
  );
  
  // Generate recovery guidance
  const recoveryGuidance = generateRecoveryGuidance(riskLevel, overreachingStatus);
  
  // Assess data quality
  const dataQuality = assessDataQuality(recentRuns);
  const confidenceScore = calculateConfidenceScore(recentRuns, dataQuality);

  return {
    overallRiskScore: Math.round(overallRiskScore),
    riskLevel,
    warningLevel,
    riskFactors: {
      trainingLoadSpike,
      performanceDecline,
      heartRateAnomalies,
      paceConsistency,
      recoveryPatterns
    },
    overreachingStatus,
    recommendations,
    recoveryGuidance,
    analysisDate: new Date().toISOString(),
    dataQuality,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    runsAnalyzed: recentRuns.length
  };
};

/**
 * Analyze training load patterns for spikes and trends
 * Requirements: 13.1
 */
const analyzeTrainingLoadPattern = (runs: EnrichedRun[]): TrainingLoadPattern => {
  const weeklyDistances: number[] = [];
  const weeklyTRIMP: number[] = [];
  const acwrHistory: TrainingLoadPattern['acwrHistory'] = [];
  const loadSpikes: TrainingLoadPattern['loadSpikes'] = [];
  
  // Calculate weekly data for last 8 weeks
  for (let week = 0; week < 8; week++) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (week * 7));
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - ((week + 1) * 7));
    
    const weekRuns = runs.filter(run => {
      const runDate = new Date(run.start_date);
      return runDate >= weekEnd && runDate < weekStart;
    });
    
    // Calculate weekly distance
    const weeklyDistance = weekRuns.reduce((sum, run) => sum + run.distance, 0) / 1000; // km
    weeklyDistances.unshift(weeklyDistance); // Add to beginning for chronological order
    
    // Calculate weekly TRIMP
    const weeklyTRIMPValue = weekRuns.reduce((sum, run) => {
      const trimpResult = calculateTRIMP(run, { restingHeartRate: 60, maxHeartRate: 190 });
      return sum + (trimpResult.value || 0);
    }, 0);
    weeklyTRIMP.unshift(weeklyTRIMPValue);
    
    // Calculate ACWR for this week
    if (week < 6) { // Need at least 6 weeks for ACWR
      const acwrRuns = runs.filter(run => {
        const runDate = new Date(run.start_date);
        const sixWeeksAgo = new Date(weekStart);
        sixWeeksAgo.setDate(sixWeeksAgo.getDate() - (6 * 7));
        return runDate >= sixWeeksAgo && runDate < weekStart;
      });
      
      if (acwrRuns.length >= 14) { // Need sufficient data
        const acwrResult = calculateACWRFromRuns(acwrRuns, 'distance');
        acwrHistory.unshift({
          date: weekStart.toISOString(),
          value: acwrResult.value.acwr,
          status: acwrResult.value.status
        });
      }
    }
  }
  
  // Detect load spikes
  for (let i = 1; i < weeklyDistances.length; i++) {
    const currentWeek = weeklyDistances[i];
    const previousWeek = weeklyDistances[i - 1];
    
    if (previousWeek > 0) {
      const increase = ((currentWeek - previousWeek) / previousWeek) * 100;
      
      if (increase > 10) { // More than 10% increase
        let severity: 'minor' | 'moderate' | 'major' | 'extreme' = 'minor';
        if (increase > 50) severity = 'extreme';
        else if (increase > 30) severity = 'major';
        else if (increase > 20) severity = 'moderate';
        
        loadSpikes.push({
          week: i,
          increase: Math.round(increase),
          severity
        });
      }
    }
  }
  
  // Determine chronic load trend
  let chronicLoadTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
  if (weeklyDistances.length >= 4) {
    const firstHalf = weeklyDistances.slice(0, 4).reduce((sum, val) => sum + val, 0) / 4;
    const secondHalf = weeklyDistances.slice(-4).reduce((sum, val) => sum + val, 0) / 4;
    
    const change = ((secondHalf - firstHalf) / firstHalf) * 100;
    if (change > 10) chronicLoadTrend = 'increasing';
    else if (change < -10) chronicLoadTrend = 'decreasing';
  }
  
  return {
    weeklyDistances,
    weeklyTRIMP,
    acwrHistory,
    loadSpikes,
    chronicLoadTrend
  };
};

/**
 * Assess training load spike risk
 * Requirements: 13.1
 */
const assessTrainingLoadSpike = (pattern: TrainingLoadPattern): InjuryRiskAssessment['riskFactors']['trainingLoadSpike'] => {
  let score = 0;
  let severity: 'low' | 'moderate' | 'high' | 'critical' = 'low';
  let description = 'Training load progression appears appropriate';
  let acwrValue = 1.0;
  
  // Check recent ACWR values
  if (pattern.acwrHistory.length > 0) {
    const recentACWR = pattern.acwrHistory[pattern.acwrHistory.length - 1];
    acwrValue = recentACWR.value;
    
    if (recentACWR.status === 'high-risk') {
      score += 40;
      severity = 'critical';
      description = `Critical ACWR of ${acwrValue.toFixed(2)} indicates very high injury risk`;
    } else if (recentACWR.status === 'caution') {
      score += 25;
      severity = 'high';
      description = `Elevated ACWR of ${acwrValue.toFixed(2)} suggests increased injury risk`;
    } else if (recentACWR.status === 'detraining') {
      score += 10;
      severity = 'moderate';
      description = `Low ACWR of ${acwrValue.toFixed(2)} indicates detraining - gradual load increase needed`;
    }
  }
  
  // Check for recent load spikes
  const recentSpikes = pattern.loadSpikes.filter(spike => spike.week >= pattern.weeklyDistances.length - 3);
  if (recentSpikes.length > 0) {
    const maxSpike = recentSpikes.reduce((max, spike) => spike.increase > max.increase ? spike : max);
    
    if (maxSpike.severity === 'extreme') {
      score += 35;
      severity = 'critical';
      description += `. Extreme load spike of ${maxSpike.increase}% detected`;
    } else if (maxSpike.severity === 'major') {
      score += 25;
      severity = severity === 'critical' ? 'critical' : 'high';
      description += `. Major load spike of ${maxSpike.increase}% detected`;
    } else if (maxSpike.severity === 'moderate') {
      score += 15;
      severity = severity === 'critical' ? 'critical' : severity === 'high' ? 'high' : 'moderate';
      description += `. Moderate load spike of ${maxSpike.increase}% detected`;
    }
  }
  
  // Check chronic load trend
  if (pattern.chronicLoadTrend === 'increasing') {
    score += 10;
    description += '. Chronic load is increasing - monitor for overreaching';
  }
  
  return {
    score: Math.min(100, score),
    severity,
    description,
    acwrValue
  };
};

/**
 * Assess performance decline patterns
 * Requirements: 13.2
 */
const assessPerformanceDecline = (runs: EnrichedRun[]): InjuryRiskAssessment['riskFactors']['performanceDecline'] => {
  let score = 0;
  let severity: 'low' | 'moderate' | 'high' | 'critical' = 'low';
  let description = 'Performance trends appear stable';
  let trendDirection: 'improving' | 'stable' | 'declining' = 'stable';
  
  if (runs.length < 8) {
    return { score: 10, severity: 'low', description: 'Insufficient data for performance trend analysis', trendDirection: 'stable' };
  }
  
  // Analyze pace trends over time
  const recentRuns = runs.slice(0, 10); // Last 10 runs
  const paces = recentRuns.map(run => run.moving_time / (run.distance / 1000));
  
  // Calculate trend using simple linear regression
  const n = paces.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = paces;
  
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumXX = x.reduce((sum, val) => sum + val * val, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const paceChange = slope * (n - 1); // Total change over the period
  
  // Determine trend direction and severity
  if (paceChange > 10) { // Getting slower by >10 seconds/km
    trendDirection = 'declining';
    if (paceChange > 30) {
      score += 30;
      severity = 'high';
      description = `Significant performance decline detected (${Math.round(paceChange)}s/km slower)`;
    } else if (paceChange > 20) {
      score += 20;
      severity = 'moderate';
      description = `Moderate performance decline detected (${Math.round(paceChange)}s/km slower)`;
    } else {
      score += 10;
      severity = 'low';
      description = `Minor performance decline detected (${Math.round(paceChange)}s/km slower)`;
    }
  } else if (paceChange < -5) { // Getting faster
    trendDirection = 'improving';
    description = `Performance improving (${Math.abs(Math.round(paceChange))}s/km faster)`;
  }
  
  // Check for pace variability (inconsistency can indicate fatigue)
  const avgPace = paces.reduce((sum, pace) => sum + pace, 0) / paces.length;
  const paceVariability = Math.sqrt(
    paces.reduce((sum, pace) => sum + Math.pow(pace - avgPace, 2), 0) / paces.length
  );
  
  if (paceVariability > 30) { // High variability
    score += 15;
    severity = severity === 'low' ? 'moderate' : severity;
    description += '. High pace variability suggests inconsistent performance';
  }
  
  return {
    score: Math.min(100, score),
    severity,
    description,
    trendDirection
  };
};

/**
 * Assess heart rate anomalies
 * Requirements: 13.2
 */
const assessHeartRateAnomalies = (runs: EnrichedRun[]): InjuryRiskAssessment['riskFactors']['heartRateAnomalies'] => {
  let score = 0;
  let severity: 'low' | 'moderate' | 'high' | 'critical' = 'low';
  let description = 'Heart rate patterns appear normal';
  let restingHRTrend: 'normal' | 'elevated' | 'declining' | undefined;
  
  const runsWithHR = runs.filter(run => run.average_heartrate && run.average_heartrate > 0);
  
  if (runsWithHR.length < 5) {
    return {
      score: 5,
      severity: 'low',
      description: 'Insufficient heart rate data for analysis',
      restingHRTrend: undefined
    };
  }
  
  // Analyze heart rate trends
  const recentHRs = runsWithHR.slice(0, 8).map(run => run.average_heartrate!);
  const avgRecentHR = recentHRs.reduce((sum, hr) => sum + hr, 0) / recentHRs.length;
  
  // Compare with older data if available
  if (runsWithHR.length >= 16) {
    const olderHRs = runsWithHR.slice(8, 16).map(run => run.average_heartrate!);
    const avgOlderHR = olderHRs.reduce((sum, hr) => sum + hr, 0) / olderHRs.length;
    
    const hrChange = avgRecentHR - avgOlderHR;
    
    if (hrChange > 10) { // Elevated HR
      restingHRTrend = 'elevated';
      score += 20;
      severity = 'moderate';
      description = `Elevated heart rate trend detected (+${Math.round(hrChange)} bpm average)`;
    } else if (hrChange < -10) { // Declining HR (could indicate overtraining)
      restingHRTrend = 'declining';
      score += 15;
      severity = 'moderate';
      description = `Declining heart rate trend detected (${Math.round(hrChange)} bpm average)`;
    } else {
      restingHRTrend = 'normal';
    }
  }
  
  // Check for HR variability at similar paces
  const paceHRPairs = runsWithHR.map(run => ({
    pace: run.moving_time / (run.distance / 1000),
    hr: run.average_heartrate!
  }));
  
  // Group by similar paces (±30 seconds/km)
  const paceGroups = new Map<number, number[]>();
  paceHRPairs.forEach(pair => {
    const paceKey = Math.round(pair.pace / 30) * 30; // Round to nearest 30s
    if (!paceGroups.has(paceKey)) {
      paceGroups.set(paceKey, []);
    }
    paceGroups.get(paceKey)!.push(pair.hr);
  });
  
  // Check for high HR variability at similar paces
  let highVariabilityCount = 0;
  paceGroups.forEach(hrs => {
    if (hrs.length >= 3) {
      const avgHR = hrs.reduce((sum, hr) => sum + hr, 0) / hrs.length;
      const hrVariability = Math.sqrt(
        hrs.reduce((sum, hr) => sum + Math.pow(hr - avgHR, 2), 0) / hrs.length
      );
      
      if (hrVariability > 15) { // High HR variability at similar pace
        highVariabilityCount++;
      }
    }
  });
  
  if (highVariabilityCount > 0) {
    score += 10;
    severity = severity === 'low' ? 'moderate' : severity;
    description += '. High heart rate variability at similar paces detected';
  }
  
  return {
    score: Math.min(100, score),
    severity,
    description,
    restingHRTrend
  };
};

/**
 * Assess pace consistency patterns
 * Requirements: 13.2
 */
const assessPaceConsistency = (runs: EnrichedRun[]): InjuryRiskAssessment['riskFactors']['paceConsistency'] => {
  let score = 0;
  let severity: 'low' | 'moderate' | 'high' | 'critical' = 'low';
  let description = 'Pace consistency appears normal';
  
  if (runs.length < 8) {
    return {
      score: 5,
      severity: 'low',
      description: 'Insufficient data for pace consistency analysis',
      variabilityIndex: 0
    };
  }
  
  // Calculate pace variability for similar distance runs
  const distanceGroups = new Map<number, number[]>();
  
  runs.forEach(run => {
    const distanceKey = Math.round(run.distance / 1000); // Round to nearest km
    const pace = run.moving_time / (run.distance / 1000);
    
    if (!distanceGroups.has(distanceKey)) {
      distanceGroups.set(distanceKey, []);
    }
    distanceGroups.get(distanceKey)!.push(pace);
  });
  
  let totalVariabilityIndex = 0;
  let groupCount = 0;
  
  distanceGroups.forEach((paces, distance) => {
    if (paces.length >= 3 && distance >= 3) { // At least 3 runs of 3km+
      const avgPace = paces.reduce((sum, pace) => sum + pace, 0) / paces.length;
      const paceVariability = Math.sqrt(
        paces.reduce((sum, pace) => sum + Math.pow(pace - avgPace, 2), 0) / paces.length
      );
      
      const variabilityIndex = (paceVariability / avgPace) * 100; // Coefficient of variation
      totalVariabilityIndex += variabilityIndex;
      groupCount++;
      
      if (variabilityIndex > 15) { // High variability (>15%)
        score += 15;
        severity = 'moderate';
        description = `High pace variability detected for ${distance}km runs (${variabilityIndex.toFixed(1)}% CV)`;
      } else if (variabilityIndex > 10) {
        score += 8;
        severity = severity === 'low' ? 'moderate' : severity;
        description = `Moderate pace variability detected for ${distance}km runs (${variabilityIndex.toFixed(1)}% CV)`;
      }
    }
  });
  
  const avgVariabilityIndex = groupCount > 0 ? totalVariabilityIndex / groupCount : 0;
  
  // Check for recent pace inconsistency
  const recentRuns = runs.slice(0, 5);
  if (recentRuns.length >= 3) {
    const recentPaces = recentRuns.map(run => run.moving_time / (run.distance / 1000));
    const avgRecentPace = recentPaces.reduce((sum, pace) => sum + pace, 0) / recentPaces.length;
    const recentVariability = Math.sqrt(
      recentPaces.reduce((sum, pace) => sum + Math.pow(pace - avgRecentPace, 2), 0) / recentPaces.length
    );
    
    if (recentVariability > 45) { // Very high recent variability
      score += 20;
      severity = 'high';
      description += '. Very high pace variability in recent runs suggests fatigue';
    }
  }
  
  return {
    score: Math.min(100, score),
    severity,
    description,
    variabilityIndex: Math.round(avgVariabilityIndex * 10) / 10
  };
};

/**
 * Assess recovery patterns between runs
 * Requirements: 13.2
 */
const assessRecoveryPatterns = (runs: EnrichedRun[]): InjuryRiskAssessment['riskFactors']['recoveryPatterns'] => {
  let score = 0;
  let severity: 'low' | 'moderate' | 'high' | 'critical' = 'low';
  let description = 'Recovery patterns appear adequate';
  let recoveryQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
  
  if (runs.length < 6) {
    return {
      score: 5,
      severity: 'low',
      description: 'Insufficient data for recovery pattern analysis',
      recoveryQuality: 'fair'
    };
  }
  
  // Analyze time between runs
  const runIntervals: number[] = [];
  for (let i = 1; i < runs.length && i < 10; i++) {
    const currentRun = new Date(runs[i - 1].start_date);
    const previousRun = new Date(runs[i].start_date);
    const intervalHours = (currentRun.getTime() - previousRun.getTime()) / (1000 * 60 * 60);
    runIntervals.push(intervalHours);
  }
  
  // Check for insufficient recovery time
  const shortRecoveries = runIntervals.filter(interval => interval < 24).length;
  const veryShortRecoveries = runIntervals.filter(interval => interval < 12).length;
  
  if (veryShortRecoveries > 0) {
    score += 25;
    severity = 'high';
    recoveryQuality = 'poor';
    description = `${veryShortRecoveries} runs with <12 hours recovery detected`;
  } else if (shortRecoveries > 2) {
    score += 15;
    severity = 'moderate';
    recoveryQuality = 'fair';
    description = `${shortRecoveries} runs with <24 hours recovery detected`;
  }
  
  // Analyze consecutive hard efforts
  let consecutiveHardEfforts = 0;
  let maxConsecutiveHard = 0;
  
  for (let i = 0; i < Math.min(runs.length, 14); i++) {
    const run = runs[i];
    const pace = run.moving_time / (run.distance / 1000);
    const isHardEffort = run.average_heartrate && run.average_heartrate > 160 || 
                       pace < 270 || // Faster than 4:30/km
                       run.distance > 15000; // Long run
    
    if (isHardEffort) {
      consecutiveHardEfforts++;
      maxConsecutiveHard = Math.max(maxConsecutiveHard, consecutiveHardEfforts);
    } else {
      consecutiveHardEfforts = 0;
    }
  }
  
  if (maxConsecutiveHard > 3) {
    score += 20;
    severity = 'high';
    recoveryQuality = 'poor';
    description += `. ${maxConsecutiveHard} consecutive hard efforts without adequate recovery`;
  } else if (maxConsecutiveHard > 2) {
    score += 10;
    severity = severity === 'low' ? 'moderate' : severity;
    recoveryQuality = recoveryQuality === 'good' ? 'fair' : recoveryQuality;
    description += `. ${maxConsecutiveHard} consecutive hard efforts detected`;
  }
  
  // Check weekly training frequency
  const weeklyFrequency = Math.min(runs.length, 7); // Runs in last week
  if (weeklyFrequency > 6) {
    score += 10;
    severity = severity === 'low' ? 'moderate' : severity;
    description += '. Very high training frequency (>6 runs/week)';
  }
  
  // Determine overall recovery quality
  if (score >= 30) recoveryQuality = 'poor';
  else if (score >= 15) recoveryQuality = 'fair';
  else if (score < 5) recoveryQuality = 'excellent';
  
  return {
    score: Math.min(100, score),
    severity,
    description,
    recoveryQuality
  };
};

/**
 * Detect overreaching status using multiple indicators
 * Requirements: 13.3, 13.4
 */
const detectOverreaching = (
  runs: EnrichedRun[],
  trainingLoadPattern: TrainingLoadPattern,
  riskFactors: Array<{ score: number; severity: string }>
): InjuryRiskAssessment['overreachingStatus'] => {
  const indicators: InjuryRiskAssessment['overreachingStatus']['indicators'] = [];
  let overallSeverity = 0;
  
  // Training load indicators
  if (trainingLoadPattern.acwrHistory.length > 0) {
    const recentACWR = trainingLoadPattern.acwrHistory[trainingLoadPattern.acwrHistory.length - 1];
    if (recentACWR.status === 'high-risk') {
      indicators.push({
        indicator: 'Acute-to-Chronic Workload Ratio',
        severity: 'high',
        trend: 'worsening',
        description: `ACWR of ${recentACWR.value.toFixed(2)} indicates high injury risk`
      });
      overallSeverity += 3;
    } else if (recentACWR.status === 'caution') {
      indicators.push({
        indicator: 'Training Load Spike',
        severity: 'medium',
        trend: 'stable',
        description: `ACWR of ${recentACWR.value.toFixed(2)} suggests elevated training stress`
      });
      overallSeverity += 2;
    }
  }
  
  // Performance indicators
  const performanceFactor = riskFactors.find(f => f.severity === 'high' || f.severity === 'critical');
  if (performanceFactor && performanceFactor.score > 20) {
    indicators.push({
      indicator: 'Performance Decline',
      severity: performanceFactor.severity === 'critical' ? 'high' : 'medium',
      trend: 'worsening',
      description: 'Declining performance despite maintained training load'
    });
    overallSeverity += performanceFactor.severity === 'critical' ? 3 : 2;
  }
  
  // Recovery indicators
  const recoveryFactor = riskFactors.find(f => f.score > 25);
  if (recoveryFactor) {
    indicators.push({
      indicator: 'Inadequate Recovery',
      severity: 'medium',
      trend: 'stable',
      description: 'Insufficient recovery time between training sessions'
    });
    overallSeverity += 2;
  }
  
  // Heart rate indicators
  const hrFactor = riskFactors.find(f => f.score > 15);
  if (hrFactor) {
    indicators.push({
      indicator: 'Heart Rate Anomalies',
      severity: 'medium',
      trend: 'stable',
      description: 'Unusual heart rate patterns detected'
    });
    overallSeverity += 1;
  }
  
  // Determine overreaching status
  let status: 'normal' | 'functional' | 'non-functional' | 'overtraining' = 'normal';
  let confidence = 0.7;
  
  if (overallSeverity >= 8) {
    status = 'overtraining';
    confidence = 0.8;
  } else if (overallSeverity >= 6) {
    status = 'non-functional';
    confidence = 0.75;
  } else if (overallSeverity >= 3) {
    status = 'functional';
    confidence = 0.7;
  }
  
  // Estimate days in current state (simplified)
  const daysInCurrentState = Math.min(14, Math.max(1, overallSeverity * 2));
  
  return {
    status,
    confidence,
    indicators,
    daysInCurrentState
  };
};

/**
 * Calculate overall risk score from individual factors
 * Requirements: 13.1
 */
const calculateOverallRiskScore = (factorScores: number[]): number => {
  // Weighted average with emphasis on highest risk factors
  const sortedScores = factorScores.sort((a, b) => b - a);
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  sortedScores.forEach((score, index) => {
    const weight = Math.pow(0.8, index); // Decreasing weights
    weightedSum += score * weight;
    totalWeight += weight;
  });
  
  return weightedSum / totalWeight;
};

/**
 * Determine risk level from overall score
 * Requirements: 13.2
 */
const determineRiskLevel = (score: number): 'low' | 'moderate' | 'high' | 'critical' => {
  if (score >= 70) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'moderate';
  return 'low';
};

/**
 * Determine warning level
 * Requirements: 13.2
 */
const determineWarningLevel = (
  score: number,
  overreachingStatus: string
): 'monitor-closely' | 'caution-advised' | 'immediate-rest-recommended' => {
  if (score >= 70 || overreachingStatus === 'overtraining') {
    return 'immediate-rest-recommended';
  }
  if (score >= 40 || overreachingStatus === 'non-functional') {
    return 'caution-advised';
  }
  return 'monitor-closely';
};

/**
 * Generate comprehensive recommendations
 * Requirements: 13.4, 13.5
 */
const generateRecommendations = (
  riskLevel: string,
  overreachingStatus: InjuryRiskAssessment['overreachingStatus'],
  riskFactors: any
): InjuryRiskAssessment['recommendations'] => {
  const immediate: string[] = [];
  const shortTerm: string[] = [];
  const longTerm: string[] = [];
  const monitoring: string[] = [];
  
  // Immediate recommendations based on risk level
  switch (riskLevel) {
    case 'critical':
      immediate.push('Stop all high-intensity training immediately');
      immediate.push('Consider complete rest for 3-7 days');
      immediate.push('Consult with sports medicine professional');
      immediate.push('Monitor for signs of illness or persistent fatigue');
      break;
      
    case 'high':
      immediate.push('Reduce training intensity by 50% this week');
      immediate.push('Cancel any planned hard workouts');
      immediate.push('Focus on easy runs and recovery activities');
      immediate.push('Ensure adequate sleep (8+ hours nightly)');
      break;
      
    case 'moderate':
      immediate.push('Reduce training volume by 20-30% this week');
      immediate.push('Add extra rest day if not already planned');
      immediate.push('Focus on recovery and easy aerobic runs');
      break;
      
    case 'low':
      immediate.push('Continue current training with close monitoring');
      immediate.push('Maintain good recovery practices');
      break;
  }
  
  // Short-term recommendations (1-2 weeks)
  if (riskLevel === 'critical' || riskLevel === 'high') {
    shortTerm.push('Gradually return to training with 50% previous volume');
    shortTerm.push('Avoid high-intensity sessions for 2 weeks');
    shortTerm.push('Focus on aerobic base building');
    shortTerm.push('Implement stress management techniques');
  } else if (riskLevel === 'moderate') {
    shortTerm.push('Gradually increase training load by max 10% per week');
    shortTerm.push('Limit high-intensity sessions to 1-2 per week');
    shortTerm.push('Prioritize recovery between hard sessions');
  } else {
    shortTerm.push('Continue progressive training with careful load management');
    shortTerm.push('Maintain current intensity distribution');
  }
  
  // Long-term recommendations (1+ months)
  longTerm.push('Implement periodized training plan');
  longTerm.push('Schedule regular recovery weeks (every 3-4 weeks)');
  longTerm.push('Monitor training load using ACWR principles');
  longTerm.push('Develop better recovery protocols');
  
  // Specific factor-based recommendations
  if (riskFactors.trainingLoadSpike.severity === 'high' || riskFactors.trainingLoadSpike.severity === 'critical') {
    shortTerm.push('Follow 10% rule for weekly mileage increases');
    longTerm.push('Use ACWR monitoring to prevent future load spikes');
  }
  
  if (riskFactors.recoveryPatterns.severity === 'high') {
    immediate.push('Ensure minimum 24 hours between hard efforts');
    shortTerm.push('Implement active recovery sessions');
    longTerm.push('Develop structured recovery protocols');
  }
  
  if (riskFactors.performanceDecline.severity === 'high') {
    immediate.push('Reduce training intensity until performance stabilizes');
    shortTerm.push('Focus on technique and form work');
    monitoring.push('Track performance metrics weekly');
  }
  
  // Monitoring recommendations
  monitoring.push('Monitor resting heart rate daily');
  monitoring.push('Track subjective wellness scores');
  monitoring.push('Watch for persistent fatigue or mood changes');
  monitoring.push('Monitor sleep quality and duration');
  
  if (overreachingStatus.status !== 'normal') {
    monitoring.push('Track recovery heart rate after standard efforts');
    monitoring.push('Monitor motivation and enjoyment levels');
    monitoring.push('Watch for increased susceptibility to illness');
  }
  
  return { immediate, shortTerm, longTerm, monitoring };
};

/**
 * Generate recovery guidance and return-to-training plan
 * Requirements: 13.5
 */
const generateRecoveryGuidance = (
  riskLevel: string,
  overreachingStatus: InjuryRiskAssessment['overreachingStatus']
): InjuryRiskAssessment['recoveryGuidance'] => {
  let estimatedRecoveryDays = 0;
  
  // Estimate recovery time based on risk level and overreaching status
  switch (riskLevel) {
    case 'critical':
      estimatedRecoveryDays = overreachingStatus.status === 'overtraining' ? 21 : 14;
      break;
    case 'high':
      estimatedRecoveryDays = overreachingStatus.status === 'non-functional' ? 14 : 10;
      break;
    case 'moderate':
      estimatedRecoveryDays = 7;
      break;
    case 'low':
      estimatedRecoveryDays = 3;
      break;
  }
  
  const safeReturnCriteria = [
    'Resting heart rate returns to normal baseline',
    'Subjective wellness scores improve to normal levels',
    'Motivation and enjoyment for training returns',
    'No persistent fatigue or mood disturbances',
    'Sleep quality returns to normal patterns'
  ];
  
  if (riskLevel === 'critical' || riskLevel === 'high') {
    safeReturnCriteria.push('Medical clearance if symptoms persist');
    safeReturnCriteria.push('Ability to complete easy runs without excessive fatigue');
  }
  
  // Progressive return plan
  const progressiveReturnPlan = [];
  
  if (riskLevel === 'critical' || riskLevel === 'high') {
    progressiveReturnPlan.push({
      phase: 'Complete Rest',
      duration: '3-7 days',
      activities: ['Complete rest from running', 'Light walking only', 'Focus on sleep and nutrition'],
      progressMarkers: ['Improved energy levels', 'Normal resting HR', 'Motivation returns']
    });
    
    progressiveReturnPlan.push({
      phase: 'Active Recovery',
      duration: '1 week',
      activities: ['Easy walking 20-30 minutes', 'Light stretching/yoga', 'Swimming if available'],
      progressMarkers: ['No fatigue from light activity', 'Stable mood', 'Good sleep quality']
    });
    
    progressiveReturnPlan.push({
      phase: 'Return to Easy Running',
      duration: '1-2 weeks',
      activities: ['Easy runs 20-30 minutes', 'Run every other day', 'Heart rate <70% max'],
      progressMarkers: ['Comfortable easy pace', 'Quick recovery', 'Enjoyment returns']
    });
    
    progressiveReturnPlan.push({
      phase: 'Gradual Build',
      duration: '2-4 weeks',
      activities: ['Increase volume by 10% weekly', 'Add one tempo run per week', 'Monitor ACWR closely'],
      progressMarkers: ['Consistent paces', 'Good recovery', 'No overreaching signs']
    });
  } else if (riskLevel === 'moderate') {
    progressiveReturnPlan.push({
      phase: 'Reduced Load',
      duration: '1 week',
      activities: ['Reduce volume by 30%', 'Easy runs only', 'Extra rest day'],
      progressMarkers: ['Improved energy', 'Stable performance', 'Good recovery']
    });
    
    progressiveReturnPlan.push({
      phase: 'Gradual Return',
      duration: '2 weeks',
      activities: ['Gradually return to normal volume', 'Add intensity carefully', 'Monitor closely'],
      progressMarkers: ['Consistent performance', 'Good adaptation', 'No fatigue accumulation']
    });
  } else {
    progressiveReturnPlan.push({
      phase: 'Continued Monitoring',
      duration: '1-2 weeks',
      activities: ['Continue current training', 'Enhanced recovery focus', 'Close monitoring'],
      progressMarkers: ['Stable metrics', 'Good adaptation', 'Maintained performance']
    });
  }
  
  return {
    estimatedRecoveryDays,
    safeReturnCriteria,
    progressiveReturnPlan
  };
};

/**
 * Assess data quality for injury risk analysis
 * Requirements: 13.1
 */
const assessDataQuality = (runs: EnrichedRun[]): 'high' | 'medium' | 'low' => {
  if (runs.length < 10) return 'low';
  
  const runsWithHR = runs.filter(run => run.average_heartrate && run.average_heartrate > 0);
  const hrDataPercentage = runsWithHR.length / runs.length;
  
  if (runs.length >= 30 && hrDataPercentage >= 0.7) return 'high';
  if (runs.length >= 20 && hrDataPercentage >= 0.5) return 'medium';
  return 'low';
};

/**
 * Calculate confidence score for the assessment
 * Requirements: 13.1
 */
const calculateConfidenceScore = (runs: EnrichedRun[], dataQuality: string): number => {
  let confidence = 0.5; // Base confidence
  
  // Data quantity bonus
  if (runs.length >= 30) confidence += 0.2;
  else if (runs.length >= 20) confidence += 0.1;
  
  // Data quality bonus
  switch (dataQuality) {
    case 'high': confidence += 0.2; break;
    case 'medium': confidence += 0.1; break;
  }
  
  // Time span bonus (more recent data is better)
  const oldestRun = new Date(runs[runs.length - 1].start_date);
  const daysSinceOldest = (Date.now() - oldestRun.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceOldest <= 30) confidence += 0.1;
  else if (daysSinceOldest <= 60) confidence += 0.05;
  
  return Math.max(0.2, Math.min(0.95, confidence));
};

/**
 * Create minimal risk assessment for insufficient data
 * Requirements: 13.1
 */
const createMinimalRiskAssessment = (runs: EnrichedRun[]): InjuryRiskAssessment => {
  return {
    overallRiskScore: 20,
    riskLevel: 'low',
    warningLevel: 'monitor-closely',
    riskFactors: {
      trainingLoadSpike: {
        score: 5,
        severity: 'low',
        description: 'Insufficient data for training load analysis',
        acwrValue: 1.0
      },
      performanceDecline: {
        score: 5,
        severity: 'low',
        description: 'Insufficient data for performance trend analysis',
        trendDirection: 'stable'
      },
      heartRateAnomalies: {
        score: 5,
        severity: 'low',
        description: 'Insufficient heart rate data for analysis',
        restingHRTrend: undefined
      },
      paceConsistency: {
        score: 5,
        severity: 'low',
        description: 'Insufficient data for pace consistency analysis',
        variabilityIndex: 0
      },
      recoveryPatterns: {
        score: 5,
        severity: 'low',
        description: 'Insufficient data for recovery pattern analysis',
        recoveryQuality: 'fair'
      }
    },
    overreachingStatus: {
      status: 'normal',
      confidence: 0.3,
      indicators: [],
      daysInCurrentState: 0
    },
    recommendations: {
      immediate: ['Continue building training history for better analysis'],
      shortTerm: ['Focus on consistent training and data collection'],
      longTerm: ['Establish baseline metrics for future monitoring'],
      monitoring: ['Track all runs with heart rate data when possible']
    },
    recoveryGuidance: {
      estimatedRecoveryDays: 0,
      safeReturnCriteria: ['Maintain consistent training'],
      progressiveReturnPlan: [{
        phase: 'Data Collection',
        duration: 'Ongoing',
        activities: ['Continue regular training', 'Record all workout data'],
        progressMarkers: ['Consistent data collection', 'Baseline establishment']
      }]
    },
    analysisDate: new Date().toISOString(),
    dataQuality: 'low',
    confidenceScore: 0.3,
    runsAnalyzed: runs.length
  };
};

/**
 * Monitor for risk factor resolution
 * Requirements: 13.5
 */
export const monitorRiskFactorResolution = (
  currentAssessment: InjuryRiskAssessment,
  previousAssessment: InjuryRiskAssessment
): {
  improvingFactors: string[];
  worseningFactors: string[];
  stableFactors: string[];
  overallTrend: 'improving' | 'stable' | 'worsening';
  readyForProgression: boolean;
} => {
  const improvingFactors: string[] = [];
  const worseningFactors: string[] = [];
  const stableFactors: string[] = [];
  
  // Compare each risk factor
  const factors = ['trainingLoadSpike', 'performanceDecline', 'heartRateAnomalies', 'paceConsistency', 'recoveryPatterns'] as const;
  
  factors.forEach(factor => {
    const currentScore = currentAssessment.riskFactors[factor].score;
    const previousScore = previousAssessment.riskFactors[factor].score;
    const change = currentScore - previousScore;
    
    if (change < -10) {
      improvingFactors.push(factor.replace(/([A-Z])/g, ' $1').toLowerCase());
    } else if (change > 10) {
      worseningFactors.push(factor.replace(/([A-Z])/g, ' $1').toLowerCase());
    } else {
      stableFactors.push(factor.replace(/([A-Z])/g, ' $1').toLowerCase());
    }
  });
  
  // Determine overall trend
  let overallTrend: 'improving' | 'stable' | 'worsening' = 'stable';
  const scoreChange = currentAssessment.overallRiskScore - previousAssessment.overallRiskScore;
  
  if (scoreChange < -15) overallTrend = 'improving';
  else if (scoreChange > 15) overallTrend = 'worsening';
  
  // Determine if ready for training progression
  const readyForProgression = 
    currentAssessment.riskLevel === 'low' &&
    currentAssessment.overreachingStatus.status === 'normal' &&
    improvingFactors.length >= worseningFactors.length;
  
  return {
    improvingFactors,
    worseningFactors,
    stableFactors,
    overallTrend,
    readyForProgression
  };
};

/**
 * Generate injury prevention recommendations
 * Requirements: 13.4
 */
export const generateInjuryPreventionPlan = (
  assessment: InjuryRiskAssessment,
  userGoals?: {
    targetRaceDate?: string;
    targetDistance?: number;
    currentWeeklyVolume?: number;
  }
): {
  preventionStrategies: string[];
  trainingModifications: string[];
  recoveryProtocols: string[];
  monitoringPlan: string[];
  raceReadinessAdvice?: string[];
} => {
  const preventionStrategies: string[] = [];
  const trainingModifications: string[] = [];
  const recoveryProtocols: string[] = [];
  const monitoringPlan: string[] = [];
  const raceReadinessAdvice: string[] = [];
  
  // General prevention strategies
  preventionStrategies.push('Follow the 10% rule for weekly mileage increases');
  preventionStrategies.push('Include regular strength training 2-3x per week');
  preventionStrategies.push('Maintain proper running form and cadence');
  preventionStrategies.push('Replace running shoes every 300-500 miles');
  preventionStrategies.push('Include variety in training surfaces and routes');
  
  // Risk-specific modifications
  if (assessment.riskFactors.trainingLoadSpike.severity === 'high') {
    trainingModifications.push('Implement strict ACWR monitoring (keep between 0.8-1.3)');
    trainingModifications.push('Plan recovery weeks every 3-4 weeks');
    trainingModifications.push('Limit weekly increases to 5% when ACWR > 1.2');
  }
  
  if (assessment.riskFactors.recoveryPatterns.severity === 'high') {
    recoveryProtocols.push('Ensure minimum 48 hours between hard efforts');
    recoveryProtocols.push('Implement active recovery sessions (easy walks, swimming)');
    recoveryProtocols.push('Prioritize sleep: 8+ hours nightly');
    recoveryProtocols.push('Include regular massage or self-massage');
  }
  
  if (assessment.riskFactors.paceConsistency.severity === 'high') {
    trainingModifications.push('Focus on consistent effort rather than pace');
    trainingModifications.push('Use heart rate zones for training intensity');
    trainingModifications.push('Practice pacing in training runs');
  }
  
  // Monitoring plan
  monitoringPlan.push('Track daily resting heart rate');
  monitoringPlan.push('Monitor subjective wellness scores (1-10 scale)');
  monitoringPlan.push('Record sleep quality and duration');
  monitoringPlan.push('Note any aches, pains, or unusual fatigue');
  monitoringPlan.push('Calculate weekly ACWR');
  
  // Race-specific advice if target race provided
  if (userGoals?.targetRaceDate) {
    const raceDate = new Date(userGoals.targetRaceDate);
    const daysToRace = Math.ceil((raceDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (daysToRace > 0) {
      if (assessment.riskLevel === 'high' || assessment.riskLevel === 'critical') {
        raceReadinessAdvice.push('Current injury risk is too high for optimal race preparation');
        raceReadinessAdvice.push('Consider postponing race or adjusting goals');
        raceReadinessAdvice.push('Focus on recovery before resuming race-specific training');
      } else if (daysToRace < 14) {
        raceReadinessAdvice.push('Begin taper phase - reduce volume by 40-60%');
        raceReadinessAdvice.push('Maintain intensity but reduce duration');
        raceReadinessAdvice.push('Prioritize recovery and race preparation');
      } else if (daysToRace < 28) {
        raceReadinessAdvice.push('Enter final build phase with caution');
        raceReadinessAdvice.push('Monitor recovery closely during peak training');
        raceReadinessAdvice.push('Plan taper to begin in 2 weeks');
      }
    }
  }
  
  return {
    preventionStrategies,
    trainingModifications,
    recoveryProtocols,
    monitoringPlan,
    raceReadinessAdvice: raceReadinessAdvice.length > 0 ? raceReadinessAdvice : undefined
  };
};

/**
 * Format injury risk assessment for display
 */
export const formatRiskLevel = (level: string): string => {
  switch (level) {
    case 'low': return 'Low Risk';
    case 'moderate': return 'Moderate Risk';
    case 'high': return 'High Risk';
    case 'critical': return 'Critical Risk';
    default: return 'Unknown Risk';
  }
};

/**
 * Format warning level for display
 */
export const formatWarningLevel = (level: string): string => {
  switch (level) {
    case 'monitor-closely': return 'Monitor Closely';
    case 'caution-advised': return 'Caution Advised';
    case 'immediate-rest-recommended': return 'Immediate Rest Recommended';
    default: return 'Unknown Warning Level';
  }
};

/**
 * Format overreaching status for display
 */
export const formatOverreachingStatus = (status: string): string => {
  switch (status) {
    case 'normal': return 'Normal';
    case 'functional': return 'Functional Overreaching';
    case 'non-functional': return 'Non-Functional Overreaching';
    case 'overtraining': return 'Overtraining Syndrome';
    default: return 'Unknown Status';
  }
};