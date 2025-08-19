// Environmental Performance Profiling System
// Requirements: 14.1, 14.2, 14.3, 14.4, 14.5

import { EnrichedRun } from '../../types';
import { calculateAdjustedPace } from './environmentalAdjustmentUtils';

export interface EnvironmentalProfile {
  // Personal tolerance profiles
  heatTolerance: {
    level: 'low' | 'medium' | 'high';
    optimalTemperature: number; // Celsius
    maxComfortableTemp: number; // Temperature where performance starts declining significantly
    heatAdaptationScore: number; // 0-100, higher = better heat adaptation
    improvementTrend: 'improving' | 'stable' | 'declining';
  };
  
  coldAdaptation: {
    level: 'low' | 'medium' | 'high';
    minComfortableTemp: number; // Temperature where performance starts declining in cold
    coldAdaptationScore: number; // 0-100, higher = better cold adaptation
    improvementTrend: 'improving' | 'stable' | 'declining';
  };
  
  // Optimal condition ranges
  optimalConditions: {
    temperatureRange: { min: number; max: number };
    humidityRange: { min: number; max: number };
    windSpeedMax: number;
    confidenceScore: number; // 0-1 based on data quality and quantity
  };
  
  // Performance patterns by condition
  performanceByTemperature: TemperaturePerformanceData[];
  performanceByHumidity: HumidityPerformanceData[];
  performanceByWind: WindPerformanceData[];
  
  // Acclimatization tracking
  acclimatization: {
    heatAcclimatization: AcclimatizationData;
    coldAcclimatization: AcclimatizationData;
  };
  
  // Metadata
  totalRunsAnalyzed: number;
  dateRange: { start: string; end: string };
  lastCalculated: string;
  dataQuality: 'high' | 'medium' | 'low';
}

export interface TemperaturePerformanceData {
  temperatureRange: string; // e.g., "15-20°C"
  minTemp: number;
  maxTemp: number;
  runCount: number;
  avgOriginalPace: number; // seconds per km
  avgAdjustedPace: number; // seconds per km
  performanceIndex: number; // 0-100, relative to personal best conditions
  paceVariability: number; // standard deviation of paces in this range
  confidenceLevel: number; // 0-1 based on sample size and consistency
}

export interface HumidityPerformanceData {
  humidityRange: string; // e.g., "40-60%"
  minHumidity: number;
  maxHumidity: number;
  runCount: number;
  avgOriginalPace: number;
  avgAdjustedPace: number;
  performanceIndex: number;
  paceVariability: number;
  confidenceLevel: number;
}

export interface WindPerformanceData {
  windRange: string; // e.g., "0-10 km/h"
  minWindSpeed: number;
  maxWindSpeed: number;
  runCount: number;
  avgOriginalPace: number;
  avgAdjustedPace: number;
  performanceIndex: number;
  paceVariability: number;
  confidenceLevel: number;
}

export interface AcclimatizationData {
  currentLevel: number; // 0-100
  trend: 'improving' | 'stable' | 'declining';
  recentImprovement: number; // Change in last 30 days
  timeToAcclimate: number; // Estimated days to reach next level
  progressHistory: Array<{
    date: string;
    level: number;
    triggerConditions: { temperature?: number; humidity?: number };
  }>;
}

export interface WeatherPerformancePattern {
  conditionType: 'temperature' | 'humidity' | 'wind' | 'combined';
  pattern: string; // Description of the pattern
  strength: 'weak' | 'moderate' | 'strong';
  confidence: number; // 0-1
  recommendation: string;
}

/**
 * Build comprehensive environmental performance profile
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */
export const buildEnvironmentalProfile = (runs: EnrichedRun[]): EnvironmentalProfile => {
  // Filter runs with weather data
  const runsWithWeather = runs.filter(run => 
    run.weather_data && 
    typeof run.weather_data.temperature === 'number' &&
    typeof run.weather_data.humidity === 'number' &&
    typeof run.weather_data.wind_speed === 'number'
  );

  if (runsWithWeather.length < 10) {
    return createMinimalProfile(runsWithWeather);
  }

  // Calculate adjusted paces for all runs
  const adjustedResults = runsWithWeather.map(run => ({
    run,
    result: calculateAdjustedPace(run),
    date: new Date(run.start_date)
  }));

  // Build temperature performance profile
  const temperaturePerformance = analyzeTemperaturePerformance(adjustedResults);
  
  // Build humidity performance profile
  const humidityPerformance = analyzeHumidityPerformance(adjustedResults);
  
  // Build wind performance profile
  const windPerformance = analyzeWindPerformance(adjustedResults);
  
  // Determine heat tolerance
  const heatTolerance = calculateHeatTolerance(temperaturePerformance, adjustedResults);
  
  // Determine cold adaptation
  const coldAdaptation = calculateColdAdaptation(temperaturePerformance, adjustedResults);
  
  // Find optimal conditions
  const optimalConditions = identifyOptimalConditions(
    temperaturePerformance,
    humidityPerformance,
    windPerformance
  );
  
  // Track acclimatization
  const acclimatization = trackAcclimatization(adjustedResults);
  
  // Calculate data quality
  const dataQuality = assessProfileDataQuality(runsWithWeather);
  
  const dateRange = {
    start: new Date(Math.min(...runsWithWeather.map(r => new Date(r.start_date).getTime()))).toISOString(),
    end: new Date(Math.max(...runsWithWeather.map(r => new Date(r.start_date).getTime()))).toISOString()
  };

  return {
    heatTolerance,
    coldAdaptation,
    optimalConditions,
    performanceByTemperature: temperaturePerformance,
    performanceByHumidity: humidityPerformance,
    performanceByWind: windPerformance,
    acclimatization,
    totalRunsAnalyzed: runsWithWeather.length,
    dateRange,
    lastCalculated: new Date().toISOString(),
    dataQuality
  };
};

/**
 * Analyze temperature performance patterns
 * Requirements: 14.1, 14.2
 */
const analyzeTemperaturePerformance = (
  adjustedResults: Array<{ run: EnrichedRun; result: any; date: Date }>
): TemperaturePerformanceData[] => {
  const tempRanges = [
    { range: 'Very Cold (<0°C)', min: -20, max: 0 },
    { range: 'Cold (0-10°C)', min: 0, max: 10 },
    { range: 'Cool (10-15°C)', min: 10, max: 15 },
    { range: 'Optimal (15-20°C)', min: 15, max: 20 },
    { range: 'Warm (20-25°C)', min: 20, max: 25 },
    { range: 'Hot (25-30°C)', min: 25, max: 30 },
    { range: 'Very Hot (>30°C)', min: 30, max: 50 }
  ];

  const performanceData: TemperaturePerformanceData[] = [];
  
  // Find best performance for relative indexing
  const bestAdjustedPace = Math.min(...adjustedResults.map(r => r.result.adjustedPace));

  for (const range of tempRanges) {
    const runsInRange = adjustedResults.filter(r => 
      r.run.weather_data!.temperature >= range.min && 
      r.run.weather_data!.temperature < range.max
    );

    if (runsInRange.length === 0) continue;

    const originalPaces = runsInRange.map(r => r.result.originalPace);
    const adjustedPaces = runsInRange.map(r => r.result.adjustedPace);
    
    const avgOriginalPace = originalPaces.reduce((sum, pace) => sum + pace, 0) / originalPaces.length;
    const avgAdjustedPace = adjustedPaces.reduce((sum, pace) => sum + pace, 0) / adjustedPaces.length;
    
    // Calculate performance index (100 = best performance, lower = worse)
    const performanceIndex = Math.max(0, Math.min(100, 
      100 - ((avgAdjustedPace - bestAdjustedPace) / bestAdjustedPace) * 100
    ));
    
    // Calculate pace variability (standard deviation)
    const paceVariability = calculateStandardDeviation(adjustedPaces);
    
    // Calculate confidence based on sample size and consistency
    const confidenceLevel = calculateConfidenceLevel(runsInRange.length, paceVariability);

    performanceData.push({
      temperatureRange: range.range,
      minTemp: range.min,
      maxTemp: range.max,
      runCount: runsInRange.length,
      avgOriginalPace: Math.round(avgOriginalPace),
      avgAdjustedPace: Math.round(avgAdjustedPace),
      performanceIndex: Math.round(performanceIndex),
      paceVariability: Math.round(paceVariability),
      confidenceLevel: Math.round(confidenceLevel * 100) / 100
    });
  }

  return performanceData.sort((a, b) => a.minTemp - b.minTemp);
};

/**
 * Analyze humidity performance patterns
 * Requirements: 14.2
 */
const analyzeHumidityPerformance = (
  adjustedResults: Array<{ run: EnrichedRun; result: any; date: Date }>
): HumidityPerformanceData[] => {
  const humidityRanges = [
    { range: 'Very Dry (<30%)', min: 0, max: 30 },
    { range: 'Dry (30-50%)', min: 30, max: 50 },
    { range: 'Moderate (50-70%)', min: 50, max: 70 },
    { range: 'Humid (70-85%)', min: 70, max: 85 },
    { range: 'Very Humid (>85%)', min: 85, max: 100 }
  ];

  const performanceData: HumidityPerformanceData[] = [];
  const bestAdjustedPace = Math.min(...adjustedResults.map(r => r.result.adjustedPace));

  for (const range of humidityRanges) {
    const runsInRange = adjustedResults.filter(r => 
      r.run.weather_data!.humidity >= range.min && 
      r.run.weather_data!.humidity < range.max
    );

    if (runsInRange.length === 0) continue;

    const originalPaces = runsInRange.map(r => r.result.originalPace);
    const adjustedPaces = runsInRange.map(r => r.result.adjustedPace);
    
    const avgOriginalPace = originalPaces.reduce((sum, pace) => sum + pace, 0) / originalPaces.length;
    const avgAdjustedPace = adjustedPaces.reduce((sum, pace) => sum + pace, 0) / adjustedPaces.length;
    
    const performanceIndex = Math.max(0, Math.min(100, 
      100 - ((avgAdjustedPace - bestAdjustedPace) / bestAdjustedPace) * 100
    ));
    
    const paceVariability = calculateStandardDeviation(adjustedPaces);
    const confidenceLevel = calculateConfidenceLevel(runsInRange.length, paceVariability);

    performanceData.push({
      humidityRange: range.range,
      minHumidity: range.min,
      maxHumidity: range.max,
      runCount: runsInRange.length,
      avgOriginalPace: Math.round(avgOriginalPace),
      avgAdjustedPace: Math.round(avgAdjustedPace),
      performanceIndex: Math.round(performanceIndex),
      paceVariability: Math.round(paceVariability),
      confidenceLevel: Math.round(confidenceLevel * 100) / 100
    });
  }

  return performanceData.sort((a, b) => a.minHumidity - b.minHumidity);
};

/**
 * Analyze wind performance patterns
 * Requirements: 14.2
 */
const analyzeWindPerformance = (
  adjustedResults: Array<{ run: EnrichedRun; result: any; date: Date }>
): WindPerformanceData[] => {
  const windRanges = [
    { range: 'Calm (0-5 km/h)', min: 0, max: 5 },
    { range: 'Light (5-15 km/h)', min: 5, max: 15 },
    { range: 'Moderate (15-25 km/h)', min: 15, max: 25 },
    { range: 'Strong (25-35 km/h)', min: 25, max: 35 },
    { range: 'Very Strong (>35 km/h)', min: 35, max: 100 }
  ];

  const performanceData: WindPerformanceData[] = [];
  const bestAdjustedPace = Math.min(...adjustedResults.map(r => r.result.adjustedPace));

  for (const range of windRanges) {
    const runsInRange = adjustedResults.filter(r => 
      r.run.weather_data!.wind_speed >= range.min && 
      r.run.weather_data!.wind_speed < range.max
    );

    if (runsInRange.length === 0) continue;

    const originalPaces = runsInRange.map(r => r.result.originalPace);
    const adjustedPaces = runsInRange.map(r => r.result.adjustedPace);
    
    const avgOriginalPace = originalPaces.reduce((sum, pace) => sum + pace, 0) / originalPaces.length;
    const avgAdjustedPace = adjustedPaces.reduce((sum, pace) => sum + pace, 0) / adjustedPaces.length;
    
    const performanceIndex = Math.max(0, Math.min(100, 
      100 - ((avgAdjustedPace - bestAdjustedPace) / bestAdjustedPace) * 100
    ));
    
    const paceVariability = calculateStandardDeviation(adjustedPaces);
    const confidenceLevel = calculateConfidenceLevel(runsInRange.length, paceVariability);

    performanceData.push({
      windRange: range.range,
      minWindSpeed: range.min,
      maxWindSpeed: range.max,
      runCount: runsInRange.length,
      avgOriginalPace: Math.round(avgOriginalPace),
      avgAdjustedPace: Math.round(avgAdjustedPace),
      performanceIndex: Math.round(performanceIndex),
      paceVariability: Math.round(paceVariability),
      confidenceLevel: Math.round(confidenceLevel * 100) / 100
    });
  }

  return performanceData.sort((a, b) => a.minWindSpeed - b.minWindSpeed);
};

/**
 * Calculate heat tolerance profile
 * Requirements: 14.1
 */
const calculateHeatTolerance = (
  temperaturePerformance: TemperaturePerformanceData[],
  adjustedResults: Array<{ run: EnrichedRun; result: any; date: Date }>
): EnvironmentalProfile['heatTolerance'] => {
  // Find performance decline threshold
  const optimalPerformance = Math.max(...temperaturePerformance.map(t => t.performanceIndex));
  const significantDeclineThreshold = optimalPerformance * 0.9; // 10% decline
  
  // Find temperature where performance starts declining significantly
  let maxComfortableTemp = 25; // Default
  for (const tempData of temperaturePerformance) {
    if (tempData.minTemp >= 20 && tempData.performanceIndex < significantDeclineThreshold) {
      maxComfortableTemp = tempData.minTemp;
      break;
    }
    if (tempData.minTemp >= 20 && tempData.performanceIndex >= significantDeclineThreshold) {
      maxComfortableTemp = tempData.maxTemp;
    }
  }
  
  // Calculate heat adaptation score based on performance in hot conditions
  const hotRuns = temperaturePerformance.filter(t => t.minTemp >= 25);
  const heatAdaptationScore = hotRuns.length > 0 
    ? hotRuns.reduce((sum, t) => sum + t.performanceIndex, 0) / hotRuns.length
    : 50; // Default moderate score
  
  // Determine tolerance level
  let level: 'low' | 'medium' | 'high' = 'medium';
  if (heatAdaptationScore >= 80 && maxComfortableTemp >= 30) {
    level = 'high';
  } else if (heatAdaptationScore < 60 || maxComfortableTemp < 22) {
    level = 'low';
  }
  
  // Find optimal temperature (best performance)
  const optimalTempData = temperaturePerformance.reduce((best, current) => 
    current.performanceIndex > best.performanceIndex ? current : best
  );
  const optimalTemperature = (optimalTempData.minTemp + optimalTempData.maxTemp) / 2;
  
  // Calculate improvement trend (simplified - would need historical data for full implementation)
  const improvementTrend = calculateImprovementTrend(adjustedResults, 'heat');

  return {
    level,
    optimalTemperature: Math.round(optimalTemperature),
    maxComfortableTemp: Math.round(maxComfortableTemp),
    heatAdaptationScore: Math.round(heatAdaptationScore),
    improvementTrend
  };
};

/**
 * Calculate cold adaptation profile
 * Requirements: 14.1
 */
const calculateColdAdaptation = (
  temperaturePerformance: TemperaturePerformanceData[],
  adjustedResults: Array<{ run: EnrichedRun; result: any; date: Date }>
): EnvironmentalProfile['coldAdaptation'] => {
  // Find performance decline threshold for cold
  const optimalPerformance = Math.max(...temperaturePerformance.map(t => t.performanceIndex));
  const significantDeclineThreshold = optimalPerformance * 0.9;
  
  // Find temperature where cold performance starts declining
  let minComfortableTemp = 5; // Default
  const coldTemps = temperaturePerformance.filter(t => t.maxTemp <= 15).reverse(); // Coldest first
  
  for (const tempData of coldTemps) {
    if (tempData.performanceIndex < significantDeclineThreshold) {
      minComfortableTemp = tempData.maxTemp;
      break;
    }
    if (tempData.performanceIndex >= significantDeclineThreshold) {
      minComfortableTemp = tempData.minTemp;
    }
  }
  
  // Calculate cold adaptation score
  const coldRuns = temperaturePerformance.filter(t => t.maxTemp <= 10);
  const coldAdaptationScore = coldRuns.length > 0 
    ? coldRuns.reduce((sum, t) => sum + t.performanceIndex, 0) / coldRuns.length
    : 50;
  
  // Determine adaptation level
  let level: 'low' | 'medium' | 'high' = 'medium';
  if (coldAdaptationScore >= 80 && minComfortableTemp <= 0) {
    level = 'high';
  } else if (coldAdaptationScore < 60 || minComfortableTemp > 10) {
    level = 'low';
  }
  
  const improvementTrend = calculateImprovementTrend(adjustedResults, 'cold');

  return {
    level,
    minComfortableTemp: Math.round(minComfortableTemp),
    coldAdaptationScore: Math.round(coldAdaptationScore),
    improvementTrend
  };
};

/**
 * Identify optimal environmental conditions
 * Requirements: 14.2
 */
const identifyOptimalConditions = (
  temperaturePerformance: TemperaturePerformanceData[],
  humidityPerformance: HumidityPerformanceData[],
  windPerformance: WindPerformanceData[]
): EnvironmentalProfile['optimalConditions'] => {
  // Find best temperature range
  const bestTempData = temperaturePerformance.reduce((best, current) => 
    current.performanceIndex > best.performanceIndex ? current : best
  );
  
  // Find best humidity range
  const bestHumidityData = humidityPerformance.reduce((best, current) => 
    current.performanceIndex > best.performanceIndex ? current : best
  );
  
  // Find best wind range (usually lowest wind)
  const bestWindData = windPerformance.reduce((best, current) => 
    current.performanceIndex > best.performanceIndex ? current : best
  );
  
  // Calculate confidence based on data quality and consistency
  const avgConfidence = (
    bestTempData.confidenceLevel + 
    bestHumidityData.confidenceLevel + 
    bestWindData.confidenceLevel
  ) / 3;

  return {
    temperatureRange: {
      min: bestTempData.minTemp,
      max: bestTempData.maxTemp
    },
    humidityRange: {
      min: bestHumidityData.minHumidity,
      max: bestHumidityData.maxHumidity
    },
    windSpeedMax: bestWindData.maxWindSpeed,
    confidenceScore: Math.round(avgConfidence * 100) / 100
  };
};

/**
 * Track acclimatization progress over time
 * Requirements: 14.4, 14.5
 */
const trackAcclimatization = (
  adjustedResults: Array<{ run: EnrichedRun; result: any; date: Date }>
): EnvironmentalProfile['acclimatization'] => {
  // Sort by date
  const sortedResults = adjustedResults.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Track heat acclimatization
  const heatAcclimatization = trackHeatAcclimatization(sortedResults);
  
  // Track cold acclimatization
  const coldAcclimatization = trackColdAcclimatization(sortedResults);

  return {
    heatAcclimatization,
    coldAcclimatization
  };
};

/**
 * Track heat acclimatization over time
 * Requirements: 14.4, 14.5
 */
const trackHeatAcclimatization = (
  sortedResults: Array<{ run: EnrichedRun; result: any; date: Date }>
): AcclimatizationData => {
  const hotRuns = sortedResults.filter(r => r.run.weather_data!.temperature >= 25);
  
  if (hotRuns.length < 3) {
    return createDefaultAcclimatization();
  }
  
  // Calculate performance in hot conditions over time
  const progressHistory: AcclimatizationData['progressHistory'] = [];
  const windowSize = Math.min(5, hotRuns.length); // Adjust window size based on available data
  
  for (let i = windowSize - 1; i < hotRuns.length; i++) {
    const window = hotRuns.slice(i - windowSize + 1, i + 1);
    // Calculate performance score - faster pace in heat = better adaptation
    const avgPerformance = window.reduce((sum, r) => {
      const paceScore = Math.max(0, 400 - r.result.adjustedPace); // Normalize around 400s/km
      return sum + paceScore;
    }, 0) / window.length;
    
    const level = Math.max(0, Math.min(100, avgPerformance / 2)); // Scale to 0-100
    
    progressHistory.push({
      date: window[window.length - 1].date.toISOString(),
      level: Math.round(level),
      triggerConditions: {
        temperature: window.reduce((sum, r) => sum + r.run.weather_data!.temperature, 0) / window.length,
        humidity: window.reduce((sum, r) => sum + r.run.weather_data!.humidity, 0) / window.length
      }
    });
  }
  
  const currentLevel = progressHistory.length > 0 ? progressHistory[progressHistory.length - 1].level : 50;
  
  // Calculate trend
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (progressHistory.length >= 2) {
    const recent = progressHistory.slice(-Math.min(3, progressHistory.length));
    const older = progressHistory.slice(0, Math.min(3, progressHistory.length - recent.length));
    
    if (recent.length > 0 && older.length > 0) {
      const recentAvg = recent.reduce((sum, p) => sum + p.level, 0) / recent.length;
      const olderAvg = older.reduce((sum, p) => sum + p.level, 0) / older.length;
      
      if (recentAvg > olderAvg + 5) trend = 'improving';
      else if (recentAvg < olderAvg - 5) trend = 'declining';
    }
  }
  
  // Calculate recent improvement (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentProgress = progressHistory.filter(p => new Date(p.date) >= thirtyDaysAgo);
  const recentImprovement = recentProgress.length >= 2 
    ? recentProgress[recentProgress.length - 1].level - recentProgress[0].level
    : 0;
  
  // Estimate time to next level (simplified)
  const timeToAcclimate = trend === 'improving' ? 14 : trend === 'declining' ? -1 : 30;

  return {
    currentLevel,
    trend,
    recentImprovement: Math.round(recentImprovement),
    timeToAcclimate,
    progressHistory: progressHistory.slice(-10) // Keep last 10 data points
  };
};

/**
 * Track cold acclimatization over time
 * Requirements: 14.4, 14.5
 */
const trackColdAcclimatization = (
  sortedResults: Array<{ run: EnrichedRun; result: any; date: Date }>
): AcclimatizationData => {
  const coldRuns = sortedResults.filter(r => r.run.weather_data!.temperature <= 10);
  
  if (coldRuns.length < 3) {
    return createDefaultAcclimatization();
  }
  
  // Similar logic to heat acclimatization but for cold conditions
  const progressHistory: AcclimatizationData['progressHistory'] = [];
  const windowSize = Math.min(5, coldRuns.length); // Adjust window size based on available data
  
  for (let i = windowSize - 1; i < coldRuns.length; i++) {
    const window = coldRuns.slice(i - windowSize + 1, i + 1);
    // Adjust performance calculation for cold conditions - faster pace is better
    const avgPerformance = window.reduce((sum, r) => {
      // Convert pace to performance score (lower pace = higher score)
      const paceScore = Math.max(0, 400 - r.result.adjustedPace); // Normalize around 400s/km
      return sum + paceScore;
    }, 0) / window.length;
    
    const level = Math.max(0, Math.min(100, avgPerformance / 2)); // Scale to 0-100
    
    progressHistory.push({
      date: window[window.length - 1].date.toISOString(),
      level: Math.round(level),
      triggerConditions: {
        temperature: window.reduce((sum, r) => sum + r.run.weather_data!.temperature, 0) / window.length
      }
    });
  }
  
  const currentLevel = progressHistory.length > 0 ? progressHistory[progressHistory.length - 1].level : 50;
  
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (progressHistory.length >= 2) {
    const recent = progressHistory.slice(-Math.min(3, progressHistory.length));
    const older = progressHistory.slice(0, Math.min(3, progressHistory.length - recent.length));
    
    if (recent.length > 0 && older.length > 0) {
      const recentAvg = recent.reduce((sum, p) => sum + p.level, 0) / recent.length;
      const olderAvg = older.reduce((sum, p) => sum + p.level, 0) / older.length;
      
      if (recentAvg > olderAvg + 5) trend = 'improving';
      else if (recentAvg < olderAvg - 5) trend = 'declining';
    }
  }
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentProgress = progressHistory.filter(p => new Date(p.date) >= thirtyDaysAgo);
  const recentImprovement = recentProgress.length >= 2 
    ? recentProgress[recentProgress.length - 1].level - recentProgress[0].level
    : 0;
  
  const timeToAcclimate = trend === 'improving' ? 14 : trend === 'declining' ? -1 : 30;

  return {
    currentLevel,
    trend,
    recentImprovement: Math.round(recentImprovement),
    timeToAcclimate,
    progressHistory: progressHistory.slice(-10)
  };
};

// Helper functions

const createMinimalProfile = (runs: EnrichedRun[]): EnvironmentalProfile => {
  return {
    heatTolerance: {
      level: 'medium',
      optimalTemperature: 18,
      maxComfortableTemp: 25,
      heatAdaptationScore: 50,
      improvementTrend: 'stable'
    },
    coldAdaptation: {
      level: 'medium',
      minComfortableTemp: 5,
      coldAdaptationScore: 50,
      improvementTrend: 'stable'
    },
    optimalConditions: {
      temperatureRange: { min: 15, max: 20 },
      humidityRange: { min: 40, max: 60 },
      windSpeedMax: 10,
      confidenceScore: 0.3
    },
    performanceByTemperature: [],
    performanceByHumidity: [],
    performanceByWind: [],
    acclimatization: {
      heatAcclimatization: createDefaultAcclimatization(),
      coldAcclimatization: createDefaultAcclimatization()
    },
    totalRunsAnalyzed: runs.length,
    dateRange: {
      start: runs.length > 0 ? runs[0].start_date : new Date().toISOString(),
      end: runs.length > 0 ? runs[runs.length - 1].start_date : new Date().toISOString()
    },
    lastCalculated: new Date().toISOString(),
    dataQuality: 'low'
  };
};

const createDefaultAcclimatization = (): AcclimatizationData => ({
  currentLevel: 50,
  trend: 'stable',
  recentImprovement: 0,
  timeToAcclimate: 30,
  progressHistory: []
});

const calculateStandardDeviation = (values: number[]): number => {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  
  return Math.sqrt(avgSquaredDiff);
};

const calculateConfidenceLevel = (sampleSize: number, variability: number): number => {
  // Base confidence on sample size
  let confidence = Math.min(1.0, sampleSize / 20); // Max confidence at 20+ samples
  
  // Reduce confidence for high variability
  const normalizedVariability = Math.min(1.0, variability / 60); // Normalize pace variability
  confidence *= (1 - normalizedVariability * 0.5);
  
  return Math.max(0.1, confidence);
};

const calculateImprovementTrend = (
  adjustedResults: Array<{ run: EnrichedRun; result: any; date: Date }>,
  conditionType: 'heat' | 'cold'
): 'improving' | 'stable' | 'declining' => {
  const relevantRuns = adjustedResults.filter(r => {
    const temp = r.run.weather_data!.temperature;
    return conditionType === 'heat' ? temp >= 25 : temp <= 10;
  });
  
  if (relevantRuns.length < 6) return 'stable';
  
  // Compare recent vs older performance
  const sortedRuns = relevantRuns.sort((a, b) => a.date.getTime() - b.date.getTime());
  const recentRuns = sortedRuns.slice(-3);
  const olderRuns = sortedRuns.slice(-6, -3);
  
  if (recentRuns.length < 2 || olderRuns.length < 2) return 'stable';
  
  const recentAvgPace = recentRuns.reduce((sum, r) => sum + r.result.adjustedPace, 0) / recentRuns.length;
  const olderAvgPace = olderRuns.reduce((sum, r) => sum + r.result.adjustedPace, 0) / olderRuns.length;
  
  const improvement = olderAvgPace - recentAvgPace; // Positive = faster (better)
  
  if (improvement > 5) return 'improving';
  if (improvement < -5) return 'declining';
  return 'stable';
};

const assessProfileDataQuality = (runs: EnrichedRun[]): 'high' | 'medium' | 'low' => {
  if (runs.length >= 50) return 'high';
  if (runs.length >= 20) return 'medium';
  return 'low';
};

/**
 * Identify weather performance patterns
 * Requirements: 14.3
 */
export const identifyWeatherPerformancePatterns = (profile: EnvironmentalProfile): WeatherPerformancePattern[] => {
  const patterns: WeatherPerformancePattern[] = [];
  
  // Temperature patterns
  const tempPattern = analyzeTemperaturePattern(profile.performanceByTemperature);
  if (tempPattern) patterns.push(tempPattern);
  
  // Humidity patterns
  const humidityPattern = analyzeHumidityPattern(profile.performanceByHumidity);
  if (humidityPattern) patterns.push(humidityPattern);
  
  // Wind patterns
  const windPattern = analyzeWindPattern(profile.performanceByWind);
  if (windPattern) patterns.push(windPattern);
  
  // Combined patterns
  const combinedPattern = analyzeCombinedPattern(profile);
  if (combinedPattern) patterns.push(combinedPattern);
  
  return patterns;
};

const analyzeTemperaturePattern = (tempData: TemperaturePerformanceData[]): WeatherPerformancePattern | null => {
  if (tempData.length < 3) return null;
  
  // Find performance trend across temperatures
  const performanceByTemp = tempData.map(t => ({ temp: (t.minTemp + t.maxTemp) / 2, performance: t.performanceIndex }));
  
  // Simple linear trend analysis
  const avgTemp = performanceByTemp.reduce((sum, p) => sum + p.temp, 0) / performanceByTemp.length;
  const avgPerf = performanceByTemp.reduce((sum, p) => sum + p.performance, 0) / performanceByTemp.length;
  
  let correlation = 0;
  let tempVariance = 0;
  let perfVariance = 0;
  
  for (const point of performanceByTemp) {
    const tempDiff = point.temp - avgTemp;
    const perfDiff = point.performance - avgPerf;
    correlation += tempDiff * perfDiff;
    tempVariance += tempDiff * tempDiff;
    perfVariance += perfDiff * perfDiff;
  }
  
  if (tempVariance > 0 && perfVariance > 0) {
    correlation = correlation / Math.sqrt(tempVariance * perfVariance);
  }
  
  let pattern = '';
  let strength: 'weak' | 'moderate' | 'strong' = 'weak';
  let recommendation = '';
  
  if (Math.abs(correlation) > 0.7) {
    strength = 'strong';
  } else if (Math.abs(correlation) > 0.4) {
    strength = 'moderate';
  }
  
  if (correlation < -0.3) {
    pattern = 'Performance decreases significantly as temperature increases';
    recommendation = 'Consider running during cooler parts of the day and focus on heat acclimatization training';
  } else if (correlation > 0.3) {
    pattern = 'Performance improves with warmer temperatures';
    recommendation = 'You perform better in warm conditions - consider this for race selection';
  } else {
    pattern = 'Temperature has minimal impact on your performance';
    recommendation = 'You adapt well to various temperatures - maintain current approach';
  }
  
  return {
    conditionType: 'temperature',
    pattern,
    strength,
    confidence: Math.abs(correlation),
    recommendation
  };
};

const analyzeHumidityPattern = (humidityData: HumidityPerformanceData[]): WeatherPerformancePattern | null => {
  if (humidityData.length < 3) return null;
  
  // Find best and worst humidity performance
  const bestHumidity = humidityData.reduce((best, current) => 
    current.performanceIndex > best.performanceIndex ? current : best
  );
  
  const worstHumidity = humidityData.reduce((worst, current) => 
    current.performanceIndex < worst.performanceIndex ? current : worst
  );
  
  const performanceDiff = bestHumidity.performanceIndex - worstHumidity.performanceIndex;
  
  let strength: 'weak' | 'moderate' | 'strong' = 'weak';
  if (performanceDiff > 15) strength = 'strong';
  else if (performanceDiff > 8) strength = 'moderate';
  
  let pattern = '';
  let recommendation = '';
  
  if (bestHumidity.minHumidity < 50 && worstHumidity.minHumidity > 70) {
    pattern = 'Performance significantly better in low humidity conditions';
    recommendation = 'High humidity impacts your performance - increase hydration and consider electrolyte management';
  } else if (performanceDiff < 5) {
    pattern = 'Humidity has minimal impact on your performance';
    recommendation = 'You handle humidity changes well - maintain current hydration strategy';
  } else {
    pattern = 'Moderate sensitivity to humidity changes';
    recommendation = 'Monitor humidity levels and adjust pacing and hydration accordingly';
  }
  
  return {
    conditionType: 'humidity',
    pattern,
    strength,
    confidence: Math.min(1.0, performanceDiff / 20),
    recommendation
  };
};

const analyzeWindPattern = (windData: WindPerformanceData[]): WeatherPerformancePattern | null => {
  if (windData.length < 2) return null;
  
  const calmConditions = windData.find(w => w.maxWindSpeed <= 10);
  const windyConditions = windData.find(w => w.minWindSpeed >= 15);
  
  if (!calmConditions || !windyConditions) {
    return {
      conditionType: 'wind',
      pattern: 'Limited wind condition data available',
      strength: 'weak',
      confidence: 0.3,
      recommendation: 'Continue running in various wind conditions to build profile'
    };
  }
  
  const performanceDiff = calmConditions.performanceIndex - windyConditions.performanceIndex;
  
  let strength: 'weak' | 'moderate' | 'strong' = 'weak';
  if (performanceDiff > 10) strength = 'strong';
  else if (performanceDiff > 5) strength = 'moderate';
  
  let pattern = '';
  let recommendation = '';
  
  if (performanceDiff > 8) {
    pattern = 'Wind significantly impacts your performance';
    recommendation = 'Consider wind conditions when planning runs and races - use sheltered routes on windy days';
  } else if (performanceDiff > 3) {
    pattern = 'Moderate sensitivity to wind conditions';
    recommendation = 'Adjust pacing slightly for headwinds and take advantage of tailwinds';
  } else {
    pattern = 'Wind has minimal impact on your performance';
    recommendation = 'You handle wind conditions well - maintain current approach';
  }
  
  return {
    conditionType: 'wind',
    pattern,
    strength,
    confidence: Math.min(1.0, performanceDiff / 15),
    recommendation
  };
};

const analyzeCombinedPattern = (profile: EnvironmentalProfile): WeatherPerformancePattern | null => {
  // Analyze if certain combinations of conditions are particularly challenging
  const optimalTemp = profile.optimalConditions.temperatureRange;
  const optimalHumidity = profile.optimalConditions.humidityRange;
  const optimalWind = profile.optimalConditions.windSpeedMax;
  
  let pattern = `Optimal conditions: ${optimalTemp.min}-${optimalTemp.max}°C, `;
  pattern += `${optimalHumidity.min}-${optimalHumidity.max}% humidity, `;
  pattern += `wind below ${optimalWind} km/h`;
  
  let recommendation = 'Plan important runs and races during optimal weather windows when possible';
  
  // Check for heat tolerance
  if (profile.heatTolerance.level === 'low') {
    recommendation += '. Focus on heat acclimatization training during summer months';
  }
  
  // Check for cold adaptation
  if (profile.coldAdaptation.level === 'low') {
    recommendation += '. Gradually build cold weather tolerance with proper layering';
  }
  
  return {
    conditionType: 'combined',
    pattern,
    strength: 'moderate',
    confidence: profile.optimalConditions.confidenceScore,
    recommendation
  };
};

/**
 * Get environmental recommendations based on current conditions
 * Requirements: 14.3, 14.5
 */
export const getEnvironmentalRecommendations = (
  profile: EnvironmentalProfile,
  currentConditions: {
    temperature: number;
    humidity: number;
    windSpeed: number;
  }
): {
  paceAdjustment: string;
  hydrationAdvice: string;
  clothingAdvice: string;
  overallRating: 'excellent' | 'good' | 'fair' | 'challenging';
  specificAdvice: string[];
} => {
  const recommendations = {
    paceAdjustment: '',
    hydrationAdvice: '',
    clothingAdvice: '',
    overallRating: 'good' as 'excellent' | 'good' | 'fair' | 'challenging',
    specificAdvice: [] as string[]
  };
  
  // Check against optimal conditions
  const tempInRange = currentConditions.temperature >= profile.optimalConditions.temperatureRange.min &&
                     currentConditions.temperature <= profile.optimalConditions.temperatureRange.max;
  const humidityInRange = currentConditions.humidity >= profile.optimalConditions.humidityRange.min &&
                         currentConditions.humidity <= profile.optimalConditions.humidityRange.max;
  const windOk = currentConditions.windSpeed <= profile.optimalConditions.windSpeedMax;
  
  // Overall rating
  const conditionsInRange = [tempInRange, humidityInRange, windOk].filter(Boolean).length;
  if (conditionsInRange === 3) {
    recommendations.overallRating = 'excellent';
  } else if (conditionsInRange === 2) {
    recommendations.overallRating = 'good';
  } else if (conditionsInRange === 1) {
    recommendations.overallRating = 'fair';
  } else {
    recommendations.overallRating = 'challenging';
  }
  
  // Temperature-specific advice
  if (currentConditions.temperature > profile.heatTolerance.maxComfortableTemp) {
    const tempDiff = currentConditions.temperature - profile.heatTolerance.maxComfortableTemp;
    recommendations.paceAdjustment = `Consider slowing pace by ${Math.round(tempDiff * 2)}-${Math.round(tempDiff * 3)} seconds per km`;
    recommendations.hydrationAdvice = 'Increase fluid intake before, during, and after run. Consider electrolyte replacement';
    recommendations.clothingAdvice = 'Light-colored, moisture-wicking clothing. Consider hat and sunglasses';
    recommendations.specificAdvice.push('Start early morning or evening to avoid peak heat');
    recommendations.specificAdvice.push('Seek shaded routes when possible');
  } else if (currentConditions.temperature < profile.coldAdaptation.minComfortableTemp) {
    recommendations.clothingAdvice = 'Layer appropriately - you should feel slightly cool at start';
    recommendations.hydrationAdvice = 'Don\'t forget hydration - you still lose fluids in cold weather';
    recommendations.specificAdvice.push('Allow extra warm-up time');
    recommendations.specificAdvice.push('Protect extremities - hands, feet, and head');
  } else {
    recommendations.paceAdjustment = 'Temperature is in your comfort zone - maintain normal pacing';
    recommendations.clothingAdvice = 'Standard running attire appropriate';
  }
  
  // Humidity-specific advice
  if (currentConditions.humidity > 75) {
    if (!recommendations.hydrationAdvice) {
      recommendations.hydrationAdvice = 'High humidity reduces cooling efficiency - increase hydration';
    }
    recommendations.specificAdvice.push('Expect higher perceived effort due to reduced cooling');
  }
  
  // Wind-specific advice
  if (currentConditions.windSpeed > profile.optimalConditions.windSpeedMax) {
    recommendations.specificAdvice.push('Strong winds - consider sheltered routes or adjust pacing for headwinds');
  }
  
  // Default advice if conditions are good
  if (recommendations.specificAdvice.length === 0) {
    recommendations.specificAdvice.push('Conditions look great for running - enjoy!');
  }
  
  return recommendations;
};

/**
 * Export environmental profile data for analysis
 * Requirements: 14.3
 */
export const exportEnvironmentalProfileData = (profile: EnvironmentalProfile): string => {
  const data = {
    summary: {
      totalRuns: profile.totalRunsAnalyzed,
      dateRange: profile.dateRange,
      dataQuality: profile.dataQuality,
      heatTolerance: profile.heatTolerance.level,
      coldAdaptation: profile.coldAdaptation.level
    },
    optimalConditions: profile.optimalConditions,
    temperaturePerformance: profile.performanceByTemperature,
    humidityPerformance: profile.performanceByHumidity,
    windPerformance: profile.performanceByWind,
    acclimatization: profile.acclimatization
  };
  
  return JSON.stringify(data, null, 2);
};