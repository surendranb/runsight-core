import { EnrichedRun } from '../../types';

export interface EffortScore {
  runId: string;
  date: string;
  effortScore: number; // 0-100 normalized effort score
  paceEffort: number;
  elevationEffort: number;
  weatherEffort: number;
  heartRateEffort?: number;
  factors: {
    pace: number;
    elevation: number;
    weather: number;
    heartRate?: number;
  };
}

export interface PerformanceVariability {
  paceVariability: {
    coefficient: number; // Coefficient of variation
    standardDeviation: number;
    mean: number;
    trend: 'improving' | 'declining' | 'stable';
  };
  distanceVariability: {
    coefficient: number;
    standardDeviation: number;
    mean: number;
    consistency: 'high' | 'medium' | 'low';
  };
  effortVariability: {
    coefficient: number;
    standardDeviation: number;
    mean: number;
    reliability: 'high' | 'medium' | 'low';
  };
}

export interface ImprovementRate {
  paceImprovement: {
    rate: number; // seconds per km improvement per month
    trend: 'improving' | 'declining' | 'stable';
    confidence: number; // 0-1
    projection: number; // projected pace in 3 months
  };
  distanceImprovement: {
    rate: number; // meters improvement per month
    trend: 'improving' | 'declining' | 'stable';
    confidence: number;
    projection: number;
  };
  consistencyImprovement: {
    rate: number; // consistency score improvement per month
    trend: 'improving' | 'declining' | 'stable';
    confidence: number;
    projection: number;
  };
}

export interface PerformancePrediction {
  nextRunPrediction: {
    predictedPace: number;
    confidence: number;
    factors: string[];
  };
  goalAchievementProbability: {
    fiveK: { time: number; probability: number };
    tenK: { time: number; probability: number };
    halfMarathon: { time: number; probability: number };
    marathon: { time: number; probability: number };
  };
  trainingRecommendations: string[];
}

export interface AdvancedPerformanceAnalysis {
  effortScores: EffortScore[];
  variabilityAnalysis: PerformanceVariability;
  improvementRates: ImprovementRate;
  predictions: PerformancePrediction;
  insights: string[];
}

export const analyzeAdvancedPerformance = (runs: EnrichedRun[]): AdvancedPerformanceAnalysis => {
  if (runs.length < 5) {
    return {
      effortScores: [],
      variabilityAnalysis: {
        paceVariability: { coefficient: 0, standardDeviation: 0, mean: 0, trend: 'stable' },
        distanceVariability: { coefficient: 0, standardDeviation: 0, mean: 0, consistency: 'low' },
        effortVariability: { coefficient: 0, standardDeviation: 0, mean: 0, reliability: 'low' }
      },
      improvementRates: {
        paceImprovement: { rate: 0, trend: 'stable', confidence: 0, projection: 0 },
        distanceImprovement: { rate: 0, trend: 'stable', confidence: 0, projection: 0 },
        consistencyImprovement: { rate: 0, trend: 'stable', confidence: 0, projection: 0 }
      },
      predictions: {
        nextRunPrediction: { predictedPace: 0, confidence: 0, factors: [] },
        goalAchievementProbability: {
          fiveK: { time: 0, probability: 0 },
          tenK: { time: 0, probability: 0 },
          halfMarathon: { time: 0, probability: 0 },
          marathon: { time: 0, probability: 0 }
        },
        trainingRecommendations: ['Need more run data for advanced analysis']
      },
      insights: ['Insufficient data for advanced performance analysis. Need at least 5 runs.']
    };
  }

  const validRuns = runs.filter(run => run.distance > 0 && run.moving_time > 0);
  
  // Calculate effort scores for each run
  const effortScores = calculateEffortScores(validRuns);
  
  // Analyze performance variability
  const variabilityAnalysis = analyzePerformanceVariability(validRuns);
  
  // Calculate improvement rates
  const improvementRates = calculateImprovementRates(validRuns);
  
  // Generate performance predictions
  const predictions = generatePerformancePredictions(validRuns, improvementRates);
  
  // Generate insights
  const insights = generateAdvancedInsights(effortScores, variabilityAnalysis, improvementRates);

  return {
    effortScores,
    variabilityAnalysis,
    improvementRates,
    predictions,
    insights
  };
};

const calculateEffortScores = (runs: EnrichedRun[]): EffortScore[] => {
  const effortScores: EffortScore[] = [];
  
  // Calculate baseline metrics for normalization
  const paces = runs.map(run => run.moving_time / (run.distance / 1000));
  const elevations = runs.map(run => run.total_elevation_gain || 0);
  const avgPace = paces.reduce((sum, pace) => sum + pace, 0) / paces.length;
  const avgElevation = elevations.reduce((sum, elev) => sum + elev, 0) / elevations.length;

  runs.forEach(run => {
    const pace = run.moving_time / (run.distance / 1000);
    const elevation = run.total_elevation_gain || 0;
    
    // Calculate individual effort components (0-100 scale)
    const paceEffort = Math.max(0, Math.min(100, 100 - ((pace - avgPace) / avgPace) * 100));
    const elevationEffort = Math.max(0, Math.min(100, (elevation / Math.max(avgElevation, 50)) * 50));
    
    // Weather effort (if available)
    let weatherEffort = 50; // neutral default
    if (run.weather_data) {
      const temp = (run.weather_data as any)?.main?.temp;
      const humidity = (run.weather_data as any)?.main?.humidity;
      if (temp && humidity) {
        // Optimal conditions: 15-20°C, 40-60% humidity
        const tempEffort = Math.max(0, 100 - Math.abs(temp - 17.5) * 3);
        const humidityEffort = Math.max(0, 100 - Math.abs(humidity - 50) * 1.5);
        weatherEffort = (tempEffort + humidityEffort) / 2;
      }
    }
    
    // Heart rate effort (if available)
    let heartRateEffort: number | undefined;
    if (run.average_heartrate) {
      // Assume max HR of 190 for effort calculation
      heartRateEffort = Math.min(100, (run.average_heartrate / 190) * 100);
    }
    
    // Combined effort score (weighted average)
    const weights = {
      pace: 0.4,
      elevation: 0.3,
      weather: 0.2,
      heartRate: heartRateEffort ? 0.1 : 0
    };
    
    const totalWeight = weights.pace + weights.elevation + weights.weather + weights.heartRate;
    const effortScore = (
      paceEffort * weights.pace +
      elevationEffort * weights.elevation +
      weatherEffort * weights.weather +
      (heartRateEffort || 0) * weights.heartRate
    ) / totalWeight;

    effortScores.push({
      runId: run.id,
      date: run.start_date,
      effortScore: Math.round(effortScore),
      paceEffort: Math.round(paceEffort),
      elevationEffort: Math.round(elevationEffort),
      weatherEffort: Math.round(weatherEffort),
      heartRateEffort: heartRateEffort ? Math.round(heartRateEffort) : undefined,
      factors: {
        pace: Math.round(paceEffort),
        elevation: Math.round(elevationEffort),
        weather: Math.round(weatherEffort),
        heartRate: heartRateEffort ? Math.round(heartRateEffort) : undefined
      }
    });
  });

  return effortScores.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const analyzePerformanceVariability = (runs: EnrichedRun[]): PerformanceVariability => {
  const paces = runs.map(run => run.moving_time / (run.distance / 1000));
  const distances = runs.map(run => run.distance);
  
  // Calculate pace variability
  const paceMean = paces.reduce((sum, pace) => sum + pace, 0) / paces.length;
  const paceStdDev = Math.sqrt(
    paces.reduce((sum, pace) => sum + Math.pow(pace - paceMean, 2), 0) / paces.length
  );
  const paceCV = (paceStdDev / paceMean) * 100;
  
  // Calculate distance variability
  const distanceMean = distances.reduce((sum, dist) => sum + dist, 0) / distances.length;
  const distanceStdDev = Math.sqrt(
    distances.reduce((sum, dist) => sum + Math.pow(dist - distanceMean, 2), 0) / distances.length
  );
  const distanceCV = (distanceStdDev / distanceMean) * 100;
  
  // Determine trends (simplified - would need more sophisticated analysis)
  const recentPaces = paces.slice(0, Math.min(10, paces.length));
  const olderPaces = paces.slice(Math.min(10, paces.length));
  const recentAvg = recentPaces.reduce((sum, pace) => sum + pace, 0) / recentPaces.length;
  const olderAvg = olderPaces.length > 0 ? 
    olderPaces.reduce((sum, pace) => sum + pace, 0) / olderPaces.length : recentAvg;
  
  const paceImprovement = ((olderAvg - recentAvg) / olderAvg) * 100;
  const paceTrend = paceImprovement > 2 ? 'improving' : 
                   paceImprovement < -2 ? 'declining' : 'stable';

  return {
    paceVariability: {
      coefficient: paceCV,
      standardDeviation: paceStdDev,
      mean: paceMean,
      trend: paceTrend
    },
    distanceVariability: {
      coefficient: distanceCV,
      standardDeviation: distanceStdDev,
      mean: distanceMean,
      consistency: distanceCV < 20 ? 'high' : distanceCV < 40 ? 'medium' : 'low'
    },
    effortVariability: {
      coefficient: (paceCV + distanceCV) / 2,
      standardDeviation: (paceStdDev + distanceStdDev) / 2,
      mean: (paceMean + distanceMean) / 2,
      reliability: (paceCV + distanceCV) / 2 < 25 ? 'high' : 
                   (paceCV + distanceCV) / 2 < 50 ? 'medium' : 'low'
    }
  };
};

const calculateImprovementRates = (runs: EnrichedRun[]): ImprovementRate => {
  if (runs.length < 10) {
    return {
      paceImprovement: { rate: 0, trend: 'stable', confidence: 0, projection: 0 },
      distanceImprovement: { rate: 0, trend: 'stable', confidence: 0, projection: 0 },
      consistencyImprovement: { rate: 0, trend: 'stable', confidence: 0, projection: 0 }
    };
  }

  // Sort runs by date
  const sortedRuns = [...runs].sort((a, b) => 
    new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
  );

  // Calculate monthly improvements using linear regression
  const paceImprovement = calculateLinearTrend(
    sortedRuns.map(run => run.moving_time / (run.distance / 1000))
  );
  
  const distanceImprovement = calculateLinearTrend(
    sortedRuns.map(run => run.distance)
  );

  // Consistency improvement (simplified)
  const consistencyImprovement = {
    rate: 0.5, // placeholder
    trend: 'stable' as const,
    confidence: 0.6,
    projection: 75
  };

  return {
    paceImprovement,
    distanceImprovement,
    consistencyImprovement
  };
};

const calculateLinearTrend = (values: number[]) => {
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = values;
  
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumXX = x.reduce((sum, val) => sum + val * val, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Convert slope to monthly rate (assuming data spans multiple months)
  const monthlyRate = slope * 30; // approximate monthly change
  
  const trend = slope > 0.1 ? 'improving' : slope < -0.1 ? 'declining' : 'stable';
  const confidence = Math.min(1, Math.abs(slope) * 10); // simplified confidence
  const projection = intercept + slope * (n + 90); // 3 months ahead
  
  return {
    rate: monthlyRate,
    trend: trend as 'improving' | 'declining' | 'stable',
    confidence,
    projection
  };
};

const generatePerformancePredictions = (
  runs: EnrichedRun[], 
  improvementRates: ImprovementRate
): PerformancePrediction => {
  const recentPaces = runs.slice(0, 10).map(run => run.moving_time / (run.distance / 1000));
  const avgRecentPace = recentPaces.reduce((sum, pace) => sum + pace, 0) / recentPaces.length;
  
  return {
    nextRunPrediction: {
      predictedPace: avgRecentPace + (improvementRates.paceImprovement.rate / 30),
      confidence: improvementRates.paceImprovement.confidence,
      factors: ['Recent pace trend', 'Weather conditions', 'Training consistency']
    },
    goalAchievementProbability: {
      fiveK: { 
        time: avgRecentPace * 5, 
        probability: Math.min(0.9, improvementRates.paceImprovement.confidence) 
      },
      tenK: { 
        time: avgRecentPace * 10 * 1.05, // slight pace drop for longer distance
        probability: Math.min(0.8, improvementRates.paceImprovement.confidence * 0.9) 
      },
      halfMarathon: { 
        time: avgRecentPace * 21.1 * 1.15,
        probability: Math.min(0.7, improvementRates.paceImprovement.confidence * 0.8) 
      },
      marathon: { 
        time: avgRecentPace * 42.2 * 1.25,
        probability: Math.min(0.6, improvementRates.paceImprovement.confidence * 0.7) 
      }
    },
    trainingRecommendations: generateTrainingRecommendations(runs, improvementRates)
  };
};

const generateTrainingRecommendations = (
  runs: EnrichedRun[], 
  improvementRates: ImprovementRate
): string[] => {
  const recommendations: string[] = [];
  
  if (improvementRates.paceImprovement.trend === 'declining') {
    recommendations.push('Consider adding interval training to improve pace');
    recommendations.push('Focus on recovery runs to prevent overtraining');
  }
  
  if (improvementRates.distanceImprovement.trend === 'stable') {
    recommendations.push('Gradually increase weekly mileage by 10%');
    recommendations.push('Add one long run per week');
  }
  
  const recentRuns = runs.slice(0, 7);
  if (recentRuns.length < 3) {
    recommendations.push('Increase running frequency for better consistency');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Maintain current training approach - showing good progress');
  }
  
  return recommendations;
};

const generateAdvancedInsights = (
  effortScores: EffortScore[],
  variability: PerformanceVariability,
  improvements: ImprovementRate
): string[] => {
  const insights: string[] = [];
  
  if (effortScores.length > 0) {
    const avgEffort = effortScores.reduce((sum, score) => sum + score.effortScore, 0) / effortScores.length;
    insights.push(`Your average effort score is ${avgEffort.toFixed(0)}/100`);
    
    const highEffortRuns = effortScores.filter(score => score.effortScore > 80).length;
    if (highEffortRuns > effortScores.length * 0.3) {
      insights.push('You frequently run at high effort - consider adding more easy runs');
    }
  }
  
  if (variability.paceVariability.trend === 'improving') {
    insights.push(`Your pace is improving by ${Math.abs(improvements.paceImprovement.rate).toFixed(1)} seconds/km per month`);
  }
  
  if (variability.distanceVariability.consistency === 'high') {
    insights.push('You maintain consistent distances - good for building aerobic base');
  }
  
  return insights;
};

// Utility functions for formatting
export const formatPace = (paceSeconds: number): string => {
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.floor(paceSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
};

export const formatTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};