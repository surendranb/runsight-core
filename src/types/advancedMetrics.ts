// Advanced Training Metrics Type Definitions

export interface UserPhysiologyData {
  restingHeartRate?: number;
  maxHeartRate?: number;
  estimatedWeight?: number; // kg
  lastUpdated?: string;
}

export interface TrainingLoadMetrics {
  trimp: number;
  estimatedTRIMP?: number; // when HR data unavailable
  acwr: {
    distance: number;
    trimp: number;
    status: 'optimal' | 'caution' | 'high-risk' | 'detraining';
    recommendation?: string;
  };
  ctl: number; // Chronic Training Load (42-day EWMA)
  atl: number; // Acute Training Load (7-day EWMA)
  tsb: number; // Training Stress Balance (CTL - ATL)
  recommendations: string[];
}

export interface PerformanceMetrics {
  vo2MaxEstimate?: number;
  vo2MaxTrend: 'improving' | 'stable' | 'declining';
  vo2MaxConfidence?: number; // 0-1
  runningEconomy: {
    heartRateToPaceRatio?: number;
    efficiencyTrend: 'improving' | 'stable' | 'declining';
    optimalPaceZone?: { min: number; max: number }; // seconds per km
  };
  paceDecoupling?: {
    percentage: number;
    aerobicEfficiency: 'excellent' | 'good' | 'fair' | 'poor';
  };
  fatigueResistance: {
    score: number; // 0-100
    negativeSpitProbability: number; // 0-1
  };
}

export interface EnvironmentalMetrics {
  adjustedPace?: number; // seconds per km
  psiScore?: number; // Physiological Strain Index 0-10
  weatherImpact: {
    temperatureAdjustment: number; // seconds per km
    humidityAdjustment: number; // seconds per km
    windAdjustment: number; // seconds per km
    totalAdjustment: number; // seconds per km
  };
  personalProfile?: {
    optimalTemperature: number;
    heatTolerance: 'low' | 'medium' | 'high';
    coldAdaptation: 'low' | 'medium' | 'high';
  };
}

export interface PredictiveMetrics {
  raceTimePredictions: {
    fiveK: { time: number; confidence: number };
    tenK: { time: number; confidence: number };
    halfMarathon: { time: number; confidence: number };
    marathon: { time: number; confidence: number };
  };
  injuryRisk: {
    score: number; // 0-100
    level: 'low' | 'moderate' | 'high' | 'critical';
    factors: string[];
  };
  overreachingDetection: {
    status: 'normal' | 'functional' | 'non-functional' | 'overtraining';
    confidence: number; // 0-1
    indicators: string[];
  };
}

export interface AdvancedRunMetrics {
  // Training Load Metrics
  trimp?: number;
  estimatedTRIMP?: number;
  
  // Performance Metrics
  vo2MaxEstimate?: number;
  runningEconomyScore?: number;
  paceDecoupling?: number;
  
  // Environmental Metrics
  adjustedPace?: number;
  psiScore?: number;
  weatherImpactScore?: number;
  
  // Power and Efficiency
  estimatedPower?: number; // watts
  elevationAdjustedPace?: number; // seconds per km
  gradeAdjustedPace?: number; // seconds per km
  
  // Pacing Analysis
  pacingConsistency?: number; // 0-100
  fatigueResistanceScore?: number; // 0-100
  paceDecoupling?: number; // percentage decoupling for long runs
  
  // Data Quality and Metadata
  dataQuality: 'high' | 'medium' | 'low';
  calculatedAt: string;
  calculationVersion: string;
  confidenceScore?: number; // 0-1
}

export interface DataQualityAssessment {
  heartRateDataAvailable: boolean;
  weatherDataAvailable: boolean;
  gpsDataQuality: 'high' | 'medium' | 'low';
  elevationDataAvailable: boolean;
  calculationConfidence: number; // 0-1
  missingDataImpact: string[];
  qualityScore: number; // 0-100
}

// TrainingZones interface moved to src/lib/training/powerEstimationUtils.ts to avoid conflicts
// Import from there if needed: import { TrainingZones } from '../lib/training/powerEstimationUtils';

export interface ACWRResult {
  acwr: number;
  status: 'optimal' | 'caution' | 'high-risk' | 'detraining';
  acuteLoad: number;
  chronicLoad: number;
  recommendation: string;
  confidence: number; // 0-1
}

export interface PaceDecouplingResult {
  percentage: number;
  aerobicEfficiency: 'excellent' | 'good' | 'fair' | 'poor';
  firstHalfPace: number;
  secondHalfPace: number;
  firstHalfHR?: number;
  secondHalfHR?: number;
  confidence: number;
}

export interface RunningEconomyAnalysis {
  heartRateToPaceRatio: number;
  efficiencyTrend: 'improving' | 'stable' | 'declining';
  optimalPaceZone: { min: number; max: number };
  economyScore: number; // 0-100
  trendConfidence: number; // 0-1
}

export interface AdjustedPaceResult {
  adjustedPace: number; // seconds per km
  originalPace: number; // seconds per km
  adjustments: {
    temperature: number;
    humidity: number;
    wind: number;
    elevation: number;
    total: number;
  };
  confidence: number; // 0-1
}

export interface EnvironmentalProfile {
  // Personal tolerance profiles
  heatTolerance: {
    level: 'low' | 'medium' | 'high';
    optimalTemperature: number; // Celsius
    maxComfortableTemp: number; // Temperature where performance starts declining significantly
    heatAdaptationScore: number; // 0-100, higher = better heat adaptation
    improvementTrend: 'improving' | 'stable' | 'declining';
  };
  
  coldAdaptation: {
    level: 'low' | 'medium' | 'high';
    minComfortableTemp: number; // Temperature where performance starts declining in cold
    coldAdaptationScore: number; // 0-100, higher = better cold adaptation
    improvementTrend: 'improving' | 'stable' | 'declining';
  };
  
  // Optimal condition ranges
  optimalConditions: {
    temperatureRange: { min: number; max: number };
    humidityRange: { min: number; max: number };
    windSpeedMax: number;
    confidenceScore: number; // 0-1 based on data quality and quantity
  };
  
  // Performance patterns by condition
  performanceByTemperature: Array<{
    temperatureRange: string; // e.g., "15-20°C"
    minTemp: number;
    maxTemp: number;
    runCount: number;
    avgOriginalPace: number; // seconds per km
    avgAdjustedPace: number; // seconds per km
    performanceIndex: number; // 0-100, relative to personal best conditions
    paceVariability: number; // standard deviation of paces in this range
    confidenceLevel: number; // 0-1 based on sample size and consistency
  }>;
  
  performanceByHumidity: Array<{
    humidityRange: string; // e.g., "40-60%"
    minHumidity: number;
    maxHumidity: number;
    runCount: number;
    avgOriginalPace: number;
    avgAdjustedPace: number;
    performanceIndex: number;
    paceVariability: number;
    confidenceLevel: number;
  }>;
  
  performanceByWind: Array<{
    windRange: string; // e.g., "0-10 km/h"
    minWindSpeed: number;
    maxWindSpeed: number;
    runCount: number;
    avgOriginalPace: number;
    avgAdjustedPace: number;
    performanceIndex: number;
    paceVariability: number;
    confidenceLevel: number;
  }>;
  
  // Acclimatization tracking
  acclimatization: {
    heatAcclimatization: {
      currentLevel: number; // 0-100
      trend: 'improving' | 'stable' | 'declining';
      recentImprovement: number; // Change in last 30 days
      timeToAcclimate: number; // Estimated days to reach next level
      progressHistory: Array<{
        date: string;
        level: number;
        triggerConditions: { temperature?: number; humidity?: number };
      }>;
    };
    coldAcclimatization: {
      currentLevel: number; // 0-100
      trend: 'improving' | 'stable' | 'declining';
      recentImprovement: number; // Change in last 30 days
      timeToAcclimate: number; // Estimated days to reach next level
      progressHistory: Array<{
        date: string;
        level: number;
        triggerConditions: { temperature?: number; humidity?: number };
      }>;
    };
  };
  
  // Metadata
  totalRunsAnalyzed: number;
  dateRange: { start: string; end: string };
  lastCalculated: string;
  dataQuality: 'high' | 'medium' | 'low';
}

export interface RaceTimePredictions {
  fiveK: { time: number; confidence: number; pacePerKm: number };
  tenK: { time: number; confidence: number; pacePerKm: number };
  halfMarathon: { time: number; confidence: number; pacePerKm: number };
  marathon: { time: number; confidence: number; pacePerKm: number };
  basedOn: {
    currentVO2Max?: number;
    recentPerformance: boolean;
    trainingLoad: boolean;
    environmentalFactors: boolean;
  };
  calculatedAt: string;
}

export interface InjuryRiskAssessment {
  score: number; // 0-100
  level: 'low' | 'moderate' | 'high' | 'critical';
  factors: Array<{
    factor: string;
    impact: 'low' | 'medium' | 'high';
    description: string;
  }>;
  recommendations: string[];
  confidence: number; // 0-1
  calculatedAt: string;
}

export interface OverreachingDetection {
  status: 'normal' | 'functional' | 'non-functional' | 'overtraining';
  confidence: number; // 0-1
  indicators: Array<{
    indicator: string;
    severity: 'low' | 'medium' | 'high';
    trend: 'improving' | 'stable' | 'worsening';
  }>;
  recommendations: string[];
  monitoringAdvice: string[];
  calculatedAt: string;
}

export interface TrainingRecommendation {
  type: 'recovery' | 'maintain' | 'increase' | 'taper' | 'build';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actionItems: string[];
  timeframe: string; // e.g., "next 1-2 weeks"
  basedOn: string[]; // factors that led to this recommendation
}

export interface FitnessProgressMetrics {
  vo2MaxProgression: Array<{
    date: string;
    value: number;
    confidence: number;
  }>;
  runningEconomyProgression: Array<{
    date: string;
    value: number;
    trend: 'improving' | 'stable' | 'declining';
  }>;
  trainingLoadProgression: Array<{
    date: string;
    ctl: number;
    atl: number;
    tsb: number;
  }>;
  performanceMarkers: Array<{
    date: string;
    distance: number;
    pace: number;
    adjustedPace: number;
    effortLevel: number;
  }>;
}

// Utility types for calculations
export interface CalculationContext {
  userPhysiology: UserPhysiologyData;
  historicalRuns: any[]; // EnrichedRun[] but avoiding circular dependency
  trainingProfile?: any; // UserTrainingProfile
  environmentalProfile?: EnvironmentalProfile;
  calculationDate: string;
}

export interface MetricCalculationResult<T> {
  value: T;
  confidence: number;
  dataQuality: DataQualityAssessment;
  calculationMethod: string;
  warnings?: string[];
}

export interface WeatherPerformancePattern {
  conditionType: 'temperature' | 'humidity' | 'wind' | 'combined';
  pattern: string; // Description of the pattern
  strength: 'weak' | 'moderate' | 'strong';
  confidence: number; // 0-1
  recommendation: string;
}

export interface EnvironmentalRecommendations {
  paceAdjustment: string;
  hydrationAdvice: string;
  clothingAdvice: string;
  overallRating: 'excellent' | 'good' | 'fair' | 'challenging';
  specificAdvice: string[];
}

// Advanced Pacing and Fatigue Analysis Types
export interface NegativeSplitAnalysis {
  probability: number; // 0-1 probability of negative splitting
  confidenceLevel: 'low' | 'medium' | 'high';
  historicalPattern: 'consistent-negative' | 'mixed' | 'consistent-positive';
  averageSplitDifference: number; // seconds per km difference between halves
  bestNegativeSplit: number; // Best negative split achieved (seconds per km)
  worstPositiveSplit: number; // Worst positive split (seconds per km)
  recommendations: string[];
}

export interface FatigueResistanceProfile {
  overallScore: number; // 0-100, higher = better fatigue resistance
  resistanceLevel: 'excellent' | 'good' | 'average' | 'needs-improvement';
  
  // Pace maintenance analysis
  paceMaintenance: {
    finalQuarterSlowdown: number; // Average slowdown in final 25% (seconds per km)
    consistencyScore: number; // 0-100, how well pace is maintained
    fatigueOnsetPoint: number; // Percentage of run where significant slowdown begins
  };
  
  // Heart rate analysis
  heartRateDrift: {
    averageDrift: number; // Average HR increase over run duration (bpm)
    driftRate: number; // HR increase per km (bpm/km)
    cardiacEfficiency: number; // 0-100, ability to maintain HR efficiency
  };
  
  // Distance-specific patterns
  distanceProfiles: Array<{
    distanceRange: string; // e.g., "5-10km"
    fatigueResistance: number; // 0-100
    typicalSlowdown: number; // seconds per km in final quarter
    sampleSize: number;
  }>;
  
  // Improvement tracking
  improvementTrend: 'improving' | 'stable' | 'declining';
  recentImprovement: number; // Change in score over last 30 days
}

export interface PacingIssueDetection {
  issues: Array<{
    type: 'excessive-early-pace' | 'poor-finishing-strength' | 'inconsistent-pacing' | 'inadequate-warmup';
    severity: 'minor' | 'moderate' | 'significant';
    frequency: number; // 0-1, how often this issue occurs
    description: string;
    impact: string; // How this affects performance
    solutions: string[];
  }>;
  
  overallPacingGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  primaryWeakness: string;
  primaryStrength: string;
  improvementPriority: string[];
}

export interface OptimalRaceStrategy {
  distance: number;
  targetPace: number; // seconds per km
  
  // Detailed pacing plan
  pacingPlan: {
    firstMile: { pace: number; effort: string; strategy: string };
    earlyMiles: { pace: number; effort: string; strategy: string };
    middleMiles: { pace: number; effort: string; strategy: string };
    finalMiles: { pace: number; effort: string; strategy: string };
    lastMile: { pace: number; effort: string; strategy: string };
  };
  
  // Fatigue management
  fatigueManagement: {
    anticipatedFatiguePoint: number; // Percentage of race
    fatigueCounterStrategies: string[];
    mentalCues: string[];
    physicalTechniques: string[];
  };
  
  // Personal strategy based on patterns
  personalizedAdvice: string[];
  riskMitigation: string[];
  confidenceFactors: string[];
}

// Export utility type for metric updates
export interface MetricUpdate {
  runId: string;
  metrics: Partial<AdvancedRunMetrics>;
  calculatedAt: string;
}