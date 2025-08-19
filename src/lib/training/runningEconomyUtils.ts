// Running Economy and Efficiency Analysis
import { EnrichedRun, UserPhysiologyData, MetricCalculationResult } from '../../types';
import { detectSteadyStatePortions } from './vo2MaxUtils';

export interface RunningEconomyMetrics {
  heartRateToPaceRatio: number; // HR per second per km
  efficiencyScore: number; // 0-100 scale
  paceZone: 'easy' | 'moderate' | 'threshold' | 'interval' | 'repetition';
  heartRateDrift: number; // Percentage drift during run
  optimalPaceRange?: { min: number; max: number }; // seconds per km
}

export interface RunningEconomyTrend {
  trend: 'improving' | 'stable' | 'declining';
  changeRate: number; // Efficiency score change per month
  confidence: number;
  optimalPaces: Array<{
    date: string;
    pace: number; // seconds per km
    efficiency: number;
  }>;
}

export interface PaceZoneEfficiency {
  zone: string;
  paceRange: { min: number; max: number }; // seconds per km
  avgHeartRate: number;
  avgEfficiency: number;
  runCount: number;
  recommendation: string;
}

/**
 * Calculate heart rate to pace ratio for running economy analysis
 * Requirements: 10.1 - Calculate heart rate to pace ratios for different pace zones
 */
export const calculateHeartRateToPaceRatio = (
  run: EnrichedRun,
  userPhysiology: UserPhysiologyData
): MetricCalculationResult<RunningEconomyMetrics> => {
  // Check if we have required data
  if (!run.average_heartrate || !run.distance || !run.moving_time) {
    return {
      value: {
        heartRateToPaceRatio: 0,
        efficiencyScore: 0,
        paceZone: 'easy',
        heartRateDrift: 0
      },
      confidence: 0,
      dataQuality: {
        heartRateDataAvailable: false,
        weatherDataAvailable: !!run.weather_data,
        gpsDataQuality: 'low',
        elevationDataAvailable: !!run.total_elevation_gain,
        calculationConfidence: 0,
        missingDataImpact: ['Heart rate and pace data required for running economy analysis'],
        qualityScore: 0
      },
      calculationMethod: 'Running economy analysis - insufficient data'
    };
  }

  // Calculate pace in seconds per km
  const paceSecondsPerKm = run.moving_time / (run.distance / 1000);
  
  // Calculate heart rate to pace ratio (HR per second per km)
  const heartRateToPaceRatio = run.average_heartrate / paceSecondsPerKm;
  
  // Determine pace zone based on heart rate zones
  const paceZone = determinePaceZone(run.average_heartrate, userPhysiology);
  
  // Calculate heart rate drift (simplified - would need detailed HR data for accuracy)
  const heartRateDrift = calculateHeartRateDrift(run);
  
  // Calculate efficiency score (lower HR for same pace = better efficiency)
  const efficiencyScore = calculateEfficiencyScore(
    heartRateToPaceRatio, 
    paceZone, 
    userPhysiology
  );
  
  // Adjust for environmental conditions (Requirement 10.4)
  const environmentalAdjustment = calculateEnvironmentalAdjustment(run);
  const adjustedEfficiencyScore = Math.max(0, Math.min(100, 
    efficiencyScore * environmentalAdjustment
  ));
  
  // Check if this is a steady-state run for better accuracy
  const steadyStateAnalysis = detectSteadyStatePortions(run);
  const confidence = steadyStateAnalysis.isSteadyState ? 0.8 : 0.6;
  
  return {
    value: {
      heartRateToPaceRatio: Math.round(heartRateToPaceRatio * 100) / 100,
      efficiencyScore: Math.round(adjustedEfficiencyScore),
      paceZone,
      heartRateDrift: Math.round(heartRateDrift * 10) / 10,
      optimalPaceRange: getOptimalPaceRange(paceZone, userPhysiology)
    },
    confidence,
    dataQuality: {
      heartRateDataAvailable: true,
      weatherDataAvailable: !!run.weather_data,
      gpsDataQuality: run.distance > 0 ? 'high' : 'low',
      elevationDataAvailable: !!run.total_elevation_gain,
      calculationConfidence: confidence,
      missingDataImpact: environmentalAdjustment < 1 ? 
        ['Environmental conditions may affect efficiency calculations'] : [],
      qualityScore: Math.round(confidence * 100)
    },
    calculationMethod: 'Running economy analysis with heart rate to pace ratio'
  };
};

/**
 * Analyze running economy trends over time
 * Requirements: 10.2, 10.3 - Show trends and highlight improvements
 */
export const analyzeRunningEconomyTrend = (
  runs: EnrichedRun[],
  userPhysiology: UserPhysiologyData,
  days: number = 90
): RunningEconomyTrend => {
  if (runs.length < 5) {
    return {
      trend: 'stable',
      changeRate: 0,
      confidence: 0,
      optimalPaces: []
    };
  }

  // Filter runs from the specified period
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const economyData = runs
    .filter(run => new Date(run.start_date_local) >= cutoffDate)
    .map(run => {
      const economy = calculateHeartRateToPaceRatio(run, userPhysiology);
      return {
        date: run.start_date_local.split('T')[0],
        efficiency: economy.value.efficiencyScore,
        pace: run.moving_time / (run.distance / 1000),
        confidence: economy.confidence
      };
    })
    .filter(data => data.efficiency > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (economyData.length < 3) {
    return {
      trend: 'stable',
      changeRate: 0,
      confidence: 0,
      optimalPaces: []
    };
  }

  // Calculate trend using linear regression on efficiency scores
  const { slope, confidence } = calculateLinearTrend(
    economyData.map(d => d.efficiency)
  );
  
  // Convert slope to monthly change rate
  const changeRatePerMonth = slope * 30;

  // Determine trend direction
  let trend: 'improving' | 'stable' | 'declining';
  if (changeRatePerMonth > 1) {
    trend = 'improving';
  } else if (changeRatePerMonth < -1) {
    trend = 'declining';
  } else {
    trend = 'stable';
  }

  // Find optimal paces (highest efficiency scores)
  const optimalPaces = economyData
    .filter(d => d.efficiency >= 70) // Only high-efficiency runs
    .map(d => ({
      date: d.date,
      pace: Math.round(d.pace),
      efficiency: d.efficiency
    }))
    .slice(-10); // Last 10 optimal performances

  return {
    trend,
    changeRate: Math.round(changeRatePerMonth * 10) / 10,
    confidence,
    optimalPaces
  };
};

/**
 * Analyze efficiency across different pace zones
 * Requirements: 10.5 - Identify optimal training paces where efficiency is highest
 */
export const analyzePaceZoneEfficiency = (
  runs: EnrichedRun[],
  userPhysiology: UserPhysiologyData
): PaceZoneEfficiency[] => {
  const zoneData: { [key: string]: {
    heartRates: number[];
    efficiencies: number[];
    paces: number[];
  } } = {
    easy: { heartRates: [], efficiencies: [], paces: [] },
    moderate: { heartRates: [], efficiencies: [], paces: [] },
    threshold: { heartRates: [], efficiencies: [], paces: [] },
    interval: { heartRates: [], efficiencies: [], paces: [] },
    repetition: { heartRates: [], efficiencies: [], paces: [] }
  };

  // Categorize runs by pace zone and collect metrics
  runs.forEach(run => {
    const economy = calculateHeartRateToPaceRatio(run, userPhysiology);
    if (economy.value.efficiencyScore > 0) {
      const zone = economy.value.paceZone;
      const pace = run.moving_time / (run.distance / 1000);
      
      zoneData[zone].heartRates.push(run.average_heartrate || 0);
      zoneData[zone].efficiencies.push(economy.value.efficiencyScore);
      zoneData[zone].paces.push(pace);
    }
  });

  // Calculate averages and recommendations for each zone
  return Object.entries(zoneData)
    .filter(([_, data]) => data.efficiencies.length > 0)
    .map(([zone, data]) => {
      const avgHeartRate = data.heartRates.reduce((sum, hr) => sum + hr, 0) / data.heartRates.length;
      const avgEfficiency = data.efficiencies.reduce((sum, eff) => sum + eff, 0) / data.efficiencies.length;
      const paces = data.paces.sort((a, b) => a - b);
      const paceRange = {
        min: Math.round(paces[0]),
        max: Math.round(paces[paces.length - 1])
      };

      return {
        zone,
        paceRange,
        avgHeartRate: Math.round(avgHeartRate),
        avgEfficiency: Math.round(avgEfficiency),
        runCount: data.efficiencies.length,
        recommendation: generateZoneRecommendation(zone, avgEfficiency, data.efficiencies.length)
      };
    })
    .sort((a, b) => b.avgEfficiency - a.avgEfficiency); // Sort by efficiency (best first)
};

/**
 * Calculate heart rate drift during a run
 * Requirements: 10.2 - Show trends in heart rate drift during steady-state runs
 */
const calculateHeartRateDrift = (run: EnrichedRun): number => {
  // Simplified calculation - in reality would need detailed HR data
  // For now, estimate based on run duration and intensity
  if (!run.average_heartrate || !run.max_heartrate) return 0;
  
  const runDurationHours = run.moving_time / 3600;
  const hrIntensity = run.average_heartrate / (run.max_heartrate || 180);
  
  // Estimate drift: longer runs and higher intensity = more drift
  const estimatedDrift = runDurationHours * hrIntensity * 2; // ~2% per hour at moderate intensity
  
  return Math.min(15, estimatedDrift); // Cap at 15% drift
};

/**
 * Determine pace zone based on heart rate
 */
const determinePaceZone = (
  heartRate: number, 
  userPhysiology: UserPhysiologyData
): 'easy' | 'moderate' | 'threshold' | 'interval' | 'repetition' => {
  const maxHR = userPhysiology.maxHeartRate || 190;
  const restingHR = userPhysiology.restingHeartRate || 60;
  const hrReserve = maxHR - restingHR;
  const hrIntensity = (heartRate - restingHR) / hrReserve;

  if (hrIntensity < 0.6) return 'easy';
  if (hrIntensity < 0.7) return 'moderate';
  if (hrIntensity < 0.8) return 'threshold';
  if (hrIntensity < 0.9) return 'interval';
  return 'repetition';
};

/**
 * Calculate efficiency score based on heart rate to pace ratio
 */
const calculateEfficiencyScore = (
  heartRateToPaceRatio: number,
  paceZone: string,
  userPhysiology: UserPhysiologyData
): number => {
  // Lower ratio = better efficiency (less HR for same pace)
  // Baseline ratios for different zones (these are rough estimates)
  const baselineRatios = {
    easy: 0.35,      // ~140 HR at 6:00/km pace
    moderate: 0.40,   // ~160 HR at 6:00/km pace
    threshold: 0.45,  // ~180 HR at 6:00/km pace
    interval: 0.50,   // ~190 HR at 5:00/km pace
    repetition: 0.55  // ~195 HR at 4:30/km pace
  };

  const baseline = baselineRatios[paceZone as keyof typeof baselineRatios] || 0.4;
  
  // Calculate efficiency: better than baseline = higher score
  const efficiency = Math.max(0, (baseline / heartRateToPaceRatio) * 70);
  
  return Math.min(100, efficiency);
};

/**
 * Calculate environmental adjustment factor
 * Requirements: 10.4 - Adjust efficiency calculations for environmental conditions
 */
const calculateEnvironmentalAdjustment = (run: EnrichedRun): number => {
  if (!run.weather_data) return 1.0; // No adjustment if no weather data
  
  let adjustment = 1.0;
  const temp = run.weather_data.temperature;
  const humidity = run.weather_data.humidity;
  
  // Temperature adjustments
  if (temp > 25) {
    adjustment *= 0.95; // Hot weather reduces apparent efficiency
  } else if (temp < 5) {
    adjustment *= 0.98; // Cold weather slightly reduces efficiency
  }
  
  // Humidity adjustments
  if (humidity > 70) {
    adjustment *= 0.97; // High humidity reduces efficiency
  }
  
  return adjustment;
};

/**
 * Get optimal pace range for a given zone
 */
const getOptimalPaceRange = (
  paceZone: string,
  userPhysiology: UserPhysiologyData
): { min: number; max: number } => {
  // Rough estimates - would be better with actual fitness testing
  const basePace = 360; // 6:00/km as baseline
  
  const zoneRanges = {
    easy: { min: basePace + 60, max: basePace + 120 },      // 7:00-8:00/km
    moderate: { min: basePace + 30, max: basePace + 60 },   // 6:30-7:00/km
    threshold: { min: basePace - 30, max: basePace + 30 },  // 5:30-6:30/km
    interval: { min: basePace - 60, max: basePace - 30 },   // 5:00-5:30/km
    repetition: { min: basePace - 90, max: basePace - 60 }  // 4:30-5:00/km
  };

  return zoneRanges[paceZone as keyof typeof zoneRanges] || zoneRanges.moderate;
};

/**
 * Generate zone-specific recommendations
 */
const generateZoneRecommendation = (
  zone: string,
  avgEfficiency: number,
  runCount: number
): string => {
  if (runCount < 3) {
    return `Need more ${zone} runs for reliable efficiency analysis`;
  }

  if (avgEfficiency >= 80) {
    return `Excellent efficiency in ${zone} zone - maintain current approach`;
  } else if (avgEfficiency >= 60) {
    return `Good efficiency in ${zone} zone - focus on form and consistency`;
  } else {
    return `Room for improvement in ${zone} zone - consider form work and gradual pace development`;
  }
};

/**
 * Calculate linear trend using simple linear regression
 */
const calculateLinearTrend = (values: number[]): { slope: number; confidence: number } => {
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = values;

  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumXX = x.reduce((sum, val) => sum + val * val, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  
  // Simple confidence based on data points and slope magnitude
  const confidence = Math.min(0.9, Math.max(0.3, n / 10 + Math.abs(slope) / 10));

  return { slope, confidence };
};

/**
 * Get running economy recommendations based on analysis
 */
export const getRunningEconomyRecommendations = (
  trend: RunningEconomyTrend,
  zoneEfficiencies: PaceZoneEfficiency[]
): string[] => {
  const recommendations: string[] = [];

  // Trend-based recommendations
  if (trend.trend === 'improving') {
    recommendations.push('Great progress! Your running economy is improving. Continue your current training approach.');
  } else if (trend.trend === 'declining') {
    recommendations.push('Your running economy is declining. Focus on form work and easy aerobic running.');
    recommendations.push('Consider adding strides and form drills to your routine.');
  } else {
    recommendations.push('Your running economy is stable. Add variety to continue improving efficiency.');
  }

  // Zone-specific recommendations
  const bestZone = zoneEfficiencies[0];
  const worstZone = zoneEfficiencies[zoneEfficiencies.length - 1];

  if (bestZone && worstZone && bestZone.avgEfficiency - worstZone.avgEfficiency > 20) {
    recommendations.push(`You're most efficient in ${bestZone.zone} pace. Consider more training in this zone.`);
    recommendations.push(`Work on efficiency in ${worstZone.zone} pace through targeted workouts.`);
  }

  // General recommendations
  if (zoneEfficiencies.some(zone => zone.avgEfficiency < 50)) {
    recommendations.push('Focus on running form and cadence to improve overall efficiency.');
    recommendations.push('Consider working with a running coach on technique improvements.');
  }

  return recommendations;
};

/**
 * Format pace for display (seconds per km to MM:SS format)
 */
export const formatPace = (secondsPerKm: number): string => {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Format efficiency score for display
 */
export const formatEfficiencyScore = (score: number): string => {
  if (score >= 80) return `${score}% (Excellent)`;
  if (score >= 60) return `${score}% (Good)`;
  if (score >= 40) return `${score}% (Fair)`;
  return `${score}% (Needs Work)`;
};