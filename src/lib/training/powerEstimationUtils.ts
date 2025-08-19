// Power Estimation and Training Zones System
// Requirements: 17.1, 17.2, 17.3, 17.4, 17.5

import { EnrichedRun } from '../../types';

export interface RunningPowerEstimate {
  estimatedPower: number; // watts
  powerPerKg: number; // watts per kg body weight
  confidence: 'high' | 'medium' | 'low';
  calculationMethod: 'elevation-pace' | 'pace-only' | 'estimated';
  factors: {
    paceComponent: number; // watts from horizontal movement
    elevationComponent: number; // watts from vertical movement
    windComponent?: number; // watts from wind resistance
    totalEfficiency: number; // 0-1, running efficiency factor
  };
}

export interface TrainingZones {
  heartRateZones: {
    zone1: { min: number; max: number; name: string; description: string }; // Recovery
    zone2: { min: number; max: number; name: string; description: string }; // Aerobic Base
    zone3: { min: number; max: number; name: string; description: string }; // Aerobic Threshold
    zone4: { min: number; max: number; name: string; description: string }; // Lactate Threshold
    zone5: { min: number; max: number; name: string; description: string }; // VO2 Max
  };
  paceZones: {
    recovery: { min: number; max: number; name: string; description: string }; // seconds per km
    easy: { min: number; max: number; name: string; description: string };
    moderate: { min: number; max: number; name: string; description: string };
    threshold: { min: number; max: number; name: string; description: string };
    interval: { min: number; max: number; name: string; description: string };
    repetition: { min: number; max: number; name: string; description: string };
  };
  powerZones?: {
    zone1: { min: number; max: number; name: string; description: string }; // watts
    zone2: { min: number; max: number; name: string; description: string };
    zone3: { min: number; max: number; name: string; description: string };
    zone4: { min: number; max: number; name: string; description: string };
    zone5: { min: number; max: number; name: string; description: string };
  };
  basedOn: {
    maxHeartRate?: number;
    restingHeartRate?: number;
    thresholdPace?: number; // seconds per km
    vo2MaxPace?: number; // seconds per km
    recentPerformance: boolean;
  };
  lastCalculated: string;
  nextRecalculation: string;
}

export interface ZoneDistributionAnalysis {
  currentDistribution: {
    zone1: { time: number; percentage: number; runs: number };
    zone2: { time: number; percentage: number; runs: number };
    zone3: { time: number; percentage: number; runs: number };
    zone4: { time: number; percentage: number; runs: number };
    zone5: { time: number; percentage: number; runs: number };
  };
  optimalDistribution: {
    zone1: { recommended: number; current: number; status: 'optimal' | 'low' | 'high' };
    zone2: { recommended: number; current: number; status: 'optimal' | 'low' | 'high' };
    zone3: { recommended: number; current: number; status: 'optimal' | 'low' | 'high' };
    zone4: { recommended: number; current: number; status: 'optimal' | 'low' | 'high' };
    zone5: { recommended: number; current: number; status: 'optimal' | 'low' | 'high' };
  };
  recommendations: string[];
  polarizationIndex: number; // 0-1, higher = more polarized training
  trainingStress: 'low' | 'moderate' | 'high' | 'excessive';
}

export interface UserPhysiologyData {
  bodyWeight?: number; // kg
  maxHeartRate?: number; // bpm
  restingHeartRate?: number; // bpm
  age?: number;
  gender?: 'male' | 'female' | 'other';
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  lastUpdated?: string;
}

/**
 * Estimate running power from pace, elevation, and body weight
 * Requirements: 17.1
 */
export const estimateRunningPower = (
  run: EnrichedRun,
  bodyWeight: number = 70, // kg, default if not provided
  windSpeed?: number // m/s, optional
): RunningPowerEstimate => {
  const distanceKm = run.distance / 1000;
  const paceSecondsPerKm = run.moving_time / distanceKm;
  const speedMs = 1000 / paceSecondsPerKm; // m/s
  
  // Calculate horizontal power component (pace-based)
  // Formula: P = k * m * v^3 where k is efficiency factor, m is mass, v is velocity
  const runningEfficiency = 0.25; // Typical running efficiency (20-30%)
  const airResistanceCoeff = 0.9; // Air resistance coefficient for running
  
  const horizontalPower = runningEfficiency * bodyWeight * Math.pow(speedMs, 2.5) * airResistanceCoeff;
  
  // Calculate vertical power component (elevation-based)
  let verticalPower = 0;
  let elevationComponent = 0;
  
  if (run.total_elevation_gain && run.total_elevation_gain > 0) {
    const elevationGainM = run.total_elevation_gain;
    const timeHours = run.moving_time / 3600;
    const verticalSpeedMs = elevationGainM / run.moving_time; // m/s vertical
    
    // Vertical power = m * g * v_vertical (simplified)
    const gravity = 9.81; // m/s²
    verticalPower = bodyWeight * gravity * verticalSpeedMs;
    elevationComponent = verticalPower;
  }
  
  // Calculate wind resistance component (if wind data available)
  let windComponent = 0;
  if (windSpeed && windSpeed > 0) {
    // Simplified wind resistance: additional power needed for headwind
    const windResistance = 0.5 * 1.225 * 0.6 * Math.pow(speedMs + windSpeed, 2) * speedMs;
    windComponent = windResistance; // Keep in watts
  }
  
  // Total estimated power
  const totalPower = horizontalPower + verticalPower + windComponent;
  const powerPerKg = totalPower / bodyWeight;
  
  // Determine confidence level
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  let calculationMethod: 'elevation-pace' | 'pace-only' | 'estimated' = 'pace-only';
  
  if (run.total_elevation_gain && run.total_elevation_gain > 50) {
    confidence = 'high';
    calculationMethod = 'elevation-pace';
  } else if (run.total_elevation_gain && run.total_elevation_gain > 10) {
    confidence = 'medium';
    calculationMethod = 'elevation-pace';
  } else {
    confidence = 'low';
    calculationMethod = 'estimated';
  }
  
  // Adjust confidence based on data quality
  if (!run.average_heartrate && run.moving_time < 600) { // Less than 10 minutes AND no HR
    confidence = 'low';
  } else if (!run.average_heartrate || run.moving_time < 600) { // Less than 10 minutes OR no HR
    confidence = confidence === 'high' ? 'medium' : 'low';
  }
  
  return {
    estimatedPower: Math.round(totalPower),
    powerPerKg: Math.round(powerPerKg * 10) / 10,
    confidence,
    calculationMethod,
    factors: {
      paceComponent: Math.round(horizontalPower),
      elevationComponent: Math.round(elevationComponent),
      windComponent: windComponent > 0 ? Math.round(windComponent) : undefined,
      totalEfficiency: runningEfficiency
    }
  };
};

/**
 * Calculate personalized training zones based on recent performance
 * Requirements: 17.2
 */
export const calculateTrainingZones = (
  runs: EnrichedRun[],
  physiology: UserPhysiologyData
): TrainingZones => {
  // Filter recent runs (last 8 weeks) for zone calculation
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
  
  const recentRuns = runs.filter(run => 
    new Date(run.start_date) > eightWeeksAgo &&
    run.distance >= 3000 && // At least 3km
    run.moving_time > 0
  );
  
  // Calculate heart rate zones
  const heartRateZones = calculateHeartRateZones(recentRuns, physiology);
  
  // Calculate pace zones
  const paceZones = calculatePaceZones(recentRuns, physiology);
  
  // Calculate power zones if we have enough data
  const powerZones = calculatePowerZones(recentRuns, physiology);
  
  const now = new Date();
  const nextRecalc = new Date(now);
  nextRecalc.setDate(nextRecalc.getDate() + 28); // Recalculate every 4 weeks
  
  // Get the calculated max HR from heart rate zones
  const calculatedMaxHR = heartRateZones.zone5.max;
  
  return {
    heartRateZones,
    paceZones,
    powerZones,
    basedOn: {
      maxHeartRate: calculatedMaxHR,
      restingHeartRate: physiology.restingHeartRate,
      thresholdPace: estimateThresholdPace(recentRuns),
      vo2MaxPace: estimateVO2MaxPace(recentRuns),
      recentPerformance: recentRuns.length >= 10
    },
    lastCalculated: now.toISOString(),
    nextRecalculation: nextRecalc.toISOString()
  };
};

/**
 * Calculate heart rate zones based on max HR and recent performance
 * Requirements: 17.2
 */
const calculateHeartRateZones = (
  runs: EnrichedRun[],
  physiology: UserPhysiologyData
) => {
  let maxHR = physiology.maxHeartRate;
  let restingHR = physiology.restingHeartRate || 60;
  
  // Estimate max HR if not provided
  if (!maxHR) {
    if (physiology.age) {
      maxHR = 220 - physiology.age; // Simple age-based formula
    } else {
      // Use observed max from recent runs
      const hrRuns = runs.filter(run => run.max_heartrate);
      if (hrRuns.length > 0) {
        maxHR = Math.max(...hrRuns.map(run => run.max_heartrate!));
        maxHR = Math.min(maxHR + 5, 200); // Add small buffer, cap at 200
      } else {
        maxHR = 185; // Conservative default
      }
    }
  }
  
  // Calculate HR reserve
  const hrReserve = maxHR - restingHR;
  
  return {
    zone1: {
      min: Math.round(restingHR + (hrReserve * 0.50)),
      max: Math.round(restingHR + (hrReserve * 0.59)),
      name: 'Recovery',
      description: 'Easy recovery runs, conversational pace'
    },
    zone2: {
      min: Math.round(restingHR + (hrReserve * 0.60)),
      max: Math.round(restingHR + (hrReserve * 0.69)),
      name: 'Aerobic Base',
      description: 'Base building, aerobic development'
    },
    zone3: {
      min: Math.round(restingHR + (hrReserve * 0.70)),
      max: Math.round(restingHR + (hrReserve * 0.79)),
      name: 'Aerobic Threshold',
      description: 'Moderate effort, sustainable pace'
    },
    zone4: {
      min: Math.round(restingHR + (hrReserve * 0.80)),
      max: Math.round(restingHR + (hrReserve * 0.89)),
      name: 'Lactate Threshold',
      description: 'Comfortably hard, tempo pace'
    },
    zone5: {
      min: Math.round(restingHR + (hrReserve * 0.90)),
      max: maxHR,
      name: 'VO2 Max',
      description: 'Hard intervals, maximum aerobic power'
    }
  };
};

/**
 * Calculate pace zones based on recent performance
 * Requirements: 17.2
 */
const calculatePaceZones = (
  runs: EnrichedRun[],
  physiology: UserPhysiologyData
) => {
  // Estimate threshold pace from recent tempo runs or time trials
  const thresholdPace = estimateThresholdPace(runs);
  const vo2MaxPace = estimateVO2MaxPace(runs);
  
  return {
    recovery: {
      min: Math.round(thresholdPace + 90), // 1:30 slower than threshold
      max: Math.round(thresholdPace + 120), // 2:00 slower than threshold
      name: 'Recovery',
      description: 'Very easy pace for recovery runs'
    },
    easy: {
      min: Math.round(thresholdPace + 60), // 1:00 slower than threshold
      max: Math.round(thresholdPace + 90), // 1:30 slower than threshold
      name: 'Easy',
      description: 'Comfortable conversational pace'
    },
    moderate: {
      min: Math.round(thresholdPace + 30), // 0:30 slower than threshold
      max: Math.round(thresholdPace + 60), // 1:00 slower than threshold
      name: 'Moderate',
      description: 'Steady aerobic effort'
    },
    threshold: {
      min: Math.round(thresholdPace - 5), // 5s faster than threshold
      max: Math.round(thresholdPace + 5), // 5s slower than threshold
      name: 'Threshold',
      description: 'Comfortably hard tempo pace'
    },
    interval: {
      min: Math.round(vo2MaxPace - 5), // 5s faster than VO2 max pace
      max: Math.round(vo2MaxPace + 5), // 5s slower than VO2 max pace
      name: 'Interval',
      description: 'Hard interval pace'
    },
    repetition: {
      min: Math.round(vo2MaxPace - 20), // 20s faster than VO2 max pace
      max: Math.round(vo2MaxPace - 5), // 5s faster than VO2 max pace
      name: 'Repetition',
      description: 'Very fast repetition pace'
    }
  };
};

/**
 * Calculate power zones if sufficient data available
 * Requirements: 17.2
 */
const calculatePowerZones = (
  runs: EnrichedRun[],
  physiology: UserPhysiologyData
) => {
  const bodyWeight = physiology.bodyWeight || 70;
  
  // Calculate power estimates for recent runs
  const powerEstimates = runs
    .filter(run => run.distance >= 5000) // 5km+ runs
    .map(run => estimateRunningPower(run, bodyWeight))
    .filter(est => est.confidence !== 'low');
  
  if (powerEstimates.length < 5) {
    return undefined; // Not enough data for reliable power zones
  }
  
  // Find threshold power (average of tempo-pace runs)
  const thresholdPowers = powerEstimates
    .filter(est => est.estimatedPower > 0)
    .sort((a, b) => b.estimatedPower - a.estimatedPower)
    .slice(Math.floor(powerEstimates.length * 0.2), Math.floor(powerEstimates.length * 0.4));
  
  const avgThresholdPower = thresholdPowers.length > 0
    ? thresholdPowers.reduce((sum, est) => sum + est.estimatedPower, 0) / thresholdPowers.length
    : 250; // Default threshold power
  
  return {
    zone1: {
      min: 0,
      max: Math.round(avgThresholdPower * 0.54),
      name: 'Active Recovery',
      description: 'Very easy effort for recovery'
    },
    zone2: {
      min: Math.round(avgThresholdPower * 0.55),
      max: Math.round(avgThresholdPower * 0.74),
      name: 'Aerobic Base',
      description: 'Base building power'
    },
    zone3: {
      min: Math.round(avgThresholdPower * 0.75),
      max: Math.round(avgThresholdPower * 0.89),
      name: 'Aerobic Threshold',
      description: 'Moderate aerobic effort'
    },
    zone4: {
      min: Math.round(avgThresholdPower * 0.90),
      max: Math.round(avgThresholdPower * 1.04),
      name: 'Lactate Threshold',
      description: 'Threshold power'
    },
    zone5: {
      min: Math.round(avgThresholdPower * 1.05),
      max: Math.round(avgThresholdPower * 1.20),
      name: 'VO2 Max',
      description: 'Maximum aerobic power'
    }
  };
};

/**
 * Estimate threshold pace from recent runs
 * Requirements: 17.2
 */
const estimateThresholdPace = (runs: EnrichedRun[]): number => {
  // Look for tempo runs (20-40 minute sustained efforts)
  const tempoRuns = runs.filter(run => {
    const durationMinutes = run.moving_time / 60;
    return durationMinutes >= 20 && durationMinutes <= 40 && run.distance >= 5000;
  });
  
  if (tempoRuns.length > 0) {
    const avgPace = tempoRuns.reduce((sum, run) => 
      sum + (run.moving_time / (run.distance / 1000)), 0
    ) / tempoRuns.length;
    return avgPace;
  }
  
  // Fallback: use 10K pace equivalent from recent runs
  const mediumRuns = runs.filter(run => 
    run.distance >= 8000 && run.distance <= 15000
  );
  
  if (mediumRuns.length > 0) {
    const avgPace = mediumRuns.reduce((sum, run) => 
      sum + (run.moving_time / (run.distance / 1000)), 0
    ) / mediumRuns.length;
    return avgPace - 10; // Assume threshold is ~10s/km faster than 10K pace
  }
  
  // Default threshold pace
  return 240; // 4:00/km default
};

/**
 * Estimate VO2 max pace from recent runs
 * Requirements: 17.2
 */
const estimateVO2MaxPace = (runs: EnrichedRun[]): number => {
  // Look for short, fast runs (5-15 minutes)
  const fastRuns = runs.filter(run => {
    const durationMinutes = run.moving_time / 60;
    return durationMinutes >= 5 && durationMinutes <= 15 && run.distance >= 1500;
  });
  
  if (fastRuns.length > 0) {
    // Take the fastest pace from these runs
    const fastestPace = Math.min(...fastRuns.map(run => 
      run.moving_time / (run.distance / 1000)
    ));
    return fastestPace;
  }
  
  // Fallback: estimate from threshold pace
  const thresholdPace = estimateThresholdPace(runs);
  return thresholdPace - 20; // VO2 max pace typically 20s/km faster than threshold
};

/**
 * Analyze training zone distribution and provide recommendations
 * Requirements: 17.4, 17.5
 */
export const analyzeZoneDistribution = (
  runs: EnrichedRun[],
  zones: TrainingZones
): ZoneDistributionAnalysis => {
  // Filter recent runs (last 4 weeks)
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  
  const recentRuns = runs.filter(run => 
    new Date(run.start_date) > fourWeeksAgo &&
    run.moving_time > 0
  );
  
  // Calculate current distribution
  const currentDistribution = calculateCurrentDistribution(recentRuns, zones);
  
  // Define optimal distribution (80/20 polarized model)
  const optimalDistribution = {
    zone1: { recommended: 50, current: currentDistribution.zone1.percentage, status: 'optimal' as const },
    zone2: { recommended: 30, current: currentDistribution.zone2.percentage, status: 'optimal' as const },
    zone3: { recommended: 10, current: currentDistribution.zone3.percentage, status: 'optimal' as const },
    zone4: { recommended: 8, current: currentDistribution.zone4.percentage, status: 'optimal' as const },
    zone5: { recommended: 2, current: currentDistribution.zone5.percentage, status: 'optimal' as const }
  };
  
  // Determine status for each zone
  Object.keys(optimalDistribution).forEach(zoneKey => {
    const zone = optimalDistribution[zoneKey as keyof typeof optimalDistribution];
    const diff = Math.abs(zone.current - zone.recommended);
    
    if (diff <= 5) zone.status = 'optimal';
    else if (zone.current > zone.recommended) zone.status = 'high';
    else zone.status = 'low';
  });
  
  // Generate recommendations
  const recommendations = generateZoneRecommendations(optimalDistribution);
  
  // Calculate polarization index
  const polarizationIndex = calculatePolarizationIndex(currentDistribution);
  
  // Determine training stress
  const trainingStress = determineTrainingStress(currentDistribution, recentRuns);
  
  return {
    currentDistribution,
    optimalDistribution,
    recommendations,
    polarizationIndex,
    trainingStress
  };
};

/**
 * Calculate current zone distribution from recent runs
 * Requirements: 17.4
 */
const calculateCurrentDistribution = (runs: EnrichedRun[], zones: TrainingZones) => {
  const totalTime = runs.reduce((sum, run) => sum + run.moving_time, 0);
  
  if (totalTime === 0) {
    return {
      zone1: { time: 0, percentage: 0, runs: 0 },
      zone2: { time: 0, percentage: 0, runs: 0 },
      zone3: { time: 0, percentage: 0, runs: 0 },
      zone4: { time: 0, percentage: 0, runs: 0 },
      zone5: { time: 0, percentage: 0, runs: 0 }
    };
  }
  
  const zoneStats = {
    zone1: { time: 0, runs: 0 },
    zone2: { time: 0, runs: 0 },
    zone3: { time: 0, runs: 0 },
    zone4: { time: 0, runs: 0 },
    zone5: { time: 0, runs: 0 }
  };
  
  runs.forEach(run => {
    const avgHR = run.average_heartrate;
    const pace = run.moving_time / (run.distance / 1000);
    
    // Classify run by heart rate if available, otherwise by pace
    let zone = 'zone2'; // default
    
    if (avgHR) {
      if (avgHR <= zones.heartRateZones.zone1.max) zone = 'zone1';
      else if (avgHR <= zones.heartRateZones.zone2.max) zone = 'zone2';
      else if (avgHR <= zones.heartRateZones.zone3.max) zone = 'zone3';
      else if (avgHR <= zones.heartRateZones.zone4.max) zone = 'zone4';
      else zone = 'zone5';
    } else {
      // Classify by pace (slower pace = easier zone)
      if (pace >= zones.paceZones.easy.min) zone = 'zone1'; // Easy/recovery pace
      else if (pace >= zones.paceZones.moderate.min) zone = 'zone2'; // Moderate pace
      else if (pace >= zones.paceZones.threshold.max) zone = 'zone3'; // Above threshold
      else if (pace >= zones.paceZones.interval.max) zone = 'zone4'; // Interval pace
      else zone = 'zone5'; // Very fast pace
    }
    
    zoneStats[zone as keyof typeof zoneStats].time += run.moving_time;
    zoneStats[zone as keyof typeof zoneStats].runs += 1;
  });
  
  return {
    zone1: {
      time: zoneStats.zone1.time,
      percentage: Math.round((zoneStats.zone1.time / totalTime) * 100),
      runs: zoneStats.zone1.runs
    },
    zone2: {
      time: zoneStats.zone2.time,
      percentage: Math.round((zoneStats.zone2.time / totalTime) * 100),
      runs: zoneStats.zone2.runs
    },
    zone3: {
      time: zoneStats.zone3.time,
      percentage: Math.round((zoneStats.zone3.time / totalTime) * 100),
      runs: zoneStats.zone3.runs
    },
    zone4: {
      time: zoneStats.zone4.time,
      percentage: Math.round((zoneStats.zone4.time / totalTime) * 100),
      runs: zoneStats.zone4.runs
    },
    zone5: {
      time: zoneStats.zone5.time,
      percentage: Math.round((zoneStats.zone5.time / totalTime) * 100),
      runs: zoneStats.zone5.runs
    }
  };
};

/**
 * Generate zone distribution recommendations
 * Requirements: 17.5
 */
const generateZoneRecommendations = (optimalDistribution: any): string[] => {
  const recommendations: string[] = [];
  
  Object.entries(optimalDistribution).forEach(([zoneKey, zone]: [string, any]) => {
    const zoneNum = zoneKey.replace('zone', '');
    const zoneName = ['Recovery', 'Easy', 'Moderate', 'Threshold', 'VO2 Max'][parseInt(zoneNum) - 1];
    
    if (zone.status === 'high') {
      const excess = zone.current - zone.recommended;
      recommendations.push(
        `Reduce Zone ${zoneNum} (${zoneName}) training by ${excess}% - currently ${zone.current}%, optimal ${zone.recommended}%`
      );
    } else if (zone.status === 'low') {
      const deficit = zone.recommended - zone.current;
      recommendations.push(
        `Increase Zone ${zoneNum} (${zoneName}) training by ${deficit}% - currently ${zone.current}%, optimal ${zone.recommended}%`
      );
    }
  });
  
  if (recommendations.length === 0) {
    recommendations.push('Your training zone distribution is well balanced!');
  }
  
  return recommendations;
};

/**
 * Calculate polarization index (0-1, higher = more polarized)
 * Requirements: 17.4
 */
const calculatePolarizationIndex = (distribution: any): number => {
  // Polarization index: (Zone1 + Zone2 + Zone5) / (Zone3 + Zone4)
  const lowIntensity = distribution.zone1.percentage + distribution.zone2.percentage;
  const highIntensity = distribution.zone5.percentage;
  const moderateIntensity = distribution.zone3.percentage + distribution.zone4.percentage;
  
  if (moderateIntensity === 0) return 1; // Fully polarized
  
  const polarization = (lowIntensity + highIntensity) / (lowIntensity + moderateIntensity + highIntensity);
  return Math.round(polarization * 100) / 100;
};

/**
 * Determine training stress level
 * Requirements: 17.5
 */
const determineTrainingStress = (distribution: any, runs: EnrichedRun[]): 'low' | 'moderate' | 'high' | 'excessive' => {
  const totalTime = runs.reduce((sum, run) => sum + run.moving_time, 0);
  const weeklyHours = totalTime / 3600 / 4; // Average weekly hours over 4 weeks
  
  const highIntensityPercentage = distribution.zone4.percentage + distribution.zone5.percentage;
  
  if (weeklyHours < 3) return 'low';
  if (weeklyHours > 15 || highIntensityPercentage > 25) return 'excessive';
  if (weeklyHours > 8 || highIntensityPercentage > 20) return 'high';
  return 'moderate';
};

/**
 * Check if zones need recalculation based on recent performance
 * Requirements: 17.3
 */
export const shouldRecalculateZones = (
  zones: TrainingZones,
  recentRuns: EnrichedRun[]
): { shouldRecalculate: boolean; reasons: string[] } => {
  const reasons: string[] = [];
  
  // Check if zones are outdated
  const lastCalc = new Date(zones.lastCalculated);
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  
  if (lastCalc < fourWeeksAgo) {
    reasons.push('Zones are more than 4 weeks old');
  }
  
  // Check for significant performance improvements
  const recentPaces = recentRuns
    .filter(run => run.distance >= 5000)
    .map(run => run.moving_time / (run.distance / 1000))
    .sort((a, b) => a - b);
  
  if (recentPaces.length >= 3) {
    const bestRecentPace = recentPaces[0];
    const thresholdPace = zones.basedOn.thresholdPace || 240;
    
    if (bestRecentPace < thresholdPace - 15) {
      reasons.push('Recent performance suggests significant fitness improvement');
    }
  }
  
  // Check for new physiological data
  const nextRecalc = new Date(zones.nextRecalculation);
  if (new Date() > nextRecalc) {
    reasons.push('Scheduled recalculation time reached');
  }
  
  return {
    shouldRecalculate: reasons.length > 0,
    reasons
  };
};

/**
 * Recalculate zones with updated data
 * Requirements: 17.3
 */
export const recalculateZones = (
  runs: EnrichedRun[],
  physiology: UserPhysiologyData,
  currentZones: TrainingZones
): TrainingZones => {
  // Calculate new zones
  const newZones = calculateTrainingZones(runs, physiology);
  
  // Preserve any manual adjustments or preferences from current zones
  // (This would be expanded based on user preferences system)
  
  return newZones;
};