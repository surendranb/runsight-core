// VO2 Max Estimation and Fitness Tracking
import { EnrichedRun, UserPhysiologyData, MetricCalculationResult } from '../../types';

export interface VO2MaxEstimate {
  vo2Max: number;
  confidence: number;
  method: string;
  fitnessLevel: 'poor' | 'fair' | 'good' | 'very-good' | 'excellent' | 'superior';
  ageGradePercentage?: number;
}

export interface VO2MaxTrend {
  trend: 'improving' | 'stable' | 'declining';
  changeRate: number; // ml/kg/min per month
  confidence: number;
  dataPoints: Array<{
    date: string;
    vo2Max: number;
    confidence: number;
  }>;
}

/**
 * Detect steady-state portions of a run to filter out warm-up/cool-down periods
 * Requirements: 9.2 - Use steady-state portions excluding warm-up/cool-down and high variability
 */
export const detectSteadyStatePortions = (run: EnrichedRun): {
  isSteadyState: boolean;
  steadyStateConfidence: number;
  variabilityScore: number;
  reasons: string[];
} => {
  const reasons: string[] = [];
  let steadyStateConfidence = 0.5; // Base confidence
  
  // Check run duration - longer runs more likely to have steady state
  const durationMinutes = run.moving_time / 60;
  if (durationMinutes < 10) {
    reasons.push('Run too short for reliable steady-state detection');
    steadyStateConfidence -= 0.3;
  } else if (durationMinutes >= 20) {
    steadyStateConfidence += 0.2;
  }
  
  // Check for heart rate variability if available
  let variabilityScore = 0.5; // Default moderate variability
  if (run.average_heartrate && run.max_heartrate) {
    const hrRange = run.max_heartrate - run.average_heartrate;
    const expectedRange = run.average_heartrate * 0.15; // Expected ~15% variation
    
    if (hrRange < expectedRange * 0.5) {
      // Very low variability - likely steady state
      variabilityScore = 0.2;
      steadyStateConfidence += 0.2;
      reasons.push('Low heart rate variability indicates steady effort');
    } else if (hrRange > expectedRange * 2) {
      // High variability - likely intervals or varied effort
      variabilityScore = 0.8;
      steadyStateConfidence -= 0.3;
      reasons.push('High heart rate variability suggests varied effort');
    } else {
      variabilityScore = 0.5;
      reasons.push('Moderate heart rate variability');
    }
  }
  
  // Check pace consistency (if we had detailed pace data, we'd analyze splits)
  // For now, use distance vs time consistency
  const avgSpeed = run.distance / run.moving_time;
  if (run.average_speed && Math.abs(run.average_speed - avgSpeed) / avgSpeed < 0.05) {
    steadyStateConfidence += 0.1;
    reasons.push('Consistent pacing throughout run');
  }
  
  // Elevation changes affect steady state
  if (run.total_elevation_gain) {
    const elevationPerKm = run.total_elevation_gain / (run.distance / 1000);
    if (elevationPerKm > 50) {
      steadyStateConfidence -= 0.2;
      reasons.push('Significant elevation changes reduce steady-state reliability');
    } else if (elevationPerKm < 20) {
      steadyStateConfidence += 0.1;
      reasons.push('Minimal elevation changes support steady-state effort');
    }
  }
  
  // Clamp confidence between 0 and 1
  steadyStateConfidence = Math.max(0, Math.min(1, steadyStateConfidence));
  
  return {
    isSteadyState: steadyStateConfidence > 0.6,
    steadyStateConfidence,
    variabilityScore,
    reasons
  };
};

/**
 * Flag potentially inaccurate VO2 max readings based on data quality
 * Requirements: 9.4 - Flag potentially inaccurate readings and suggest data quality checks
 */
export const flagInaccurateVO2MaxReadings = (
  vo2MaxEstimate: number,
  run: EnrichedRun,
  userPhysiology: UserPhysiologyData,
  steadyStateAnalysis: ReturnType<typeof detectSteadyStatePortions>
): {
  isAccurate: boolean;
  confidence: number;
  flags: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    impact: 'low' | 'medium' | 'high';
  }>;
  suggestions: string[];
} => {
  const flags: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    impact: 'low' | 'medium' | 'high';
  }> = [];
  const suggestions: string[] = [];
  let confidence = 0.8; // Base confidence
  
  // Check for extreme VO2 max values
  if (vo2MaxEstimate > 80) {
    flags.push({
      type: 'warning',
      message: 'VO2 max estimate is extremely high (>80 ml/kg/min)',
      impact: 'high'
    });
    suggestions.push('Verify heart rate data accuracy and consider lab testing for confirmation');
    confidence -= 0.3;
  } else if (vo2MaxEstimate < 25) {
    flags.push({
      type: 'warning',
      message: 'VO2 max estimate is very low (<25 ml/kg/min)',
      impact: 'medium'
    });
    suggestions.push('Check if this represents your true fitness level or if data quality is poor');
    confidence -= 0.2;
  }
  
  // Check steady-state quality
  if (!steadyStateAnalysis.isSteadyState) {
    flags.push({
      type: 'warning',
      message: 'Run does not appear to be steady-state effort',
      impact: 'high'
    });
    suggestions.push('VO2 max estimates are most accurate from steady-state runs of 20+ minutes');
    confidence -= 0.4;
  }
  
  // Check heart rate data quality
  if (!run.average_heartrate || !userPhysiology.restingHeartRate || !userPhysiology.maxHeartRate) {
    flags.push({
      type: 'info',
      message: 'Missing heart rate data - using pace-based estimation',
      impact: 'medium'
    });
    suggestions.push('Provide resting and max heart rate for more accurate VO2 max estimates');
    confidence -= 0.2;
  } else {
    // Check for physiologically reasonable heart rate values
    const hrReserve = userPhysiology.maxHeartRate - userPhysiology.restingHeartRate;
    if (hrReserve < 100 || hrReserve > 200) {
      flags.push({
        type: 'warning',
        message: 'Heart rate reserve seems unusual - check max/resting HR values',
        impact: 'medium'
      });
      suggestions.push('Update your resting and maximum heart rate values in your profile');
      confidence -= 0.2;
    }
    
    // Check if average HR is reasonable for the effort
    const hrIntensity = (run.average_heartrate - userPhysiology.restingHeartRate) / hrReserve;
    if (hrIntensity < 0.3) {
      flags.push({
        type: 'info',
        message: 'Heart rate suggests very easy effort - may underestimate VO2 max',
        impact: 'low'
      });
    } else if (hrIntensity > 0.9) {
      flags.push({
        type: 'warning',
        message: 'Heart rate suggests maximum effort - may overestimate VO2 max',
        impact: 'medium'
      });
      confidence -= 0.1;
    }
  }
  
  // Check run duration
  const durationMinutes = run.moving_time / 60;
  if (durationMinutes < 10) {
    flags.push({
      type: 'warning',
      message: 'Run duration too short for reliable VO2 max estimation',
      impact: 'high'
    });
    suggestions.push('VO2 max estimates are most reliable from runs of 20+ minutes');
    confidence -= 0.3;
  }
  
  // Check for environmental factors that might affect accuracy
  if (run.weather_data) {
    const temp = run.weather_data.temperature;
    if (temp > 25 || temp < 5) {
      flags.push({
        type: 'info',
        message: 'Extreme temperature may affect VO2 max estimation accuracy',
        impact: 'low'
      });
      suggestions.push('Consider environmental impact on performance when interpreting VO2 max');
    }
  }
  
  // Check elevation impact
  if (run.total_elevation_gain) {
    const elevationPerKm = run.total_elevation_gain / (run.distance / 1000);
    if (elevationPerKm > 50) {
      flags.push({
        type: 'info',
        message: 'Significant elevation gain may affect VO2 max estimation',
        impact: 'medium'
      });
      suggestions.push('Hilly runs may overestimate VO2 max due to increased effort');
      confidence -= 0.1;
    }
  }
  
  confidence = Math.max(0.1, Math.min(1, confidence));
  
  return {
    isAccurate: confidence > 0.6 && flags.filter(f => f.type === 'error').length === 0,
    confidence,
    flags,
    suggestions
  };
};

/**
 * Calculate 30-day rolling average VO2 max trend
 * Requirements: 9.3 - Show rolling 30-day averages to smooth out daily variations
 */
export const calculate30DayRollingVO2Max = (
  runs: EnrichedRun[],
  userPhysiology: UserPhysiologyData
): Array<{
  date: string;
  rollingAverage: number;
  dataPoints: number;
  confidence: number;
  trend: 'improving' | 'stable' | 'declining';
}> => {
  if (runs.length === 0) return [];
  
  // Sort runs by date
  const sortedRuns = [...runs].sort((a, b) => 
    new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
  );
  
  const rollingAverages: Array<{
    date: string;
    rollingAverage: number;
    dataPoints: number;
    confidence: number;
    trend: 'improving' | 'stable' | 'declining';
  }> = [];
  
  // Calculate rolling average for each run
  for (let i = 0; i < sortedRuns.length; i++) {
    const currentRun = sortedRuns[i];
    const currentDate = new Date(currentRun.start_date_local);
    
    // Find runs within 30 days before current run
    const thirtyDaysAgo = new Date(currentDate);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentRuns = sortedRuns.slice(0, i + 1).filter(run => 
      new Date(run.start_date_local) >= thirtyDaysAgo
    );
    
    if (recentRuns.length < 2) continue; // Need at least 2 runs for meaningful average
    
    // Calculate VO2 max for each recent run and filter valid estimates
    const vo2MaxEstimates = recentRuns
      .map(run => {
        const steadyState = detectSteadyStatePortions(run);
        const estimate = calculateVO2Max(run, userPhysiology);
        const qualityCheck = flagInaccurateVO2MaxReadings(
          estimate.value.vo2Max, 
          run, 
          userPhysiology, 
          steadyState
        );
        
        return {
          vo2Max: estimate.value.vo2Max,
          confidence: estimate.confidence * qualityCheck.confidence,
          date: run.start_date_local,
          isValid: estimate.value.vo2Max > 0 && qualityCheck.isAccurate
        };
      })
      .filter(est => est.isValid && est.vo2Max > 0);
    
    if (vo2MaxEstimates.length === 0) continue;
    
    // Calculate weighted average (more recent estimates weighted higher)
    let totalWeight = 0;
    let weightedSum = 0;
    
    vo2MaxEstimates.forEach((est, index) => {
      // Weight decreases with age of estimate (more recent = higher weight)
      const weight = est.confidence * (1 + index * 0.1); // Recent runs get slight boost
      weightedSum += est.vo2Max * weight;
      totalWeight += weight;
    });
    
    const rollingAverage = weightedSum / totalWeight;
    const avgConfidence = vo2MaxEstimates.reduce((sum, est) => sum + est.confidence, 0) / vo2MaxEstimates.length;
    
    // Determine trend by comparing with previous rolling average
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (rollingAverages.length > 0) {
      const previousAverage = rollingAverages[rollingAverages.length - 1].rollingAverage;
      const change = rollingAverage - previousAverage;
      const changeThreshold = 0.5; // ml/kg/min
      
      if (change > changeThreshold) {
        trend = 'improving';
      } else if (change < -changeThreshold) {
        trend = 'declining';
      }
    }
    
    rollingAverages.push({
      date: currentRun.start_date_local.split('T')[0],
      rollingAverage: Math.round(rollingAverage * 10) / 10,
      dataPoints: vo2MaxEstimates.length,
      confidence: Math.round(avgConfidence * 100) / 100,
      trend
    });
  }
  
  return rollingAverages;
};

/**
 * Estimate VO2 Max using Jack Daniels formula
 * VO2 Max = 15.3 × (MHR/RHR)
 * Alternative: VO2 Max = -4.6 + 0.182258 × (HRmax/HRrest) + 0.000104 × (HRmax/HRrest)²
 */
export const estimateVO2MaxFromHeartRate = (
  run: EnrichedRun,
  userPhysiology: UserPhysiologyData
): MetricCalculationResult<VO2MaxEstimate> => {
  const { average_heartrate, max_heartrate } = run;
  const { restingHeartRate, maxHeartRate } = userPhysiology;

  // Check if we have sufficient heart rate data
  if (!average_heartrate || !restingHeartRate || !maxHeartRate) {
    return {
      value: {
        vo2Max: 0,
        confidence: 0,
        method: 'Insufficient heart rate data',
        fitnessLevel: 'poor'
      },
      confidence: 0,
      dataQuality: {
        heartRateDataAvailable: false,
        weatherDataAvailable: !!run.weather_data,
        gpsDataQuality: 'low',
        elevationDataAvailable: !!run.total_elevation_gain,
        calculationConfidence: 0,
        missingDataImpact: ['Heart rate data required for VO2 max estimation'],
        qualityScore: 0
      },
      calculationMethod: 'VO2 max estimation - insufficient data'
    };
  }

  // Validate heart rate values
  if (average_heartrate < restingHeartRate || average_heartrate > maxHeartRate) {
    return estimateVO2MaxFromPace(run);
  }

  // Analyze steady-state quality (Requirement 9.2)
  const steadyStateAnalysis = detectSteadyStatePortions(run);

  // Use Jack Daniels simplified formula
  const hrRatio = maxHeartRate / restingHeartRate;
  const vo2Max = 15.3 * hrRatio;

  // Adjust based on actual effort during the run
  const effortRatio = (average_heartrate - restingHeartRate) / (maxHeartRate - restingHeartRate);
  const adjustedVO2Max = vo2Max * (0.7 + 0.3 * effortRatio); // Scale based on effort

  // Apply steady-state adjustment
  const steadyStateAdjustment = steadyStateAnalysis.isSteadyState ? 1.0 : 0.9;
  const finalVO2Max = adjustedVO2Max * steadyStateAdjustment;

  const fitnessLevel = categorizeVO2Max(finalVO2Max);
  const baseConfidence = calculateVO2MaxConfidence(run, userPhysiology, 'heart-rate');
  
  // Adjust confidence based on steady-state quality
  const adjustedConfidence = baseConfidence * steadyStateAnalysis.steadyStateConfidence;

  // Flag potentially inaccurate readings (Requirement 9.4)
  const qualityCheck = flagInaccurateVO2MaxReadings(
    finalVO2Max, 
    run, 
    userPhysiology, 
    steadyStateAnalysis
  );

  const missingDataImpact: string[] = [];
  if (!steadyStateAnalysis.isSteadyState) {
    missingDataImpact.push('Non-steady-state effort reduces VO2 max accuracy');
  }
  qualityCheck.flags.forEach(flag => {
    if (flag.impact === 'high' || flag.impact === 'medium') {
      missingDataImpact.push(flag.message);
    }
  });

  return {
    value: {
      vo2Max: Math.round(finalVO2Max * 10) / 10,
      confidence: adjustedConfidence,
      method: 'Jack Daniels heart rate formula (steady-state adjusted)',
      fitnessLevel
    },
    confidence: qualityCheck.confidence,
    dataQuality: {
      heartRateDataAvailable: true,
      weatherDataAvailable: !!run.weather_data,
      gpsDataQuality: run.distance > 0 ? 'high' : 'low',
      elevationDataAvailable: !!run.total_elevation_gain,
      calculationConfidence: qualityCheck.confidence,
      missingDataImpact,
      qualityScore: Math.round(qualityCheck.confidence * 100)
    },
    calculationMethod: 'VO2 max from heart rate using Jack Daniels formula with steady-state analysis',
    warnings: qualityCheck.suggestions
  };
};

/**
 * Estimate VO2 Max from pace using running performance
 * Based on Jack Daniels VDOT tables and race performance predictions
 */
export const estimateVO2MaxFromPace = (run: EnrichedRun): MetricCalculationResult<VO2MaxEstimate> => {
  if (!run.distance || !run.moving_time || run.distance < 1000) {
    return {
      value: {
        vo2Max: 0,
        confidence: 0,
        method: 'Insufficient pace data',
        fitnessLevel: 'poor'
      },
      confidence: 0,
      dataQuality: {
        heartRateDataAvailable: false,
        weatherDataAvailable: !!run.weather_data,
        gpsDataQuality: 'low',
        elevationDataAvailable: !!run.total_elevation_gain,
        calculationConfidence: 0,
        missingDataImpact: ['Valid pace data required'],
        qualityScore: 0
      },
      calculationMethod: 'VO2 max estimation - insufficient pace data'
    };
  }

  // Analyze steady-state quality (Requirement 9.2)
  const steadyStateAnalysis = detectSteadyStatePortions(run);

  const paceSecondsPerKm = run.moving_time / (run.distance / 1000);
  const paceMinutesPerKm = paceSecondsPerKm / 60;

  // Estimate VO2 max based on pace using simplified Jack Daniels approach
  // This is a rough approximation - actual VDOT tables are more complex
  let vo2Max: number;

  if (paceMinutesPerKm < 3.0) {
    vo2Max = 70; // Elite level
  } else if (paceMinutesPerKm < 3.5) {
    vo2Max = 65; // Very high
  } else if (paceMinutesPerKm < 4.0) {
    vo2Max = 60; // High
  } else if (paceMinutesPerKm < 4.5) {
    vo2Max = 55; // Good
  } else if (paceMinutesPerKm < 5.0) {
    vo2Max = 50; // Moderate
  } else if (paceMinutesPerKm < 5.5) {
    vo2Max = 45; // Fair
  } else if (paceMinutesPerKm < 6.0) {
    vo2Max = 40; // Below average
  } else if (paceMinutesPerKm < 7.0) {
    vo2Max = 35; // Low
  } else {
    vo2Max = 30; // Very low
  }

  // Adjust for distance - longer distances typically indicate better aerobic fitness
  const distanceKm = run.distance / 1000;
  if (distanceKm > 15) {
    vo2Max += 3; // Bonus for long runs
  } else if (distanceKm > 10) {
    vo2Max += 2;
  } else if (distanceKm > 5) {
    vo2Max += 1;
  } else if (distanceKm < 2) {
    vo2Max -= 2; // Penalty for very short runs
  }

  // Apply steady-state adjustment
  const steadyStateAdjustment = steadyStateAnalysis.isSteadyState ? 1.0 : 0.85;
  const finalVO2Max = vo2Max * steadyStateAdjustment;

  const fitnessLevel = categorizeVO2Max(finalVO2Max);
  const baseConfidence = calculateVO2MaxConfidence(run, {}, 'pace');
  
  // Adjust confidence based on steady-state quality
  const adjustedConfidence = baseConfidence * steadyStateAnalysis.steadyStateConfidence;

  // Flag potentially inaccurate readings (Requirement 9.4)
  const qualityCheck = flagInaccurateVO2MaxReadings(
    finalVO2Max, 
    run, 
    {}, // No physiology data for pace-based
    steadyStateAnalysis
  );

  const missingDataImpact = ['Heart rate data would improve accuracy'];
  if (!steadyStateAnalysis.isSteadyState) {
    missingDataImpact.push('Non-steady-state effort reduces VO2 max accuracy');
  }
  qualityCheck.flags.forEach(flag => {
    if (flag.impact === 'high' || flag.impact === 'medium') {
      missingDataImpact.push(flag.message);
    }
  });

  return {
    value: {
      vo2Max: Math.round(finalVO2Max * 10) / 10,
      confidence: adjustedConfidence,
      method: 'Pace-based estimation (steady-state adjusted)',
      fitnessLevel
    },
    confidence: qualityCheck.confidence,
    dataQuality: {
      heartRateDataAvailable: false,
      weatherDataAvailable: !!run.weather_data,
      gpsDataQuality: 'high',
      elevationDataAvailable: !!run.total_elevation_gain,
      calculationConfidence: qualityCheck.confidence,
      missingDataImpact,
      qualityScore: Math.round(qualityCheck.confidence * 100)
    },
    calculationMethod: 'VO2 max from pace using performance tables with steady-state analysis',
    warnings: qualityCheck.suggestions
  };
};

/**
 * Calculate best VO2 max estimate using available data
 */
export const calculateVO2Max = (
  run: EnrichedRun,
  userPhysiology: UserPhysiologyData
): MetricCalculationResult<VO2MaxEstimate> => {
  // Prefer heart rate method if available
  if (run.average_heartrate && userPhysiology.restingHeartRate && userPhysiology.maxHeartRate) {
    return estimateVO2MaxFromHeartRate(run, userPhysiology);
  }
  
  // Fall back to pace method
  return estimateVO2MaxFromPace(run);
};

/**
 * Categorize VO2 max into fitness levels
 */
const categorizeVO2Max = (vo2Max: number): VO2MaxEstimate['fitnessLevel'] => {
  // General categories (these vary by age and gender, but this is a simplified version)
  if (vo2Max >= 60) return 'superior';
  if (vo2Max >= 52) return 'excellent';
  if (vo2Max >= 47) return 'very-good';
  if (vo2Max >= 42) return 'good';
  if (vo2Max >= 37) return 'fair';
  return 'poor';
};

/**
 * Calculate confidence score for VO2 max estimation
 */
const calculateVO2MaxConfidence = (
  run: EnrichedRun,
  userPhysiology: UserPhysiologyData,
  method: 'heart-rate' | 'pace'
): number => {
  let confidence = 0.5; // Base confidence

  if (method === 'heart-rate') {
    confidence = 0.8; // Higher confidence with HR data
    
    // Boost confidence if we have good physiological data
    if (userPhysiology.restingHeartRate && userPhysiology.maxHeartRate) {
      confidence += 0.1;
    }
  } else {
    confidence = 0.6; // Moderate confidence with pace only
  }

  // Adjust based on run characteristics
  const distanceKm = run.distance / 1000;
  
  // Longer runs give better VO2 max estimates
  if (distanceKm >= 5) {
    confidence += 0.1;
  } else if (distanceKm < 2) {
    confidence -= 0.2;
  }

  // Steady-state runs are better for VO2 max estimation
  if (run.moving_time > 1200) { // > 20 minutes
    confidence += 0.05;
  }

  return Math.max(0.1, Math.min(0.95, confidence));
};

/**
 * Analyze VO2 max trend from multiple runs using 30-day rolling averages
 * Requirements: 9.3 - Show rolling 30-day averages to smooth out daily variations
 * Requirements: 9.5 - Correlate VO2 max trends with training load and performance metrics
 */
export const analyzeVO2MaxTrend = (
  runs: EnrichedRun[],
  userPhysiology: UserPhysiologyData,
  days: number = 90
): VO2MaxTrend => {
  if (runs.length < 3) {
    return {
      trend: 'stable',
      changeRate: 0,
      confidence: 0,
      dataPoints: []
    };
  }

  // Get 30-day rolling averages (Requirement 9.3)
  const rollingAverages = calculate30DayRollingVO2Max(runs, userPhysiology);
  
  if (rollingAverages.length < 2) {
    return {
      trend: 'stable',
      changeRate: 0,
      confidence: 0,
      dataPoints: []
    };
  }

  // Filter to specified time period
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const filteredAverages = rollingAverages.filter(avg => 
    new Date(avg.date) >= cutoffDate
  );

  if (filteredAverages.length < 2) {
    return {
      trend: 'stable',
      changeRate: 0,
      confidence: 0,
      dataPoints: filteredAverages.map(avg => ({
        date: avg.date,
        vo2Max: avg.rollingAverage,
        confidence: avg.confidence
      }))
    };
  }

  // Calculate trend using linear regression on rolling averages
  const { slope, confidence } = calculateLinearTrend(
    filteredAverages.map(d => d.rollingAverage)
  );
  
  // Convert slope to monthly change rate
  const changeRatePerMonth = slope * 30; // Approximate monthly change

  // Determine trend direction using more sensitive thresholds for rolling averages
  let trend: 'improving' | 'stable' | 'declining';
  if (changeRatePerMonth > 0.3) {
    trend = 'improving';
  } else if (changeRatePerMonth < -0.3) {
    trend = 'declining';
  } else {
    trend = 'stable';
  }

  // Use the most recent trend from rolling averages if available
  if (filteredAverages.length > 0) {
    const recentTrend = filteredAverages[filteredAverages.length - 1].trend;
    // Override calculated trend if recent rolling average shows clear direction
    if (recentTrend !== 'stable') {
      trend = recentTrend;
    }
  }

  return {
    trend,
    changeRate: Math.round(changeRatePerMonth * 10) / 10,
    confidence: Math.min(confidence, filteredAverages.reduce((sum, avg) => sum + avg.confidence, 0) / filteredAverages.length),
    dataPoints: filteredAverages.map(avg => ({
      date: avg.date,
      vo2Max: avg.rollingAverage,
      confidence: avg.confidence
    }))
  };
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
 * Get VO2 max percentile for age and gender
 */
export const getVO2MaxPercentile = (
  vo2Max: number,
  age: number,
  gender: 'male' | 'female'
): number => {
  // Simplified percentile calculation
  // In reality, this would use comprehensive age/gender tables
  
  let baseVO2Max: number;
  if (gender === 'male') {
    baseVO2Max = 50 - (age - 20) * 0.5; // Rough decline with age
  } else {
    baseVO2Max = 45 - (age - 20) * 0.4; // Slightly different for females
  }

  // Calculate percentile (simplified)
  const percentile = Math.max(0, Math.min(100, 50 + (vo2Max - baseVO2Max) * 2));
  return Math.round(percentile);
};

/**
 * Predict race times based on VO2 max
 */
export const predictRaceTimesFromVO2Max = (vo2Max: number): {
  fiveK: number;
  tenK: number;
  halfMarathon: number;
  marathon: number;
} => {
  // Simplified race time predictions based on VO2 max
  // These are rough approximations - actual predictions would use more sophisticated models
  
  const vdot = vo2Max; // Simplified VDOT approximation
  
  // Race time predictions (in seconds)
  const fiveK = 900 + (60 - vdot) * 15; // ~15 min for VO2 max 60, scales linearly
  const tenK = fiveK * 2.1; // 10K is roughly 2.1x 5K time
  const halfMarathon = fiveK * 4.6; // Half marathon is roughly 4.6x 5K time
  const marathon = halfMarathon * 2.2; // Marathon is roughly 2.2x half marathon time

  return {
    fiveK: Math.max(600, fiveK), // Minimum 10 minutes
    tenK: Math.max(1200, tenK), // Minimum 20 minutes
    halfMarathon: Math.max(3600, halfMarathon), // Minimum 1 hour
    marathon: Math.max(7200, marathon) // Minimum 2 hours
  };
};

/**
 * Format VO2 max for display
 */
export const formatVO2Max = (vo2Max: number): string => {
  return `${vo2Max.toFixed(1)} ml/kg/min`;
};

/**
 * Correlate VO2 max trends with training load and performance metrics
 * Requirements: 9.5 - Correlate VO2 max trends with training load and performance metrics
 */
export const correlateVO2MaxWithTrainingLoad = (
  vo2MaxTrend: VO2MaxTrend,
  trainingLoadMetrics?: {
    currentCTL: number;
    currentATL: number;
    currentTSB: number;
    acwrStatus: 'optimal' | 'caution' | 'high-risk' | 'detraining';
    weeklyTRIMPTrend: 'increasing' | 'stable' | 'decreasing';
  }
): {
  correlation: 'positive' | 'negative' | 'neutral' | 'insufficient-data';
  insights: string[];
  recommendations: string[];
  confidence: number;
} => {
  const insights: string[] = [];
  const recommendations: string[] = [];
  let correlation: 'positive' | 'negative' | 'neutral' | 'insufficient-data' = 'insufficient-data';
  let confidence = 0.5;

  if (!trainingLoadMetrics) {
    return {
      correlation: 'insufficient-data',
      insights: ['Training load data not available for correlation analysis'],
      recommendations: ['Track training load metrics to understand fitness progression'],
      confidence: 0
    };
  }

  // Analyze correlation between VO2 max trend and training load
  if (vo2MaxTrend.trend === 'improving') {
    if (trainingLoadMetrics.acwrStatus === 'optimal' && trainingLoadMetrics.currentTSB > -20) {
      correlation = 'positive';
      insights.push('VO2 max improvement correlates with optimal training load management');
      insights.push(`Current fitness (CTL: ${trainingLoadMetrics.currentCTL.toFixed(1)}) supports aerobic development`);
      confidence += 0.3;
    } else if (trainingLoadMetrics.acwrStatus === 'high-risk') {
      correlation = 'negative';
      insights.push('VO2 max improving despite high training load risk - monitor for overreaching');
      recommendations.push('Consider reducing training intensity to maintain sustainable progress');
      confidence += 0.2;
    } else {
      correlation = 'neutral';
      insights.push('VO2 max improvement with moderate training load correlation');
    }
  } else if (vo2MaxTrend.trend === 'declining') {
    if (trainingLoadMetrics.acwrStatus === 'detraining' || trainingLoadMetrics.currentTSB > 25) {
      correlation = 'positive';
      insights.push('VO2 max decline correlates with detraining - increase training stimulus');
      recommendations.push('Gradually increase training volume and add structured workouts');
      confidence += 0.3;
    } else if (trainingLoadMetrics.acwrStatus === 'high-risk' && trainingLoadMetrics.currentTSB < -30) {
      correlation = 'positive';
      insights.push('VO2 max decline may indicate overreaching from excessive training load');
      recommendations.push('Prioritize recovery and reduce training intensity');
      confidence += 0.4;
    } else {
      correlation = 'negative';
      insights.push('VO2 max declining despite appropriate training load - check other factors');
      recommendations.push('Consider environmental factors, stress, or health issues affecting performance');
    }
  } else { // stable
    if (trainingLoadMetrics.acwrStatus === 'optimal') {
      correlation = 'positive';
      insights.push('Stable VO2 max with optimal training load - good maintenance phase');
      confidence += 0.2;
    } else {
      correlation = 'neutral';
      insights.push('Stable VO2 max - consider varying training stimulus for continued adaptation');
    }
  }

  // Analyze weekly TRIMP trend correlation
  if (trainingLoadMetrics.weeklyTRIMPTrend === 'increasing' && vo2MaxTrend.trend === 'improving') {
    insights.push('Increasing training load correlates with VO2 max improvement');
    confidence += 0.1;
  } else if (trainingLoadMetrics.weeklyTRIMPTrend === 'decreasing' && vo2MaxTrend.trend === 'declining') {
    insights.push('Decreasing training load correlates with VO2 max decline');
    confidence += 0.1;
  }

  // TSB-specific insights
  if (trainingLoadMetrics.currentTSB > 10) {
    insights.push('Positive training stress balance indicates freshness - good time for testing fitness');
  } else if (trainingLoadMetrics.currentTSB < -20) {
    insights.push('Negative training stress balance indicates accumulated fatigue');
    if (vo2MaxTrend.trend === 'declining') {
      recommendations.push('Current fatigue may be masking true fitness gains - allow recovery');
    }
  }

  confidence = Math.max(0.1, Math.min(0.9, confidence));

  return {
    correlation,
    insights,
    recommendations,
    confidence
  };
};

/**
 * Get comprehensive VO2 max analysis including training load correlation
 * Requirements: 9.5 - Correlate VO2 max trends with training load and performance metrics
 */
export const getComprehensiveVO2MaxAnalysis = (
  runs: EnrichedRun[],
  userPhysiology: UserPhysiologyData,
  trainingLoadMetrics?: {
    currentCTL: number;
    currentATL: number;
    currentTSB: number;
    acwrStatus: 'optimal' | 'caution' | 'high-risk' | 'detraining';
    weeklyTRIMPTrend: 'increasing' | 'stable' | 'decreasing';
  }
): {
  currentVO2Max?: number;
  trend: VO2MaxTrend;
  rollingAverages: ReturnType<typeof calculate30DayRollingVO2Max>;
  trainingLoadCorrelation: ReturnType<typeof correlateVO2MaxWithTrainingLoad>;
  recommendations: string[];
  dataQuality: {
    totalRuns: number;
    steadyStateRuns: number;
    highQualityEstimates: number;
    averageConfidence: number;
  };
} => {
  // Get trend analysis with 30-day rolling averages
  const trend = analyzeVO2MaxTrend(runs, userPhysiology);
  const rollingAverages = calculate30DayRollingVO2Max(runs, userPhysiology);
  
  // Get current VO2 max from most recent high-quality run
  let currentVO2Max: number | undefined;
  const recentRuns = runs
    .sort((a, b) => new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime())
    .slice(0, 10); // Check last 10 runs
  
  for (const run of recentRuns) {
    const steadyState = detectSteadyStatePortions(run);
    if (steadyState.isSteadyState) {
      const estimate = calculateVO2Max(run, userPhysiology);
      if (estimate.value.vo2Max > 0 && estimate.confidence > 0.6) {
        currentVO2Max = estimate.value.vo2Max;
        break;
      }
    }
  }

  // Correlate with training load
  const trainingLoadCorrelation = correlateVO2MaxWithTrainingLoad(trend, trainingLoadMetrics);

  // Calculate data quality metrics
  let steadyStateRuns = 0;
  let highQualityEstimates = 0;
  let totalConfidence = 0;
  let validEstimates = 0;

  runs.forEach(run => {
    const steadyState = detectSteadyStatePortions(run);
    if (steadyState.isSteadyState) steadyStateRuns++;
    
    const estimate = calculateVO2Max(run, userPhysiology);
    if (estimate.value.vo2Max > 0) {
      totalConfidence += estimate.confidence;
      validEstimates++;
      
      if (estimate.confidence > 0.7) {
        highQualityEstimates++;
      }
    }
  });

  const dataQuality = {
    totalRuns: runs.length,
    steadyStateRuns,
    highQualityEstimates,
    averageConfidence: validEstimates > 0 ? totalConfidence / validEstimates : 0
  };

  // Generate comprehensive recommendations
  const recommendations = [
    ...getVO2MaxRecommendations(currentVO2Max || 0, trend, 'good'),
    ...trainingLoadCorrelation.recommendations
  ];

  return {
    currentVO2Max,
    trend,
    rollingAverages,
    trainingLoadCorrelation,
    recommendations,
    dataQuality
  };
};

/**
 * Get VO2 max improvement recommendations
 */
export const getVO2MaxRecommendations = (
  currentVO2Max: number,
  trend: VO2MaxTrend,
  fitnessLevel: VO2MaxEstimate['fitnessLevel']
): string[] => {
  const recommendations: string[] = [];

  if (trend.trend === 'declining') {
    recommendations.push('Your VO2 max is declining. Focus on maintaining aerobic base with consistent easy runs.');
    recommendations.push('Add 1-2 interval sessions per week to stimulate VO2 max improvements.');
  } else if (trend.trend === 'stable') {
    recommendations.push('Your VO2 max is stable. Add variety to your training to continue improving.');
    recommendations.push('Include tempo runs and intervals to challenge your aerobic system.');
  } else {
    recommendations.push('Great progress! Your VO2 max is improving. Keep up your current training approach.');
  }

  if (fitnessLevel === 'poor' || fitnessLevel === 'fair') {
    recommendations.push('Focus on building your aerobic base with easy, conversational-pace runs.');
    recommendations.push('Gradually increase your weekly mileage by 10% each week.');
  } else if (fitnessLevel === 'good' || fitnessLevel === 'very-good') {
    recommendations.push('Add structured workouts: intervals, tempo runs, and hill training.');
    recommendations.push('Consider periodized training with build and recovery phases.');
  } else {
    recommendations.push('Maintain your excellent fitness with varied, challenging workouts.');
    recommendations.push('Focus on race-specific training for your goal events.');
  }

  return recommendations;
};