// Environmental Profiling Integration Utilities
// Provides easy-to-use functions for integrating environmental profiling into the app

import { EnrichedRun } from '../../types';
import {
  buildEnvironmentalProfile,
  identifyWeatherPerformancePatterns,
  getEnvironmentalRecommendations,
  exportEnvironmentalProfileData,
  EnvironmentalProfile,
  WeatherPerformancePattern
} from './environmentalProfilingUtils';

/**
 * Get environmental profile for a user with caching support
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */
export const getUserEnvironmentalProfile = async (
  runs: EnrichedRun[],
  options: {
    forceRecalculate?: boolean;
    minRunsRequired?: number;
  } = {}
): Promise<{
  profile: EnvironmentalProfile;
  patterns: WeatherPerformancePattern[];
  recommendations: string[];
}> => {
  const { forceRecalculate = false, minRunsRequired = 10 } = options;
  
  // Filter runs with weather data
  const runsWithWeather = runs.filter(run => 
    run.weather_data && 
    typeof run.weather_data.temperature === 'number' &&
    typeof run.weather_data.humidity === 'number' &&
    typeof run.weather_data.wind_speed === 'number'
  );

  if (runsWithWeather.length < minRunsRequired) {
    return {
      profile: buildEnvironmentalProfile(runsWithWeather),
      patterns: [],
      recommendations: [
        `Need at least ${minRunsRequired} runs with weather data for comprehensive environmental analysis.`,
        `Currently have ${runsWithWeather.length} runs with weather data.`,
        'Continue running and syncing data to build your environmental performance profile.'
      ]
    };
  }

  // Build the environmental profile
  const profile = buildEnvironmentalProfile(runsWithWeather);
  
  // Identify performance patterns
  const patterns = identifyWeatherPerformancePatterns(profile);
  
  // Generate general recommendations
  const recommendations = generateGeneralRecommendations(profile, patterns);

  return {
    profile,
    patterns,
    recommendations
  };
};

/**
 * Get current weather recommendations for a user
 * Requirements: 14.3, 14.5
 */
export const getCurrentWeatherRecommendations = (
  profile: EnvironmentalProfile,
  currentConditions: {
    temperature: number;
    humidity: number;
    windSpeed: number;
  }
) => {
  return getEnvironmentalRecommendations(profile, currentConditions);
};

/**
 * Get environmental performance summary for dashboard display
 * Requirements: 14.1, 14.2
 */
export const getEnvironmentalPerformanceSummary = (profile: EnvironmentalProfile): {
  heatTolerance: {
    level: string;
    description: string;
    optimalTemp: number;
    maxComfortableTemp: number;
  };
  coldAdaptation: {
    level: string;
    description: string;
    minComfortableTemp: number;
  };
  optimalConditions: {
    temperature: string;
    humidity: string;
    wind: string;
    confidence: string;
  };
  acclimatizationStatus: {
    heat: {
      level: number;
      trend: string;
      description: string;
    };
    cold: {
      level: number;
      trend: string;
      description: string;
    };
  };
  dataQuality: {
    level: string;
    runsAnalyzed: number;
    description: string;
  };
} => {
  return {
    heatTolerance: {
      level: profile.heatTolerance.level,
      description: getHeatToleranceDescription(profile.heatTolerance.level, profile.heatTolerance.heatAdaptationScore),
      optimalTemp: profile.heatTolerance.optimalTemperature,
      maxComfortableTemp: profile.heatTolerance.maxComfortableTemp
    },
    coldAdaptation: {
      level: profile.coldAdaptation.level,
      description: getColdAdaptationDescription(profile.coldAdaptation.level, profile.coldAdaptation.coldAdaptationScore),
      minComfortableTemp: profile.coldAdaptation.minComfortableTemp
    },
    optimalConditions: {
      temperature: `${profile.optimalConditions.temperatureRange.min}-${profile.optimalConditions.temperatureRange.max}°C`,
      humidity: `${profile.optimalConditions.humidityRange.min}-${profile.optimalConditions.humidityRange.max}%`,
      wind: `Below ${profile.optimalConditions.windSpeedMax} km/h`,
      confidence: getConfidenceDescription(profile.optimalConditions.confidenceScore)
    },
    acclimatizationStatus: {
      heat: {
        level: profile.acclimatization.heatAcclimatization.currentLevel,
        trend: profile.acclimatization.heatAcclimatization.trend,
        description: getAcclimatizationDescription(
          profile.acclimatization.heatAcclimatization.currentLevel,
          profile.acclimatization.heatAcclimatization.trend,
          'heat'
        )
      },
      cold: {
        level: profile.acclimatization.coldAcclimatization.currentLevel,
        trend: profile.acclimatization.coldAcclimatization.trend,
        description: getAcclimatizationDescription(
          profile.acclimatization.coldAcclimatization.currentLevel,
          profile.acclimatization.coldAcclimatization.trend,
          'cold'
        )
      }
    },
    dataQuality: {
      level: profile.dataQuality,
      runsAnalyzed: profile.totalRunsAnalyzed,
      description: getDataQualityDescription(profile.dataQuality, profile.totalRunsAnalyzed)
    }
  };
};

/**
 * Get performance insights for specific weather conditions
 * Requirements: 14.3
 */
export const getWeatherPerformanceInsights = (
  profile: EnvironmentalProfile,
  conditionType: 'temperature' | 'humidity' | 'wind'
): {
  bestConditions: string;
  worstConditions: string;
  performanceRange: string;
  insights: string[];
} => {
  let performanceData: any[];
  let conditionUnit: string;
  let conditionName: string;

  switch (conditionType) {
    case 'temperature':
      performanceData = profile.performanceByTemperature;
      conditionUnit = '°C';
      conditionName = 'Temperature';
      break;
    case 'humidity':
      performanceData = profile.performanceByHumidity;
      conditionUnit = '%';
      conditionName = 'Humidity';
      break;
    case 'wind':
      performanceData = profile.performanceByWind;
      conditionUnit = ' km/h';
      conditionName = 'Wind Speed';
      break;
    default:
      return {
        bestConditions: 'Unknown',
        worstConditions: 'Unknown',
        performanceRange: 'Unknown',
        insights: ['Invalid condition type']
      };
  }

  if (performanceData.length === 0) {
    return {
      bestConditions: 'Insufficient data',
      worstConditions: 'Insufficient data',
      performanceRange: 'Insufficient data',
      insights: [`Need more runs with ${conditionName.toLowerCase()} data for analysis`]
    };
  }

  const bestPerformance = performanceData.reduce((best, current) => 
    current.performanceIndex > best.performanceIndex ? current : best
  );
  
  const worstPerformance = performanceData.reduce((worst, current) => 
    current.performanceIndex < worst.performanceIndex ? current : worst
  );

  const performanceRange = Math.round(bestPerformance.performanceIndex - worstPerformance.performanceIndex);

  const insights: string[] = [];

  // Add specific insights based on condition type
  if (conditionType === 'temperature') {
    const tempRange = bestPerformance as any;
    insights.push(`Best performance in ${tempRange.temperatureRange} (${tempRange.performanceIndex}/100)`);
    
    if (performanceRange > 15) {
      insights.push('Significant temperature sensitivity - consider timing runs for optimal conditions');
    } else if (performanceRange < 5) {
      insights.push('Good temperature adaptation - minimal performance variation across conditions');
    }
  } else if (conditionType === 'humidity') {
    const humidityRange = bestPerformance as any;
    insights.push(`Best performance in ${humidityRange.humidityRange} humidity (${humidityRange.performanceIndex}/100)`);
    
    if (performanceRange > 12) {
      insights.push('High humidity sensitivity - focus on hydration and cooling strategies');
    }
  } else if (conditionType === 'wind') {
    const windRange = bestPerformance as any;
    insights.push(`Best performance in ${windRange.windRange} wind (${windRange.performanceIndex}/100)`);
    
    if (performanceRange > 10) {
      insights.push('Wind significantly affects performance - consider sheltered routes on windy days');
    }
  }

  return {
    bestConditions: (bestPerformance as any)[`${conditionType}Range`] || 'Unknown',
    worstConditions: (worstPerformance as any)[`${conditionType}Range`] || 'Unknown',
    performanceRange: `${performanceRange} point difference`,
    insights
  };
};

/**
 * Export environmental profile data for external analysis
 * Requirements: 14.3
 */
export const exportEnvironmentalData = (profile: EnvironmentalProfile): {
  jsonData: string;
  csvData: string;
  summary: string;
} => {
  const jsonData = exportEnvironmentalProfileData(profile);
  
  // Create CSV data for temperature performance
  const csvHeaders = [
    'Condition Type',
    'Range',
    'Run Count',
    'Avg Original Pace (s/km)',
    'Avg Adjusted Pace (s/km)',
    'Performance Index',
    'Confidence Level'
  ];
  
  const csvRows: string[] = [csvHeaders.join(',')];
  
  // Add temperature data
  profile.performanceByTemperature.forEach(temp => {
    csvRows.push([
      'Temperature',
      temp.temperatureRange,
      temp.runCount.toString(),
      temp.avgOriginalPace.toString(),
      temp.avgAdjustedPace.toString(),
      temp.performanceIndex.toString(),
      temp.confidenceLevel.toString()
    ].join(','));
  });
  
  // Add humidity data
  profile.performanceByHumidity.forEach(humidity => {
    csvRows.push([
      'Humidity',
      humidity.humidityRange,
      humidity.runCount.toString(),
      humidity.avgOriginalPace.toString(),
      humidity.avgAdjustedPace.toString(),
      humidity.performanceIndex.toString(),
      humidity.confidenceLevel.toString()
    ].join(','));
  });
  
  // Add wind data
  profile.performanceByWind.forEach(wind => {
    csvRows.push([
      'Wind',
      wind.windRange,
      wind.runCount.toString(),
      wind.avgOriginalPace.toString(),
      wind.avgAdjustedPace.toString(),
      wind.performanceIndex.toString(),
      wind.confidenceLevel.toString()
    ].join(','));
  });
  
  const csvData = csvRows.join('\n');
  
  // Create summary
  const summary = `Environmental Performance Profile Summary
Generated: ${new Date().toISOString()}
Data Quality: ${profile.dataQuality}
Total Runs Analyzed: ${profile.totalRunsAnalyzed}
Date Range: ${profile.dateRange.start} to ${profile.dateRange.end}

Heat Tolerance: ${profile.heatTolerance.level} (Score: ${profile.heatTolerance.heatAdaptationScore}/100)
Cold Adaptation: ${profile.coldAdaptation.level} (Score: ${profile.coldAdaptation.coldAdaptationScore}/100)

Optimal Conditions:
- Temperature: ${profile.optimalConditions.temperatureRange.min}-${profile.optimalConditions.temperatureRange.max}°C
- Humidity: ${profile.optimalConditions.humidityRange.min}-${profile.optimalConditions.humidityRange.max}%
- Wind: Below ${profile.optimalConditions.windSpeedMax} km/h
- Confidence: ${Math.round(profile.optimalConditions.confidenceScore * 100)}%`;

  return {
    jsonData,
    csvData,
    summary
  };
};

// Helper functions

const generateGeneralRecommendations = (
  profile: EnvironmentalProfile,
  patterns: WeatherPerformancePattern[]
): string[] => {
  const recommendations: string[] = [];
  
  // Heat tolerance recommendations
  if (profile.heatTolerance.level === 'low') {
    recommendations.push('Consider heat acclimatization training during warmer months');
    recommendations.push('Plan important runs during cooler parts of the day');
  } else if (profile.heatTolerance.level === 'high') {
    recommendations.push('You handle heat well - consider summer races and training camps');
  }
  
  // Cold adaptation recommendations
  if (profile.coldAdaptation.level === 'low') {
    recommendations.push('Gradually build cold weather tolerance with proper layering');
    recommendations.push('Allow extra warm-up time in cold conditions');
  } else if (profile.coldAdaptation.level === 'high') {
    recommendations.push('You adapt well to cold - consider winter races and training');
  }
  
  // Pattern-based recommendations
  patterns.forEach(pattern => {
    if (pattern.strength === 'strong' && pattern.confidence > 0.7) {
      recommendations.push(pattern.recommendation);
    }
  });
  
  // Data quality recommendations
  if (profile.dataQuality === 'low') {
    recommendations.push('Continue running in varied weather conditions to improve profile accuracy');
  }
  
  return recommendations;
};

const getHeatToleranceDescription = (level: string, score: number): string => {
  switch (level) {
    case 'high':
      return `Excellent heat tolerance (${score}/100). You maintain good performance even in hot conditions.`;
    case 'medium':
      return `Moderate heat tolerance (${score}/100). Some performance impact in very hot conditions.`;
    case 'low':
      return `Limited heat tolerance (${score}/100). Consider heat acclimatization training.`;
    default:
      return 'Heat tolerance assessment unavailable.';
  }
};

const getColdAdaptationDescription = (level: string, score: number): string => {
  switch (level) {
    case 'high':
      return `Excellent cold adaptation (${score}/100). You perform well in cold conditions.`;
    case 'medium':
      return `Moderate cold adaptation (${score}/100). Some performance impact in very cold conditions.`;
    case 'low':
      return `Limited cold adaptation (${score}/100). Focus on proper layering and warm-up.`;
    default:
      return 'Cold adaptation assessment unavailable.';
  }
};

const getConfidenceDescription = (confidence: number): string => {
  if (confidence >= 0.8) return 'High confidence';
  if (confidence >= 0.6) return 'Medium confidence';
  if (confidence >= 0.4) return 'Low confidence';
  return 'Very low confidence';
};

const getAcclimatizationDescription = (
  level: number,
  trend: string,
  type: 'heat' | 'cold'
): string => {
  const conditionType = type === 'heat' ? 'hot' : 'cold';
  let description = `Current ${conditionType} acclimatization: ${level}/100`;
  
  switch (trend) {
    case 'improving':
      description += ` (improving - good adaptation progress)`;
      break;
    case 'declining':
      description += ` (declining - may need more ${conditionType} exposure)`;
      break;
    default:
      description += ` (stable)`;
  }
  
  return description;
};

const getDataQualityDescription = (quality: string, runsAnalyzed: number): string => {
  switch (quality) {
    case 'high':
      return `High quality analysis based on ${runsAnalyzed} runs with weather data.`;
    case 'medium':
      return `Medium quality analysis based on ${runsAnalyzed} runs. More data will improve accuracy.`;
    case 'low':
      return `Limited analysis based on ${runsAnalyzed} runs. Need more weather data for comprehensive insights.`;
    default:
      return 'Data quality assessment unavailable.';
  }
};