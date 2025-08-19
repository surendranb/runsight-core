// User Profile Management for Physiological Data
// Requirements: 6.1, 6.2, 6.3, 6.4, 6.5

import { EnrichedRun } from '../../types';

export interface UserPhysiologyProfile {
  id?: string;
  userId: string;
  
  // Core physiological data
  restingHeartRate?: number; // bpm
  maxHeartRate?: number; // bpm
  bodyWeight?: number; // kg
  height?: number; // cm
  age?: number;
  gender?: 'male' | 'female' | 'other';
  
  // Fitness level and experience
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  runningExperience?: number; // years
  weeklyMileage?: number; // km per week
  
  // Estimation flags and confidence
  maxHREstimated: boolean;
  restingHREstimated: boolean;
  estimationMethod?: 'age-based' | 'observed-max' | 'user-input' | 'fitness-test';
  
  // Data freshness tracking
  lastUpdated: string;
  dataFreshness: 'fresh' | 'stale' | 'outdated';
  nextUpdateReminder?: string;
  
  // Validation and quality
  dataQuality: 'high' | 'medium' | 'low';
  validationErrors: string[];
  
  createdAt: string;
  updatedAt: string;
}

export interface PhysiologyEstimation {
  estimatedMaxHR?: number;
  estimatedRestingHR?: number;
  confidence: 'high' | 'medium' | 'low';
  method: 'age-based' | 'observed-max' | 'fitness-test' | 'default';
  disclaimers: string[];
  recommendations: string[];
}

export interface ProfileUpdateResult {
  success: boolean;
  profile: UserPhysiologyProfile;
  recalculationNeeded: boolean;
  affectedMetrics: string[];
  warnings: string[];
}

export interface DataFreshnessCheck {
  isStale: boolean;
  daysSinceUpdate: number;
  recommendedActions: string[];
  criticalUpdatesNeeded: string[];
}

/**
 * Create or update user physiology profile
 * Requirements: 6.1, 6.2
 */
export const createOrUpdatePhysiologyProfile = (
  userId: string,
  profileData: Partial<UserPhysiologyProfile>,
  existingProfile?: UserPhysiologyProfile
): ProfileUpdateResult => {
  const now = new Date().toISOString();
  
  // Validate input data
  const validation = validatePhysiologyData(profileData);
  
  // Determine what changed for recalculation needs
  const changedFields = existingProfile 
    ? detectChangedFields(existingProfile, profileData)
    : Object.keys(profileData);
  
  // Create updated profile
  const updatedProfile: UserPhysiologyProfile = {
    ...existingProfile,
    ...profileData,
    userId,
    lastUpdated: now,
    updatedAt: now,
    dataFreshness: 'fresh',
    dataQuality: validation.quality,
    validationErrors: validation.errors,
    maxHREstimated: profileData.maxHeartRate ? false : (existingProfile?.maxHREstimated ?? true),
    restingHREstimated: profileData.restingHeartRate ? false : (existingProfile?.restingHREstimated ?? true),
    createdAt: existingProfile?.createdAt ?? now
  };
  
  // Set next update reminder (3 months for most data, 6 months for weight/height)
  const reminderDate = new Date();
  reminderDate.setMonth(reminderDate.getMonth() + 3);
  updatedProfile.nextUpdateReminder = reminderDate.toISOString();
  
  // Determine if recalculation is needed
  const recalculationNeeded = needsRecalculation(changedFields);
  const affectedMetrics = getAffectedMetrics(changedFields);
  
  return {
    success: validation.errors.length === 0,
    profile: updatedProfile,
    recalculationNeeded,
    affectedMetrics,
    warnings: validation.warnings
  };
};

/**
 * Estimate missing physiological data with disclaimers
 * Requirements: 6.2
 */
export const estimatePhysiologyData = (
  profile: Partial<UserPhysiologyProfile>,
  recentRuns: EnrichedRun[] = []
): PhysiologyEstimation => {
  const disclaimers: string[] = [];
  const recommendations: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  let method: 'age-based' | 'observed-max' | 'fitness-test' | 'default' = 'default';
  
  let estimatedMaxHR: number | undefined;
  let estimatedRestingHR: number | undefined;
  
  // Estimate max heart rate
  if (!profile.maxHeartRate) {
    if (profile.age) {
      // Use age-based estimation (Tanaka formula is more accurate than 220-age)
      estimatedMaxHR = Math.round(208 - (0.7 * profile.age));
      method = 'age-based';
      confidence = 'medium';
      disclaimers.push('Max heart rate estimated using age-based formula (Tanaka et al.)');
      recommendations.push('Consider a fitness test or monitor your highest heart rate during intense training');
    } else if (recentRuns.length > 0) {
      // Use observed maximum from recent runs
      const hrRuns = recentRuns.filter(run => run.max_heartrate && run.max_heartrate > 0);
      if (hrRuns.length >= 5) {
        const observedMax = Math.max(...hrRuns.map(run => run.max_heartrate!));
        estimatedMaxHR = Math.min(observedMax + 5, 220); // Add small buffer, cap at 220
        method = 'observed-max';
        confidence = 'medium';
        disclaimers.push('Max heart rate estimated from your highest recorded heart rate');
        recommendations.push('This estimate may be conservative - consider a proper fitness test');
      } else {
        estimatedMaxHR = 185; // Conservative default
        method = 'default';
        confidence = 'low';
        disclaimers.push('Max heart rate set to conservative default due to insufficient data');
        recommendations.push('Please provide your age or complete more runs with heart rate data');
      }
    } else {
      estimatedMaxHR = 185; // Conservative default
      method = 'default';
      confidence = 'low';
      disclaimers.push('Max heart rate set to conservative default');
      recommendations.push('Please provide your age or complete runs with heart rate monitoring');
    }
  }
  
  // Estimate resting heart rate
  if (!profile.restingHeartRate) {
    if (profile.fitnessLevel) {
      // Estimate based on fitness level
      switch (profile.fitnessLevel) {
        case 'elite':
          estimatedRestingHR = 45;
          break;
        case 'advanced':
          estimatedRestingHR = 50;
          break;
        case 'intermediate':
          estimatedRestingHR = 60;
          break;
        case 'beginner':
          estimatedRestingHR = 70;
          break;
        default:
          estimatedRestingHR = 60;
      }
      disclaimers.push('Resting heart rate estimated based on fitness level');
      recommendations.push('Measure your resting heart rate first thing in the morning for accuracy');
    } else {
      estimatedRestingHR = 60; // Average default
      disclaimers.push('Resting heart rate set to population average');
      recommendations.push('Please measure and input your actual resting heart rate');
    }
  }
  
  return {
    estimatedMaxHR,
    estimatedRestingHR,
    confidence,
    method,
    disclaimers,
    recommendations
  };
};

/**
 * Check data freshness and recommend updates
 * Requirements: 6.4
 */
export const checkDataFreshness = (profile: UserPhysiologyProfile): DataFreshnessCheck => {
  const now = new Date();
  const lastUpdate = new Date(profile.lastUpdated);
  const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
  
  const recommendedActions: string[] = [];
  const criticalUpdatesNeeded: string[] = [];
  
  // Check age-dependent data (max HR estimation becomes less accurate over time)
  if (profile.maxHREstimated && daysSinceUpdate > 365) {
    criticalUpdatesNeeded.push('Max heart rate estimation is over 1 year old');
    recommendedActions.push('Consider updating your age or conducting a fitness test');
  }
  
  // Check weight data (can change significantly)
  if (daysSinceUpdate > 90) {
    recommendedActions.push('Consider updating your body weight if it has changed');
  }
  
  // Check fitness level (should be reviewed periodically)
  if (daysSinceUpdate > 180) {
    recommendedActions.push('Review your fitness level - has your training changed significantly?');
  }
  
  // Check resting HR (can improve with training)
  if (profile.restingHREstimated && daysSinceUpdate > 90) {
    recommendedActions.push('Measure your current resting heart rate - it may have improved');
  }
  
  const isStale = daysSinceUpdate > 90 || criticalUpdatesNeeded.length > 0;
  
  return {
    isStale,
    daysSinceUpdate,
    recommendedActions,
    criticalUpdatesNeeded
  };
};

/**
 * Trigger recalculation of historical metrics when profile is updated
 * Requirements: 6.3
 */
export const triggerHistoricalRecalculation = (
  profile: UserPhysiologyProfile,
  changedFields: string[]
): {
  shouldRecalculate: boolean;
  affectedPeriod: 'all' | 'recent' | 'none';
  estimatedDuration: string;
  affectedMetrics: string[];
} => {
  const criticalFields = ['maxHeartRate', 'restingHeartRate', 'bodyWeight'];
  const hasCriticalChanges = changedFields.some(field => criticalFields.includes(field));
  
  if (!hasCriticalChanges) {
    return {
      shouldRecalculate: false,
      affectedPeriod: 'none',
      estimatedDuration: '0 minutes',
      affectedMetrics: []
    };
  }
  
  const affectedMetrics: string[] = [];
  
  if (changedFields.includes('maxHeartRate') || changedFields.includes('restingHeartRate')) {
    affectedMetrics.push(
      'Training zones',
      'Heart rate-based metrics',
      'TRIMP calculations',
      'VO2 max estimates',
      'Training load analysis'
    );
  }
  
  if (changedFields.includes('bodyWeight')) {
    affectedMetrics.push(
      'Power estimates',
      'Running economy',
      'Environmental adjustments'
    );
  }
  
  // Determine recalculation scope
  const affectedPeriod: 'all' | 'recent' = 
    changedFields.includes('maxHeartRate') || changedFields.includes('restingHeartRate') 
      ? 'all' 
      : 'recent';
  
  const estimatedDuration = affectedPeriod === 'all' ? '5-10 minutes' : '1-2 minutes';
  
  return {
    shouldRecalculate: true,
    affectedPeriod,
    estimatedDuration,
    affectedMetrics
  };
};

/**
 * Generate update prompts for outdated data
 * Requirements: 6.5
 */
export const generateUpdatePrompts = (profile: UserPhysiologyProfile): {
  prompts: Array<{
    field: string;
    priority: 'high' | 'medium' | 'low';
    message: string;
    helpText: string;
  }>;
  overallScore: number; // 0-100, completeness score
} => {
  const prompts: Array<{
    field: string;
    priority: 'high' | 'medium' | 'low';
    message: string;
    helpText: string;
  }> = [];
  
  let completenessScore = 0;
  const totalFields = 8; // Number of important fields
  
  // Check max heart rate
  if (!profile.maxHeartRate) {
    prompts.push({
      field: 'maxHeartRate',
      priority: 'high',
      message: 'Add your maximum heart rate for accurate training zones',
      helpText: 'You can estimate this as 220 minus your age, or measure it during a fitness test'
    });
  } else {
    completenessScore += 15;
  }
  
  // Check resting heart rate
  if (!profile.restingHeartRate) {
    prompts.push({
      field: 'restingHeartRate',
      priority: 'high',
      message: 'Add your resting heart rate for better fitness tracking',
      helpText: 'Measure this first thing in the morning before getting out of bed'
    });
  } else {
    completenessScore += 15;
  }
  
  // Check body weight
  if (!profile.bodyWeight) {
    prompts.push({
      field: 'bodyWeight',
      priority: 'medium',
      message: 'Add your body weight for power estimates and better analysis',
      helpText: 'This helps calculate running power and environmental adjustments'
    });
  } else {
    completenessScore += 10;
  }
  
  // Check age
  if (!profile.age) {
    prompts.push({
      field: 'age',
      priority: 'medium',
      message: 'Add your age for more accurate heart rate zone calculations',
      helpText: 'Age is used to estimate maximum heart rate if not provided directly'
    });
  } else {
    completenessScore += 10;
  }
  
  // Check height
  if (!profile.height) {
    prompts.push({
      field: 'height',
      priority: 'low',
      message: 'Add your height for comprehensive body composition tracking',
      helpText: 'Height helps with BMI calculations and running efficiency analysis'
    });
  } else {
    completenessScore += 10;
  }
  
  // Check fitness level
  if (!profile.fitnessLevel) {
    prompts.push({
      field: 'fitnessLevel',
      priority: 'medium',
      message: 'Set your fitness level for personalized recommendations',
      helpText: 'This helps tailor training advice and metric interpretations to your level'
    });
  } else {
    completenessScore += 15;
  }
  
  // Check running experience
  if (!profile.runningExperience) {
    prompts.push({
      field: 'runningExperience',
      priority: 'low',
      message: 'Add your running experience for better context',
      helpText: 'Years of running experience helps interpret your metrics and progress'
    });
  } else {
    completenessScore += 10;
  }
  
  // Check weekly mileage
  if (!profile.weeklyMileage) {
    prompts.push({
      field: 'weeklyMileage',
      priority: 'low',
      message: 'Add your typical weekly mileage for training load context',
      helpText: 'This helps set appropriate training load targets and recommendations'
    });
  } else {
    completenessScore += 15;
  }
  
  return {
    prompts: prompts.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }),
    overallScore: completenessScore
  };
};

/**
 * Validate physiology data input
 * Requirements: 6.1
 */
const validatePhysiologyData = (data: Partial<UserPhysiologyProfile>): {
  quality: 'high' | 'medium' | 'low';
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate heart rate data
  if (data.maxHeartRate !== undefined) {
    if (data.maxHeartRate < 120 || data.maxHeartRate > 220) {
      errors.push('Maximum heart rate must be between 120 and 220 bpm');
    }
  }
  
  if (data.restingHeartRate !== undefined) {
    if (data.restingHeartRate < 30 || data.restingHeartRate > 100) {
      errors.push('Resting heart rate must be between 30 and 100 bpm');
    }
  }
  
  // Check heart rate relationship
  if (data.maxHeartRate && data.restingHeartRate) {
    if (data.maxHeartRate <= data.restingHeartRate) {
      errors.push('Maximum heart rate must be higher than resting heart rate');
    }
    if (data.maxHeartRate - data.restingHeartRate < 50) {
      warnings.push('Heart rate range seems narrow - please verify your values');
    }
  }
  
  // Validate body measurements
  if (data.bodyWeight !== undefined) {
    if (data.bodyWeight < 30 || data.bodyWeight > 200) {
      errors.push('Body weight must be between 30 and 200 kg');
    }
  }
  
  if (data.height !== undefined) {
    if (data.height < 120 || data.height > 250) {
      errors.push('Height must be between 120 and 250 cm');
    }
  }
  
  // Validate age
  if (data.age !== undefined) {
    if (data.age < 10 || data.age > 100) {
      errors.push('Age must be between 10 and 100 years');
    }
  }
  
  // Validate experience
  if (data.runningExperience !== undefined) {
    if (data.runningExperience < 0 || data.runningExperience > 50) {
      errors.push('Running experience must be between 0 and 50 years');
    }
  }
  
  // Validate weekly mileage
  if (data.weeklyMileage !== undefined) {
    if (data.weeklyMileage < 0 || data.weeklyMileage > 300) {
      errors.push('Weekly mileage must be between 0 and 300 km');
    }
  }
  
  // Determine quality
  let quality: 'high' | 'medium' | 'low' = 'high';
  if (errors.length > 0) quality = 'low';
  else if (warnings.length > 0) quality = 'medium';
  
  return { quality, errors, warnings };
};

/**
 * Detect which fields changed between profiles
 */
const detectChangedFields = (
  existing: UserPhysiologyProfile,
  updated: Partial<UserPhysiologyProfile>
): string[] => {
  const changedFields: string[] = [];
  
  Object.keys(updated).forEach(key => {
    const existingValue = existing[key as keyof UserPhysiologyProfile];
    const updatedValue = updated[key as keyof UserPhysiologyProfile];
    
    if (existingValue !== updatedValue) {
      changedFields.push(key);
    }
  });
  
  return changedFields;
};

/**
 * Determine if recalculation is needed based on changed fields
 */
const needsRecalculation = (changedFields: string[]): boolean => {
  const criticalFields = [
    'maxHeartRate',
    'restingHeartRate',
    'bodyWeight',
    'age',
    'fitnessLevel'
  ];
  
  return changedFields.some(field => criticalFields.includes(field));
};

/**
 * Get list of metrics affected by field changes
 */
const getAffectedMetrics = (changedFields: string[]): string[] => {
  const affectedMetrics: string[] = [];
  
  if (changedFields.includes('maxHeartRate') || changedFields.includes('restingHeartRate')) {
    affectedMetrics.push('Training Zones', 'TRIMP Scores', 'Heart Rate Analysis');
  }
  
  if (changedFields.includes('bodyWeight')) {
    affectedMetrics.push('Power Estimates', 'Running Economy');
  }
  
  if (changedFields.includes('age')) {
    affectedMetrics.push('VO2 Max Estimates', 'Age-Graded Performance');
  }
  
  if (changedFields.includes('fitnessLevel')) {
    affectedMetrics.push('Training Recommendations', 'Metric Interpretations');
  }
  
  return [...new Set(affectedMetrics)]; // Remove duplicates
};