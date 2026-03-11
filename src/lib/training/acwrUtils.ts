// ACWR (Acute-to-Chronic Workload Ratio) Calculator
import { EnrichedRun, ACWRResult, MetricCalculationResult } from '../../types';

/**
 * Calculate ACWR using rolling average method
 * ACWR = Acute Load (7-day average) / Chronic Load (28-day average)
 * Note: This function requires database access and should be used in server-side contexts
 */
export const calculateACWR = async (
  userId: string,
  metric: 'distance' | 'trimp' = 'trimp'
): Promise<MetricCalculationResult<ACWRResult>> => {
  // This function will be implemented when database utilities are available
  // For now, redirect to the runs-based calculation
  throw new Error('Database-based ACWR calculation not yet implemented. Use calculateACWRFromRuns instead.');
};

/**
 * Calculate ACWR from raw run data (alternative method)
 */
export const calculateACWRFromRuns = (
  runs: EnrichedRun[],
  metric: 'distance' | 'trimp' = 'trimp'
): MetricCalculationResult<ACWRResult> => {
  if (runs.length === 0) {
    return {
      value: {
        acwr: 0,
        status: 'detraining',
        acuteLoad: 0,
        chronicLoad: 0,
        recommendation: 'No training data available',
        confidence: 0
      },
      confidence: 0,
      dataQuality: {
        heartRateDataAvailable: false,
        weatherDataAvailable: false,
        gpsDataQuality: 'low',
        elevationDataAvailable: false,
        calculationConfidence: 0,
        missingDataImpact: ['No training data'],
        qualityScore: 0
      },
      calculationMethod: 'ACWR calculation - no data'
    };
  }

  // Sort runs by date (most recent first)
  const sortedRuns = [...runs].sort((a, b) => {
    const dateA = a.start_date_local || a.start_date;
    const dateB = b.start_date_local || b.start_date;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  // Group runs by date and calculate daily totals
  const dailyTotals = groupRunsByDate(sortedRuns, metric);
  
  if (dailyTotals.length < 28) {
    return {
      value: {
        acwr: 0,
        status: 'detraining',
        acuteLoad: 0,
        chronicLoad: 0,
        recommendation: 'Need at least 28 days of training data for ACWR calculation',
        confidence: 0
      },
      confidence: 0,
      dataQuality: {
        heartRateDataAvailable: metric === 'trimp',
        weatherDataAvailable: true,
        gpsDataQuality: 'medium',
        elevationDataAvailable: true,
        calculationConfidence: 0,
        missingDataImpact: ['Insufficient training history'],
        qualityScore: 0
      },
      calculationMethod: 'ACWR calculation from runs - insufficient data'
    };
  }

  // Calculate acute load (last 7 days average)
  const acuteLoad = dailyTotals.slice(0, 7).reduce((sum, day) => sum + day.value, 0) / 7;
  
  // Calculate chronic load (last 28 days average)  
  const chronicLoad = dailyTotals.slice(0, 28).reduce((sum, day) => sum + day.value, 0) / 28;
  
  // Calculate ACWR
  const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;
  
  // Determine status and recommendations
  const { status, recommendation } = interpretACWR(acwr);
  
  // Calculate confidence
  const confidence = Math.min(1, dailyTotals.length / 42); // Full confidence with 42+ days
  
  return {
    value: {
      acwr: Math.round(acwr * 100) / 100,
      status,
      acuteLoad: Math.round(acuteLoad * 10) / 10,
      chronicLoad: Math.round(chronicLoad * 10) / 10,
      recommendation,
      confidence
    },
    confidence,
    dataQuality: {
      heartRateDataAvailable: metric === 'trimp',
      weatherDataAvailable: true,
      gpsDataQuality: 'high',
      elevationDataAvailable: true,
      calculationConfidence: confidence,
      missingDataImpact: confidence < 0.8 ? ['Limited training history'] : [],
      qualityScore: Math.round(confidence * 100)
    },
    calculationMethod: `ACWR calculation from runs using ${metric}`
  };
};

/**
 * Interpret ACWR value and provide status and recommendations
 */
const interpretACWR = (acwr: number): { 
  status: 'optimal' | 'caution' | 'high-risk' | 'detraining';
  recommendation: string;
} => {
  if (acwr < 0.8) {
    return {
      status: 'detraining',
      recommendation: 'Training load is low. Consider gradually increasing training volume to maintain fitness.'
    };
  } else if (acwr >= 0.8 && acwr <= 1.3) {
    return {
      status: 'optimal',
      recommendation: 'Training load is in the optimal zone for fitness gains with low injury risk. Maintain current approach.'
    };
  } else if (acwr > 1.3 && acwr <= 1.5) {
    return {
      status: 'caution',
      recommendation: 'Training load is elevated. Monitor for signs of fatigue and consider reducing intensity or volume.'
    };
  } else {
    return {
      status: 'high-risk',
      recommendation: 'Training load is very high. Reduce training volume immediately and focus on recovery to prevent injury.'
    };
  }
};

/**
 * Calculate confidence score for ACWR based on data completeness
 */
const calculateACWRConfidence = (
  trainingData: any[],
  metric: 'distance' | 'trimp'
): number => {
  if (trainingData.length < 28) return 0;
  
  // Check for data completeness in the last 28 days
  const last28Days = trainingData.slice(-28);
  const daysWithData = last28Days.filter(day => 
    metric === 'distance' ? day.total_distance > 0 : day.total_trimp > 0
  ).length;
  
  // Base confidence on data completeness
  let confidence = daysWithData / 28;
  
  // Bonus for having more than 28 days of data
  if (trainingData.length >= 42) {
    confidence = Math.min(1, confidence + 0.1);
  }
  
  // Penalty for very sparse data
  if (daysWithData < 14) {
    confidence *= 0.7;
  }
  
  return Math.round(confidence * 100) / 100;
};

/**
 * Group runs by date and calculate daily totals
 */
const groupRunsByDate = (
  runs: EnrichedRun[] | any[],
  metric: 'distance' | 'trimp'
): Array<{ date: string; value: number }> => {
  const dailyTotals = new Map<string, number>();
  
  runs.forEach(run => {
    // Handle both date formats
    const dateStr = run.start_date_local || run.start_date;
    if (!dateStr) return;
    
    const date = dateStr.split('T')[0]; // Get date part only
    const currentTotal = dailyTotals.get(date) || 0;
    
    let value: number;
    if (metric === 'distance') {
      value = run.distance || 0;
    } else {
      // Check multiple possible locations for TRIMP score
      value = run.trimpScore || // From processed runs
              run.advanced_metrics?.trimp || 
              run.advanced_metrics?.estimatedTRIMP || 
              0;
    }
    
    if (value > 0) {
      dailyTotals.set(date, currentTotal + value);
    }
  });
  
  // Convert to array and sort by date (most recent first)
  return Array.from(dailyTotals.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => b.date.localeCompare(a.date));
};

/**
 * Get ACWR status color for UI display
 */
export const getACWRStatusColor = (status: ACWRResult['status']): string => {
  switch (status) {
    case 'optimal':
      return '#22c55e'; // green
    case 'caution':
      return '#eab308'; // yellow
    case 'high-risk':
      return '#ef4444'; // red
    case 'detraining':
      return '#3b82f6'; // blue
    default:
      return '#6b7280'; // gray
  }
};

/**
 * Get ACWR trend analysis from runs data
 */
export const analyzeACWRTrendFromRuns = (
  runs: EnrichedRun[],
  metric: 'distance' | 'trimp' = 'trimp',
  days: number = 14
): {
  trend: 'increasing' | 'stable' | 'decreasing';
  values: Array<{ date: string; acwr: number }>;
  recommendation: string;
} => {
  if (runs.length < 28) {
    return {
      trend: 'stable',
      values: [],
      recommendation: 'Need more training data for trend analysis'
    };
  }
  
  // Sort runs by date
  const sortedRuns = [...runs].sort((a, b) => 
    new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime()
  );
  
  // Group by date and calculate daily totals
  const dailyTotals = groupRunsByDate(sortedRuns, metric);
  
  if (dailyTotals.length < 28) {
    return {
      trend: 'stable',
      values: [],
      recommendation: 'Need at least 28 days of data for trend analysis'
    };
  }
  
  // Calculate ACWR for each day in the specified period
  const acwrValues: Array<{ date: string; acwr: number }> = [];
  const analysisWindow = Math.min(days, dailyTotals.length - 28);
  
  for (let i = 0; i <= analysisWindow; i++) {
    // Calculate 7-day and 28-day averages for this point in time
    const acuteData = dailyTotals.slice(i, i + 7);
    const chronicData = dailyTotals.slice(i, i + 28);
    
    const acuteLoad = acuteData.reduce((sum, day) => sum + day.value, 0) / 7;
    const chronicLoad = chronicData.reduce((sum, day) => sum + day.value, 0) / 28;
    
    const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;
    
    acwrValues.push({
      date: dailyTotals[i].date,
      acwr: Math.round(acwr * 100) / 100
    });
  }
  
  // Analyze trend
  if (acwrValues.length < 3) {
    return {
      trend: 'stable',
      values: acwrValues,
      recommendation: 'Need more data points for trend analysis'
    };
  }
  
  const firstThird = acwrValues.slice(0, Math.floor(acwrValues.length / 3));
  const lastThird = acwrValues.slice(-Math.floor(acwrValues.length / 3));
  
  const firstAvg = firstThird.reduce((sum, v) => sum + v.acwr, 0) / firstThird.length;
  const lastAvg = lastThird.reduce((sum, v) => sum + v.acwr, 0) / lastThird.length;
  
  const change = (lastAvg - firstAvg) / firstAvg;
  
  let trend: 'increasing' | 'stable' | 'decreasing';
  let recommendation: string;
  
  if (change > 0.1) {
    trend = 'increasing';
    recommendation = 'ACWR is trending upward. Monitor closely and consider moderating training increases.';
  } else if (change < -0.1) {
    trend = 'decreasing';
    recommendation = 'ACWR is trending downward. You may be able to gradually increase training load.';
  } else {
    trend = 'stable';
    recommendation = 'ACWR is stable. Continue current training approach.';
  }
  
  return {
    trend,
    values: acwrValues,
    recommendation
  };
};

/**
 * Calculate both distance and TRIMP ACWR for comprehensive analysis from runs
 */
export const calculateComprehensiveACWRFromRuns = (runs: EnrichedRun[]): {
  distance: ACWRResult;
  trimp: ACWRResult;
  recommendation: string;
  overallStatus: 'optimal' | 'caution' | 'high-risk' | 'detraining';
} => {
  const distanceResult = calculateACWRFromRuns(runs, 'distance');
  const trimpResult = calculateACWRFromRuns(runs, 'trimp');
  
  const distanceACWR = distanceResult.value;
  const trimpACWR = trimpResult.value;
  
  // Determine overall status (use the more conservative/cautious one)
  const statusPriority = { 'optimal': 1, 'caution': 2, 'high-risk': 3, 'detraining': 0 };
  const overallStatus = statusPriority[distanceACWR.status] > statusPriority[trimpACWR.status] 
    ? distanceACWR.status 
    : trimpACWR.status;
  
  // Generate comprehensive recommendation
  let recommendation: string;
  if (distanceACWR.status === trimpACWR.status) {
    recommendation = distanceACWR.recommendation;
  } else {
    recommendation = `Mixed signals: Distance ACWR suggests ${distanceACWR.status} (${distanceACWR.acwr}), while intensity ACWR suggests ${trimpACWR.status} (${trimpACWR.acwr}). Focus on the more conservative approach.`;
  }
  
  return {
    distance: distanceACWR,
    trimp: trimpACWR,
    recommendation,
    overallStatus
  };
};