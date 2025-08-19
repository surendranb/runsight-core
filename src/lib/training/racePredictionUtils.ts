// Advanced Race Prediction Models
// Requirements: 12.1, 12.2, 12.3, 12.4, 12.5

import { EnrichedRun } from '../../types';
import { calculateTRIMP } from './trainingLoadUtils';
import { calculateVO2Max } from './vo2MaxUtils';
import { calculateACWRFromRuns } from './acwrUtils';
import { calculateAdjustedPace } from './environmentalAdjustmentUtils';

export interface RacePrediction {
  distance: number; // meters
  distanceName: string; // "5K", "10K", "Half Marathon", "Marathon"
  predictedTime: number; // seconds
  predictedPace: number; // seconds per km
  confidenceInterval: {
    optimistic: number; // seconds (best case scenario)
    realistic: number; // seconds (most likely)
    conservative: number; // seconds (worst case scenario)
  };
  confidence: number; // 0-1 overall confidence in prediction
  basedOn: {
    currentVO2Max?: number;
    recentPerformance: boolean;
    trainingLoad: boolean;
    environmentalFactors: boolean;
    fitnessProgression: boolean;
  };
  environmentalAdjustments?: {
    temperature: number; // Expected race temperature
    humidity: number; // Expected race humidity
    elevation: number; // Expected race elevation gain
    paceAdjustment: number; // Total pace adjustment in seconds per km
  };
  recommendations: string[];
  calculatedAt: string;
}

export interface RaceStrategy {
  distance: number;
  targetPace: number; // seconds per km
  paceStrategy: {
    firstQuarter: { pace: number; effort: string; advice: string };
    secondQuarter: { pace: number; effort: string; advice: string };
    thirdQuarter: { pace: number; effort: string; advice: string };
    finalQuarter: { pace: number; effort: string; advice: string };
  };
  fuelStrategy: string[];
  hydrationStrategy: string[];
  pacingAdvice: string[];
  riskFactors: string[];
}

export interface FitnessBasedPrediction {
  currentFitnessLevel: 'peak' | 'good' | 'moderate' | 'building' | 'detrained';
  fitnessScore: number; // 0-100
  fatigueLevel: 'fresh' | 'moderate' | 'high' | 'overreached';
  trainingLoadStatus: 'optimal' | 'high' | 'low' | 'risky';
  readinessScore: number; // 0-100 combination of fitness and fatigue
  peakingAdvice: string[];
}

/**
 * Calculate sophisticated race time predictions using multiple factors
 * Requirements: 12.1, 12.2, 12.3
 */
export const calculateAdvancedRacePrediction = (
  runs: EnrichedRun[],
  raceDistance: number,
  raceConditions?: {
    temperature?: number;
    humidity?: number;
    elevationGain?: number;
  }
): RacePrediction => {
  const distanceName = getDistanceName(raceDistance);
  
  // Get recent performance data (last 90 days)
  const recentRuns = runs
    .filter(run => {
      const runDate = new Date(run.start_date);
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      return runDate >= ninetyDaysAgo;
    })
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

  if (recentRuns.length < 5) {
    return createMinimalPrediction(raceDistance, distanceName);
  }

  // Calculate current fitness metrics
  const currentVO2Max = calculateCurrentVO2Max(recentRuns);
  const fitnessProgression = analyzeFitnessProgression(recentRuns);
  const trainingLoadAnalysis = analyzeTrainingLoad(recentRuns);
  
  // Base prediction on VO2 Max and recent performance
  const basePrediction = calculateBasePrediction(raceDistance, currentVO2Max, recentRuns);
  
  // Adjust for training load and fitness state
  const fitnessAdjustment = calculateFitnessAdjustment(trainingLoadAnalysis, fitnessProgression);
  
  // Apply environmental adjustments if race conditions provided
  let environmentalAdjustment = 0;
  let environmentalAdjustments: RacePrediction['environmentalAdjustments'];
  
  if (raceConditions) {
    const envResult = calculateEnvironmentalRaceAdjustment(raceConditions, raceDistance);
    environmentalAdjustment = envResult.totalAdjustment;
    environmentalAdjustments = {
      temperature: raceConditions.temperature || 20,
      humidity: raceConditions.humidity || 60,
      elevation: raceConditions.elevationGain || 0,
      paceAdjustment: envResult.paceAdjustmentPerKm
    };
  }
  
  // Calculate final prediction with all adjustments
  const adjustedTime = basePrediction + fitnessAdjustment + environmentalAdjustment;
  const predictedTime = Math.max(raceDistance * 0.18, adjustedTime); // Minimum 3:00/km pace
  
  // Calculate confidence intervals
  const confidenceInterval = calculateConfidenceInterval(
    predictedTime,
    trainingLoadAnalysis,
    recentRuns.length,
    currentVO2Max ? 0.8 : 0.5
  );
  
  // Calculate overall confidence
  const confidence = calculatePredictionConfidence(
    recentRuns,
    currentVO2Max,
    trainingLoadAnalysis,
    raceDistance
  );
  
  // Generate recommendations
  const recommendations = generateRaceRecommendations(
    trainingLoadAnalysis,
    fitnessProgression,
    raceDistance,
    environmentalAdjustments
  );
  
  return {
    distance: raceDistance,
    distanceName,
    predictedTime: Math.round(predictedTime),
    predictedPace: Math.round(predictedTime / (raceDistance / 1000)),
    confidenceInterval,
    confidence: Math.round(confidence * 100) / 100,
    basedOn: {
      currentVO2Max,
      recentPerformance: recentRuns.length >= 5,
      trainingLoad: true,
      environmentalFactors: !!raceConditions,
      fitnessProgression: fitnessProgression.trend !== 'stable'
    },
    environmentalAdjustments,
    recommendations,
    calculatedAt: new Date().toISOString()
  };
};

/**
 * Calculate current VO2 Max from recent runs
 * Requirements: 12.1
 */
const calculateCurrentVO2Max = (recentRuns: EnrichedRun[]): number | undefined => {
  const vo2MaxRuns = recentRuns
    .filter(run => run.average_heartrate && run.distance >= 3000) // At least 3km with HR
    .slice(0, 10); // Last 10 qualifying runs
  
  if (vo2MaxRuns.length < 3) {
    return undefined;
  }
  
  const vo2MaxValues = vo2MaxRuns
    .map(run => calculateVO2Max(run, { restingHeartRate: 60, maxHeartRate: 190 })) // Default physiology
    .filter(result => result.vo2Max && result.confidence > 0.6)
    .map(result => result.vo2Max!);
  
  if (vo2MaxValues.length === 0) {
    return undefined;
  }
  
  // Return weighted average with more recent runs weighted higher
  const weights = vo2MaxValues.map((_, index) => Math.pow(0.9, index));
  const weightedSum = vo2MaxValues.reduce((sum, vo2, index) => sum + vo2 * weights[index], 0);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  
  return Math.round((weightedSum / totalWeight) * 10) / 10;
};

/**
 * Analyze fitness progression trend
 * Requirements: 12.1
 */
const analyzeFitnessProgression = (recentRuns: EnrichedRun[]): {
  trend: 'improving' | 'stable' | 'declining';
  rate: number; // Change per week
  confidence: number;
} => {
  if (recentRuns.length < 8) {
    return { trend: 'stable', rate: 0, confidence: 0.3 };
  }
  
  // Calculate weekly average paces
  const weeklyPaces: number[] = [];
  const weeksBack = Math.min(8, Math.floor(recentRuns.length / 3));
  
  for (let week = 0; week < weeksBack; week++) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (week * 7));
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - ((week + 1) * 7));
    
    const weekRuns = recentRuns.filter(run => {
      const runDate = new Date(run.start_date);
      return runDate >= weekEnd && runDate < weekStart;
    });
    
    if (weekRuns.length > 0) {
      const avgPace = weekRuns.reduce((sum, run) => 
        sum + (run.moving_time / (run.distance / 1000)), 0
      ) / weekRuns.length;
      weeklyPaces.push(avgPace);
    }
  }
  
  if (weeklyPaces.length < 4) {
    return { trend: 'stable', rate: 0, confidence: 0.4 };
  }
  
  // Calculate linear regression to determine trend
  const n = weeklyPaces.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = weeklyPaces;
  
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumXX = x.reduce((sum, val) => sum + val * val, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const rate = -slope; // Negative because lower pace = better performance
  
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (rate > 2) trend = 'improving'; // Getting faster by >2s/km per week
  else if (rate < -2) trend = 'declining'; // Getting slower by >2s/km per week
  
  const confidence = Math.min(0.9, 0.5 + (weeklyPaces.length * 0.05));
  
  return { trend, rate: Math.round(rate * 10) / 10, confidence };
};

/**
 * Analyze current training load status
 * Requirements: 12.1
 */
const analyzeTrainingLoad = (recentRuns: EnrichedRun[]): {
  status: 'optimal' | 'high' | 'low' | 'risky';
  acwr: number;
  weeklyDistance: number;
  weeklyTRIMP: number;
  recommendation: string;
} => {
  if (recentRuns.length < 14) {
    return {
      status: 'low',
      acwr: 0.5,
      weeklyDistance: 0,
      weeklyTRIMP: 0,
      recommendation: 'Need more training data for accurate assessment'
    };
  }
  
  // Calculate ACWR
  const acwrResult = calculateACWRFromRuns(recentRuns, 'distance');
  
  // Calculate recent weekly averages
  const lastWeekRuns = recentRuns.filter(run => {
    const runDate = new Date(run.start_date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return runDate >= weekAgo;
  });
  
  const weeklyDistance = lastWeekRuns.reduce((sum, run) => sum + run.distance, 0) / 1000;
  const weeklyTRIMP = lastWeekRuns.reduce((sum, run) => {
    const trimpResult = calculateTRIMP(run, { restingHeartRate: 60, maxHeartRate: 190 }); // Default physiology
    return sum + (trimpResult.trimp || trimpResult.estimatedTRIMP || 0);
  }, 0);
  
  let status: 'optimal' | 'high' | 'low' | 'risky' = 'optimal';
  let recommendation = 'Training load is well balanced';
  
  if (acwrResult.value.status === 'high-risk') {
    status = 'risky';
    recommendation = 'High injury risk - reduce training load immediately';
  } else if (acwrResult.value.status === 'caution') {
    status = 'high';
    recommendation = 'Training load is elevated - monitor closely';
  } else if (acwrResult.value.status === 'detraining') {
    status = 'low';
    recommendation = 'Training load is too low - gradually increase volume';
  }
  
  return {
    status,
    acwr: acwrResult.value.acwr,
    weeklyDistance: Math.round(weeklyDistance),
    weeklyTRIMP: Math.round(weeklyTRIMP),
    recommendation
  };
};

/**
 * Calculate base race prediction from VO2 Max and recent performance
 * Requirements: 12.1
 */
const calculateBasePrediction = (
  raceDistance: number,
  vo2Max: number | undefined,
  recentRuns: EnrichedRun[]
): number => {
  // Method 1: VO2 Max based prediction (Jack Daniels formula)
  let vo2Prediction: number | undefined;
  if (vo2Max) {
    vo2Prediction = calculateVO2MaxBasedPrediction(raceDistance, vo2Max);
  }
  
  // Method 2: Recent performance extrapolation
  const performancePrediction = calculatePerformanceBasedPrediction(raceDistance, recentRuns);
  
  // Method 3: Distance-specific recent performance
  const distanceSpecificPrediction = calculateDistanceSpecificPrediction(raceDistance, recentRuns);
  
  // Combine predictions with weights based on confidence
  const predictions: Array<{ value: number; weight: number }> = [];
  
  if (vo2Prediction) {
    predictions.push({ value: vo2Prediction, weight: 0.4 });
  }
  
  if (performancePrediction) {
    predictions.push({ value: performancePrediction, weight: 0.4 });
  }
  
  if (distanceSpecificPrediction) {
    predictions.push({ value: distanceSpecificPrediction, weight: 0.6 });
  }
  
  if (predictions.length === 0) {
    // Fallback: estimate based on average recreational runner pace
    return raceDistance * 0.33; // ~5:30/km pace
  }
  
  const totalWeight = predictions.reduce((sum, p) => sum + p.weight, 0);
  const weightedAverage = predictions.reduce((sum, p) => sum + p.value * p.weight, 0) / totalWeight;
  
  return weightedAverage;
};

/**
 * Calculate VO2 Max based race prediction using Jack Daniels formula
 * Requirements: 12.1
 */
const calculateVO2MaxBasedPrediction = (distance: number, vo2Max: number): number => {
  // Jack Daniels VDOT formula for race time prediction
  const distanceKm = distance / 1000;
  
  // Velocity at VO2 Max (vVO2max) in km/h
  const vVO2Max = vo2Max * 0.2; // Rough approximation
  
  // Time limit at vVO2max (Tlim) - varies by distance
  let tlim: number;
  if (distanceKm <= 5) {
    tlim = 6; // 6 minutes for 5K and shorter
  } else if (distanceKm <= 10) {
    tlim = 8; // 8 minutes for 10K
  } else if (distanceKm <= 21.1) {
    tlim = 12; // 12 minutes for half marathon
  } else {
    tlim = 15; // 15 minutes for marathon and longer
  }
  
  // Calculate sustainable pace as percentage of vVO2max
  let pacePercentage: number;
  if (distanceKm <= 5) {
    pacePercentage = 0.95; // 95% of vVO2max for 5K
  } else if (distanceKm <= 10) {
    pacePercentage = 0.88; // 88% of vVO2max for 10K
  } else if (distanceKm <= 21.1) {
    pacePercentage = 0.82; // 82% of vVO2max for half marathon
  } else {
    pacePercentage = 0.75; // 75% of vVO2max for marathon
  }
  
  const raceVelocity = vVO2Max * pacePercentage; // km/h
  const raceTime = (distanceKm / raceVelocity) * 3600; // seconds
  
  return raceTime;
};

/**
 * Calculate performance-based prediction from recent runs
 * Requirements: 12.1
 */
const calculatePerformanceBasedPrediction = (
  raceDistance: number,
  recentRuns: EnrichedRun[]
): number | undefined => {
  // Find runs of similar effort level (tempo/threshold runs)
  const tempoRuns = recentRuns.filter(run => {
    const pace = run.moving_time / (run.distance / 1000);
    const distance = run.distance;
    
    // Look for runs that are likely tempo efforts (3-15km at sustained pace)
    return distance >= 3000 && distance <= 15000 && 
           run.average_heartrate && run.average_heartrate > 150;
  }).slice(0, 5);
  
  if (tempoRuns.length < 2) {
    return undefined;
  }
  
  // Calculate average pace from tempo runs
  const avgTempoPace = tempoRuns.reduce((sum, run) => 
    sum + (run.moving_time / (run.distance / 1000)), 0
  ) / tempoRuns.length;
  
  // Extrapolate to race distance using established ratios
  const raceDistanceKm = raceDistance / 1000;
  let paceAdjustment = 0;
  
  if (raceDistanceKm <= 5) {
    paceAdjustment = -10; // 5K pace ~10s/km faster than tempo
  } else if (raceDistanceKm <= 10) {
    paceAdjustment = -5; // 10K pace ~5s/km faster than tempo
  } else if (raceDistanceKm <= 21.1) {
    paceAdjustment = 5; // Half marathon ~5s/km slower than tempo
  } else {
    paceAdjustment = 15; // Marathon ~15s/km slower than tempo
  }
  
  const predictedPace = avgTempoPace + paceAdjustment;
  return (raceDistance / 1000) * predictedPace;
};

/**
 * Calculate distance-specific prediction from similar distance runs
 * Requirements: 12.1
 */
const calculateDistanceSpecificPrediction = (
  raceDistance: number,
  recentRuns: EnrichedRun[]
): number | undefined => {
  const distanceTolerance = raceDistance * 0.2; // ±20% distance tolerance
  
  const similarRuns = recentRuns.filter(run => 
    Math.abs(run.distance - raceDistance) <= distanceTolerance
  ).slice(0, 3); // Last 3 similar distance runs
  
  if (similarRuns.length === 0) {
    return undefined;
  }
  
  // Calculate average time, weighted by recency
  const weights = similarRuns.map((_, index) => Math.pow(0.8, index));
  const weightedSum = similarRuns.reduce((sum, run, index) => 
    sum + run.moving_time * weights[index], 0
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  
  const avgTime = weightedSum / totalWeight;
  
  // Adjust for exact distance difference
  const distanceRatio = raceDistance / (similarRuns[0].distance);
  return avgTime * distanceRatio;
};/**
 
* Calculate fitness-based adjustments to base prediction
 * Requirements: 12.1, 12.3
 */
const calculateFitnessAdjustment = (
  trainingLoad: ReturnType<typeof analyzeTrainingLoad>,
  fitnessProgression: ReturnType<typeof analyzeFitnessProgression>
): number => {
  let adjustment = 0;
  
  // Training load adjustments
  switch (trainingLoad.status) {
    case 'risky':
      adjustment += 30; // Significant slowdown due to overtraining risk
      break;
    case 'high':
      adjustment += 10; // Moderate slowdown due to fatigue
      break;
    case 'low':
      adjustment += 15; // Slowdown due to insufficient training
      break;
    case 'optimal':
      adjustment += 0; // No adjustment for optimal training
      break;
  }
  
  // Fitness progression adjustments
  switch (fitnessProgression.trend) {
    case 'improving':
      adjustment -= Math.min(20, Math.abs(fitnessProgression.rate) * 2); // Faster due to improving fitness
      break;
    case 'declining':
      adjustment += Math.min(25, Math.abs(fitnessProgression.rate) * 2); // Slower due to declining fitness
      break;
    case 'stable':
      adjustment += 0; // No adjustment for stable fitness
      break;
  }
  
  return adjustment;
};

/**
 * Calculate environmental adjustments for race conditions
 * Requirements: 12.2
 */
const calculateEnvironmentalRaceAdjustment = (
  conditions: {
    temperature?: number;
    humidity?: number;
    elevationGain?: number;
  },
  raceDistance: number
): {
  totalAdjustment: number;
  paceAdjustmentPerKm: number;
} => {
  let paceAdjustmentPerKm = 0;
  
  // Temperature adjustments
  if (conditions.temperature !== undefined) {
    if (conditions.temperature > 20) {
      // Hot conditions: +2-3 seconds per km for every degree above 20°C
      paceAdjustmentPerKm += (conditions.temperature - 20) * 2.5;
    } else if (conditions.temperature < 10) {
      // Cold conditions: +1-2 seconds per km for every degree below 10°C
      paceAdjustmentPerKm += (10 - conditions.temperature) * 1.5;
    }
  }
  
  // Humidity adjustments
  if (conditions.humidity !== undefined && conditions.humidity > 60) {
    // High humidity: +1-2 seconds per km for every 10% above 60%
    paceAdjustmentPerKm += ((conditions.humidity - 60) / 10) * 1.5;
  }
  
  // Elevation adjustments
  if (conditions.elevationGain !== undefined && conditions.elevationGain > 0) {
    const elevationPerKm = conditions.elevationGain / (raceDistance / 1000);
    if (elevationPerKm > 10) {
      // Significant elevation: +10-15 seconds per km for every 10m elevation gain per km
      paceAdjustmentPerKm += (elevationPerKm / 10) * 12.5;
    }
  }
  
  const totalAdjustment = paceAdjustmentPerKm * (raceDistance / 1000);
  
  return {
    totalAdjustment,
    paceAdjustmentPerKm: Math.round(paceAdjustmentPerKm * 10) / 10
  };
};

/**
 * Calculate confidence intervals for race prediction
 * Requirements: 12.3
 */
const calculateConfidenceInterval = (
  predictedTime: number,
  trainingLoad: ReturnType<typeof analyzeTrainingLoad>,
  dataPoints: number,
  baseConfidence: number
): RacePrediction['confidenceInterval'] => {
  // Base variance as percentage of predicted time
  let variancePercent = 0.08; // 8% base variance
  
  // Adjust variance based on training load status
  switch (trainingLoad.status) {
    case 'risky':
      variancePercent += 0.05; // Higher uncertainty with overtraining
      break;
    case 'high':
      variancePercent += 0.02;
      break;
    case 'low':
      variancePercent += 0.03; // Higher uncertainty with low training
      break;
  }
  
  // Adjust variance based on data quality
  if (dataPoints < 10) {
    variancePercent += 0.03;
  } else if (dataPoints > 20) {
    variancePercent -= 0.01;
  }
  
  // Adjust variance based on base confidence
  variancePercent *= (1.2 - baseConfidence);
  
  const variance = predictedTime * variancePercent;
  
  return {
    optimistic: Math.round(predictedTime - variance),
    realistic: Math.round(predictedTime),
    conservative: Math.round(predictedTime + variance)
  };
};

/**
 * Calculate overall prediction confidence
 * Requirements: 12.3
 */
const calculatePredictionConfidence = (
  recentRuns: EnrichedRun[],
  vo2Max: number | undefined,
  trainingLoad: ReturnType<typeof analyzeTrainingLoad>,
  raceDistance: number
): number => {
  let confidence = 0.5; // Base confidence
  
  // Data quantity bonus
  if (recentRuns.length >= 20) {
    confidence += 0.2;
  } else if (recentRuns.length >= 10) {
    confidence += 0.1;
  }
  
  // VO2 Max availability bonus
  if (vo2Max) {
    confidence += 0.15;
  }
  
  // Training load status impact
  switch (trainingLoad.status) {
    case 'optimal':
      confidence += 0.1;
      break;
    case 'risky':
      confidence -= 0.15;
      break;
    case 'low':
      confidence -= 0.1;
      break;
  }
  
  // Distance-specific confidence
  if (raceDistance === 5000 || raceDistance === 10000) {
    confidence += 0.05; // More predictable distances
  } else if (raceDistance >= 42195) {
    confidence -= 0.05; // Marathon more variable
  }
  
  return Math.max(0.2, Math.min(0.95, confidence));
};

/**
 * Generate race-specific recommendations
 * Requirements: 12.4, 12.5
 */
const generateRaceRecommendations = (
  trainingLoad: ReturnType<typeof analyzeTrainingLoad>,
  fitnessProgression: ReturnType<typeof analyzeFitnessProgression>,
  raceDistance: number,
  environmentalAdjustments?: RacePrediction['environmentalAdjustments']
): string[] => {
  const recommendations: string[] = [];
  
  // Training load recommendations
  switch (trainingLoad.status) {
    case 'risky':
      recommendations.push('High injury risk detected - consider reducing training volume before race');
      recommendations.push('Focus on recovery and easy runs leading up to race');
      break;
    case 'high':
      recommendations.push('Training load is elevated - prioritize recovery in final weeks');
      recommendations.push('Avoid high-intensity sessions close to race day');
      break;
    case 'low':
      recommendations.push('Training volume is low - consider conservative race goals');
      recommendations.push('Focus on building base fitness for future races');
      break;
    case 'optimal':
      recommendations.push('Training load is well balanced - maintain current approach');
      break;
  }
  
  // Fitness progression recommendations
  switch (fitnessProgression.trend) {
    case 'improving':
      recommendations.push('Fitness is improving - you may exceed predicted times');
      recommendations.push('Consider slightly aggressive pacing strategy');
      break;
    case 'declining':
      recommendations.push('Recent fitness decline detected - race conservatively');
      recommendations.push('Focus on maintaining current fitness rather than pushing limits');
      break;
    case 'stable':
      recommendations.push('Fitness is stable - stick to proven pacing strategies');
      break;
  }
  
  // Environmental recommendations
  if (environmentalAdjustments) {
    if (environmentalAdjustments.temperature > 25) {
      recommendations.push('Hot conditions expected - increase hydration and start conservatively');
      recommendations.push('Consider pre-cooling strategies and electrolyte management');
    } else if (environmentalAdjustments.temperature < 5) {
      recommendations.push('Cold conditions expected - ensure proper warm-up and layering');
    }
    
    if (environmentalAdjustments.humidity > 75) {
      recommendations.push('High humidity expected - adjust pacing and cooling strategies');
    }
    
    if (environmentalAdjustments.elevation > 100) {
      recommendations.push('Significant elevation gain - practice hill running and pacing');
      recommendations.push('Start conservatively and save energy for climbs');
    }
  }
  
  // Distance-specific recommendations
  if (raceDistance <= 5000) {
    recommendations.push('5K distance - focus on maintaining high intensity throughout');
  } else if (raceDistance <= 10000) {
    recommendations.push('10K distance - balance aggressive start with strong finish');
  } else if (raceDistance <= 21097) {
    recommendations.push('Half marathon - practice race pace and fueling strategy');
  } else if (raceDistance >= 42195) {
    recommendations.push('Marathon distance - prioritize pacing discipline and fueling');
    recommendations.push('Practice negative split strategy in training');
  }
  
  return recommendations;
};

/**
 * Create race strategy based on prediction and conditions
 * Requirements: 12.4, 12.5
 */
export const createRaceStrategy = (
  prediction: RacePrediction,
  userPreferences?: {
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  }
): RaceStrategy => {
  const targetPace = prediction.predictedPace;
  const riskTolerance = userPreferences?.riskTolerance || 'moderate';
  const experienceLevel = userPreferences?.experienceLevel || 'intermediate';
  
  // Adjust target pace based on risk tolerance
  let adjustedTargetPace = targetPace;
  switch (riskTolerance) {
    case 'conservative':
      adjustedTargetPace = targetPace + 10; // 10s/km slower
      break;
    case 'aggressive':
      adjustedTargetPace = targetPace - 5; // 5s/km faster
      break;
  }
  
  // Create quarter-by-quarter pacing strategy
  const paceStrategy = createPacingStrategy(
    prediction.distance,
    adjustedTargetPace,
    experienceLevel
  );
  
  // Generate fueling strategy
  const fuelStrategy = createFuelingStrategy(prediction.distance, experienceLevel);
  
  // Generate hydration strategy
  const hydrationStrategy = createHydrationStrategy(
    prediction.distance,
    prediction.environmentalAdjustments
  );
  
  // Generate pacing advice
  const pacingAdvice = createPacingAdvice(prediction.distance, riskTolerance);
  
  // Identify risk factors
  const riskFactors = identifyRiskFactors(prediction, userPreferences);
  
  return {
    distance: prediction.distance,
    targetPace: adjustedTargetPace,
    paceStrategy,
    fuelStrategy,
    hydrationStrategy,
    pacingAdvice,
    riskFactors
  };
};

/**
 * Create quarter-by-quarter pacing strategy
 * Requirements: 12.5
 */
const createPacingStrategy = (
  distance: number,
  targetPace: number,
  experienceLevel: string
): RaceStrategy['paceStrategy'] => {
  const isLongDistance = distance >= 21097; // Half marathon or longer
  
  if (isLongDistance) {
    // Negative split strategy for long distances
    return {
      firstQuarter: {
        pace: targetPace + 5,
        effort: 'Controlled',
        advice: 'Start conservatively, settle into rhythm'
      },
      secondQuarter: {
        pace: targetPace + 2,
        effort: 'Steady',
        advice: 'Gradually increase to target pace'
      },
      thirdQuarter: {
        pace: targetPace,
        effort: 'Focused',
        advice: 'Maintain target pace, stay mentally strong'
      },
      finalQuarter: {
        pace: targetPace - 3,
        effort: 'Strong',
        advice: 'Push hard if feeling good, maintain if struggling'
      }
    };
  } else {
    // More aggressive strategy for shorter distances
    return {
      firstQuarter: {
        pace: targetPace - 2,
        effort: 'Strong',
        advice: 'Start slightly faster to establish position'
      },
      secondQuarter: {
        pace: targetPace,
        effort: 'Steady',
        advice: 'Settle into target pace rhythm'
      },
      thirdQuarter: {
        pace: targetPace + 2,
        effort: 'Focused',
        advice: 'Fight through the difficult middle section'
      },
      finalQuarter: {
        pace: targetPace - 5,
        effort: 'Maximum',
        advice: 'Empty the tank - give everything you have'
      }
    };
  }
};

/**
 * Create fueling strategy based on distance
 * Requirements: 12.5
 */
const createFuelingStrategy = (distance: number, experienceLevel: string): string[] => {
  const strategy: string[] = [];
  
  if (distance <= 10000) {
    strategy.push('No fueling needed during race');
    strategy.push('Ensure proper pre-race meal 2-3 hours before');
    strategy.push('Consider small amount of carbs 30-60 minutes before start');
  } else if (distance <= 21097) {
    strategy.push('Consider sports drink or gel at 45-60 minutes');
    strategy.push('Practice fueling strategy during long training runs');
    strategy.push('Aim for 30-60g carbs per hour after first hour');
  } else {
    strategy.push('Begin fueling at 45-60 minutes, then every 45-60 minutes');
    strategy.push('Target 60-90g carbs per hour after first hour');
    strategy.push('Use variety of fuel sources to prevent flavor fatigue');
    strategy.push('Practice exact race fueling during long runs');
  }
  
  return strategy;
};

/**
 * Create hydration strategy
 * Requirements: 12.5
 */
const createHydrationStrategy = (
  distance: number,
  environmentalAdjustments?: RacePrediction['environmentalAdjustments']
): string[] => {
  const strategy: string[] = [];
  const isHot = environmentalAdjustments?.temperature && environmentalAdjustments.temperature > 20;
  const isHumid = environmentalAdjustments?.humidity && environmentalAdjustments.humidity > 70;
  
  if (distance <= 5000) {
    strategy.push('Minimal hydration needed during race');
    strategy.push('Ensure proper hydration 2-4 hours before race');
  } else if (distance <= 10000) {
    strategy.push('Small sips of water if available and needed');
    strategy.push('Focus on pre-race hydration');
    if (isHot || isHumid) {
      strategy.push('Consider sports drink due to hot/humid conditions');
    }
  } else {
    strategy.push('Drink to thirst - aim for 150-250ml every 15-20 minutes');
    strategy.push('Use sports drink for runs over 90 minutes');
    if (isHot || isHumid) {
      strategy.push('Increase fluid intake due to environmental conditions');
      strategy.push('Consider electrolyte replacement every 30-45 minutes');
    }
  }
  
  return strategy;
};

/**
 * Create pacing advice
 * Requirements: 12.5
 */
const createPacingAdvice = (distance: number, riskTolerance: string): string[] => {
  const advice: string[] = [];
  
  // Universal advice
  advice.push('Use a GPS watch or app to monitor pace consistently');
  advice.push('Focus on effort level rather than exact pace in challenging conditions');
  
  // Distance-specific advice
  if (distance <= 5000) {
    advice.push('5K is mostly anaerobic - expect discomfort and push through');
    advice.push('Use other runners for pacing and motivation');
  } else if (distance <= 10000) {
    advice.push('10K requires balance of speed and endurance');
    advice.push('The middle 5K is crucial - stay mentally engaged');
  } else if (distance >= 21097) {
    advice.push('Long distance success depends on pacing discipline');
    advice.push('Save energy for the final 25% when it gets difficult');
  }
  
  // Risk tolerance advice
  if (riskTolerance === 'conservative') {
    advice.push('Better to finish strong than to blow up early');
    advice.push('If in doubt, err on the side of caution with pacing');
  } else if (riskTolerance === 'aggressive') {
    advice.push('Take calculated risks - you can always slow down if needed');
    advice.push('Use adrenaline and race atmosphere to your advantage');
  }
  
  return advice;
};

/**
 * Identify potential risk factors
 * Requirements: 12.3
 */
const identifyRiskFactors = (
  prediction: RacePrediction,
  userPreferences?: {
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  }
): string[] => {
  const risks: string[] = [];
  
  // Confidence-based risks
  if (prediction.confidence < 0.6) {
    risks.push('Low prediction confidence due to limited training data');
  }
  
  // Environmental risks
  if (prediction.environmentalAdjustments) {
    const env = prediction.environmentalAdjustments;
    if (env.temperature > 25 || env.temperature < 5) {
      risks.push('Extreme temperature conditions may impact performance');
    }
    if (env.humidity > 80) {
      risks.push('Very high humidity increases heat stress risk');
    }
    if (env.elevation > 200) {
      risks.push('Significant elevation gain requires adjusted pacing strategy');
    }
  }
  
  // Training load risks
  if (!prediction.basedOn.trainingLoad) {
    risks.push('Limited training load data may affect prediction accuracy');
  }
  
  // Experience level risks
  if (userPreferences?.experienceLevel === 'beginner') {
    risks.push('Race day nerves and inexperience may affect pacing');
    risks.push('Practice race day routine and fueling strategy');
  }
  
  // Distance-specific risks
  if (prediction.distance >= 42195 && userPreferences?.experienceLevel !== 'advanced') {
    risks.push('Marathon distance requires extensive preparation and experience');
  }
  
  return risks;
};

/**
 * Analyze current fitness and readiness for racing
 * Requirements: 12.1, 12.3
 */
export const analyzeFitnessReadiness = (runs: EnrichedRun[]): FitnessBasedPrediction => {
  const recentRuns = runs.slice(0, 30); // Last 30 runs
  
  if (recentRuns.length < 10) {
    return {
      currentFitnessLevel: 'building',
      fitnessScore: 40,
      fatigueLevel: 'moderate',
      trainingLoadStatus: 'low',
      readinessScore: 35,
      peakingAdvice: ['Need more training data for accurate fitness assessment']
    };
  }
  
  const trainingLoad = analyzeTrainingLoad(recentRuns);
  const fitnessProgression = analyzeFitnessProgression(recentRuns);
  
  // Calculate fitness level
  let fitnessLevel: FitnessBasedPrediction['currentFitnessLevel'] = 'moderate';
  let fitnessScore = 50;
  
  if (trainingLoad.weeklyDistance > 50 && fitnessProgression.trend === 'improving') {
    fitnessLevel = 'peak';
    fitnessScore = 85;
  } else if (trainingLoad.weeklyDistance > 30 && fitnessProgression.trend !== 'declining') {
    fitnessLevel = 'good';
    fitnessScore = 70;
  } else if (trainingLoad.weeklyDistance < 15 || fitnessProgression.trend === 'declining') {
    fitnessLevel = 'building';
    fitnessScore = 45;
  }
  
  // Calculate fatigue level
  let fatigueLevel: FitnessBasedPrediction['fatigueLevel'] = 'moderate';
  if (trainingLoad.status === 'risky') {
    fatigueLevel = 'overreached';
  } else if (trainingLoad.status === 'high') {
    fatigueLevel = 'high';
  } else if (trainingLoad.status === 'optimal') {
    fatigueLevel = 'fresh';
  }
  
  // Calculate readiness score
  const readinessScore = Math.round((fitnessScore * 0.7) + 
    (fatigueLevel === 'fresh' ? 30 : fatigueLevel === 'moderate' ? 20 : 
     fatigueLevel === 'high' ? 10 : 0));
  
  // Generate peaking advice
  const peakingAdvice = generatePeakingAdvice(fitnessLevel, fatigueLevel, trainingLoad.status);
  
  return {
    currentFitnessLevel: fitnessLevel,
    fitnessScore,
    fatigueLevel,
    trainingLoadStatus: trainingLoad.status,
    readinessScore: Math.max(0, Math.min(100, readinessScore)),
    peakingAdvice
  };
};

/**
 * Generate peaking and tapering advice
 * Requirements: 12.4
 */
const generatePeakingAdvice = (
  fitnessLevel: FitnessBasedPrediction['currentFitnessLevel'],
  fatigueLevel: FitnessBasedPrediction['fatigueLevel'],
  trainingLoadStatus: FitnessBasedPrediction['trainingLoadStatus']
): string[] => {
  const advice: string[] = [];
  
  // Fitness level advice
  switch (fitnessLevel) {
    case 'peak':
      advice.push('You are at peak fitness - maintain with quality over quantity');
      advice.push('Focus on race-specific workouts and recovery');
      break;
    case 'good':
      advice.push('Good fitness level - fine-tune with targeted workouts');
      advice.push('Consider 2-3 week taper for important races');
      break;
    case 'moderate':
      advice.push('Moderate fitness - continue building base with consistent training');
      advice.push('Focus on gradual volume increases');
      break;
    case 'building':
      advice.push('Building phase - prioritize consistency over intensity');
      advice.push('Establish solid aerobic base before adding speed work');
      break;
    case 'detrained':
      advice.push('Return to training gradually with easy runs');
      advice.push('Focus on rebuilding aerobic fitness');
      break;
  }
  
  // Fatigue level advice
  switch (fatigueLevel) {
    case 'overreached':
      advice.push('High fatigue detected - immediate rest and recovery needed');
      advice.push('Consider postponing races until recovered');
      break;
    case 'high':
      advice.push('Elevated fatigue - reduce training volume this week');
      advice.push('Prioritize sleep and recovery protocols');
      break;
    case 'moderate':
      advice.push('Normal fatigue levels - maintain current recovery practices');
      break;
    case 'fresh':
      advice.push('Low fatigue - good time for quality workouts or racing');
      break;
  }
  
  return advice;
};

// Helper functions

const getDistanceName = (distance: number): string => {
  if (distance <= 5000) return '5K';
  if (distance <= 10000) return '10K';
  if (distance <= 21097) return 'Half Marathon';
  if (distance <= 42195) return 'Marathon';
  return `${Math.round(distance / 1000)}K`;
};

const createMinimalPrediction = (distance: number, distanceName: string): RacePrediction => {
  const estimatedPace = 330; // 5:30/km conservative estimate
  const predictedTime = (distance / 1000) * estimatedPace;
  
  return {
    distance,
    distanceName,
    predictedTime: Math.round(predictedTime),
    predictedPace: estimatedPace,
    confidenceInterval: {
      optimistic: Math.round(predictedTime * 0.9),
      realistic: Math.round(predictedTime),
      conservative: Math.round(predictedTime * 1.1)
    },
    confidence: 0.3,
    basedOn: {
      recentPerformance: false,
      trainingLoad: false,
      environmentalFactors: false,
      fitnessProgression: false
    },
    recommendations: [
      'Limited training data available for accurate prediction',
      'Build more training history for better predictions',
      'Start conservatively and adjust based on how you feel'
    ],
    calculatedAt: new Date().toISOString()
  };
};

/**
 * Get multiple race predictions for common distances
 * Requirements: 12.1
 */
export const getMultipleRacePredictions = (
  runs: EnrichedRun[],
  raceConditions?: {
    temperature?: number;
    humidity?: number;
    elevationGain?: number;
  }
): RacePrediction[] => {
  const distances = [5000, 10000, 21097, 42195]; // 5K, 10K, Half, Marathon
  
  return distances.map(distance => 
    calculateAdvancedRacePrediction(runs, distance, raceConditions)
  );
};

/**
 * Format race time for display
 */
export const formatRaceTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
};

/**
 * Format pace for display
 */
export const formatPace = (secondsPerKm: number): string => {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
};