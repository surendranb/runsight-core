// Physiological Strain Index (PSI) Calculator
// Based on established heat stress formulas and heart rate elevation

import { EnrichedRun } from '../../types';
import { UserPhysiologyData } from '../../types/advancedMetrics';

export interface PSIResult {
  psiScore: number; // 0-10 scale
  strainLevel: 'minimal' | 'low' | 'moderate' | 'high' | 'extreme';
  heatStressComponents: {
    heartRateStrain: number; // 0-5 scale
    environmentalStrain: number; // 0-5 scale
  };
  recommendations: string[];
  confidence: number; // 0-1
  dataQuality: {
    hasHeartRateData: boolean;
    hasWeatherData: boolean;
    qualityScore: number;
  };
}

export interface PSITrendAnalysis {
  currentPSI: number;
  averagePSI: number;
  trend: 'improving' | 'stable' | 'worsening';
  heatAcclimatization: {
    status: 'poor' | 'developing' | 'good' | 'excellent';
    progressScore: number; // 0-100
    daysToImprovement: number;
  };
  highStrainDays: number;
  recommendations: string[];
}

/**
 * Calculate Physiological Strain Index (PSI) for a run
 * Requirements: 4.1, 4.2 - Calculate PSI using heart rate elevation and environmental data
 */
export const calculatePSI = (
  run: EnrichedRun,
  userPhysiology: UserPhysiologyData
): PSIResult => {
  // Check data availability
  const hasHeartRateData = !!(run.average_heartrate && userPhysiology.restingHeartRate);
  const hasWeatherData = !!run.weather_data;
  
  if (!hasHeartRateData && !hasWeatherData) {
    return createEmptyPSIResult('No heart rate or weather data available');
  }

  // Calculate heart rate strain component (0-5 scale)
  const heartRateStrain = hasHeartRateData 
    ? calculateHeartRateStrain(run, userPhysiology)
    : 0;

  // Calculate environmental strain component (0-5 scale)
  const environmentalStrain = hasWeatherData
    ? calculateEnvironmentalStrain(run)
    : 0;

  // Combine components for final PSI score (0-10 scale)
  const psiScore = heartRateStrain + environmentalStrain;

  // Determine strain level
  const strainLevel = determinePSIStrainLevel(psiScore);

  // Generate recommendations
  const recommendations = generatePSIRecommendations(psiScore, strainLevel, run);

  // Calculate confidence based on data quality
  const confidence = calculatePSIConfidence(hasHeartRateData, hasWeatherData, run, userPhysiology);

  return {
    psiScore: Math.round(psiScore * 10) / 10, // Round to 1 decimal
    strainLevel,
    heatStressComponents: {
      heartRateStrain: Math.round(heartRateStrain * 10) / 10,
      environmentalStrain: Math.round(environmentalStrain * 10) / 10
    },
    recommendations,
    confidence,
    dataQuality: {
      hasHeartRateData,
      hasWeatherData,
      qualityScore: confidence * 100
    }
  };
};

/**
 * Calculate heart rate strain component (0-5 scale)
 * Based on heart rate elevation above resting
 */
const calculateHeartRateStrain = (
  run: EnrichedRun,
  userPhysiology: UserPhysiologyData
): number => {
  if (!run.average_heartrate || !userPhysiology.restingHeartRate) {
    return 0;
  }

  const restingHR = userPhysiology.restingHeartRate;
  const maxHR = userPhysiology.maxHeartRate || estimateMaxHeartRate(userPhysiology);
  const avgHR = run.average_heartrate;

  // Calculate heart rate reserve percentage
  const hrReserve = maxHR - restingHR;
  const hrElevation = avgHR - restingHR;
  const hrReservePercentage = (hrElevation / hrReserve) * 100;

  // Convert to 0-5 strain scale
  let hrStrain = 0;
  
  if (hrReservePercentage <= 30) {
    hrStrain = 0.5; // Very light effort
  } else if (hrReservePercentage <= 50) {
    hrStrain = 1.5; // Light effort
  } else if (hrReservePercentage <= 70) {
    hrStrain = 2.5; // Moderate effort
  } else if (hrReservePercentage <= 85) {
    hrStrain = 3.5; // Hard effort
  } else if (hrReservePercentage <= 95) {
    hrStrain = 4.5; // Very hard effort
  } else {
    hrStrain = 5.0; // Maximum effort
  }

  // Adjust for duration - longer runs at high HR increase strain
  const durationMinutes = run.moving_time / 60;
  if (durationMinutes > 60 && hrReservePercentage > 60) {
    hrStrain += Math.min(1.0, (durationMinutes - 60) / 120); // Up to +1.0 for very long runs
  }

  return Math.min(5.0, hrStrain);
};

/**
 * Calculate environmental strain component (0-5 scale)
 * Based on temperature, humidity, and heat index
 */
const calculateEnvironmentalStrain = (run: EnrichedRun): number => {
  if (!run.weather_data) {
    return 0;
  }

  const temp = run.weather_data.temperature;
  const humidity = run.weather_data.humidity;

  // Calculate heat index (apparent temperature)
  const heatIndex = calculateHeatIndex(temp, humidity);

  // Base environmental strain from temperature
  let envStrain = 0;
  
  if (temp <= 10) {
    envStrain = 0.5; // Cold stress (minimal)
  } else if (temp <= 20) {
    envStrain = 0; // Optimal temperature range
  } else if (temp <= 25) {
    envStrain = 1.0; // Warm
  } else if (temp <= 30) {
    envStrain = 2.0; // Hot
  } else if (temp <= 35) {
    envStrain = 3.5; // Very hot
  } else {
    envStrain = 5.0; // Extreme heat
  }

  // Humidity adjustment
  if (humidity > 60) {
    const humidityFactor = Math.min(1.5, (humidity - 60) / 40); // Up to +1.5 for 100% humidity
    envStrain += humidityFactor;
  }

  // Heat index adjustment (combines temp and humidity effects)
  if (heatIndex > temp + 2) {
    const heatIndexBonus = Math.min(1.0, (heatIndex - temp - 2) / 5);
    envStrain += heatIndexBonus;
  }

  // Wind adjustment (cooling effect)
  if (run.weather_data.wind_speed > 10) {
    const windCooling = Math.min(0.5, (run.weather_data.wind_speed - 10) / 20);
    envStrain = Math.max(0, envStrain - windCooling);
  }

  return Math.min(5.0, envStrain);
};

/**
 * Calculate heat index (apparent temperature)
 * Simplified Rothfusz equation
 */
const calculateHeatIndex = (tempC: number, humidity: number): number => {
  // Convert to Fahrenheit for calculation
  const tempF = (tempC * 9/5) + 32;
  const rh = humidity;

  if (tempF < 80) {
    return tempC; // Heat index not applicable for cooler temperatures
  }

  // Rothfusz equation coefficients
  const c1 = -42.379;
  const c2 = 2.04901523;
  const c3 = 10.14333127;
  const c4 = -0.22475541;
  const c5 = -0.00683783;
  const c6 = -0.05481717;
  const c7 = 0.00122874;
  const c8 = 0.00085282;
  const c9 = -0.00000199;

  let heatIndexF = c1 + (c2 * tempF) + (c3 * rh) + (c4 * tempF * rh) + 
                   (c5 * tempF * tempF) + (c6 * rh * rh) + (c7 * tempF * tempF * rh) + 
                   (c8 * tempF * rh * rh) + (c9 * tempF * tempF * rh * rh);

  // Convert back to Celsius
  return (heatIndexF - 32) * 5/9;
};

/**
 * Determine PSI strain level from score
 * Requirements: 4.4 - Provide contextual information about score ranges
 */
const determinePSIStrainLevel = (psiScore: number): 'minimal' | 'low' | 'moderate' | 'high' | 'extreme' => {
  if (psiScore <= 1.5) return 'minimal';
  if (psiScore <= 3.5) return 'low';
  if (psiScore <= 5.5) return 'moderate';
  if (psiScore <= 7.5) return 'high';
  return 'extreme';
};

/**
 * Generate PSI recommendations
 * Requirements: 4.3 - Flag high strain and suggest extended recovery
 */
const generatePSIRecommendations = (
  psiScore: number,
  strainLevel: string,
  run: EnrichedRun
): string[] => {
  const recommendations: string[] = [];

  // High strain recommendations (PSI > 7)
  if (psiScore > 7) {
    recommendations.push('⚠️ High physiological strain detected - consider extended recovery');
    recommendations.push('Take 24-48 hours of easy recovery or complete rest');
    recommendations.push('Monitor for signs of heat exhaustion or overexertion');
    recommendations.push('Increase hydration and electrolyte replacement');
  } else if (psiScore > 5) {
    recommendations.push('Moderate strain - allow adequate recovery time');
    recommendations.push('Consider easy runs or cross-training for next 24 hours');
    recommendations.push('Focus on hydration and cooling strategies');
  } else if (psiScore > 3) {
    recommendations.push('Low to moderate strain - normal recovery protocols');
    recommendations.push('Standard post-run hydration and nutrition');
  } else {
    recommendations.push('Minimal strain - good conditions for training');
  }

  // Environmental-specific recommendations
  if (run.weather_data) {
    const temp = run.weather_data.temperature;
    const humidity = run.weather_data.humidity;

    if (temp > 25 || humidity > 70) {
      recommendations.push('Consider earlier morning or later evening runs in hot weather');
      recommendations.push('Pre-cooling strategies may help in future hot weather runs');
    }

    if (temp > 30) {
      recommendations.push('Reduce intensity in extreme heat conditions');
      recommendations.push('Consider indoor training alternatives when possible');
    }
  }

  return recommendations;
};

/**
 * Calculate PSI confidence score
 */
const calculatePSIConfidence = (
  hasHeartRateData: boolean,
  hasWeatherData: boolean,
  run: EnrichedRun,
  userPhysiology: UserPhysiologyData
): number => {
  let confidence = 0.2; // Lower base confidence

  // Heart rate data quality
  if (hasHeartRateData) {
    confidence += 0.3;
    
    // Check if we have user's actual resting HR vs estimated
    if (userPhysiology.restingHeartRate) {
      confidence += 0.2;
    }
    
    // Check heart rate data quality
    if (run.average_heartrate && run.max_heartrate) {
      const hrRange = run.max_heartrate - run.average_heartrate;
      if (hrRange > 10 && hrRange < 80) { // Reasonable HR range
        confidence += 0.1;
      } else {
        confidence -= 0.2; // Penalize unrealistic HR data
      }
    }
  }

  // Weather data quality
  if (hasWeatherData) {
    confidence += 0.3;
    
    // Check for reasonable weather values
    const temp = run.weather_data!.temperature;
    const humidity = run.weather_data!.humidity;
    
    if (temp >= -20 && temp <= 50 && humidity >= 0 && humidity <= 100) {
      confidence += 0.1;
    }
  }

  return Math.max(0.1, Math.min(1.0, confidence));
};

/**
 * Estimate max heart rate if not provided
 */
const estimateMaxHeartRate = (userPhysiology: UserPhysiologyData): number => {
  // Use age-based estimation if available, otherwise use conservative estimate
  // Note: In a real implementation, we'd need user's age
  // For now, use a conservative estimate based on resting HR
  const restingHR = userPhysiology.restingHeartRate || 70;
  
  // Conservative estimate: assume moderate fitness level
  return Math.max(180, restingHR + 110);
};

/**
 * Create empty PSI result for error cases
 */
const createEmptyPSIResult = (reason: string): PSIResult => ({
  psiScore: 0,
  strainLevel: 'minimal',
  heatStressComponents: {
    heartRateStrain: 0,
    environmentalStrain: 0
  },
  recommendations: [reason],
  confidence: 0,
  dataQuality: {
    hasHeartRateData: false,
    hasWeatherData: false,
    qualityScore: 0
  }
});

/**
 * Analyze PSI trends for heat acclimatization tracking
 * Requirements: 4.5 - Build PSI trend analysis for heat acclimatization tracking
 */
export const analyzePSITrends = (
  runs: EnrichedRun[],
  userPhysiology: UserPhysiologyData,
  daysToAnalyze: number = 30
): PSITrendAnalysis => {
  // Filter runs from the last N days and calculate PSI for each
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToAnalyze);

  const recentRuns = runs
    .filter(run => new Date(run.start_date) >= cutoffDate)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  if (recentRuns.length === 0) {
    return createEmptyPSITrendAnalysis();
  }

  // Calculate PSI for all recent runs
  const psiResults = recentRuns.map(run => ({
    run,
    psi: calculatePSI(run, userPhysiology)
  }));

  // Calculate current and average PSI
  const currentPSI = psiResults[psiResults.length - 1]?.psi.psiScore || 0;
  const averagePSI = psiResults.reduce((sum, r) => sum + r.psi.psiScore, 0) / psiResults.length;

  // Analyze trend
  const trend = analyzePSITrendDirection(psiResults);

  // Assess heat acclimatization
  const heatAcclimatization = assessHeatAcclimatization(psiResults);

  // Count high strain days
  const highStrainDays = psiResults.filter(r => r.psi.psiScore > 7).length;

  // Generate trend-based recommendations
  const recommendations = generateTrendRecommendations(
    trend,
    heatAcclimatization,
    highStrainDays,
    daysToAnalyze
  );

  return {
    currentPSI: Math.round(currentPSI * 10) / 10,
    averagePSI: Math.round(averagePSI * 10) / 10,
    trend,
    heatAcclimatization,
    highStrainDays,
    recommendations
  };
};

/**
 * Analyze PSI trend direction
 */
const analyzePSITrendDirection = (
  psiResults: Array<{ run: EnrichedRun; psi: PSIResult }>
): 'improving' | 'stable' | 'worsening' => {
  if (psiResults.length < 6) return 'stable';

  // Compare first half vs second half of the period
  const midpoint = Math.floor(psiResults.length / 2);
  const firstHalf = psiResults.slice(0, midpoint);
  const secondHalf = psiResults.slice(midpoint);

  const firstHalfAvg = firstHalf.reduce((sum, r) => sum + r.psi.psiScore, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, r) => sum + r.psi.psiScore, 0) / secondHalf.length;

  const difference = secondHalfAvg - firstHalfAvg;

  if (difference < -0.3) return 'improving'; // PSI decreasing = better adaptation
  if (difference > 0.3) return 'worsening'; // PSI increasing = worse adaptation
  return 'stable';
};

/**
 * Assess heat acclimatization status
 */
const assessHeatAcclimatization = (
  psiResults: Array<{ run: EnrichedRun; psi: PSIResult }>
): {
  status: 'poor' | 'developing' | 'good' | 'excellent';
  progressScore: number;
  daysToImprovement: number;
} => {
  // Filter runs in hot conditions (temp > 25°C)
  const hotWeatherRuns = psiResults.filter(r => 
    r.run.weather_data && r.run.weather_data.temperature > 25
  );

  if (hotWeatherRuns.length < 3) {
    return {
      status: 'poor',
      progressScore: 0,
      daysToImprovement: 14
    };
  }

  // Calculate average PSI in hot conditions
  const avgHotWeatherPSI = hotWeatherRuns.reduce((sum, r) => sum + r.psi.psiScore, 0) / hotWeatherRuns.length;

  // Assess improvement over time in hot conditions
  const earlyHotRuns = hotWeatherRuns.slice(0, Math.ceil(hotWeatherRuns.length / 2));
  const recentHotRuns = hotWeatherRuns.slice(-Math.ceil(hotWeatherRuns.length / 2));

  const earlyAvg = earlyHotRuns.reduce((sum, r) => sum + r.psi.psiScore, 0) / earlyHotRuns.length;
  const recentAvg = recentHotRuns.reduce((sum, r) => sum + r.psi.psiScore, 0) / recentHotRuns.length;

  const improvement = earlyAvg - recentAvg; // Positive = improving

  let status: 'poor' | 'developing' | 'good' | 'excellent';
  let progressScore: number;
  let daysToImprovement: number;

  if (avgHotWeatherPSI <= 4 && improvement >= 0) {
    status = 'excellent';
    progressScore = 90;
    daysToImprovement = 0;
  } else if (avgHotWeatherPSI <= 5.5 && improvement >= -0.5) {
    status = 'good';
    progressScore = 75;
    daysToImprovement = 3;
  } else if (avgHotWeatherPSI <= 7 && improvement >= -1) {
    status = 'developing';
    progressScore = 50;
    daysToImprovement = 7;
  } else {
    status = 'poor';
    progressScore = 25;
    daysToImprovement = 14;
  }

  return { status, progressScore, daysToImprovement };
};

/**
 * Generate trend-based recommendations
 */
const generateTrendRecommendations = (
  trend: 'improving' | 'stable' | 'worsening',
  heatAcclimatization: { status: string; progressScore: number; daysToImprovement: number },
  highStrainDays: number,
  daysAnalyzed: number
): string[] => {
  const recommendations: string[] = [];

  // Trend-based recommendations
  if (trend === 'improving') {
    recommendations.push('✅ Great progress! Your heat adaptation is improving');
    recommendations.push('Continue current training approach in varied conditions');
  } else if (trend === 'worsening') {
    recommendations.push('⚠️ PSI trending higher - consider heat adaptation strategies');
    recommendations.push('Gradually increase exposure to warm conditions');
    recommendations.push('Focus on hydration and cooling techniques');
  } else {
    recommendations.push('Stable PSI levels - maintain current training approach');
  }

  // Heat acclimatization recommendations
  if (heatAcclimatization.status === 'poor') {
    recommendations.push('Heat acclimatization needs work - start with shorter, easier runs in heat');
    recommendations.push('Allow 10-14 days for initial heat adaptation');
  } else if (heatAcclimatization.status === 'developing') {
    recommendations.push('Heat adaptation progressing - continue gradual exposure');
    recommendations.push(`Expect further improvement in ~${heatAcclimatization.daysToImprovement} days`);
  } else if (heatAcclimatization.status === 'excellent') {
    recommendations.push('Excellent heat adaptation! You handle hot conditions well');
  }

  // High strain day warnings
  const highStrainPercentage = (highStrainDays / daysAnalyzed) * 100;
  if (highStrainPercentage > 20) {
    recommendations.push(`⚠️ ${highStrainDays} high strain days in ${daysAnalyzed} days - consider more recovery`);
    recommendations.push('Reduce training intensity in extreme conditions');
  } else if (highStrainPercentage > 10) {
    recommendations.push('Monitor recovery after high strain sessions');
  }

  return recommendations;
};

/**
 * Create empty PSI trend analysis
 */
const createEmptyPSITrendAnalysis = (): PSITrendAnalysis => ({
  currentPSI: 0,
  averagePSI: 0,
  trend: 'stable',
  heatAcclimatization: {
    status: 'poor',
    progressScore: 0,
    daysToImprovement: 14
  },
  highStrainDays: 0,
  recommendations: ['Insufficient data for PSI trend analysis']
});

/**
 * Format PSI score for display
 */
export const formatPSIScore = (psiScore: number): string => {
  return `${psiScore.toFixed(1)}/10`;
};

/**
 * Get PSI color coding for UI
 */
export const getPSIColorClass = (psiScore: number): string => {
  if (psiScore <= 2) return 'text-green-600'; // Minimal
  if (psiScore <= 4) return 'text-blue-600'; // Low
  if (psiScore <= 6) return 'text-yellow-600'; // Moderate
  if (psiScore <= 8) return 'text-orange-600'; // High
  return 'text-red-600'; // Extreme
};

/**
 * Get PSI background color for UI
 */
export const getPSIBackgroundClass = (psiScore: number): string => {
  if (psiScore <= 2) return 'bg-green-100'; // Minimal
  if (psiScore <= 4) return 'bg-blue-100'; // Low
  if (psiScore <= 6) return 'bg-yellow-100'; // Moderate
  if (psiScore <= 8) return 'bg-orange-100'; // High
  return 'bg-red-100'; // Extreme
};