// Training Load Calculator - TRIMP Implementation
import { EnrichedRun, UserPhysiologyData, TrainingLoadMetrics, MetricCalculationResult } from '../../types';

/**
 * Calculate Training Impulse (TRIMP) using the Banister formula
 * TRIMP = Duration × ΔHR × 0.64^(e^(k×ΔHRr))
 * where k = 1.92 for men, 1.67 for women (using 1.8 as average)
 */
export const calculateTRIMP = (
  run: EnrichedRun, 
  userPhysiology: UserPhysiologyData
): MetricCalculationResult<number> => {
  const duration = run.moving_time / 60; // Convert to minutes
  
  // Check if we have heart rate data
  if (run.average_heartrate && userPhysiology.restingHeartRate && userPhysiology.maxHeartRate) {
    return calculateTRIMPWithHeartRate(run, userPhysiology, duration);
  } else {
    return calculateEstimatedTRIMP(run, duration);
  }
};

/**
 * Calculate TRIMP with heart rate data using Banister formula
 */
const calculateTRIMPWithHeartRate = (
  run: EnrichedRun,
  userPhysiology: UserPhysiologyData,
  duration: number
): MetricCalculationResult<number> => {
  const avgHR = run.average_heartrate!;
  const restingHR = userPhysiology.restingHeartRate!;
  const maxHR = userPhysiology.maxHeartRate!;
  
  // Validate heart rate values
  if (avgHR < restingHR || avgHR > maxHR || restingHR >= maxHR) {
    return calculateEstimatedTRIMP(run, duration);
  }
  
  // Calculate heart rate reserve components
  const deltaHR = avgHR - restingHR;
  const hrReserve = maxHR - restingHR;
  const deltaHRr = deltaHR / hrReserve;
  
  // Banister formula constants (using 1.8 as average between male 1.92 and female 1.67)
  const k = 1.8;
  const exponent = k * deltaHRr;
  
  // Calculate TRIMP
  const trimp = duration * deltaHR * Math.pow(0.64, Math.exp(exponent));
  
  return {
    value: Math.round(trimp * 10) / 10, // Round to 1 decimal place
    confidence: 0.9, // High confidence with HR data
    dataQuality: {
      heartRateDataAvailable: true,
      weatherDataAvailable: !!run.weather_data,
      gpsDataQuality: run.distance > 0 && run.moving_time > 0 ? 'high' : 'low',
      elevationDataAvailable: !!run.total_elevation_gain,
      calculationConfidence: 0.9,
      missingDataImpact: [],
      qualityScore: 90
    },
    calculationMethod: 'Banister TRIMP with heart rate data'
  };
};

/**
 * Calculate estimated TRIMP without heart rate data using RPE estimation
 */
const calculateEstimatedTRIMP = (
  run: EnrichedRun,
  duration: number
): MetricCalculationResult<number> => {
  // Estimate RPE based on pace and duration
  const paceSecondsPerKm = run.moving_time / (run.distance / 1000);
  const estimatedRPE = estimateRPEFromPace(paceSecondsPerKm, duration);
  
  // Simple TRIMP estimation: Duration × RPE × 10
  const estimatedTRIMP = duration * estimatedRPE * 10;
  
  const missingDataImpact = ['Heart rate data unavailable - using pace-based estimation'];
  
  return {
    value: Math.round(estimatedTRIMP * 10) / 10,
    confidence: 0.6, // Lower confidence without HR data
    dataQuality: {
      heartRateDataAvailable: false,
      weatherDataAvailable: !!run.weather_data,
      gpsDataQuality: run.distance > 0 && run.moving_time > 0 ? 'high' : 'low',
      elevationDataAvailable: !!run.total_elevation_gain,
      calculationConfidence: 0.6,
      missingDataImpact,
      qualityScore: 60
    },
    calculationMethod: 'Estimated TRIMP from pace and duration'
  };
};

/**
 * Estimate RPE (Rate of Perceived Exertion) from pace and duration
 * Based on typical running pace zones and effort levels
 */
const estimateRPEFromPace = (paceSecondsPerKm: number, durationMinutes: number): number => {
  // Convert pace to minutes per km for easier interpretation
  const paceMinPerKm = paceSecondsPerKm / 60;
  
  // Adjust RPE based on duration (longer runs feel harder at same pace)
  const durationFactor = Math.min(1.2, 1 + (durationMinutes - 30) / 180); // Max 20% increase for very long runs
  
  let baseRPE: number;
  
  // Estimate RPE based on pace (these are rough guidelines)
  if (paceMinPerKm < 3.5) {
    baseRPE = 8; // Very hard - elite race pace
  } else if (paceMinPerKm < 4.0) {
    baseRPE = 7; // Hard - 5K race pace
  } else if (paceMinPerKm < 4.5) {
    baseRPE = 6; // Moderately hard - 10K pace
  } else if (paceMinPerKm < 5.0) {
    baseRPE = 5; // Moderate - threshold pace
  } else if (paceMinPerKm < 5.5) {
    baseRPE = 4; // Moderate - tempo pace
  } else if (paceMinPerKm < 6.0) {
    baseRPE = 3.5; // Somewhat hard - marathon pace
  } else if (paceMinPerKm < 7.0) {
    baseRPE = 3; // Easy - aerobic base
  } else {
    baseRPE = 2; // Very easy - recovery
  }
  
  // Apply duration adjustment
  const adjustedRPE = baseRPE * durationFactor;
  
  // Ensure RPE stays within 1-10 range
  return Math.max(1, Math.min(10, adjustedRPE));
};

/**
 * Get default physiological values based on age and gender
 * Used when user hasn't provided their own values
 */
export const getDefaultPhysiologyData = (age?: number, gender?: 'male' | 'female'): UserPhysiologyData => {
  const estimatedAge = age || 35; // Default age if not provided
  
  // Age-based max heart rate estimation (220 - age)
  const estimatedMaxHR = 220 - estimatedAge;
  
  // Typical resting heart rate ranges
  const estimatedRestingHR = gender === 'female' ? 65 : 60;
  
  return {
    maxHeartRate: estimatedMaxHR,
    restingHeartRate: estimatedRestingHR,
    estimatedWeight: gender === 'female' ? 65 : 75, // kg
    lastUpdated: new Date().toISOString()
  };
};

/**
 * Validate physiological data for reasonableness
 */
export const validatePhysiologyData = (data: UserPhysiologyData): {
  isValid: boolean;
  warnings: string[];
} => {
  const warnings: string[] = [];
  let isValid = true;
  
  if (data.restingHeartRate) {
    if (data.restingHeartRate < 40 || data.restingHeartRate > 90) {
      warnings.push('Resting heart rate seems unusual (normal range: 40-90 bpm)');
      if (data.restingHeartRate < 30 || data.restingHeartRate > 120) {
        isValid = false;
      }
    }
  }
  
  if (data.maxHeartRate) {
    if (data.maxHeartRate < 150 || data.maxHeartRate > 210) {
      warnings.push('Maximum heart rate seems unusual (normal range: 150-210 bpm)');
      if (data.maxHeartRate < 120 || data.maxHeartRate > 250) {
        isValid = false;
      }
    }
  }
  
  if (data.restingHeartRate && data.maxHeartRate) {
    if (data.restingHeartRate >= data.maxHeartRate) {
      warnings.push('Resting heart rate should be lower than maximum heart rate');
      isValid = false;
    }
    
    const hrReserve = data.maxHeartRate - data.restingHeartRate;
    if (hrReserve < 50) {
      warnings.push('Heart rate reserve seems low - please verify your values');
    }
  }
  
  if (data.estimatedWeight) {
    if (data.estimatedWeight < 40 || data.estimatedWeight > 150) {
      warnings.push('Weight seems unusual (normal range: 40-150 kg)');
      if (data.estimatedWeight < 30 || data.estimatedWeight > 200) {
        isValid = false;
      }
    }
  }
  
  return { isValid, warnings };
};

/**
 * Calculate TRIMP for multiple runs efficiently
 */
export const batchCalculateTRIMP = (
  runs: EnrichedRun[],
  userPhysiology: UserPhysiologyData
): Array<{ runId: string; trimp: number; confidence: number; method: string }> => {
  return runs.map(run => {
    const result = calculateTRIMP(run, userPhysiology);
    return {
      runId: run.id,
      trimp: result.value,
      confidence: result.confidence,
      method: result.calculationMethod
    };
  });
};

/**
 * Get TRIMP interpretation and context
 */
export const interpretTRIMP = (trimp: number): {
  level: 'very-easy' | 'easy' | 'moderate' | 'hard' | 'very-hard';
  description: string;
  color: string;
} => {
  if (trimp < 30) {
    return {
      level: 'very-easy',
      description: 'Very easy recovery run',
      color: '#22c55e' // green
    };
  } else if (trimp < 60) {
    return {
      level: 'easy',
      description: 'Easy aerobic run',
      color: '#84cc16' // lime
    };
  } else if (trimp < 100) {
    return {
      level: 'moderate',
      description: 'Moderate training effort',
      color: '#eab308' // yellow
    };
  } else if (trimp < 150) {
    return {
      level: 'hard',
      description: 'Hard training session',
      color: '#f97316' // orange
    };
  } else {
    return {
      level: 'very-hard',
      description: 'Very hard or race effort',
      color: '#ef4444' // red
    };
  }
};

/**
 * Calculate weekly TRIMP totals from daily data
 */
export const calculateWeeklyTRIMP = (
  dailyTRIMPData: Array<{ date: string; trimp: number }>
): Array<{ weekStart: string; totalTRIMP: number; avgDaily: number; runDays: number }> => {
  const weeklyData = new Map<string, { total: number; days: Set<string> }>();
  
  dailyTRIMPData.forEach(({ date, trimp }) => {
    const dateObj = new Date(date);
    const weekStart = new Date(dateObj);
    weekStart.setDate(dateObj.getDate() - dateObj.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, { total: 0, days: new Set() });
    }
    
    const weekData = weeklyData.get(weekKey)!;
    weekData.total += trimp;
    weekData.days.add(date);
  });
  
  return Array.from(weeklyData.entries())
    .map(([weekStart, data]) => ({
      weekStart,
      totalTRIMP: Math.round(data.total * 10) / 10,
      avgDaily: Math.round((data.total / 7) * 10) / 10,
      runDays: data.days.size
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
};