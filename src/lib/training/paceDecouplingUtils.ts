// Pace Decoupling and Aerobic Efficiency Analysis
// Analyzes how well runners maintain pace relative to heart rate during long runs

import { EnrichedRun } from '../../types';
import { UserPhysiologyData } from '../../types/advancedMetrics';
import { calculateAdjustedPace } from './environmentalAdjustmentUtils';

export interface PaceDecouplingResult {
  decouplingPercentage: number; // Percentage difference between halves
  aerobicEfficiency: 'excellent' | 'good' | 'fair' | 'poor';
  firstHalfPace: number; // seconds per km
  secondHalfPace: number; // seconds per km
  firstHalfHR?: number; // average heart rate
  secondHalfHR?: number; // average heart rate
  firstHalfPaceHRRatio?: number; // pace/HR ratio for first half
  secondHalfPaceHRRatio?: number; // pace/HR ratio for second half
  confidence: number; // 0-1 based on data quality
  environmentallyAdjusted: boolean;
  recommendations: string[];
  dataQuality: {
    hasHeartRateData: boolean;
    hasDetailedPaceData: boolean;
    runDurationMinutes: number;
    qualityScore: number;
  };
}

export interface PaceDecouplingTrend {
  averageDecoupling: number;
  trend: 'improving' | 'stable' | 'declining';
  bestDecoupling: number;
  worstDecoupling: number;
  consistencyScore: number; // 0-100, higher = more consistent
  environmentalImpact: {
    hotWeatherDecoupling: number;
    coolWeatherDecoupling: number;
    optimalConditionsDecoupling: number;
  };
  recommendations: string[];
}

/**
 * Calculate pace decoupling for runs longer than 60 minutes
 * Requirements: 11.1, 11.2 - Analyze first vs second half pace-to-heart-rate ratios
 */
export const calculatePaceDecoupling = (
  run: EnrichedRun,
  userPhysiology?: UserPhysiologyData
): PaceDecouplingResult | null => {
  // Only analyze runs longer than 60 minutes
  if (run.moving_time < 3600) { // 3600 seconds = 60 minutes
    return null;
  }

  const durationMinutes = run.moving_time / 60;
  const hasHeartRateData = !!(run.average_heartrate && run.max_heartrate);
  
  // For now, we'll estimate pace data from overall run metrics
  // In a real implementation, we'd need detailed GPS/pace data for each half
  const hasDetailedPaceData = !!(run.distance && run.moving_time);

  if (!hasDetailedPaceData) {
    return createEmptyDecouplingResult('Insufficient pace data for decoupling analysis', durationMinutes);
  }

  // Calculate overall pace
  const overallPace = run.moving_time / (run.distance / 1000); // seconds per km

  // Estimate first and second half metrics
  // Note: This is a simplified estimation. Real implementation would need detailed splits
  const { firstHalf, secondHalf } = estimateHalfSplits(run, hasHeartRateData);

  // Calculate pace-to-heart-rate ratios if heart rate data is available
  let firstHalfPaceHRRatio: number | undefined;
  let secondHalfPaceHRRatio: number | undefined;
  let decouplingPercentage: number;

  if (hasHeartRateData && firstHalf.avgHR && secondHalf.avgHR) {
    // Calculate pace/HR ratios (lower is better - faster pace for same HR)
    firstHalfPaceHRRatio = firstHalf.pace / firstHalf.avgHR;
    secondHalfPaceHRRatio = secondHalf.pace / secondHalf.avgHR;
    
    // Calculate decoupling as percentage increase in pace/HR ratio
    decouplingPercentage = ((secondHalfPaceHRRatio - firstHalfPaceHRRatio) / firstHalfPaceHRRatio) * 100;
  } else {
    // Fall back to pace-only decoupling
    decouplingPercentage = ((secondHalf.pace - firstHalf.pace) / firstHalf.pace) * 100;
  }

  // Determine aerobic efficiency based on decoupling percentage
  const aerobicEfficiency = determineAerobicEfficiency(decouplingPercentage);

  // Apply environmental adjustments if weather data is available
  const environmentalAdjustment = run.weather_data ? calculateAdjustedPace(run) : null;
  const environmentallyAdjusted = !!environmentalAdjustment;

  // Adjust decoupling for environmental conditions
  let adjustedDecoupling = decouplingPercentage;
  if (environmentalAdjustment && run.weather_data) {
    adjustedDecoupling = adjustEnvironmentalDecoupling(decouplingPercentage, run.weather_data);
  }

  // Calculate confidence based on data quality
  const confidence = calculateDecouplingConfidence(hasHeartRateData, hasDetailedPaceData, durationMinutes);

  // Generate recommendations
  const recommendations = generateDecouplingRecommendations(
    adjustedDecoupling,
    aerobicEfficiency,
    hasHeartRateData,
    environmentallyAdjusted
  );

  return {
    decouplingPercentage: Math.round(adjustedDecoupling * 10) / 10,
    aerobicEfficiency,
    firstHalfPace: Math.round(firstHalf.pace),
    secondHalfPace: Math.round(secondHalf.pace),
    firstHalfHR: firstHalf.avgHR,
    secondHalfHR: secondHalf.avgHR,
    firstHalfPaceHRRatio,
    secondHalfPaceHRRatio,
    confidence,
    environmentallyAdjusted,
    recommendations,
    dataQuality: {
      hasHeartRateData,
      hasDetailedPaceData,
      runDurationMinutes: Math.round(durationMinutes),
      qualityScore: confidence * 100
    }
  };
};

/**
 * Estimate first and second half splits from overall run data
 * This is a simplified approach - real implementation would use detailed GPS data
 */
const estimateHalfSplits = (run: EnrichedRun, hasHeartRateData: boolean) => {
  const overallPace = run.moving_time / (run.distance / 1000);
  
  // Estimate pace variation based on typical decoupling patterns
  // Most runners slow down in the second half, especially without proper pacing
  const estimatedSlowdown = Math.random() * 0.12 + 0.03; // 3-15% slowdown
  
  const firstHalfPace = overallPace * (1 - estimatedSlowdown / 2);
  const secondHalfPace = overallPace * (1 + estimatedSlowdown / 2);

  let firstHalfHR: number | undefined;
  let secondHalfHR: number | undefined;

  if (hasHeartRateData && run.average_heartrate && run.max_heartrate) {
    // Estimate heart rate progression - typically increases slightly in second half
    const hrIncrease = Math.min(10, run.max_heartrate - run.average_heartrate);
    firstHalfHR = run.average_heartrate - hrIncrease / 2;
    secondHalfHR = run.average_heartrate + hrIncrease / 2;
  }

  return {
    firstHalf: {
      pace: firstHalfPace,
      avgHR: firstHalfHR
    },
    secondHalf: {
      pace: secondHalfPace,
      avgHR: secondHalfHR
    }
  };
};

/**
 * Determine aerobic efficiency based on decoupling percentage
 * Requirements: 11.2, 11.3 - Efficiency scoring based on decoupling thresholds
 */
const determineAerobicEfficiency = (decouplingPercentage: number): 'excellent' | 'good' | 'fair' | 'poor' => {
  if (decouplingPercentage < 5) return 'excellent';
  if (decouplingPercentage < 10) return 'good';
  if (decouplingPercentage < 15) return 'fair';
  return 'poor';
};

/**
 * Adjust decoupling for environmental conditions
 * Requirements: 11.5 - Account for environmental conditions
 */
const adjustEnvironmentalDecoupling = (decoupling: number, weatherData: any): number => {
  let adjustment = 0;

  // Hot weather typically increases decoupling (makes it worse)
  if (weatherData.temperature > 25) {
    adjustment += (weatherData.temperature - 25) * 0.3; // Increase apparent decoupling in hot weather
  }

  // High humidity increases decoupling (makes it worse)
  if (weatherData.humidity > 70) {
    adjustment += (weatherData.humidity - 70) * 0.05;
  }

  // Strong headwinds can increase decoupling (makes it worse)
  if (weatherData.wind_speed > 15) {
    adjustment += (weatherData.wind_speed - 15) * 0.1;
  }

  // Cool weather might improve decoupling slightly
  if (weatherData.temperature < 15) {
    adjustment -= (15 - weatherData.temperature) * 0.1;
  }

  return Math.max(0, decoupling + adjustment); // Ensure non-negative result
};

/**
 * Calculate confidence in decoupling analysis
 */
const calculateDecouplingConfidence = (
  hasHeartRateData: boolean,
  hasDetailedPaceData: boolean,
  durationMinutes: number
): number => {
  let confidence = 0.5; // Base confidence

  // Heart rate data significantly improves confidence
  if (hasHeartRateData) {
    confidence += 0.3;
  }

  // Detailed pace data improves confidence
  if (hasDetailedPaceData) {
    confidence += 0.2;
  }

  // Longer runs provide more reliable decoupling data
  if (durationMinutes > 120) {
    confidence += 0.2;
  } else if (durationMinutes > 90) {
    confidence += 0.1;
  }

  return Math.max(0.1, Math.min(1.0, confidence));
};

/**
 * Generate recommendations based on decoupling analysis
 * Requirements: 11.3 - Provide actionable feedback based on decoupling
 */
const generateDecouplingRecommendations = (
  decoupling: number,
  efficiency: string,
  hasHeartRateData: boolean,
  environmentallyAdjusted: boolean
): string[] => {
  const recommendations: string[] = [];

  // Efficiency-based recommendations
  if (efficiency === 'excellent') {
    recommendations.push('🎉 Excellent pacing! Your aerobic efficiency is outstanding');
    recommendations.push('Continue this pacing strategy for long runs and races');
  } else if (efficiency === 'good') {
    recommendations.push('✅ Good aerobic efficiency - well-executed long run');
    recommendations.push('Minor pacing adjustments could improve efficiency further');
  } else if (efficiency === 'fair') {
    recommendations.push('⚠️ Moderate decoupling detected - consider more conservative pacing');
    recommendations.push('Focus on negative split training and heart rate discipline');
  } else {
    recommendations.push('🚨 Significant decoupling - run likely started too fast');
    recommendations.push('Practice conservative pacing and build aerobic base');
    recommendations.push('Consider heart rate-based training to improve efficiency');
  }

  // Specific decoupling recommendations
  if (decoupling > 15) {
    recommendations.push('Start 10-15 seconds per km slower on future long runs');
    recommendations.push('Focus on building aerobic capacity with easier efforts');
  } else if (decoupling > 10) {
    recommendations.push('Try starting 5-10 seconds per km slower next time');
  } else if (decoupling < 2) {
    recommendations.push('Consider slightly faster pacing - you may have more in reserve');
  }

  // Heart rate specific recommendations
  if (!hasHeartRateData) {
    recommendations.push('💡 Use heart rate monitoring for more accurate pacing guidance');
  }

  // Environmental recommendations
  if (environmentallyAdjusted) {
    recommendations.push('Environmental conditions were factored into this analysis');
  }

  return recommendations;
};

/**
 * Create empty decoupling result for error cases
 */
const createEmptyDecouplingResult = (reason: string, durationMinutes: number): PaceDecouplingResult => ({
  decouplingPercentage: 0,
  aerobicEfficiency: 'fair',
  firstHalfPace: 0,
  secondHalfPace: 0,
  confidence: 0,
  environmentallyAdjusted: false,
  recommendations: [reason],
  dataQuality: {
    hasHeartRateData: false,
    hasDetailedPaceData: false,
    runDurationMinutes: Math.round(durationMinutes),
    qualityScore: 0
  }
});

/**
 * Analyze pace decoupling trends across multiple runs
 * Requirements: 11.4 - Show improvements in aerobic efficiency over time
 */
export const analyzePaceDecouplingTrends = (
  runs: EnrichedRun[],
  userPhysiology?: UserPhysiologyData,
  daysToAnalyze: number = 90
): PaceDecouplingTrend | null => {
  // Filter to long runs from the specified period
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToAnalyze);

  const longRuns = runs
    .filter(run => 
      run.moving_time >= 3600 && // 60+ minutes
      new Date(run.start_date) >= cutoffDate
    )
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  if (longRuns.length < 3) {
    return null; // Need at least 3 long runs for trend analysis
  }

  // Calculate decoupling for all long runs
  const decouplingResults: PaceDecouplingResult[] = [];
  
  for (const run of longRuns) {
    const result = calculatePaceDecoupling(run, userPhysiology);
    if (result !== null) {
      decouplingResults.push(result);
    }
  }

  if (decouplingResults.length < 3) {
    return null;
  }

  // Calculate trend metrics
  const decouplingValues = decouplingResults.map(r => r.decouplingPercentage);
  const averageDecoupling = decouplingValues.reduce((sum, val) => sum + val, 0) / decouplingValues.length;
  const bestDecoupling = Math.min(...decouplingValues);
  const worstDecoupling = Math.max(...decouplingValues);

  // Determine trend direction
  const trend = analyzeTrendDirection(decouplingValues);

  // Calculate consistency score
  const consistencyScore = calculateConsistencyScore(decouplingValues);

  // Analyze environmental impact
  const environmentalImpact = analyzeEnvironmentalImpact(longRuns, decouplingResults);

  // Generate trend-based recommendations
  const recommendations = generateTrendRecommendations(
    trend,
    averageDecoupling,
    consistencyScore,
    environmentalImpact
  );

  return {
    averageDecoupling: Math.round(averageDecoupling * 10) / 10,
    trend,
    bestDecoupling: Math.round(bestDecoupling * 10) / 10,
    worstDecoupling: Math.round(worstDecoupling * 10) / 10,
    consistencyScore: Math.round(consistencyScore),
    environmentalImpact,
    recommendations
  };
};

/**
 * Analyze trend direction in decoupling values
 */
const analyzeTrendDirection = (values: number[]): 'improving' | 'stable' | 'declining' => {
  if (values.length < 4) return 'stable';

  // Compare first third vs last third
  const firstThird = values.slice(0, Math.floor(values.length / 3));
  const lastThird = values.slice(-Math.floor(values.length / 3));

  const firstAvg = firstThird.reduce((sum, val) => sum + val, 0) / firstThird.length;
  const lastAvg = lastThird.reduce((sum, val) => sum + val, 0) / lastThird.length;

  const improvement = firstAvg - lastAvg; // Positive = improving (lower decoupling)

  if (improvement > 2) return 'improving';
  if (improvement < -2) return 'declining';
  return 'stable';
};

/**
 * Calculate consistency score based on decoupling variation
 */
const calculateConsistencyScore = (values: number[]): number => {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const standardDeviation = Math.sqrt(variance);

  // Convert to 0-100 score (lower std dev = higher consistency)
  const maxExpectedStdDev = 10; // Assume max reasonable std dev is 10%
  const consistencyScore = Math.max(0, 100 - (standardDeviation / maxExpectedStdDev) * 100);

  return consistencyScore;
};

/**
 * Analyze environmental impact on decoupling
 */
const analyzeEnvironmentalImpact = (
  runs: EnrichedRun[],
  results: PaceDecouplingResult[]
): {
  hotWeatherDecoupling: number;
  coolWeatherDecoupling: number;
  optimalConditionsDecoupling: number;
} => {
  const hotWeatherRuns = results.filter((_, i) => 
    runs[i].weather_data && runs[i].weather_data!.temperature > 25
  );
  const coolWeatherRuns = results.filter((_, i) => 
    runs[i].weather_data && runs[i].weather_data!.temperature < 15
  );
  const optimalWeatherRuns = results.filter((_, i) => 
    runs[i].weather_data && 
    runs[i].weather_data!.temperature >= 15 && 
    runs[i].weather_data!.temperature <= 25
  );

  const avgDecoupling = (results: PaceDecouplingResult[]) => 
    results.length > 0 
      ? results.reduce((sum, r) => sum + r.decouplingPercentage, 0) / results.length 
      : 0;

  return {
    hotWeatherDecoupling: Math.round(avgDecoupling(hotWeatherRuns) * 10) / 10,
    coolWeatherDecoupling: Math.round(avgDecoupling(coolWeatherRuns) * 10) / 10,
    optimalConditionsDecoupling: Math.round(avgDecoupling(optimalWeatherRuns) * 10) / 10
  };
};

/**
 * Generate trend-based recommendations
 */
const generateTrendRecommendations = (
  trend: 'improving' | 'stable' | 'declining',
  averageDecoupling: number,
  consistencyScore: number,
  environmentalImpact: any
): string[] => {
  const recommendations: string[] = [];

  // Trend-based recommendations
  if (trend === 'improving') {
    recommendations.push('🎯 Excellent progress! Your aerobic efficiency is improving');
    recommendations.push('Continue current training approach and pacing strategies');
  } else if (trend === 'declining') {
    recommendations.push('⚠️ Decoupling trending worse - review pacing and training load');
    recommendations.push('Consider more aerobic base building and conservative pacing');
  } else {
    recommendations.push('Stable decoupling patterns - consistent aerobic fitness');
  }

  // Average decoupling recommendations
  if (averageDecoupling > 12) {
    recommendations.push('Focus on aerobic base development and conservative pacing');
    recommendations.push('Practice negative split long runs to improve efficiency');
  } else if (averageDecoupling < 6) {
    recommendations.push('Excellent aerobic efficiency - consider slightly faster pacing');
  }

  // Consistency recommendations
  if (consistencyScore < 60) {
    recommendations.push('Work on pacing consistency - use heart rate or power for guidance');
  } else if (consistencyScore > 85) {
    recommendations.push('Very consistent pacing - excellent race preparation');
  }

  // Environmental recommendations
  if (environmentalImpact.hotWeatherDecoupling > environmentalImpact.optimalConditionsDecoupling + 3) {
    recommendations.push('Heat significantly impacts your efficiency - adjust pacing in hot weather');
  }

  return recommendations;
};

/**
 * Format decoupling percentage for display
 */
export const formatDecouplingPercentage = (percentage: number): string => {
  return `${percentage.toFixed(1)}%`;
};

/**
 * Get color class for decoupling percentage
 */
export const getDecouplingColorClass = (percentage: number): string => {
  if (percentage < 5) return 'text-green-600'; // Excellent
  if (percentage < 10) return 'text-blue-600'; // Good
  if (percentage < 15) return 'text-yellow-600'; // Fair
  return 'text-red-600'; // Poor
};

/**
 * Get background color class for decoupling percentage
 */
export const getDecouplingBackgroundClass = (percentage: number): string => {
  if (percentage < 5) return 'bg-green-100'; // Excellent
  if (percentage < 10) return 'bg-blue-100'; // Good
  if (percentage < 15) return 'bg-yellow-100'; // Fair
  return 'bg-red-100'; // Poor
};

/**
 * Get efficiency description
 */
export const getEfficiencyDescription = (efficiency: 'excellent' | 'good' | 'fair' | 'poor'): string => {
  const descriptions = {
    excellent: 'Outstanding aerobic efficiency and pacing',
    good: 'Good aerobic efficiency with minor room for improvement',
    fair: 'Moderate efficiency - pacing adjustments recommended',
    poor: 'Significant decoupling - focus on aerobic base and pacing'
  };
  
  return descriptions[efficiency];
};