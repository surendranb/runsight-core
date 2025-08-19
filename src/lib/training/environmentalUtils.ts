// Environmental utilities for training load dashboard
// Simplified versions of environmental calculations

import { EnrichedRun } from '../../types';

export interface AdjustedPaceResult {
    adjustedPace: number; // seconds per km
    originalPace: number; // seconds per km
    adjustments: {
        temperature: number;
        humidity: number;
        wind: number;
        total: number;
    };
    confidence: number; // 0-1
}

export interface PSIResult {
    psiScore: number; // 0-10 scale
    heatStress: 'low' | 'moderate' | 'high' | 'extreme';
    confidence: number;
}

/**
 * Calculate weather-adjusted pace
 */
export const calculateAdjustedPace = (
    run: EnrichedRun,
    weatherData: any
): AdjustedPaceResult => {
    const originalPace = run.moving_time / (run.distance / 1000);

    let tempAdjustment = 0;
    let humidityAdjustment = 0;
    let windAdjustment = 0;

    // Temperature adjustment (2-3 sec/km per degree above 20°C)
    if (weatherData.temperature > 20) {
        tempAdjustment = (weatherData.temperature - 20) * 2.5;
    } else if (weatherData.temperature < 5) {
        tempAdjustment = (5 - weatherData.temperature) * 1.5;
    }

    // Humidity adjustment (1-2 sec/km per 10% above 60%)
    if (weatherData.humidity > 60) {
        humidityAdjustment = ((weatherData.humidity - 60) / 10) * 1.5;
    }

    // Wind adjustment (simplified)
    if (weatherData.wind_speed > 15) {
        windAdjustment = (weatherData.wind_speed - 15) * 0.3;
    }

    const totalAdjustment = tempAdjustment + humidityAdjustment + windAdjustment;
    const adjustedPace = Math.max(originalPace - totalAdjustment, originalPace * 0.8);

    return {
        adjustedPace,
        originalPace,
        adjustments: {
            temperature: tempAdjustment,
            humidity: humidityAdjustment,
            wind: windAdjustment,
            total: totalAdjustment
        },
        confidence: weatherData.temperature && weatherData.humidity ? 0.8 : 0.5
    };
};

/**
 * Calculate Physiological Strain Index (PSI)
 */
export const calculatePSI = (
    run: EnrichedRun,
    weatherData: any,
    userPhysiology: any = {}
): PSIResult => {
    if (!run.average_heartrate || !weatherData.temperature) {
        return {
            psiScore: 0,
            heatStress: 'low',
            confidence: 0
        };
    }

    const maxHR = userPhysiology.maxHeartRate || 190;
    const restingHR = userPhysiology.restingHeartRate || 60;

    // Calculate heart rate elevation
    const hrElevation = (run.average_heartrate - restingHR) / (maxHR - restingHR);

    // Environmental stress factor
    let envStress = 0;
    if (weatherData.temperature > 25) {
        envStress += (weatherData.temperature - 25) * 0.1;
    }
    if (weatherData.humidity > 70) {
        envStress += (weatherData.humidity - 70) * 0.02;
    }

    // PSI calculation (simplified)
    const psiScore = Math.min(10, (hrElevation * 5) + envStress);

    let heatStress: 'low' | 'moderate' | 'high' | 'extreme' = 'low';
    if (psiScore > 7) heatStress = 'extreme';
    else if (psiScore > 5) heatStress = 'high';
    else if (psiScore > 3) heatStress = 'moderate';

    return {
        psiScore: Math.round(psiScore * 10) / 10,
        heatStress,
        confidence: 0.7
    };
};
/**
 * Build environmental performance profile
 */
export const buildEnvironmentalProfile = (runs: EnrichedRun[]): {
  performanceByTemperature: Array<{
    temperatureRange: string;
    avgOriginalPace: number | null;
    runCount: number;
    confidence: number;
  }>;
  optimalConditions: {
    temperatureRange: string;
    humidityRange: string;
    confidence: number;
  };
  heatTolerance: {
    level: 'low' | 'moderate' | 'high';
    optimalTemp: number;
    adaptationScore: number;
  };
} => {
  // Safety check for input
  if (!Array.isArray(runs) || runs.length === 0) {
    return {
      performanceByTemperature: [],
      optimalConditions: {
        temperatureRange: '15°C - 20°C',
        humidityRange: '30% - 50%',
        confidence: 0
      },
      heatTolerance: {
        level: 'low',
        optimalTemp: 15,
        adaptationScore: 0
      }
    };
  }
  // Group runs by temperature ranges
  const tempRanges = [
    { name: 'Cool (10-15°C)', min: 10, max: 15 },
    { name: 'Optimal (15-20°C)', min: 15, max: 20 },
    { name: 'Warm (20-25°C)', min: 20, max: 25 },
    { name: 'Hot (25-30°C)', min: 25, max: 30 }
  ];

  const performanceByTemperature = tempRanges.map(range => {
    const runsInRange = runs.filter(run => {
      const temp = run.weather_data?.temperature;
      return temp && temp >= range.min && temp < range.max;
    });

    let avgOriginalPace = null;
    if (runsInRange.length > 0) {
      // Calculate pace for each run and filter out invalid values
      const validPaces = runsInRange
        .map(run => {
          // Ensure we have valid distance and time data
          if (!run.distance || !run.moving_time || run.distance <= 0 || run.moving_time <= 0) {
            return null;
          }
          const pace = run.moving_time / (run.distance / 1000);
          return pace;
        })
        .filter((pace): pace is number => 
          pace !== null && 
          pace > 0 && 
          pace < 1800 && // Less than 30 minutes per km (outlier filter)
          pace > 120 && // More than 2 minutes per km (outlier filter)
          !isNaN(pace)
        );
      
      if (validPaces.length > 0) {
        const totalPace = validPaces.reduce((sum, pace) => sum + pace, 0);
        avgOriginalPace = totalPace / validPaces.length;
      }
    }

    return {
      temperatureRange: range.name,
      avgOriginalPace,
      runCount: runsInRange.length,
      confidence: Math.min(1, runsInRange.length / 10)
    };
  });

  // Find optimal conditions (best average pace with sufficient data)
  const validRanges = performanceByTemperature.filter(range => range.runCount >= 3 && range.avgOriginalPace !== null);
  const bestRange = validRanges.length > 0 
    ? validRanges.reduce((best, current) => 
        (current.avgOriginalPace !== null && best.avgOriginalPace !== null && current.avgOriginalPace < best.avgOriginalPace) ? current : best
      )
    : null;

  // Calculate heat tolerance
  const hotRuns = runs.filter(run => run.weather_data?.temperature && run.weather_data.temperature > 25);
  const heatTolerance = {
    level: hotRuns.length > 10 ? 'moderate' : 'low' as 'low' | 'moderate' | 'high',
    optimalTemp: bestRange ? 13 : 15, // Use data-driven or conservative default
    adaptationScore: Math.min(100, hotRuns.length * 2)
  };

  return {
    performanceByTemperature,
    optimalConditions: {
      temperatureRange: bestRange ? bestRange.temperatureRange : '15°C - 20°C',
      humidityRange: '30% - 50%',
      confidence: bestRange ? bestRange.confidence : 0.1
    },
    heatTolerance
  };
};

/**
 * Identify weather performance patterns
 */
export const identifyWeatherPerformancePatterns = (runs: EnrichedRun[]): {
  heatAdaptation: {
    trend: 'improving' | 'stable' | 'declining';
    level: number;
  };
} => {
  // Analyze recent hot weather runs for adaptation trends
  const hotRuns = runs
    .filter(run => run.weather_data?.temperature && run.weather_data.temperature > 25)
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
    .slice(0, 20); // Last 20 hot runs

  if (hotRuns.length < 5) {
    return {
      heatAdaptation: {
        trend: 'stable',
        level: 0
      }
    };
  }

  // Simple trend analysis based on pace improvement in hot conditions
  const recentHotRuns = hotRuns.slice(0, Math.floor(hotRuns.length / 2));
  const olderHotRuns = hotRuns.slice(Math.floor(hotRuns.length / 2));

  const recentAvgPace = recentHotRuns.reduce((sum, run) => sum + (run.moving_time / (run.distance / 1000)), 0) / recentHotRuns.length;
  const olderAvgPace = olderHotRuns.reduce((sum, run) => sum + (run.moving_time / (run.distance / 1000)), 0) / olderHotRuns.length;

  const improvement = olderAvgPace - recentAvgPace; // Positive means getting faster
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  
  if (improvement > 5) trend = 'improving';
  else if (improvement < -5) trend = 'declining';

  return {
    heatAdaptation: {
      trend,
      level: Math.min(100, hotRuns.length * 3)
    }
  };
};

/**
 * Get environmental recommendations based on profile and current conditions
 */
export const getEnvironmentalRecommendations = (
  profile: any, 
  currentConditions?: { temperature: number; humidity: number; windSpeed: number; weatherDescription: string }
): string[] => {
  const recommendations: string[] = [];

  if (!currentConditions) {
    // General recommendations
    recommendations.push('Start hydrating 2-3 hours before running');
    recommendations.push('Run during cooler parts of the day');
    recommendations.push('Monitor weather conditions before heading out');
    return recommendations;
  }

  // Temperature-based recommendations
  if (currentConditions.temperature > 25) {
    recommendations.push('High temperature detected - reduce pace by 10-20 seconds per km');
    recommendations.push('Start hydrating 2-3 hours before running');
    recommendations.push('Consider running during cooler parts of the day');
  } else if (currentConditions.temperature < 5) {
    recommendations.push('Cold conditions - warm up indoors before heading out');
    recommendations.push('Layer clothing for temperature regulation');
  }

  // Humidity recommendations
  if (currentConditions.humidity > 70) {
    recommendations.push('High humidity - expect increased perceived effort');
    recommendations.push('Focus on electrolyte replacement during longer runs');
  }

  // Wind recommendations
  if (currentConditions.windSpeed > 15) {
    recommendations.push('Strong winds - adjust pacing and consider sheltered routes');
  }

  // Heat tolerance specific recommendations
  if (profile?.heatTolerance?.level === 'low' && currentConditions.temperature > 20) {
    recommendations.push('Your heat tolerance is low - be extra cautious in warm conditions');
  }

  return recommendations.slice(0, 4); // Limit to 4 recommendations
};