// Route and Elevation Performance Analysis System
// Requirements: 15.1, 15.2, 15.3, 15.4, 15.5

import { EnrichedRun } from '../../types';

export interface ElevationPerformanceData {
  // Grade-adjusted pace calculations
  gradeAdjustedPace: number; // seconds per km, normalized for elevation
  originalPace: number; // seconds per km, actual pace
  elevationAdjustment: number; // seconds per km adjustment applied
  
  // Elevation metrics
  totalElevationGain: number; // meters
  elevationGainPerKm: number; // meters per km
  averageGrade: number; // percentage grade
  maxGrade?: number; // maximum grade encountered
  
  // Performance analysis
  climbingEfficiency: number; // 0-100 score for uphill performance
  descentEfficiency: number; // 0-100 score for downhill performance
  flatTerrainPace: number; // estimated pace on flat terrain
  
  // Data quality
  elevationDataQuality: 'high' | 'medium' | 'low';
  confidence: number; // 0-1 confidence in calculations
  calculationMethod: string;
}

export interface RoutePerformanceProfile {
  // Climbing performance
  climbingProfile: {
    efficiency: 'excellent' | 'good' | 'average' | 'needs-improvement';
    optimalGrade: number; // grade percentage where performance is best
    maxSustainableGrade: number; // steepest grade that can be sustained
    climbingPaceAdjustment: number; // typical pace adjustment per % grade
    improvementTrend: 'improving' | 'stable' | 'declining';
  };
  
  // Descent performance
  descentProfile: {
    efficiency: 'excellent' | 'good' | 'average' | 'needs-improvement';
    descentPaceImprovement: number; // typical pace improvement on descents
    maxComfortableDescentGrade: number; // steepest comfortable descent
    brakingTendency: 'aggressive' | 'moderate' | 'conservative';
  };
  
  // Terrain preferences
  terrainPreferences: {
    flatTerrain: { performance: number; preference: string };
    rollingHills: { performance: number; preference: string };
    steepClimbs: { performance: number; preference: string };
    technicalDescents: { performance: number; preference: string };
  };
  
  // Route recommendations
  routeRecommendations: {
    optimalElevationGain: { min: number; max: number }; // meters per km
    recommendedGradeRange: { min: number; max: number }; // percentage
    pacingStrategy: string[];
    trainingFocus: string[];
  };
  
  // Analysis metadata
  totalRunsAnalyzed: number;
  elevationDataAvailable: number;
  dateRange: { start: string; end: string };
  lastCalculated: string;
}

export interface HillRunningMetrics {
  // Uphill metrics
  uphillPace: number; // average pace on uphills (>2% grade)
  uphillHeartRate?: number; // average HR on uphills
  uphillEffort: number; // 0-100 relative effort score
  
  // Downhill metrics
  downhillPace: number; // average pace on downhills (<-2% grade)
  downhillHeartRate?: number; // average HR on downhills
  downhillControl: number; // 0-100 control/confidence score
  
  // Flat terrain baseline
  flatPace: number; // pace on flat terrain (-2% to 2% grade)
  flatHeartRate?: number; // HR on flat terrain
  
  // Comparative analysis
  uphillSlowdown: number; // % slower than flat terrain
  downhillSpeedup: number; // % faster than flat terrain
  gradeEfficiency: number; // overall efficiency across grades
}

/**
 * Calculate grade-adjusted pace for elevation normalization
 * Requirements: 15.1, 15.2
 */
export const calculateGradeAdjustedPace = (run: EnrichedRun): ElevationPerformanceData => {
  const originalPace = run.moving_time / (run.distance / 1000); // seconds per km
  
  // Check if elevation data is available
  if (!run.total_elevation_gain || run.total_elevation_gain === 0 || run.total_elevation_gain === undefined) {
    return {
      gradeAdjustedPace: originalPace,
      originalPace,
      elevationAdjustment: 0,
      totalElevationGain: 0,
      elevationGainPerKm: 0,
      averageGrade: 0,
      climbingEfficiency: 50, // neutral score
      descentEfficiency: 50,
      flatTerrainPace: originalPace,
      elevationDataQuality: 'low',
      confidence: 0.3,
      calculationMethod: 'no_elevation_data'
    };
  }
  
  const distanceKm = run.distance / 1000;
  const elevationGainPerKm = run.total_elevation_gain / distanceKm;
  const averageGrade = (run.total_elevation_gain / run.distance) * 100; // percentage
  
  // Calculate elevation adjustment using established formulas
  const elevationAdjustment = calculateElevationPaceAdjustment(
    elevationGainPerKm,
    averageGrade,
    originalPace
  );
  
  const gradeAdjustedPace = Math.max(60, originalPace - elevationAdjustment); // minimum 1:00/km
  
  // Estimate flat terrain pace
  const flatTerrainPace = estimateFlatTerrainPace(originalPace, elevationGainPerKm);
  
  // Calculate climbing and descent efficiency
  const climbingEfficiency = calculateClimbingEfficiency(
    originalPace,
    elevationGainPerKm,
    run.average_heartrate
  );
  
  const descentEfficiency = calculateDescentEfficiency(
    originalPace,
    elevationGainPerKm,
    averageGrade
  );
  
  // Assess data quality
  const elevationDataQuality = assessElevationDataQuality(run);
  const confidence = calculateElevationConfidence(run, elevationDataQuality);
  
  return {
    gradeAdjustedPace,
    originalPace,
    elevationAdjustment,
    totalElevationGain: run.total_elevation_gain,
    elevationGainPerKm,
    averageGrade,
    maxGrade: estimateMaxGrade(run),
    climbingEfficiency,
    descentEfficiency,
    flatTerrainPace,
    elevationDataQuality,
    confidence,
    calculationMethod: 'grade_adjusted_pace'
  };
};/**

 * Calculate elevation pace adjustment using established formulas
 * Requirements: 15.1
 */
const calculateElevationPaceAdjustment = (
  elevationGainPerKm: number,
  averageGrade: number,
  originalPace: number
): number => {
  // Use Jack Daniels' formula: ~12-15 seconds per km for every 1% grade
  // Adjusted for different grade ranges
  
  let adjustment = 0;
  
  if (elevationGainPerKm > 10) { // Significant elevation gain
    if (averageGrade <= 3) {
      // Gentle grades: 10-12 seconds per km per 1% grade
      adjustment = averageGrade * 11;
    } else if (averageGrade <= 6) {
      // Moderate grades: 12-15 seconds per km per 1% grade
      adjustment = averageGrade * 13.5;
    } else if (averageGrade <= 10) {
      // Steep grades: 15-20 seconds per km per 1% grade
      adjustment = averageGrade * 17.5;
    } else {
      // Very steep grades: 20-25 seconds per km per 1% grade
      adjustment = averageGrade * 22.5;
    }
    
    // Cap adjustment at 50% of original pace to avoid unrealistic values
    adjustment = Math.min(adjustment, originalPace * 0.5);
  }
  
  // Account for descents (negative adjustment)
  if (elevationGainPerKm < -10) {
    const descentGrade = Math.abs(averageGrade);
    if (descentGrade <= 3) {
      // Gentle descents: 5-8 seconds per km improvement per 1% grade
      adjustment = -descentGrade * 6.5;
    } else if (descentGrade <= 6) {
      // Moderate descents: 8-12 seconds per km improvement per 1% grade
      adjustment = -descentGrade * 10;
    } else {
      // Steep descents: limited improvement due to braking
      adjustment = -descentGrade * 8;
    }
    
    // Cap descent improvement at 25% of original pace
    adjustment = Math.max(adjustment, -originalPace * 0.25);
  }
  
  return Math.round(adjustment * 10) / 10; // Round to 1 decimal place
};

/**
 * Estimate flat terrain pace from elevation-affected run
 * Requirements: 15.2
 */
const estimateFlatTerrainPace = (
  originalPace: number,
  elevationGainPerKm: number
): number => {
  if (Math.abs(elevationGainPerKm) < 5) {
    // Already mostly flat
    return originalPace;
  }
  
  // Simple estimation: remove elevation impact
  const averageGrade = elevationGainPerKm / 10; // rough conversion
  let adjustment = 0;
  
  if (elevationGainPerKm > 5) {
    // Remove uphill slowdown
    adjustment = -averageGrade * 12; // Remove ~12 sec/km per 1% grade
  } else if (elevationGainPerKm < -5) {
    // Remove downhill speedup
    adjustment = Math.abs(averageGrade) * 8; // Add back ~8 sec/km per 1% descent
  }
  
  return Math.max(60, originalPace + adjustment);
};

/**
 * Calculate climbing efficiency score
 * Requirements: 15.3
 */
const calculateClimbingEfficiency = (
  pace: number,
  elevationGainPerKm: number,
  heartRate?: number
): number => {
  if (elevationGainPerKm < 10) {
    return 50; // Neutral score for flat terrain
  }
  
  // Base efficiency on pace relative to elevation gain
  const expectedSlowdown = elevationGainPerKm * 0.8; // Expected seconds per km slowdown
  const paceSlowdown = pace - 300; // Assume 5:00/km baseline
  
  let efficiency = 50; // Start with neutral
  
  if (paceSlowdown < expectedSlowdown) {
    // Better than expected performance
    efficiency = Math.min(100, 50 + (expectedSlowdown - paceSlowdown) * 2);
  } else {
    // Worse than expected performance
    efficiency = Math.max(0, 50 - (paceSlowdown - expectedSlowdown) * 1.5);
  }
  
  // Adjust for heart rate if available
  if (heartRate && heartRate > 0) {
    const expectedHR = 150 + (elevationGainPerKm * 0.5); // Rough estimation
    if (heartRate < expectedHR) {
      efficiency += 5; // Bonus for lower HR
    } else if (heartRate > expectedHR + 20) {
      efficiency -= 10; // Penalty for excessive HR
    }
  }
  
  return Math.max(0, Math.min(100, Math.round(efficiency)));
};

/**
 * Calculate descent efficiency score
 * Requirements: 15.3
 */
const calculateDescentEfficiency = (
  pace: number,
  elevationGainPerKm: number,
  averageGrade: number
): number => {
  if (elevationGainPerKm > -10) {
    return 50; // Neutral score for non-descent terrain
  }
  
  const descentGrade = Math.abs(averageGrade);
  const expectedSpeedup = descentGrade * 8; // Expected seconds per km improvement
  const actualSpeedup = 300 - pace; // Assume 5:00/km baseline
  
  let efficiency = 50;
  
  if (actualSpeedup > expectedSpeedup) {
    // Better than expected descent performance
    efficiency = Math.min(100, 50 + (actualSpeedup - expectedSpeedup) * 3);
  } else {
    // Conservative descent approach
    efficiency = Math.max(20, 50 - (expectedSpeedup - actualSpeedup) * 2);
  }
  
  // Penalize excessive caution on gentle descents
  if (descentGrade < 3 && actualSpeedup < expectedSpeedup * 0.5) {
    efficiency -= 15;
  }
  
  return Math.max(0, Math.min(100, Math.round(efficiency)));
};

/**
 * Estimate maximum grade encountered during run
 * Requirements: 15.1
 */
const estimateMaxGrade = (run: EnrichedRun): number | undefined => {
  if (!run.total_elevation_gain || run.total_elevation_gain === 0) {
    return undefined;
  }
  
  // Rough estimation: max grade is typically 2-3x average grade
  const averageGrade = (run.total_elevation_gain / run.distance) * 100;
  return Math.min(25, averageGrade * 2.5); // Cap at 25% grade
};

/**
 * Assess elevation data quality
 * Requirements: 15.1
 */
const assessElevationDataQuality = (run: EnrichedRun): 'high' | 'medium' | 'low' => {
  if (!run.total_elevation_gain || run.total_elevation_gain === 0) {
    return 'low';
  }
  
  const distanceKm = run.distance / 1000;
  const elevationGainPerKm = Math.abs(run.total_elevation_gain) / distanceKm;
  
  // Check for realistic elevation values
  if (elevationGainPerKm > 200) {
    return 'low'; // Unrealistic elevation gain
  }
  
  if (run.distance > 1000 && Math.abs(run.total_elevation_gain) > 10) {
    return 'high'; // Good distance and meaningful elevation
  }
  
  if (run.distance > 500 && Math.abs(run.total_elevation_gain) > 5) {
    return 'medium'; // Decent data
  }
  
  return 'low';
};

/**
 * Calculate confidence in elevation calculations
 * Requirements: 15.1
 */
const calculateElevationConfidence = (
  run: EnrichedRun,
  dataQuality: 'high' | 'medium' | 'low'
): number => {
  let confidence = 0.5; // Base confidence
  
  switch (dataQuality) {
    case 'high':
      confidence = 0.9;
      break;
    case 'medium':
      confidence = 0.7;
      break;
    case 'low':
      confidence = 0.3;
      break;
  }
  
  // Adjust for run characteristics
  if (run.distance > 5000) {
    confidence += 0.1; // Longer runs more reliable
  }
  
  if (run.total_elevation_gain && run.total_elevation_gain > 100) {
    confidence += 0.1; // Significant elevation more reliable
  }
  
  return Math.max(0.1, Math.min(1.0, confidence));
};

/**
 * Build comprehensive route performance profile
 * Requirements: 15.3, 15.4, 15.5
 */
export const buildRoutePerformanceProfile = (runs: EnrichedRun[]): RoutePerformanceProfile => {
  // Filter runs with elevation data
  const elevationRuns = runs.filter(run => 
    run.total_elevation_gain && 
    run.total_elevation_gain > 0 &&
    run.distance > 1000 // At least 1km
  );

  if (elevationRuns.length < 5) {
    return createMinimalRouteProfile(elevationRuns);
  }

  // Calculate elevation performance for all runs
  const elevationData = elevationRuns.map(run => ({
    run,
    performance: calculateGradeAdjustedPace(run)
  }));

  // Analyze climbing performance
  const climbingProfile = analyzeClimbingPerformance(elevationData);
  
  // Analyze descent performance
  const descentProfile = analyzeDescentPerformance(elevationData);
  
  // Determine terrain preferences
  const terrainPreferences = analyzeTerrainPreferences(elevationData);
  
  // Generate route recommendations
  const routeRecommendations = generateRouteRecommendations(
    climbingProfile,
    descentProfile,
    terrainPreferences
  );
  
  const dateRange = {
    start: new Date(Math.min(...elevationRuns.map(r => new Date(r.start_date).getTime()))).toISOString(),
    end: new Date(Math.max(...elevationRuns.map(r => new Date(r.start_date).getTime()))).toISOString()
  };

  return {
    climbingProfile,
    descentProfile,
    terrainPreferences,
    routeRecommendations,
    totalRunsAnalyzed: runs.length,
    elevationDataAvailable: elevationRuns.length,
    dateRange,
    lastCalculated: new Date().toISOString()
  };
};

/**
 * Analyze climbing performance patterns
 * Requirements: 15.3
 */
const analyzeClimbingPerformance = (
  elevationData: Array<{ run: EnrichedRun; performance: ElevationPerformanceData }>
): RoutePerformanceProfile['climbingProfile'] => {
  const climbingRuns = elevationData.filter(d => d.performance.elevationGainPerKm > 20);
  
  if (climbingRuns.length < 3) {
    return {
      efficiency: 'average',
      optimalGrade: 3,
      maxSustainableGrade: 8,
      climbingPaceAdjustment: 12,
      improvementTrend: 'stable'
    };
  }
  
  // Calculate average climbing efficiency
  const avgEfficiency = climbingRuns.reduce((sum, d) => sum + d.performance.climbingEfficiency, 0) / climbingRuns.length;
  
  let efficiency: 'excellent' | 'good' | 'average' | 'needs-improvement' = 'average';
  if (avgEfficiency >= 80) efficiency = 'excellent';
  else if (avgEfficiency >= 65) efficiency = 'good';
  else if (avgEfficiency < 40) efficiency = 'needs-improvement';
  
  // Find optimal grade (best efficiency)
  const gradeEfficiencyMap = new Map<number, number[]>();
  climbingRuns.forEach(d => {
    const grade = Math.round(d.performance.averageGrade);
    if (!gradeEfficiencyMap.has(grade)) {
      gradeEfficiencyMap.set(grade, []);
    }
    gradeEfficiencyMap.get(grade)!.push(d.performance.climbingEfficiency);
  });
  
  let optimalGrade = 3;
  let bestAvgEfficiency = 0;
  gradeEfficiencyMap.forEach((efficiencies, grade) => {
    const avgEff = efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length;
    if (avgEff > bestAvgEfficiency) {
      bestAvgEfficiency = avgEff;
      optimalGrade = grade;
    }
  });
  
  // Estimate max sustainable grade
  const maxSustainableGrade = Math.min(15, optimalGrade * 2.5);
  
  // Calculate typical pace adjustment
  const paceAdjustments = climbingRuns.map(d => 
    d.performance.elevationAdjustment / d.performance.averageGrade
  ).filter(adj => adj > 0 && adj < 30);
  
  const climbingPaceAdjustment = paceAdjustments.length > 0
    ? paceAdjustments.reduce((sum, adj) => sum + adj, 0) / paceAdjustments.length
    : 12;
  
  // Determine improvement trend (simplified)
  const improvementTrend = calculateClimbingTrend(climbingRuns);
  
  return {
    efficiency,
    optimalGrade: Math.round(optimalGrade),
    maxSustainableGrade: Math.round(maxSustainableGrade),
    climbingPaceAdjustment: Math.round(climbingPaceAdjustment * 10) / 10,
    improvementTrend
  };
};

/**
 * Analyze descent performance patterns
 * Requirements: 15.3
 */
const analyzeDescentPerformance = (
  elevationData: Array<{ run: EnrichedRun; performance: ElevationPerformanceData }>
): RoutePerformanceProfile['descentProfile'] => {
  const descentRuns = elevationData.filter(d => d.performance.elevationGainPerKm < -10);
  
  if (descentRuns.length < 2) {
    return {
      efficiency: 'average',
      descentPaceImprovement: 8,
      maxComfortableDescentGrade: 6,
      brakingTendency: 'moderate'
    };
  }
  
  const avgEfficiency = descentRuns.reduce((sum, d) => sum + d.performance.descentEfficiency, 0) / descentRuns.length;
  
  let efficiency: 'excellent' | 'good' | 'average' | 'needs-improvement' = 'average';
  if (avgEfficiency >= 80) efficiency = 'excellent';
  else if (avgEfficiency >= 65) efficiency = 'good';
  else if (avgEfficiency < 40) efficiency = 'needs-improvement';
  
  // Calculate typical pace improvement on descents
  const paceImprovements = descentRuns.map(d => {
    const expectedImprovement = Math.abs(d.performance.averageGrade) * 8;
    const actualImprovement = d.performance.flatTerrainPace - d.performance.originalPace;
    return actualImprovement;
  }).filter(imp => imp > 0);
  
  const descentPaceImprovement = paceImprovements.length > 0
    ? paceImprovements.reduce((sum, imp) => sum + imp, 0) / paceImprovements.length
    : 8;
  
  // Estimate max comfortable descent grade
  const maxComfortableDescentGrade = Math.min(12, 
    Math.max(...descentRuns.map(d => Math.abs(d.performance.averageGrade)))
  );
  
  // Determine braking tendency
  let brakingTendency: 'aggressive' | 'moderate' | 'conservative' = 'moderate';
  if (avgEfficiency >= 75) brakingTendency = 'aggressive';
  else if (avgEfficiency < 50) brakingTendency = 'conservative';
  
  return {
    efficiency,
    descentPaceImprovement: Math.round(descentPaceImprovement * 10) / 10,
    maxComfortableDescentGrade: Math.round(maxComfortableDescentGrade),
    brakingTendency
  };
};

/**
 * Analyze terrain preferences
 * Requirements: 15.4
 */
const analyzeTerrainPreferences = (
  elevationData: Array<{ run: EnrichedRun; performance: ElevationPerformanceData }>
): RoutePerformanceProfile['terrainPreferences'] => {
  const flatRuns = elevationData.filter(d => Math.abs(d.performance.elevationGainPerKm) < 10);
  const rollingRuns = elevationData.filter(d => 
    d.performance.elevationGainPerKm >= 10 && d.performance.elevationGainPerKm < 30
  );
  const steepRuns = elevationData.filter(d => d.performance.elevationGainPerKm >= 30);
  const descentRuns = elevationData.filter(d => d.performance.elevationGainPerKm < -10);
  
  const calculateTerrainScore = (runs: typeof elevationData) => {
    if (runs.length === 0) return { performance: 50, preference: 'Limited data' };
    
    const avgEfficiency = runs.reduce((sum, d) => 
      sum + (d.performance.climbingEfficiency + d.performance.descentEfficiency) / 2, 0
    ) / runs.length;
    
    let preference = 'Neutral';
    if (avgEfficiency >= 70) preference = 'Preferred';
    else if (avgEfficiency >= 55) preference = 'Comfortable';
    else if (avgEfficiency < 45) preference = 'Challenging';
    
    return { performance: Math.round(avgEfficiency), preference };
  };
  
  return {
    flatTerrain: calculateTerrainScore(flatRuns),
    rollingHills: calculateTerrainScore(rollingRuns),
    steepClimbs: calculateTerrainScore(steepRuns),
    technicalDescents: calculateTerrainScore(descentRuns)
  };
};

/**
 * Generate route recommendations
 * Requirements: 15.5
 */
const generateRouteRecommendations = (
  climbingProfile: RoutePerformanceProfile['climbingProfile'],
  descentProfile: RoutePerformanceProfile['descentProfile'],
  terrainPreferences: RoutePerformanceProfile['terrainPreferences']
): RoutePerformanceProfile['routeRecommendations'] => {
  const optimalElevationGain = {
    min: Math.max(0, climbingProfile.optimalGrade * 5),
    max: Math.min(50, climbingProfile.maxSustainableGrade * 3)
  };
  
  const recommendedGradeRange = {
    min: 0,
    max: climbingProfile.maxSustainableGrade
  };
  
  const pacingStrategy: string[] = [];
  const trainingFocus: string[] = [];
  
  // Pacing strategy recommendations
  if (climbingProfile.efficiency === 'excellent') {
    pacingStrategy.push('Maintain aggressive climbing pace - you handle hills well');
  } else if (climbingProfile.efficiency === 'needs-improvement') {
    pacingStrategy.push('Start climbs conservatively and build into them');
    pacingStrategy.push(`Add ${Math.round(climbingProfile.climbingPaceAdjustment * 1.2)}s/km per 1% grade`);
  } else {
    pacingStrategy.push(`Add ~${Math.round(climbingProfile.climbingPaceAdjustment)}s/km per 1% grade on climbs`);
  }
  
  if (descentProfile.brakingTendency === 'conservative') {
    pacingStrategy.push('Work on descent confidence - you can push harder downhill');
  } else if (descentProfile.brakingTendency === 'aggressive') {
    pacingStrategy.push('Excellent descent technique - use downhills for recovery');
  }
  
  // Training focus recommendations
  if (climbingProfile.efficiency < 60) {
    trainingFocus.push('Hill repeat training to improve climbing strength');
    trainingFocus.push('Focus on maintaining form during climbs');
  }
  
  if (descentProfile.efficiency < 60) {
    trainingFocus.push('Downhill running technique practice');
    trainingFocus.push('Build confidence on technical descents');
  }
  
  if (terrainPreferences.steepClimbs.performance < 50) {
    trainingFocus.push('Gradual exposure to steeper grades');
  }
  
  if (terrainPreferences.flatTerrain.performance > 70) {
    trainingFocus.push('Leverage flat terrain strength for speed work');
  }
  
  // Ensure at least some recommendations
  if (pacingStrategy.length === 0) {
    pacingStrategy.push('Maintain steady effort based on terrain');
  }
  
  if (trainingFocus.length === 0) {
    trainingFocus.push('Continue varied terrain training to build profile');
  }
  
  return {
    optimalElevationGain,
    recommendedGradeRange,
    pacingStrategy,
    trainingFocus
  };
};

// Helper functions

const createMinimalRouteProfile = (runs: EnrichedRun[]): RoutePerformanceProfile => {
  return {
    climbingProfile: {
      efficiency: 'average',
      optimalGrade: 3,
      maxSustainableGrade: 8,
      climbingPaceAdjustment: 12,
      improvementTrend: 'stable'
    },
    descentProfile: {
      efficiency: 'average',
      descentPaceImprovement: 8,
      maxComfortableDescentGrade: 6,
      brakingTendency: 'moderate'
    },
    terrainPreferences: {
      flatTerrain: { performance: 50, preference: 'Limited data' },
      rollingHills: { performance: 50, preference: 'Limited data' },
      steepClimbs: { performance: 50, preference: 'Limited data' },
      technicalDescents: { performance: 50, preference: 'Limited data' }
    },
    routeRecommendations: {
      optimalElevationGain: { min: 10, max: 30 },
      recommendedGradeRange: { min: 0, max: 8 },
      pacingStrategy: ['Need more elevation data for personalized pacing advice'],
      trainingFocus: ['Continue running varied terrain to build profile']
    },
    totalRunsAnalyzed: runs.length,
    elevationDataAvailable: runs.filter(r => r.total_elevation_gain && r.total_elevation_gain > 0).length,
    dateRange: {
      start: runs.length > 0 ? runs[0].start_date : new Date().toISOString(),
      end: runs.length > 0 ? runs[runs.length - 1].start_date : new Date().toISOString()
    },
    lastCalculated: new Date().toISOString()
  };
};

const calculateClimbingTrend = (
  climbingRuns: Array<{ run: EnrichedRun; performance: ElevationPerformanceData }>
): 'improving' | 'stable' | 'declining' => {
  if (climbingRuns.length < 6) return 'stable';
  
  // Sort by date
  const sortedRuns = climbingRuns.sort((a, b) => 
    new Date(a.run.start_date).getTime() - new Date(b.run.start_date).getTime()
  );
  
  const recentRuns = sortedRuns.slice(-3);
  const olderRuns = sortedRuns.slice(-6, -3);
  
  if (recentRuns.length < 2 || olderRuns.length < 2) return 'stable';
  
  const recentAvgEfficiency = recentRuns.reduce((sum, r) => sum + r.performance.climbingEfficiency, 0) / recentRuns.length;
  const olderAvgEfficiency = olderRuns.reduce((sum, r) => sum + r.performance.climbingEfficiency, 0) / olderRuns.length;
  
  const improvement = recentAvgEfficiency - olderAvgEfficiency;
  
  if (improvement > 5) return 'improving';
  if (improvement < -5) return 'declining';
  return 'stable';
};

/**
 * Analyze hill running metrics for specific run
 * Requirements: 15.3
 */
export const analyzeHillRunningMetrics = (run: EnrichedRun): HillRunningMetrics | null => {
  const elevationData = calculateGradeAdjustedPace(run);
  
  if (elevationData.elevationDataQuality === 'low') {
    return null;
  }
  
  // Simplified analysis - in real implementation would need split data
  const avgGrade = elevationData.averageGrade;
  const originalPace = elevationData.originalPace;
  const flatPace = elevationData.flatTerrainPace;
  
  let uphillPace = originalPace;
  let downhillPace = originalPace;
  let uphillSlowdown = 0;
  let downhillSpeedup = 0;
  
  if (avgGrade > 2) {
    // Primarily uphill run
    uphillPace = originalPace;
    uphillSlowdown = ((originalPace - flatPace) / flatPace) * 100;
    downhillPace = flatPace * 0.95; // Estimate
    downhillSpeedup = 5;
  } else if (avgGrade < -2) {
    // Primarily downhill run
    downhillPace = originalPace;
    downhillSpeedup = ((flatPace - originalPace) / flatPace) * 100;
    uphillPace = flatPace * 1.15; // Estimate
    uphillSlowdown = 15;
  } else {
    // Mixed terrain
    uphillSlowdown = 10;
    downhillSpeedup = 5;
  }
  
  const gradeEfficiency = (elevationData.climbingEfficiency + elevationData.descentEfficiency) / 2;
  
  return {
    uphillPace: Math.round(uphillPace),
    uphillHeartRate: run.average_heartrate || undefined,
    uphillEffort: Math.min(100, 50 + (uphillSlowdown * 2)),
    downhillPace: Math.round(downhillPace),
    downhillHeartRate: run.average_heartrate ? Math.round(run.average_heartrate * 0.95) : undefined,
    downhillControl: elevationData.descentEfficiency,
    flatPace: Math.round(flatPace),
    flatHeartRate: run.average_heartrate || undefined,
    uphillSlowdown: Math.round(uphillSlowdown * 10) / 10,
    downhillSpeedup: Math.round(downhillSpeedup * 10) / 10,
    gradeEfficiency: Math.round(gradeEfficiency)
  };
};

/**
 * Get specialized pacing recommendations for elevation
 * Requirements: 15.5
 */
export const getElevationPacingRecommendations = (
  routeProfile: RoutePerformanceProfile,
  plannedElevationGain: number,
  plannedDistance: number
): {
  paceAdjustments: string[];
  strategyAdvice: string[];
  effortDistribution: string[];
  recoveryAdvice: string[];
} => {
  const elevationGainPerKm = plannedElevationGain / (plannedDistance / 1000);
  const avgGrade = (plannedElevationGain / plannedDistance) * 100;
  
  const paceAdjustments: string[] = [];
  const strategyAdvice: string[] = [];
  const effortDistribution: string[] = [];
  const recoveryAdvice: string[] = [];
  
  // Pace adjustments
  if (elevationGainPerKm > 50) {
    const adjustment = Math.round(routeProfile.climbingProfile.climbingPaceAdjustment * avgGrade);
    paceAdjustments.push(`Add ${adjustment}s/km for elevation (${Math.round(avgGrade)}% avg grade)`);
    paceAdjustments.push('Start conservatively - hills compound fatigue');
  } else if (elevationGainPerKm > 20) {
    const adjustment = Math.round(routeProfile.climbingProfile.climbingPaceAdjustment * avgGrade * 0.8);
    paceAdjustments.push(`Add ${adjustment}s/km for rolling terrain`);
  } else {
    paceAdjustments.push('Minimal pace adjustment needed for flat terrain');
  }
  
  // Strategy advice
  if (routeProfile.climbingProfile.efficiency === 'excellent') {
    strategyAdvice.push('Use climbs to your advantage - you handle them well');
    strategyAdvice.push('Consider pushing slightly harder on uphills');
  } else if (routeProfile.climbingProfile.efficiency === 'needs-improvement') {
    strategyAdvice.push('Focus on maintaining steady effort rather than pace on climbs');
    strategyAdvice.push('Use power hiking on steep sections if needed');
  } else {
    strategyAdvice.push('Maintain consistent effort on varied terrain');
  }
  
  if (routeProfile.descentProfile.brakingTendency === 'aggressive') {
    strategyAdvice.push('Use descents for active recovery while maintaining speed');
  } else if (routeProfile.descentProfile.brakingTendency === 'conservative') {
    strategyAdvice.push('Work on descent confidence - you can gain time here');
  } else {
    strategyAdvice.push('Use descents for recovery while maintaining form');
  }
  
  // Effort distribution
  if (elevationGainPerKm > 30) {
    effortDistribution.push('Front-load effort before major climbs');
    effortDistribution.push('Expect 15-20% higher effort on sustained climbs');
    effortDistribution.push('Plan recovery periods after major ascents');
  } else {
    effortDistribution.push('Maintain steady effort throughout');
    effortDistribution.push('Use rolling terrain for natural interval training');
  }
  
  // Recovery advice
  if (elevationGainPerKm > 40) {
    recoveryAdvice.push('Plan extra recovery time post-run');
    recoveryAdvice.push('Focus on quad and calf recovery');
    recoveryAdvice.push('Consider walking breaks on steepest sections');
  } else {
    recoveryAdvice.push('Standard recovery protocols apply');
    recoveryAdvice.push('Use gentle descents for active recovery');
  }
  
  // Ensure all arrays have content
  if (strategyAdvice.length === 0) {
    strategyAdvice.push('Adapt pacing to terrain conditions');
  }
  
  if (effortDistribution.length === 0) {
    effortDistribution.push('Distribute effort evenly across terrain');
  }
  
  if (recoveryAdvice.length === 0) {
    recoveryAdvice.push('Follow standard post-run recovery protocols');
  }
  
  return {
    paceAdjustments,
    strategyAdvice,
    effortDistribution,
    recoveryAdvice
  };
};

/**
 * Compare route performance across different elevation profiles
 * Requirements: 15.2
 */
export const compareRoutePerformance = (runs: EnrichedRun[]): {
  flatTerrain: { avgPace: number; efficiency: number; runCount: number };
  rollingHills: { avgPace: number; efficiency: number; runCount: number };
  steepClimbs: { avgPace: number; efficiency: number; runCount: number };
  insights: string[];
} => {
  const elevationData = runs
    .filter(run => run.total_elevation_gain !== undefined && run.total_elevation_gain !== null)
    .map(run => ({
      run,
      performance: calculateGradeAdjustedPace(run)
    }));
  
  const flatRuns = elevationData.filter(d => Math.abs(d.performance.elevationGainPerKm) < 10);
  const rollingRuns = elevationData.filter(d => 
    d.performance.elevationGainPerKm >= 10 && d.performance.elevationGainPerKm < 30
  );
  const steepRuns = elevationData.filter(d => d.performance.elevationGainPerKm >= 30);
  
  const calculateStats = (data: typeof elevationData) => {
    if (data.length === 0) return { avgPace: 0, efficiency: 0, runCount: 0 };
    
    const avgPace = data.reduce((sum, d) => sum + d.performance.gradeAdjustedPace, 0) / data.length;
    const efficiency = data.reduce((sum, d) => 
      sum + (d.performance.climbingEfficiency + d.performance.descentEfficiency) / 2, 0
    ) / data.length;
    
    return {
      avgPace: Math.round(avgPace),
      efficiency: Math.round(efficiency),
      runCount: data.length
    };
  };
  
  const flatStats = calculateStats(flatRuns);
  const rollingStats = calculateStats(rollingRuns);
  const steepStats = calculateStats(steepRuns);
  
  const insights: string[] = [];
  
  // Generate insights
  if (flatStats.runCount > 0 && rollingStats.runCount > 0) {
    const paceDiff = rollingStats.avgPace - flatStats.avgPace;
    insights.push(`Rolling hills add ${paceDiff}s/km compared to flat terrain`);
  }
  
  if (steepStats.runCount > 0 && flatStats.runCount > 0) {
    const paceDiff = steepStats.avgPace - flatStats.avgPace;
    insights.push(`Steep climbs add ${paceDiff}s/km compared to flat terrain`);
  }
  
  const bestTerrain = [
    { name: 'flat terrain', efficiency: flatStats.efficiency },
    { name: 'rolling hills', efficiency: rollingStats.efficiency },
    { name: 'steep climbs', efficiency: steepStats.efficiency }
  ].reduce((best, current) => current.efficiency > best.efficiency ? current : best);
  
  if (bestTerrain.efficiency > 0) {
    insights.push(`You perform best on ${bestTerrain.name} (${bestTerrain.efficiency}% efficiency)`);
  }
  
  return {
    flatTerrain: flatStats,
    rollingHills: rollingStats,
    steepClimbs: steepStats,
    insights
  };
};