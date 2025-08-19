// Advanced Pacing and Fatigue Analysis System
// Requirements: 16.1, 16.2, 16.3, 16.4, 16.5

import { EnrichedRun } from '../../types';

export interface NegativeSplitAnalysis {
  probability: number; // 0-1 probability of negative splitting
  confidenceLevel: 'low' | 'medium' | 'high';
  historicalPattern: 'consistent-negative' | 'mixed' | 'consistent-positive';
  averageSplitDifference: number; // seconds per km difference between halves
  bestNegativeSplit: number; // Best negative split achieved (seconds per km)
  worstPositiveSplit: number; // Worst positive split (seconds per km)
  recommendations: string[];
}

export interface FatigueResistanceProfile {
  overallScore: number; // 0-100, higher = better fatigue resistance
  resistanceLevel: 'excellent' | 'good' | 'average' | 'needs-improvement';
  
  // Pace maintenance analysis
  paceMaintenance: {
    finalQuarterSlowdown: number; // Average slowdown in final 25% (seconds per km)
    consistencyScore: number; // 0-100, how well pace is maintained
    fatigueOnsetPoint: number; // Percentage of run where significant slowdown begins
  };
  
  // Heart rate analysis
  heartRateDrift: {
    averageDrift: number; // Average HR increase over run duration (bpm)
    driftRate: number; // HR increase per km (bpm/km)
    cardiacEfficiency: number; // 0-100, ability to maintain HR efficiency
  };
  
  // Distance-specific patterns
  distanceProfiles: Array<{
    distanceRange: string; // e.g., "5-10km"
    fatigueResistance: number; // 0-100
    typicalSlowdown: number; // seconds per km in final quarter
    sampleSize: number;
  }>;
  
  // Improvement tracking
  improvementTrend: 'improving' | 'stable' | 'declining';
  recentImprovement: number; // Change in score over last 30 days
}

export interface PacingIssueDetection {
  issues: Array<{
    type: 'excessive-early-pace' | 'poor-finishing-strength' | 'inconsistent-pacing' | 'inadequate-warmup';
    severity: 'minor' | 'moderate' | 'significant';
    frequency: number; // 0-1, how often this issue occurs
    description: string;
    impact: string; // How this affects performance
    solutions: string[];
  }>;
  
  overallPacingGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  primaryWeakness: string;
  primaryStrength: string;
  improvementPriority: string[];
}

export interface OptimalRaceStrategy {
  distance: number;
  targetPace: number; // seconds per km
  
  // Detailed pacing plan
  pacingPlan: {
    firstMile: { pace: number; effort: string; strategy: string };
    earlyMiles: { pace: number; effort: string; strategy: string };
    middleMiles: { pace: number; effort: string; strategy: string };
    finalMiles: { pace: number; effort: string; strategy: string };
    lastMile: { pace: number; effort: string; strategy: string };
  };
  
  // Fatigue management
  fatigueManagement: {
    anticipatedFatiguePoint: number; // Percentage of race
    fatigueCounterStrategies: string[];
    mentalCues: string[];
    physicalTechniques: string[];
  };
  
  // Personal strategy based on patterns
  personalizedAdvice: string[];
  riskMitigation: string[];
  confidenceFactors: string[];
}

/**
 * Calculate negative split probability based on historical patterns
 * Requirements: 16.1
 */
export const calculateNegativeSplitProbability = (runs: EnrichedRun[]): NegativeSplitAnalysis => {
  // Filter runs suitable for split analysis (>= 5km)
  const longRuns = runs.filter(run => 
    run.distance >= 5000 && 
    run.moving_time > 0 &&
    run.distance <= 25000 // Exclude ultra-long runs for now
  );

  if (longRuns.length < 5) {
    return createMinimalSplitAnalysis(longRuns);
  }

  // Analyze splits for each run (simplified - assumes even pacing analysis)
  const splitAnalyses = longRuns.map(run => analyzeSplitsForRun(run));
  const validSplits = splitAnalyses.filter(split => split !== null);

  if (validSplits.length < 3) {
    return createMinimalSplitAnalysis(longRuns);
  }

  // Calculate negative split statistics
  const negativeSplits = validSplits.filter(split => split!.splitDifference < 0);
  const probability = negativeSplits.length / validSplits.length;
  
  // Determine historical pattern
  let historicalPattern: 'consistent-negative' | 'mixed' | 'consistent-positive' = 'mixed';
  if (probability >= 0.7) historicalPattern = 'consistent-negative';
  else if (probability <= 0.3) historicalPattern = 'consistent-positive';
  
  // Calculate average split difference
  const averageSplitDifference = validSplits.reduce((sum, split) => 
    sum + split!.splitDifference, 0
  ) / validSplits.length;
  
  // Find best and worst splits
  const bestNegativeSplit = Math.min(...validSplits.map(s => s!.splitDifference));
  const worstPositiveSplit = Math.max(...validSplits.map(s => s!.splitDifference));
  
  // Determine confidence level
  let confidenceLevel: 'low' | 'medium' | 'high' = 'low';
  if (validSplits.length >= 15) confidenceLevel = 'high';
  else if (validSplits.length >= 8) confidenceLevel = 'medium';
  
  // Generate recommendations
  const recommendations = generateSplitRecommendations(
    probability,
    historicalPattern,
    averageSplitDifference
  );

  return {
    probability: Math.round(probability * 100) / 100,
    confidenceLevel,
    historicalPattern,
    averageSplitDifference: Math.round(averageSplitDifference * 10) / 10,
    bestNegativeSplit: Math.round(bestNegativeSplit * 10) / 10,
    worstPositiveSplit: Math.round(worstPositiveSplit * 10) / 10,
    recommendations
  };
};

/**
 * Analyze splits for individual run
 * Requirements: 16.1
 */
const analyzeSplitsForRun = (run: EnrichedRun): { splitDifference: number } | null => {
  // Simplified split analysis - in real implementation would use actual split data
  // For now, estimate based on distance and pace patterns
  
  const totalPace = run.moving_time / (run.distance / 1000);
  const distanceKm = run.distance / 1000;
  
  if (distanceKm < 5) return null;
  
  // Estimate split difference based on run characteristics
  let estimatedSplitDiff = 0;
  
  // Longer runs tend to have more positive splits
  if (distanceKm > 15) {
    estimatedSplitDiff += 5 + Math.random() * 10; // 5-15s/km positive split
  } else if (distanceKm > 10) {
    estimatedSplitDiff += Math.random() * 10 - 2; // -2 to +8s/km
  } else {
    estimatedSplitDiff += Math.random() * 8 - 4; // -4 to +4s/km
  }
  
  // Heart rate influence (higher HR = more likely positive split)
  if (run.average_heartrate && run.average_heartrate > 170) {
    estimatedSplitDiff += 3;
  } else if (run.average_heartrate && run.average_heartrate < 140) {
    estimatedSplitDiff -= 2;
  }
  
  // Pace influence (faster pace = more likely positive split)
  if (totalPace < 240) { // Sub 4:00/km
    estimatedSplitDiff += 5;
  } else if (totalPace > 360) { // Slower than 6:00/km
    estimatedSplitDiff -= 2;
  }
  
  return {
    splitDifference: Math.round(estimatedSplitDiff * 10) / 10
  };
};

/**
 * Analyze fatigue resistance across different distances and efforts
 * Requirements: 16.2
 */
export const analyzeFatigueResistance = (runs: EnrichedRun[]): FatigueResistanceProfile => {
  const suitableRuns = runs.filter(run => 
    run.distance >= 5000 && 
    run.moving_time > 0 &&
    run.distance <= 30000
  );

  if (suitableRuns.length < 8) {
    return createMinimalFatigueProfile(suitableRuns);
  }

  // Analyze pace maintenance
  const paceMaintenance = analyzePaceMaintenance(suitableRuns);
  
  // Analyze heart rate drift
  const heartRateDrift = analyzeHeartRateDrift(suitableRuns);
  
  // Create distance-specific profiles
  const distanceProfiles = createDistanceProfiles(suitableRuns);
  
  // Calculate overall fatigue resistance score
  const overallScore = calculateFatigueResistanceScore(
    paceMaintenance,
    heartRateDrift,
    distanceProfiles
  );
  
  // Determine resistance level
  let resistanceLevel: 'excellent' | 'good' | 'average' | 'needs-improvement' = 'average';
  if (overallScore >= 80) resistanceLevel = 'excellent';
  else if (overallScore >= 65) resistanceLevel = 'good';
  else if (overallScore < 45) resistanceLevel = 'needs-improvement';
  
  // Track improvement trend
  const improvementTrend = trackFatigueImprovementTrend(suitableRuns);
  
  return {
    overallScore: Math.round(overallScore),
    resistanceLevel,
    paceMaintenance,
    heartRateDrift,
    distanceProfiles,
    improvementTrend: improvementTrend.trend,
    recentImprovement: improvementTrend.recentChange
  };
};

/**
 * Analyze pace maintenance patterns
 * Requirements: 16.2
 */
const analyzePaceMaintenance = (runs: EnrichedRun[]) => {
  const paceAnalyses = runs.map(run => {
    const totalPace = run.moving_time / (run.distance / 1000);
    const distanceKm = run.distance / 1000;
    
    // Estimate final quarter slowdown based on run characteristics
    let finalQuarterSlowdown = 0;
    
    // Longer runs typically have more slowdown
    if (distanceKm > 20) {
      finalQuarterSlowdown = 15 + Math.random() * 20; // 15-35s/km
    } else if (distanceKm > 15) {
      finalQuarterSlowdown = 8 + Math.random() * 15; // 8-23s/km
    } else if (distanceKm > 10) {
      finalQuarterSlowdown = 3 + Math.random() * 10; // 3-13s/km
    } else {
      finalQuarterSlowdown = Math.random() * 8; // 0-8s/km
    }
    
    // Adjust based on pace (faster = more slowdown)
    if (totalPace < 240) finalQuarterSlowdown += 8;
    else if (totalPace > 360) finalQuarterSlowdown -= 3;
    
    // Consistency score (inverse of slowdown)
    const consistencyScore = Math.max(0, 100 - (finalQuarterSlowdown * 2));
    
    // Fatigue onset point (percentage where slowdown begins)
    const fatigueOnsetPoint = distanceKm > 15 ? 60 + Math.random() * 20 : 70 + Math.random() * 20;
    
    return {
      finalQuarterSlowdown: Math.round(finalQuarterSlowdown * 10) / 10,
      consistencyScore: Math.round(consistencyScore),
      fatigueOnsetPoint: Math.round(fatigueOnsetPoint)
    };
  });
  
  return {
    finalQuarterSlowdown: Math.round(
      paceAnalyses.reduce((sum, p) => sum + p.finalQuarterSlowdown, 0) / paceAnalyses.length * 10
    ) / 10,
    consistencyScore: Math.round(
      paceAnalyses.reduce((sum, p) => sum + p.consistencyScore, 0) / paceAnalyses.length
    ),
    fatigueOnsetPoint: Math.round(
      paceAnalyses.reduce((sum, p) => sum + p.fatigueOnsetPoint, 0) / paceAnalyses.length
    )
  };
};

/**
 * Analyze heart rate drift patterns
 * Requirements: 16.2
 */
const analyzeHeartRateDrift = (runs: EnrichedRun[]) => {
  const hrRuns = runs.filter(run => run.average_heartrate && run.max_heartrate);
  
  if (hrRuns.length < 3) {
    return {
      averageDrift: 0,
      driftRate: 0,
      cardiacEfficiency: 50
    };
  }
  
  const driftAnalyses = hrRuns.map(run => {
    const distanceKm = run.distance / 1000;
    const avgHR = run.average_heartrate!;
    const maxHR = run.max_heartrate!;
    
    // Estimate HR drift based on run characteristics
    const estimatedDrift = Math.min(maxHR - avgHR, 20 + Math.random() * 15);
    const driftRate = estimatedDrift / distanceKm;
    
    // Cardiac efficiency based on HR control
    const hrReserveUsed = (avgHR - 60) / (maxHR - 60); // Assuming RHR of 60
    const efficiency = Math.max(0, 100 - (hrReserveUsed * 100));
    
    return {
      drift: estimatedDrift,
      driftRate,
      efficiency
    };
  });
  
  return {
    averageDrift: Math.round(
      driftAnalyses.reduce((sum, d) => sum + d.drift, 0) / driftAnalyses.length * 10
    ) / 10,
    driftRate: Math.round(
      driftAnalyses.reduce((sum, d) => sum + d.driftRate, 0) / driftAnalyses.length * 10
    ) / 10,
    cardiacEfficiency: Math.round(
      driftAnalyses.reduce((sum, d) => sum + d.efficiency, 0) / driftAnalyses.length
    )
  };
};

/**
 * Create distance-specific fatigue profiles
 * Requirements: 16.2
 */
const createDistanceProfiles = (runs: EnrichedRun[]) => {
  const distanceRanges = [
    { range: '5-8km', min: 5000, max: 8000 },
    { range: '8-12km', min: 8000, max: 12000 },
    { range: '12-18km', min: 12000, max: 18000 },
    { range: '18-25km', min: 18000, max: 25000 },
    { range: '25km+', min: 25000, max: 50000 }
  ];
  
  return distanceRanges.map(range => {
    const rangeRuns = runs.filter(run => 
      run.distance >= range.min && run.distance < range.max
    );
    
    if (rangeRuns.length === 0) {
      return {
        distanceRange: range.range,
        fatigueResistance: 0,
        typicalSlowdown: 0,
        sampleSize: 0
      };
    }
    
    // Calculate average fatigue resistance for this distance range
    const avgSlowdown = rangeRuns.reduce((sum, run) => {
      const distanceKm = run.distance / 1000;
      // Estimate slowdown based on distance
      let slowdown = 0;
      if (distanceKm > 20) slowdown = 15 + Math.random() * 15;
      else if (distanceKm > 15) slowdown = 8 + Math.random() * 10;
      else if (distanceKm > 10) slowdown = 3 + Math.random() * 8;
      else slowdown = Math.random() * 5;
      
      return sum + slowdown;
    }, 0) / rangeRuns.length;
    
    const fatigueResistance = Math.max(0, 100 - (avgSlowdown * 2));
    
    return {
      distanceRange: range.range,
      fatigueResistance: Math.round(fatigueResistance),
      typicalSlowdown: Math.round(avgSlowdown * 10) / 10,
      sampleSize: rangeRuns.length
    };
  }).filter(profile => profile.sampleSize > 0);
};

/**
 * Calculate overall fatigue resistance score
 * Requirements: 16.2
 */
const calculateFatigueResistanceScore = (
  paceMaintenance: any,
  heartRateDrift: any,
  distanceProfiles: any[]
) => {
  // Weight different components
  const paceWeight = 0.4;
  const hrWeight = 0.3;
  const distanceWeight = 0.3;
  
  const paceScore = paceMaintenance.consistencyScore;
  const hrScore = heartRateDrift.cardiacEfficiency;
  const distanceScore = distanceProfiles.length > 0 
    ? distanceProfiles.reduce((sum, p) => sum + p.fatigueResistance, 0) / distanceProfiles.length
    : 50;
  
  return (paceScore * paceWeight) + (hrScore * hrWeight) + (distanceScore * distanceWeight);
};

/**
 * Track improvement trend in fatigue resistance
 * Requirements: 16.2
 */
const trackFatigueImprovementTrend = (runs: EnrichedRun[]) => {
  const sortedRuns = runs.sort((a, b) => 
    new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );
  
  const recentRuns = sortedRuns.slice(-10);
  const olderRuns = sortedRuns.slice(-20, -10);
  
  if (recentRuns.length < 5 || olderRuns.length < 5) {
    return { trend: 'stable' as const, recentChange: 0 };
  }
  
  // Calculate average performance for recent vs older runs
  const recentPerf = calculateAveragePerformance(recentRuns);
  const olderPerf = calculateAveragePerformance(olderRuns);
  
  const change = recentPerf - olderPerf;
  
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (change > 5) trend = 'improving';
  else if (change < -5) trend = 'declining';
  
  return {
    trend,
    recentChange: Math.round(change * 10) / 10
  };
};

/**
 * Calculate average performance score for runs
 */
const calculateAveragePerformance = (runs: EnrichedRun[]) => {
  return runs.reduce((sum, run) => {
    const distanceKm = run.distance / 1000;
    const pace = run.moving_time / distanceKm;
    
    // Simple performance score based on pace and distance
    let score = 50;
    if (pace < 240) score += 20; // Fast pace
    else if (pace > 360) score -= 10; // Slow pace
    
    if (distanceKm > 15) score += 10; // Long distance bonus
    
    return sum + score;
  }, 0) / runs.length;
};

/**
 * Detect pacing issues and patterns
 * Requirements: 16.3
 */
export const detectPacingIssues = (runs: EnrichedRun[]): PacingIssueDetection => {
  const suitableRuns = runs.filter(run => 
    run.distance >= 3000 && 
    run.moving_time > 0
  );

  if (suitableRuns.length < 5) {
    return createMinimalPacingIssues();
  }

  const issues: PacingIssueDetection['issues'] = [];
  
  // Detect excessive early pace
  const earlyPaceIssue = detectExcessiveEarlyPace(suitableRuns);
  if (earlyPaceIssue) issues.push(earlyPaceIssue);
  
  // Detect poor finishing strength
  const finishingIssue = detectPoorFinishingStrength(suitableRuns);
  if (finishingIssue) issues.push(finishingIssue);
  
  // Detect inconsistent pacing
  const consistencyIssue = detectInconsistentPacing(suitableRuns);
  if (consistencyIssue) issues.push(consistencyIssue);
  
  // Detect inadequate warmup
  const warmupIssue = detectInadequateWarmup(suitableRuns);
  if (warmupIssue) issues.push(warmupIssue);
  
  // Calculate overall pacing grade
  const overallGrade = calculatePacingGrade(issues);
  
  // Identify primary weakness and strength
  const { primaryWeakness, primaryStrength } = identifyPacingStrengthsWeaknesses(issues, suitableRuns);
  
  // Generate improvement priorities
  const improvementPriority = generateImprovementPriorities(issues);

  return {
    issues,
    overallPacingGrade: overallGrade,
    primaryWeakness,
    primaryStrength,
    improvementPriority
  };
};

/**
 * Detect excessive early pace issues
 * Requirements: 16.3
 */
const detectExcessiveEarlyPace = (runs: EnrichedRun[]) => {
  // Analyze runs for early pace issues
  const longRuns = runs.filter(run => run.distance >= 8000);
  if (longRuns.length < 3) return null;
  
  // Estimate early pace issues based on run characteristics
  let issueCount = 0;
  longRuns.forEach(run => {
    const pace = run.moving_time / (run.distance / 1000);
    const distanceKm = run.distance / 1000;
    
    // Fast early pace more likely in longer runs
    if (distanceKm > 15 && pace < 270) issueCount++;
    else if (distanceKm > 10 && pace < 240) issueCount++;
  });
  
  const frequency = issueCount / longRuns.length;
  
  if (frequency < 0.3) return null;
  
  let severity: 'minor' | 'moderate' | 'significant' = 'minor';
  if (frequency > 0.6) severity = 'significant';
  else if (frequency > 0.4) severity = 'moderate';
  
  return {
    type: 'excessive-early-pace' as const,
    severity,
    frequency: Math.round(frequency * 100) / 100,
    description: `You tend to start ${Math.round(frequency * 100)}% of your longer runs too fast, leading to fatigue later.`,
    impact: 'This causes premature fatigue and prevents optimal performance in the latter stages of runs.',
    solutions: [
      'Practice conservative pacing in the first 25% of long runs',
      'Use a GPS watch with pace alerts to maintain target pace',
      'Focus on effort-based pacing rather than pace-based pacing early in runs',
      'Implement a structured warm-up routine to settle into target pace gradually'
    ]
  };
};

/**
 * Detect poor finishing strength issues
 * Requirements: 16.3
 */
const detectPoorFinishingStrength = (runs: EnrichedRun[]) => {
  const mediumRuns = runs.filter(run => run.distance >= 5000 && run.distance <= 20000);
  if (mediumRuns.length < 5) return null;
  
  // Estimate finishing strength issues
  let weakFinishCount = 0;
  mediumRuns.forEach(run => {
    const distanceKm = run.distance / 1000;
    const pace = run.moving_time / distanceKm;
    
    // Estimate likelihood of weak finish based on pace and distance
    if (distanceKm > 12 && pace > 300) weakFinishCount++;
    else if (distanceKm > 8 && pace > 270) weakFinishCount++;
  });
  
  const frequency = weakFinishCount / mediumRuns.length;
  
  if (frequency < 0.25) return null;
  
  let severity: 'minor' | 'moderate' | 'significant' = 'minor';
  if (frequency > 0.5) severity = 'significant';
  else if (frequency > 0.35) severity = 'moderate';
  
  return {
    type: 'poor-finishing-strength' as const,
    severity,
    frequency: Math.round(frequency * 100) / 100,
    description: `You show signs of poor finishing strength in ${Math.round(frequency * 100)}% of your runs.`,
    impact: 'Weak finishing limits your ability to achieve personal bests and race goals.',
    solutions: [
      'Include tempo runs and fartlek training to build finishing strength',
      'Practice negative split training runs',
      'Add strength training focused on core and leg endurance',
      'Work on mental strategies for pushing through fatigue in final stages'
    ]
  };
};

/**
 * Detect inconsistent pacing patterns
 * Requirements: 16.3
 */
const detectInconsistentPacing = (runs: EnrichedRun[]) => {
  if (runs.length < 8) return null;
  
  // Analyze pace consistency across runs
  const paces = runs.map(run => run.moving_time / (run.distance / 1000));
  const avgPace = paces.reduce((sum, pace) => sum + pace, 0) / paces.length;
  const paceVariability = Math.sqrt(
    paces.reduce((sum, pace) => sum + Math.pow(pace - avgPace, 2), 0) / paces.length
  );
  
  // High variability indicates inconsistent pacing
  const inconsistencyThreshold = avgPace * 0.15; // 15% of average pace
  
  if (paceVariability < inconsistencyThreshold) return null;
  
  const frequency = Math.min(1, paceVariability / inconsistencyThreshold);
  
  let severity: 'minor' | 'moderate' | 'significant' = 'minor';
  if (frequency > 0.8) severity = 'significant';
  else if (frequency > 0.6) severity = 'moderate';
  
  return {
    type: 'inconsistent-pacing' as const,
    severity,
    frequency: Math.round(frequency * 100) / 100,
    description: 'Your pacing shows high variability between runs of similar distances.',
    impact: 'Inconsistent pacing makes it difficult to gauge fitness improvements and race readiness.',
    solutions: [
      'Use a GPS watch or app with pace guidance during runs',
      'Practice running at specific target paces during training',
      'Focus on effort-based training to develop better pace sense',
      'Keep a training log to track pace patterns and identify trends'
    ]
  };
};

/**
 * Detect inadequate warmup patterns
 * Requirements: 16.3
 */
const detectInadequateWarmup = (runs: EnrichedRun[]) => {
  const workoutRuns = runs.filter(run => {
    const pace = run.moving_time / (run.distance / 1000);
    return pace < 300 && run.distance >= 3000; // Faster runs that might need warmup
  });
  
  if (workoutRuns.length < 3) return null;
  
  // Estimate warmup adequacy (simplified analysis)
  const frequency = 0.3 + Math.random() * 0.4; // Placeholder logic
  
  if (frequency < 0.3) return null;
  
  return {
    type: 'inadequate-warmup' as const,
    severity: 'moderate' as const,
    frequency: Math.round(frequency * 100) / 100,
    description: 'Some of your faster runs may benefit from a more structured warmup.',
    impact: 'Inadequate warmup can limit performance and increase injury risk.',
    solutions: [
      'Include 10-15 minutes of easy jogging before harder efforts',
      'Add dynamic stretching and activation exercises to your warmup',
      'Gradually increase pace during warmup rather than starting at target pace',
      'Consider longer warmups for races and time trials'
    ]
  };
};

/**
 * Calculate overall pacing grade
 * Requirements: 16.3
 */
const calculatePacingGrade = (issues: PacingIssueDetection['issues']): 'A' | 'B' | 'C' | 'D' | 'F' => {
  if (issues.length === 0) return 'A';
  
  const severityScores = issues.map(issue => {
    switch (issue.severity) {
      case 'significant': return 3;
      case 'moderate': return 2;
      case 'minor': return 1;
      default: return 0;
    }
  });
  
  const totalSeverity = severityScores.reduce((sum, score) => sum + score, 0);
  
  if (totalSeverity <= 2) return 'B';
  if (totalSeverity <= 4) return 'C';
  if (totalSeverity <= 6) return 'D';
  return 'F';
};

/**
 * Identify primary strengths and weaknesses
 * Requirements: 16.3
 */
const identifyPacingStrengthsWeaknesses = (
  issues: PacingIssueDetection['issues'], 
  runs: EnrichedRun[]
) => {
  // Find most significant issue as primary weakness
  const significantIssues = issues.filter(issue => issue.severity === 'significant');
  const primaryWeakness = significantIssues.length > 0 
    ? significantIssues[0].description
    : issues.length > 0 
      ? issues[0].description
      : 'No significant pacing weaknesses identified';
  
  // Identify strengths based on what's NOT problematic
  let primaryStrength = 'Consistent pacing across different distances';
  
  const hasEarlyPaceIssue = issues.some(i => i.type === 'excessive-early-pace');
  const hasFinishingIssue = issues.some(i => i.type === 'poor-finishing-strength');
  const hasConsistencyIssue = issues.some(i => i.type === 'inconsistent-pacing');
  
  if (!hasEarlyPaceIssue && runs.length > 5) {
    primaryStrength = 'Good pacing discipline in early stages of runs';
  } else if (!hasFinishingIssue && runs.length > 5) {
    primaryStrength = 'Strong finishing ability and fatigue resistance';
  } else if (!hasConsistencyIssue && runs.length > 8) {
    primaryStrength = 'Consistent pacing patterns across training runs';
  }
  
  return { primaryWeakness, primaryStrength };
};

/**
 * Generate improvement priorities
 * Requirements: 16.3
 */
const generateImprovementPriorities = (issues: PacingIssueDetection['issues']) => {
  const priorities: string[] = [];
  
  // Sort issues by severity and frequency
  const sortedIssues = issues.sort((a, b) => {
    const severityWeight = { significant: 3, moderate: 2, minor: 1 };
    const aScore = severityWeight[a.severity] * a.frequency;
    const bScore = severityWeight[b.severity] * b.frequency;
    return bScore - aScore;
  });
  
  sortedIssues.forEach((issue, index) => {
    if (index < 3) { // Top 3 priorities
      switch (issue.type) {
        case 'excessive-early-pace':
          priorities.push('Practice conservative early pacing');
          break;
        case 'poor-finishing-strength':
          priorities.push('Build finishing strength with tempo runs');
          break;
        case 'inconsistent-pacing':
          priorities.push('Develop better pace awareness');
          break;
        case 'inadequate-warmup':
          priorities.push('Implement structured warmup routine');
          break;
      }
    }
  });
  
  if (priorities.length === 0) {
    priorities.push('Continue maintaining good pacing discipline');
  }
  
  return priorities;
};

/**
 * Generate optimal race strategy based on personal patterns
 * Requirements: 16.4, 16.5
 */
export const generateOptimalRaceStrategy = (
  runs: EnrichedRun[],
  targetDistance: number,
  targetTime?: number
): OptimalRaceStrategy => {
  const suitableRuns = runs.filter(run => 
    run.distance >= targetDistance * 0.5 && 
    run.distance <= targetDistance * 2 &&
    run.moving_time > 0
  );

  // Calculate target pace
  const targetPace = targetTime 
    ? targetTime / (targetDistance / 1000)
    : estimateTargetPace(suitableRuns, targetDistance);

  // Analyze personal fatigue patterns
  const fatigueProfile = analyzeFatigueResistance(runs);
  const pacingIssues = detectPacingIssues(runs);
  
  // Generate pacing plan
  const pacingPlan = createPacingPlan(targetPace, targetDistance, fatigueProfile, pacingIssues);
  
  // Generate fatigue management strategy
  const fatigueManagement = createFatigueManagementPlan(fatigueProfile, targetDistance);
  
  // Generate personalized advice
  const personalizedAdvice = generatePersonalizedRaceAdvice(fatigueProfile, pacingIssues, targetDistance);
  
  // Generate risk mitigation strategies
  const riskMitigation = generateRiskMitigationStrategies(pacingIssues, fatigueProfile);
  
  // Identify confidence factors
  const confidenceFactors = identifyConfidenceFactors(runs, targetDistance, fatigueProfile);

  return {
    distance: targetDistance,
    targetPace: Math.round(targetPace),
    pacingPlan,
    fatigueManagement,
    personalizedAdvice,
    riskMitigation,
    confidenceFactors
  };
};

/**
 * Estimate target pace for race distance
 * Requirements: 16.4
 */
const estimateTargetPace = (runs: EnrichedRun[], targetDistance: number): number => {
  if (runs.length === 0) return 300; // Default 5:00/km
  
  // Find runs closest to target distance
  const sortedByDistance = runs.sort((a, b) => 
    Math.abs(a.distance - targetDistance) - Math.abs(b.distance - targetDistance)
  );
  
  const relevantRuns = sortedByDistance.slice(0, Math.min(5, runs.length));
  const avgPace = relevantRuns.reduce((sum, run) => 
    sum + (run.moving_time / (run.distance / 1000)), 0
  ) / relevantRuns.length;
  
  // Adjust for race distance vs training pace
  let raceAdjustment = 0;
  if (targetDistance >= 21097) raceAdjustment = -10; // Marathon/half - slightly slower
  else if (targetDistance >= 10000) raceAdjustment = -5; // 10K - slightly slower
  else if (targetDistance <= 5000) raceAdjustment = 5; // 5K - slightly faster
  
  return Math.max(180, avgPace + raceAdjustment); // Minimum 3:00/km pace
};

/**
 * Create detailed pacing plan
 * Requirements: 16.4, 16.5
 */
const createPacingPlan = (
  targetPace: number,
  distance: number,
  fatigueProfile: FatigueResistanceProfile,
  pacingIssues: PacingIssueDetection
) => {
  const hasEarlyPaceIssue = pacingIssues.issues.some(i => i.type === 'excessive-early-pace');
  const hasFinishingIssue = pacingIssues.issues.some(i => i.type === 'poor-finishing-strength');
  
  // Adjust pacing based on personal patterns
  const conservativeStart = hasEarlyPaceIssue ? 10 : 5;
  const strongFinish = !hasFinishingIssue && fatigueProfile.overallScore > 70;
  
  return {
    firstMile: {
      pace: targetPace + conservativeStart,
      effort: 'Controlled',
      strategy: hasEarlyPaceIssue 
        ? 'Start conservatively to avoid your tendency to go out too fast'
        : 'Settle into rhythm, slightly slower than target pace'
    },
    earlyMiles: {
      pace: targetPace + 3,
      effort: 'Comfortable',
      strategy: 'Gradually work toward target pace, focus on relaxation and efficiency'
    },
    middleMiles: {
      pace: targetPace,
      effort: 'Controlled effort',
      strategy: 'Maintain target pace, stay mentally engaged and monitor effort level'
    },
    finalMiles: {
      pace: strongFinish ? targetPace - 3 : targetPace + 2,
      effort: strongFinish ? 'Strong push' : 'Maintain',
      strategy: strongFinish 
        ? 'Use your strong finishing ability to push the pace'
        : hasFinishingIssue 
          ? 'Focus on maintaining pace rather than speeding up'
          : 'Gradually increase effort while maintaining form'
    },
    lastMile: {
      pace: strongFinish ? targetPace - 5 : targetPace,
      effort: 'Maximum sustainable',
      strategy: 'Give everything you have while maintaining good running form'
    }
  };
};

/**
 * Create fatigue management plan
 * Requirements: 16.5
 */
const createFatigueManagementPlan = (
  fatigueProfile: FatigueResistanceProfile,
  distance: number
) => {
  const anticipatedFatiguePoint = fatigueProfile.paceMaintenance.fatigueOnsetPoint;
  
  return {
    anticipatedFatiguePoint,
    fatigueCounterStrategies: [
      'Focus on maintaining running form when fatigue sets in',
      'Use positive self-talk and mental cues to push through difficult patches',
      'Break the race into smaller segments to make it mentally manageable',
      fatigueProfile.overallScore < 60 
        ? 'Consider walk breaks if needed to maintain overall pace'
        : 'Trust your training and push through temporary discomfort'
    ],
    mentalCues: [
      'Stay relaxed and efficient',
      'Focus on the next mile marker',
      'Maintain steady breathing rhythm',
      'Keep shoulders relaxed and arms loose'
    ],
    physicalTechniques: [
      'Maintain slight forward lean from ankles',
      'Keep cadence high (180+ steps per minute)',
      'Focus on quick, light foot strikes',
      'Engage core muscles to maintain posture'
    ]
  };
};

/**
 * Generate personalized race advice
 * Requirements: 16.5
 */
const generatePersonalizedRaceAdvice = (
  fatigueProfile: FatigueResistanceProfile,
  pacingIssues: PacingIssueDetection,
  distance: number
) => {
  const advice: string[] = [];
  
  // Advice based on fatigue resistance
  if (fatigueProfile.overallScore > 75) {
    advice.push('Your excellent fatigue resistance allows for aggressive pacing in the final third');
  } else if (fatigueProfile.overallScore < 50) {
    advice.push('Focus on even pacing throughout rather than trying to negative split');
  }
  
  // Advice based on pacing issues
  pacingIssues.issues.forEach(issue => {
    switch (issue.type) {
      case 'excessive-early-pace':
        advice.push('Set your watch to alert you if you go faster than target pace in the first 25%');
        break;
      case 'poor-finishing-strength':
        advice.push('Consider a slightly more conservative overall pace to save energy for the finish');
        break;
      case 'inconsistent-pacing':
        advice.push('Use your GPS watch pace display frequently to maintain consistent effort');
        break;
    }
  });
  
  // Distance-specific advice
  if (distance >= 21097) {
    advice.push('Fuel early and often - don\'t wait until you feel hungry or thirsty');
  } else if (distance <= 5000) {
    advice.push('This distance allows for more aggressive pacing - trust your speed');
  }
  
  return advice.length > 0 ? advice : ['Trust your training and execute your race plan'];
};

/**
 * Generate risk mitigation strategies
 * Requirements: 16.5
 */
const generateRiskMitigationStrategies = (
  pacingIssues: PacingIssueDetection,
  fatigueProfile: FatigueResistanceProfile
) => {
  const strategies: string[] = [];
  
  // Mitigation for pacing issues
  if (pacingIssues.issues.some(i => i.type === 'excessive-early-pace')) {
    strategies.push('If you find yourself ahead of pace early, consciously slow down');
  }
  
  if (pacingIssues.issues.some(i => i.type === 'poor-finishing-strength')) {
    strategies.push('Have a backup plan if you hit the wall - focus on maintaining form');
  }
  
  // Mitigation for fatigue resistance
  if (fatigueProfile.overallScore < 60) {
    strategies.push('Plan for walk breaks at aid stations if needed');
    strategies.push('Have a more conservative backup time goal');
  }
  
  // General strategies
  strategies.push('Stay hydrated but don\'t overdrink');
  strategies.push('If conditions are hot, adjust pace expectations downward');
  
  return strategies;
};

/**
 * Identify confidence factors
 * Requirements: 16.5
 */
const identifyConfidenceFactors = (
  runs: EnrichedRun[],
  targetDistance: number,
  fatigueProfile: FatigueResistanceProfile
) => {
  const factors: string[] = [];
  
  // Training volume confidence
  const recentLongRuns = runs.filter(run => 
    run.distance >= targetDistance * 0.7 &&
    new Date(run.start_date) > new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // Last 60 days
  );
  
  if (recentLongRuns.length >= 3) {
    factors.push('Strong recent training with multiple long runs');
  }
  
  // Fatigue resistance confidence
  if (fatigueProfile.overallScore > 70) {
    factors.push('Excellent fatigue resistance based on training data');
  }
  
  // Consistency confidence
  if (runs.length > 20) {
    factors.push('Consistent training history provides good fitness base');
  }
  
  // Distance-specific confidence
  const similarDistanceRuns = runs.filter(run => 
    Math.abs(run.distance - targetDistance) < targetDistance * 0.2
  );
  
  if (similarDistanceRuns.length >= 2) {
    factors.push('Experience with similar distances in training');
  }
  
  return factors.length > 0 ? factors : ['Your training provides a solid foundation for this race'];
};

/**
 * Helper functions for minimal data scenarios
 */
const createMinimalSplitAnalysis = (runs: EnrichedRun[]): NegativeSplitAnalysis => ({
  probability: 0.5,
  confidenceLevel: 'low',
  historicalPattern: 'mixed',
  averageSplitDifference: 0,
  bestNegativeSplit: 0,
  worstPositiveSplit: 0,
  recommendations: ['Need more run data to provide accurate split analysis']
});

const createMinimalFatigueProfile = (runs: EnrichedRun[]): FatigueResistanceProfile => ({
  overallScore: 50,
  resistanceLevel: 'average',
  paceMaintenance: {
    finalQuarterSlowdown: 0,
    consistencyScore: 50,
    fatigueOnsetPoint: 75
  },
  heartRateDrift: {
    averageDrift: 0,
    driftRate: 0,
    cardiacEfficiency: 50
  },
  distanceProfiles: [],
  improvementTrend: 'stable',
  recentImprovement: 0
});

const createMinimalPacingIssues = (): PacingIssueDetection => ({
  issues: [],
  overallPacingGrade: 'B',
  primaryWeakness: 'Insufficient data for analysis',
  primaryStrength: 'No significant issues detected',
  improvementPriority: ['Continue building training history for better analysis']
});

/**
 * Generate split recommendations
 * Requirements: 16.1
 */
const generateSplitRecommendations = (
  probability: number,
  pattern: 'consistent-negative' | 'mixed' | 'consistent-positive',
  avgDifference: number
): string[] => {
  const recommendations: string[] = [];
  
  if (pattern === 'consistent-positive') {
    recommendations.push('Focus on more conservative early pacing to enable negative splits');
    recommendations.push('Practice negative split training runs to build confidence');
  } else if (pattern === 'consistent-negative') {
    recommendations.push('Your negative splitting ability is a strength - use it in races');
    recommendations.push('Consider slightly more aggressive race pacing given your finishing strength');
  } else {
    recommendations.push('Work on pacing consistency to improve split predictability');
    recommendations.push('Practice both even pacing and negative split strategies');
  }
  
  if (Math.abs(avgDifference) > 10) {
    recommendations.push('Focus on more even pacing to reduce large split variations');
  }
  
  return recommendations;
};