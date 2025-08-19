// Environmental Performance Adjustment System
import { EnrichedRun } from '../../types';

export interface EnvironmentalAdjustment {
  temperatureAdjustment: number; // seconds per km
  humidityAdjustment: number; // seconds per km
  windAdjustment: number; // seconds per km
  elevationAdjustment: number; // seconds per km
  totalAdjustment: number; // seconds per km
  adjustmentFactors: {
    temperature: { value: number; impact: string };
    humidity: { value: number; impact: string };
    wind: { value: number; impact: string };
    elevation: { value: number; impact: string };
  };
}

export interface AdjustedPaceResult {
  originalPace: number; // seconds per km
  adjustedPace: number; // seconds per km
  adjustments: EnvironmentalAdjustment;
  confidence: number; // 0-1 based on data quality
  explanation: string[];
}

export interface EnvironmentalConditions {
  temperature: number; // Celsius
  humidity: number; // Percentage
  windSpeed: number; // km/h
  windDirection?: number; // degrees (0-360)
  runDirection?: number; // degrees (0-360) - would need GPS track analysis
  elevation?: number; // meters gained per km
}

/**
 * Calculate adjusted pace for environmental conditions
 * Requirements: 3.1 - Calculate adjusted pace that normalizes for environmental conditions
 */
export const calculateAdjustedPace = (run: EnrichedRun): AdjustedPaceResult => {
  // Calculate original pace
  const originalPace = run.moving_time / (run.distance / 1000); // seconds per km

  // Check if we have weather data
  if (!run.weather_data) {
    return {
      originalPace,
      adjustedPace: originalPace,
      adjustments: createEmptyAdjustment(),
      confidence: 0,
      explanation: ['No weather data available for environmental adjustments']
    };
  }

  // Extract environmental conditions
  const conditions: EnvironmentalConditions = {
    temperature: run.weather_data.temperature,
    humidity: run.weather_data.humidity,
    windSpeed: run.weather_data.wind_speed,
    elevation: run.total_elevation_gain ? (run.total_elevation_gain / (run.distance / 1000)) : undefined
  };

  // Calculate individual adjustments
  const temperatureAdjustment = calculateTemperatureAdjustment(conditions.temperature);
  const humidityAdjustment = calculateHumidityAdjustment(conditions.humidity);
  const windAdjustment = calculateWindAdjustment(conditions.windSpeed);
  const elevationAdjustment = calculateElevationAdjustment(conditions.elevation);

  // Create adjustment object
  const adjustments: EnvironmentalAdjustment = {
    temperatureAdjustment: temperatureAdjustment.adjustment,
    humidityAdjustment: humidityAdjustment.adjustment,
    windAdjustment: windAdjustment.adjustment,
    elevationAdjustment: elevationAdjustment.adjustment,
    totalAdjustment: temperatureAdjustment.adjustment + humidityAdjustment.adjustment + 
                    windAdjustment.adjustment + elevationAdjustment.adjustment,
    adjustmentFactors: {
      temperature: temperatureAdjustment,
      humidity: humidityAdjustment,
      wind: windAdjustment,
      elevation: elevationAdjustment
    }
  };

  // Calculate adjusted pace (subtract adjustments to get "normalized" pace)
  const adjustedPace = Math.max(60, originalPace - adjustments.totalAdjustment); // Minimum 1:00/km

  // Calculate confidence based on data availability
  const confidence = calculateAdjustmentConfidence(run, conditions);

  // Generate explanations
  const explanation = generateAdjustmentExplanations(adjustments, conditions);

  return {
    originalPace,
    adjustedPace,
    adjustments,
    confidence,
    explanation
  };
};

/**
 * Calculate temperature adjustment
 * Requirements: 3.2 - Apply temperature adjustments
 */
const calculateTemperatureAdjustment = (temperature: number): { value: number; impact: string; adjustment: number } => {
  let adjustment = 0;
  let impact = 'neutral';

  // Optimal temperature range: 10-20°C
  if (temperature > 20) {
    // Hot weather: +2-3 seconds per km for every degree above 20°C
    const excessTemp = temperature - 20;
    adjustment = excessTemp * 2.5; // Average of 2-3 seconds
    impact = `+${excessTemp.toFixed(1)}°C above optimal`;
  } else if (temperature < 10) {
    // Cold weather: -1-2 seconds per km for every degree below 10°C
    const deficitTemp = 10 - temperature;
    adjustment = deficitTemp * -1.5; // Average of 1-2 seconds (negative because it's easier)
    impact = `${deficitTemp.toFixed(1)}°C below optimal`;
  } else {
    impact = 'optimal range (10-20°C)';
  }

  return {
    value: temperature,
    impact,
    adjustment: Math.round(adjustment * 10) / 10
  };
};

/**
 * Calculate humidity adjustment
 * Requirements: 3.3 - Apply humidity adjustments
 */
const calculateHumidityAdjustment = (humidity: number): { value: number; impact: string; adjustment: number } => {
  let adjustment = 0;
  let impact = 'neutral';

  // Optimal humidity: below 60%
  if (humidity > 60) {
    // High humidity: +1-2 seconds per km for every 10% above 60%
    const excessHumidity = humidity - 60;
    adjustment = (excessHumidity / 10) * 1.5; // Average of 1-2 seconds per 10%
    impact = `+${excessHumidity.toFixed(0)}% above optimal`;
  } else {
    impact = 'optimal range (<60%)';
  }

  return {
    value: humidity,
    impact,
    adjustment: Math.round(adjustment * 10) / 10
  };
};

/**
 * Calculate wind adjustment
 * Requirements: 3.4 - Apply wind adjustments
 */
const calculateWindAdjustment = (windSpeed: number): { value: number; impact: string; adjustment: number } => {
  let adjustment = 0;
  let impact = 'neutral';

  // Significant wind: above 15 km/h
  if (windSpeed > 15) {
    // Assume headwind (worst case) since we don't have direction data
    // +3-5 seconds per km for headwinds above 15 km/h
    const excessWind = windSpeed - 15;
    adjustment = excessWind * 0.4; // Average of 3-5 seconds per km/h, scaled
    impact = `${excessWind.toFixed(1)} km/h above calm (assumed headwind)`;
  } else {
    impact = 'calm conditions (<15 km/h)';
  }

  return {
    value: windSpeed,
    impact,
    adjustment: Math.round(adjustment * 10) / 10
  };
};

/**
 * Calculate elevation adjustment (bonus feature)
 */
const calculateElevationAdjustment = (elevationPerKm?: number): { value: number; impact: string; adjustment: number } => {
  if (!elevationPerKm) {
    return {
      value: 0,
      impact: 'flat terrain',
      adjustment: 0
    };
  }

  let adjustment = 0;
  let impact = 'neutral';

  // Significant elevation: above 20m per km
  if (elevationPerKm > 20) {
    // Uphill: +10-15 seconds per km for every 10m elevation gain per km
    adjustment = ((elevationPerKm - 20) / 10) * 12.5; // Average of 10-15 seconds
    impact = `+${(elevationPerKm - 20).toFixed(0)}m/km elevation gain`;
  } else if (elevationPerKm < -20) {
    // Downhill: -5-8 seconds per km for every 10m elevation loss per km
    adjustment = ((elevationPerKm + 20) / 10) * -6.5; // Average of 5-8 seconds (negative)
    impact = `${Math.abs(elevationPerKm + 20).toFixed(0)}m/km elevation loss`;
  } else {
    impact = 'minimal elevation change';
  }

  return {
    value: elevationPerKm,
    impact,
    adjustment: Math.round(adjustment * 10) / 10
  };
};

/**
 * Calculate confidence in adjustment accuracy
 */
const calculateAdjustmentConfidence = (run: EnrichedRun, conditions: EnvironmentalConditions): number => {
  let confidence = 0.8; // Base confidence

  // Reduce confidence if missing key data
  if (!run.weather_data) {
    confidence = 0;
  } else {
    // Check data quality
    if (conditions.temperature < -20 || conditions.temperature > 50) {
      confidence -= 0.2; // Extreme temperatures might be inaccurate
    }
    
    if (conditions.humidity < 0 || conditions.humidity > 100) {
      confidence -= 0.2; // Invalid humidity data
    }
    
    if (conditions.windSpeed > 50) {
      confidence -= 0.1; // Very high wind speeds might be inaccurate
    }
  }

  // Boost confidence for moderate conditions (easier to adjust accurately)
  if (conditions.temperature >= 10 && conditions.temperature <= 30 &&
      conditions.humidity >= 30 && conditions.humidity <= 80) {
    confidence += 0.1;
  }

  return Math.max(0.1, Math.min(1.0, confidence));
};

/**
 * Generate human-readable explanations for adjustments
 * Requirements: 3.5 - Show clear explanations of adjustments made
 */
const generateAdjustmentExplanations = (
  adjustments: EnvironmentalAdjustment,
  conditions: EnvironmentalConditions
): string[] => {
  const explanations: string[] = [];

  // Temperature explanation
  if (Math.abs(adjustments.temperatureAdjustment) > 0.5) {
    const direction = adjustments.temperatureAdjustment > 0 ? 'slower' : 'faster';
    explanations.push(
      `Temperature (${conditions.temperature.toFixed(1)}°C): ${Math.abs(adjustments.temperatureAdjustment).toFixed(1)}s/km ${direction} - ${adjustments.adjustmentFactors.temperature.impact}`
    );
  }

  // Humidity explanation
  if (Math.abs(adjustments.humidityAdjustment) > 0.5) {
    explanations.push(
      `Humidity (${conditions.humidity.toFixed(0)}%): ${adjustments.humidityAdjustment.toFixed(1)}s/km slower - ${adjustments.adjustmentFactors.humidity.impact}`
    );
  }

  // Wind explanation
  if (Math.abs(adjustments.windAdjustment) > 0.5) {
    explanations.push(
      `Wind (${conditions.windSpeed.toFixed(1)} km/h): ${adjustments.windAdjustment.toFixed(1)}s/km slower - ${adjustments.adjustmentFactors.wind.impact}`
    );
  }

  // Elevation explanation
  if (Math.abs(adjustments.elevationAdjustment) > 0.5) {
    const direction = adjustments.elevationAdjustment > 0 ? 'slower' : 'faster';
    explanations.push(
      `Elevation: ${Math.abs(adjustments.elevationAdjustment).toFixed(1)}s/km ${direction} - ${adjustments.adjustmentFactors.elevation.impact}`
    );
  }

  // Summary
  if (explanations.length === 0) {
    explanations.push('Ideal conditions - no significant adjustments needed');
  } else {
    const totalAdjustment = adjustments.totalAdjustment;
    const direction = totalAdjustment > 0 ? 'slower than' : 'faster than';
    explanations.unshift(
      `Total adjustment: ${Math.abs(totalAdjustment).toFixed(1)}s/km ${direction} neutral conditions`
    );
  }

  return explanations;
};

/**
 * Create empty adjustment object for when no weather data is available
 */
const createEmptyAdjustment = (): EnvironmentalAdjustment => ({
  temperatureAdjustment: 0,
  humidityAdjustment: 0,
  windAdjustment: 0,
  elevationAdjustment: 0,
  totalAdjustment: 0,
  adjustmentFactors: {
    temperature: { value: 0, impact: 'unknown', adjustment: 0 },
    humidity: { value: 0, impact: 'unknown', adjustment: 0 },
    wind: { value: 0, impact: 'unknown', adjustment: 0 },
    elevation: { value: 0, impact: 'unknown', adjustment: 0 }
  }
});

/**
 * Batch calculate adjusted paces for multiple runs
 */
export const calculateAdjustedPacesForRuns = (runs: EnrichedRun[]): AdjustedPaceResult[] => {
  return runs.map(run => calculateAdjustedPace(run));
};

/**
 * Compare performance across different environmental conditions
 */
export const compareEnvironmentalPerformance = (runs: EnrichedRun[]): {
  bestConditions: { temperature: number; humidity: number; windSpeed: number; avgPace: number };
  worstConditions: { temperature: number; humidity: number; windSpeed: number; avgPace: number };
  optimalConditions: string[];
  performanceByCondition: Array<{
    conditionRange: string;
    avgOriginalPace: number;
    avgAdjustedPace: number;
    runCount: number;
    improvement: number; // How much faster adjusted pace is
  }>;
} => {
  const adjustedResults = runs
    .filter(run => run.weather_data)
    .map(run => ({
      run,
      result: calculateAdjustedPace(run)
    }));

  if (adjustedResults.length === 0) {
    return {
      bestConditions: { temperature: 15, humidity: 50, windSpeed: 5, avgPace: 0 },
      worstConditions: { temperature: 30, humidity: 80, windSpeed: 20, avgPace: 0 },
      optimalConditions: ['No weather data available'],
      performanceByCondition: []
    };
  }

  // Find best and worst conditions based on adjusted pace
  const sortedByAdjustedPace = adjustedResults.sort((a, b) => a.result.adjustedPace - b.result.adjustedPace);
  const best = sortedByAdjustedPace[0];
  const worst = sortedByAdjustedPace[sortedByAdjustedPace.length - 1];

  // Group by temperature ranges
  const tempRanges = [
    { range: 'Cold (<10°C)', min: -20, max: 10 },
    { range: 'Cool (10-15°C)', min: 10, max: 15 },
    { range: 'Optimal (15-20°C)', min: 15, max: 20 },
    { range: 'Warm (20-25°C)', min: 20, max: 25 },
    { range: 'Hot (>25°C)', min: 25, max: 50 }
  ];

  const performanceByCondition = tempRanges
    .map(range => {
      const runsInRange = adjustedResults.filter(r => 
        r.run.weather_data!.temperature >= range.min && 
        r.run.weather_data!.temperature < range.max
      );

      if (runsInRange.length === 0) return null;

      const avgOriginalPace = runsInRange.reduce((sum, r) => sum + r.result.originalPace, 0) / runsInRange.length;
      const avgAdjustedPace = runsInRange.reduce((sum, r) => sum + r.result.adjustedPace, 0) / runsInRange.length;

      return {
        conditionRange: range.range,
        avgOriginalPace: Math.round(avgOriginalPace),
        avgAdjustedPace: Math.round(avgAdjustedPace),
        runCount: runsInRange.length,
        improvement: Math.round(avgOriginalPace - avgAdjustedPace)
      };
    })
    .filter(Boolean) as Array<{
      conditionRange: string;
      avgOriginalPace: number;
      avgAdjustedPace: number;
      runCount: number;
      improvement: number;
    }>;

  return {
    bestConditions: {
      temperature: best.run.weather_data!.temperature,
      humidity: best.run.weather_data!.humidity,
      windSpeed: best.run.weather_data!.wind_speed,
      avgPace: Math.round(best.result.adjustedPace)
    },
    worstConditions: {
      temperature: worst.run.weather_data!.temperature,
      humidity: worst.run.weather_data!.humidity,
      windSpeed: worst.run.weather_data!.wind_speed,
      avgPace: Math.round(worst.result.adjustedPace)
    },
    optimalConditions: [
      'Temperature: 15-20°C for optimal performance',
      'Humidity: Below 60% to minimize heat stress',
      'Wind: Below 15 km/h to avoid resistance',
      'Terrain: Minimal elevation change for consistent pacing'
    ],
    performanceByCondition
  };
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
 * Format adjustment for display
 */
export const formatAdjustment = (adjustment: number): string => {
  if (Math.abs(adjustment) < 0.1) return 'No adjustment';
  
  const direction = adjustment > 0 ? '+' : '';
  return `${direction}${adjustment.toFixed(1)}s/km`;
};

/**
 * Get environmental impact summary
 */
export const getEnvironmentalImpactSummary = (result: AdjustedPaceResult): string => {
  const totalAdjustment = result.adjustments.totalAdjustment;
  
  if (Math.abs(totalAdjustment) < 1) {
    return 'Minimal environmental impact on performance';
  } else if (totalAdjustment > 0) {
    return `Challenging conditions slowed pace by ${totalAdjustment.toFixed(1)}s/km`;
  } else {
    return `Favorable conditions helped pace by ${Math.abs(totalAdjustment).toFixed(1)}s/km`;
  }
};