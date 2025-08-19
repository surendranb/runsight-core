// Fitness & Fatigue Model (CTL/ATL/TSB) Implementation
import { EnrichedRun, MetricCalculationResult } from '../../types';

export interface FitnessMetrics {
  ctl: number; // Chronic Training Load (42-day EWMA)
  atl: number; // Acute Training Load (7-day EWMA)
  tsb: number; // Training Stress Balance (CTL - ATL)
  status: 'fresh' | 'neutral' | 'fatigued' | 'very-fatigued';
  recommendation: string;
  confidence: number;
}

export interface DailyTRIMPData {
  date: string;
  trimp: number;
}

/**
 * Calculate Exponentially Weighted Moving Average (EWMA)
 * Used for CTL (42-day) and ATL (7-day) calculations
 */
const calculateEWMA = (values: number[], timeConstant: number): number => {
  if (values.length === 0) return 0;
  
  // Calculate alpha (smoothing factor)
  const alpha = 2 / (timeConstant + 1);
  
  // Start with first value
  let ewma = values[0];
  
  // Apply EWMA formula for remaining values
  for (let i = 1; i < values.length; i++) {
    ewma = alpha * values[i] + (1 - alpha) * ewma;
  }
  
  return ewma;
};

/**
 * Calculate CTL/ATL/TSB from daily TRIMP data
 */
export const calculateFitnessMetrics = (
  dailyTRIMPData: DailyTRIMPData[]
): MetricCalculationResult<FitnessMetrics> => {
  if (dailyTRIMPData.length < 7) {
    return {
      value: {
        ctl: 0,
        atl: 0,
        tsb: 0,
        status: 'neutral',
        recommendation: 'Need at least 7 days of training data for fitness analysis',
        confidence: 0
      },
      confidence: 0,
      dataQuality: {
        heartRateDataAvailable: false,
        weatherDataAvailable: false,
        gpsDataQuality: 'low',
        elevationDataAvailable: false,
        calculationConfidence: 0,
        missingDataImpact: ['Insufficient training history'],
        qualityScore: 0
      },
      calculationMethod: 'Fitness metrics - insufficient data'
    };
  }

  // Sort by date to ensure chronological order
  const sortedData = [...dailyTRIMPData].sort((a, b) => a.date.localeCompare(b.date));
  const trimpValues = sortedData.map(d => d.trimp);

  // Calculate CTL (Chronic Training Load) - 42-day EWMA
  const ctl = calculateEWMA(trimpValues, 42);

  // Calculate ATL (Acute Training Load) - 7-day EWMA
  // For ATL, we typically use the last 7 days more heavily weighted
  const recentTRIMP = trimpValues.slice(-7);
  const atl = calculateEWMA(recentTRIMP.length > 0 ? recentTRIMP : trimpValues, 7);

  // Calculate TSB (Training Stress Balance)
  const tsb = ctl - atl;

  // Determine status based on TSB
  const { status, recommendation } = interpretTSB(tsb, ctl, atl);

  // Calculate confidence based on data completeness
  const confidence = Math.min(1, dailyTRIMPData.length / 42);

  return {
    value: {
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round(tsb * 10) / 10,
      status,
      recommendation,
      confidence
    },
    confidence,
    dataQuality: {
      heartRateDataAvailable: true, // Assume TRIMP data implies HR availability
      weatherDataAvailable: true,
      gpsDataQuality: 'high',
      elevationDataAvailable: true,
      calculationConfidence: confidence,
      missingDataImpact: confidence < 0.8 ? ['Limited training history for optimal accuracy'] : [],
      qualityScore: Math.round(confidence * 100)
    },
    calculationMethod: 'CTL/ATL/TSB using exponentially weighted moving averages'
  };
};

/**
 * Interpret TSB value and provide recommendations
 */
const interpretTSB = (tsb: number, ctl: number, atl: number): {
  status: 'fresh' | 'neutral' | 'fatigued' | 'very-fatigued';
  recommendation: string;
} => {
  // Handle edge case where both CTL and ATL are 0 (no training data)
  if (ctl === 0 && atl === 0) {
    return {
      status: 'neutral',
      recommendation: 'No training load detected. Start with easy runs to build your fitness base.'
    };
  }

  if (tsb > 25) {
    return {
      status: 'fresh',
      recommendation: 'You are very fresh and ready for high-intensity training or racing. Consider scheduling key workouts or competitions.'
    };
  } else if (tsb >= -5) { // Adjusted threshold to be more inclusive of neutral zone
    return {
      status: 'neutral',
      recommendation: 'Good balance between fitness and fatigue. You can handle moderate to high training loads.'
    };
  } else if (tsb > -30) {
    return {
      status: 'fatigued',
      recommendation: 'You are carrying some fatigue. Focus on easier training and ensure adequate recovery between sessions.'
    };
  } else {
    return {
      status: 'very-fatigued',
      recommendation: 'High fatigue levels detected. Prioritize recovery with easy runs, rest days, and good sleep. Avoid high-intensity training.'
    };
  }
};

/**
 * Calculate fitness metrics from runs data
 */
export const calculateFitnessMetricsFromRuns = (
  runs: EnrichedRun[] | any[]
): MetricCalculationResult<FitnessMetrics> => {
  // Group runs by date and sum TRIMP scores
  const dailyTRIMP = new Map<string, number>();

  runs.forEach(run => {
    // Handle both date formats
    const dateStr = run.start_date_local || run.start_date;
    if (!dateStr) return;
    
    const date = dateStr.split('T')[0]; // Get date part only
    
    // Check multiple possible locations for TRIMP score
    const trimp = run.trimpScore || // From processed runs
                  run.advanced_metrics?.trimp || 
                  run.advanced_metrics?.estimatedTRIMP || 
                  0;
    
    if (trimp > 0) {
      dailyTRIMP.set(date, (dailyTRIMP.get(date) || 0) + trimp);
    }
  });

  // Convert to array format
  const dailyTRIMPData: DailyTRIMPData[] = Array.from(dailyTRIMP.entries())
    .map(([date, trimp]) => ({ date, trimp }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return calculateFitnessMetrics(dailyTRIMPData);
};

/**
 * Get fitness trend over time
 */
export const getFitnessTrend = (
  dailyTRIMPData: DailyTRIMPData[],
  days: number = 30
): Array<{
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
}> => {
  if (dailyTRIMPData.length < 7) return [];

  const sortedData = [...dailyTRIMPData].sort((a, b) => a.date.localeCompare(b.date));
  const trend: Array<{ date: string; ctl: number; atl: number; tsb: number }> = [];

  // Calculate CTL/ATL/TSB for each day in the specified period
  const endIndex = sortedData.length;
  const startIndex = Math.max(0, endIndex - days);

  for (let i = startIndex; i < endIndex; i++) {
    // Get data up to current day for progressive calculation
    const dataUpToDay = sortedData.slice(0, i + 1);
    const trimpValues = dataUpToDay.map(d => d.trimp);

    const ctl = calculateEWMA(trimpValues, 42);
    const atl = calculateEWMA(trimpValues.slice(-7), 7);
    const tsb = ctl - atl;

    trend.push({
      date: sortedData[i].date,
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round(tsb * 10) / 10
    });
  }

  return trend;
};

/**
 * Predict optimal training windows based on current fitness state
 */
export const predictOptimalTrainingWindows = (
  currentMetrics: FitnessMetrics,
  dailyTRIMPData: DailyTRIMPData[]
): {
  nextOptimalWindow: { date: string; confidence: number } | null;
  peakReadiness: { date: string; confidence: number } | null;
  recoveryNeeded: number; // days
} => {
  const { ctl, atl, tsb } = currentMetrics;

  // Estimate recovery time based on current TSB
  let recoveryNeeded = 0;
  if (tsb < -30) {
    recoveryNeeded = 7; // Very fatigued
  } else if (tsb < -10) {
    recoveryNeeded = 3; // Moderately fatigued
  } else if (tsb < 5) {
    recoveryNeeded = 1; // Slightly fatigued
  }

  // Predict when TSB will be optimal (5-25 range)
  const today = new Date();
  let nextOptimalWindow: { date: string; confidence: number } | null = null;
  let peakReadiness: { date: string; confidence: number } | null = null;

  if (recoveryNeeded > 0) {
    const optimalDate = new Date(today);
    optimalDate.setDate(today.getDate() + recoveryNeeded);
    
    nextOptimalWindow = {
      date: optimalDate.toISOString().split('T')[0],
      confidence: Math.min(0.8, currentMetrics.confidence)
    };

    // Peak readiness typically 2-3 days after optimal window
    const peakDate = new Date(optimalDate);
    peakDate.setDate(optimalDate.getDate() + 2);
    
    peakReadiness = {
      date: peakDate.toISOString().split('T')[0],
      confidence: Math.min(0.7, currentMetrics.confidence)
    };
  } else if (tsb > 25) {
    // Already at peak, readiness is now
    peakReadiness = {
      date: today.toISOString().split('T')[0],
      confidence: 0.9
    };
  }

  return {
    nextOptimalWindow,
    peakReadiness,
    recoveryNeeded
  };
};

/**
 * Get fitness status color for UI display
 */
export const getFitnessStatusColor = (status: FitnessMetrics['status']): string => {
  switch (status) {
    case 'fresh':
      return '#22c55e'; // green
    case 'neutral':
      return '#3b82f6'; // blue
    case 'fatigued':
      return '#eab308'; // yellow
    case 'very-fatigued':
      return '#ef4444'; // red
    default:
      return '#6b7280'; // gray
  }
};

/**
 * Format fitness metrics for display
 */
export const formatFitnessMetrics = (metrics: FitnessMetrics): {
  ctlDisplay: string;
  atlDisplay: string;
  tsbDisplay: string;
  statusDisplay: string;
} => {
  return {
    ctlDisplay: metrics.ctl.toFixed(1),
    atlDisplay: metrics.atl.toFixed(1),
    tsbDisplay: metrics.tsb > 0 ? `+${metrics.tsb.toFixed(1)}` : metrics.tsb.toFixed(1),
    statusDisplay: metrics.status.charAt(0).toUpperCase() + metrics.status.slice(1).replace('-', ' ')
  };
};