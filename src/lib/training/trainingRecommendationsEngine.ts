// Training Recommendations Engine
// Requirements: 7.1, 7.2, 7.3, 7.4, 7.5

import { EnrichedRun } from '../../types';
import { ACWRResult } from '../../types/advancedMetrics';

export interface TrainingRecommendation {
  id: string;
  type: 'training-load' | 'environmental' | 'recovery' | 'progression' | 'safety';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems: string[];
  timeframe: string;
  reasoning: string[];
  confidence: 'high' | 'medium' | 'low';
  
  // Specific recommendation data
  targetMetrics?: {
    weeklyDistance?: { min: number; max: number; unit: 'km' };
    weeklyTRIMP?: { min: number; max: number };
    intensityDistribution?: { easy: number; moderate: number; hard: number };
    restDays?: number;
  };
  
  environmentalGuidance?: {
    temperatureRange?: { min: number; max: number; unit: 'celsius' };
    paceAdjustments?: { temperature: number; humidity: number; wind: number };
    hydrationStrategy?: string;
    timingAdvice?: string;
  };
  
  createdAt: string;
  validUntil: string;
}

export interface RecommendationContext {
  // Training load context
  acwr: ACWRResult;
  recentTrainingLoad: {
    weeklyDistance: number;
    weeklyTRIMP: number;
    intensityDistribution: { zone1: number; zone2: number; zone3: number; zone4: number; zone5: number };
    restDays: number;
  };
  
  // Environmental context
  upcomingWeather?: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    conditions: string;
  };
  
  // Performance context
  recentPerformance: {
    trend: 'improving' | 'stable' | 'declining';
    fatigueLevel: 'low' | 'moderate' | 'high';
    injuryRisk: 'low' | 'moderate' | 'high' | 'critical';
  };
  
  // User context
  userGoals?: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  availableTime: number; // hours per week
}

export interface RecommendationEngine {
  generateRecommendations(
    runs: EnrichedRun[],
    context: RecommendationContext
  ): TrainingRecommendation[];
}

/**
 * Generate ACWR-based training load recommendations
 * Requirements: 7.1
 */
export const generateACWRRecommendations = (
  acwr: ACWRResult,
  recentTrainingLoad: RecommendationContext['recentTrainingLoad'],
  experienceLevel: string
): TrainingRecommendation[] => {
  const recommendations: TrainingRecommendation[] = [];
  const now = new Date();
  const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Valid for 1 week
  
  switch (acwr.status) {
    case 'high-risk':
      recommendations.push({
        id: `acwr-high-risk-${Date.now()}`,
        type: 'training-load',
        priority: 'critical',
        title: 'Reduce Training Load - High Injury Risk',
        description: `Your ACWR of ${acwr.acwr.toFixed(2)} indicates high injury risk. Immediate load reduction recommended.`,
        actionItems: [
          'Reduce weekly distance by 20-30% this week',
          'Eliminate high-intensity sessions for 3-5 days',
          'Focus on easy-paced recovery runs only',
          'Consider taking 1-2 complete rest days',
          'Monitor for signs of overreaching (elevated resting HR, poor sleep, mood changes)'
        ],
        timeframe: 'Immediate (next 3-7 days)',
        reasoning: [
          `ACWR of ${acwr.acwr.toFixed(2)} is above the safe threshold of 1.3`,
          'High ACWR correlates with 2-4x increased injury risk',
          'Acute load is significantly higher than chronic adaptation'
        ],
        confidence: 'high',
        targetMetrics: {
          weeklyDistance: {
            min: Math.round(recentTrainingLoad.weeklyDistance * 0.7),
            max: Math.round(recentTrainingLoad.weeklyDistance * 0.8),
            unit: 'km'
          },
          weeklyTRIMP: {
            min: Math.round(recentTrainingLoad.weeklyTRIMP * 0.6),
            max: Math.round(recentTrainingLoad.weeklyTRIMP * 0.7)
          },
          intensityDistribution: { easy: 90, moderate: 10, hard: 0 },
          restDays: 2
        },
        createdAt: now.toISOString(),
        validUntil: validUntil.toISOString()
      });
      break;
      
    case 'caution':
      recommendations.push({
        id: `acwr-caution-${Date.now()}`,
        type: 'training-load',
        priority: 'high',
        title: 'Monitor Training Load Carefully',
        description: `Your ACWR of ${acwr.acwr.toFixed(2)} suggests elevated risk. Proceed with caution.`,
        actionItems: [
          'Maintain current weekly distance but avoid increases',
          'Reduce intensity by 10-20% for the next week',
          'Add an extra easy day between hard sessions',
          'Pay close attention to recovery indicators',
          'Consider massage or other recovery modalities'
        ],
        timeframe: 'Next 1-2 weeks',
        reasoning: [
          `ACWR of ${acwr.acwr.toFixed(2)} is in the caution zone (1.0-1.3)`,
          'Moderate elevation in injury risk',
          'Good time to consolidate fitness gains'
        ],
        confidence: 'high',
        targetMetrics: {
          weeklyDistance: {
            min: Math.round(recentTrainingLoad.weeklyDistance * 0.9),
            max: Math.round(recentTrainingLoad.weeklyDistance * 1.0),
            unit: 'km'
          },
          intensityDistribution: { easy: 80, moderate: 15, hard: 5 },
          restDays: 1
        },
        createdAt: now.toISOString(),
        validUntil: validUntil.toISOString()
      });
      break;
      
    case 'detraining':
      const increaseAmount = experienceLevel === 'beginner' ? 0.1 : 0.15;
      recommendations.push({
        id: `acwr-detraining-${Date.now()}`,
        type: 'progression',
        priority: 'medium',
        title: 'Gradually Increase Training Load',
        description: `Your ACWR of ${acwr.acwr.toFixed(2)} suggests you can safely increase training.`,
        actionItems: [
          `Increase weekly distance by ${Math.round(increaseAmount * 100)}% this week`,
          'Add one additional training session if time permits',
          'Include some moderate intensity work',
          'Monitor response to increased load',
          'Build base fitness with consistent easy running'
        ],
        timeframe: 'Next 2-4 weeks',
        reasoning: [
          `ACWR of ${acwr.acwr.toFixed(2)} is below optimal range (0.8-1.3)`,
          'Low injury risk allows for training progression',
          'Opportunity to build fitness and work capacity'
        ],
        confidence: 'medium',
        targetMetrics: {
          weeklyDistance: {
            min: Math.round(recentTrainingLoad.weeklyDistance * (1 + increaseAmount)),
            max: Math.round(recentTrainingLoad.weeklyDistance * (1 + increaseAmount + 0.1)),
            unit: 'km'
          },
          intensityDistribution: { easy: 75, moderate: 20, hard: 5 }
        },
        createdAt: now.toISOString(),
        validUntil: validUntil.toISOString()
      });
      break;
      
    case 'optimal':
      recommendations.push({
        id: `acwr-optimal-${Date.now()}`,
        type: 'training-load',
        priority: 'low',
        title: 'Maintain Current Training Load',
        description: `Your ACWR of ${acwr.acwr.toFixed(2)} is in the optimal range. Continue current approach.`,
        actionItems: [
          'Maintain current weekly distance and intensity',
          'Continue with planned training progression',
          'Focus on consistency and quality',
          'Monitor for any signs of excessive fatigue',
          'Consider periodization for long-term development'
        ],
        timeframe: 'Ongoing',
        reasoning: [
          `ACWR of ${acwr.acwr.toFixed(2)} is in the optimal range (0.8-1.3)`,
          'Balanced acute and chronic training loads',
          'Low injury risk with good fitness stimulus'
        ],
        confidence: 'high',
        targetMetrics: {
          weeklyDistance: {
            min: Math.round(recentTrainingLoad.weeklyDistance * 0.95),
            max: Math.round(recentTrainingLoad.weeklyDistance * 1.05),
            unit: 'km'
          },
          intensityDistribution: { easy: 80, moderate: 15, hard: 5 }
        },
        createdAt: now.toISOString(),
        validUntil: validUntil.toISOString()
      });
      break;
  }
  
  return recommendations;
};

/**
 * Generate environmental condition-based recommendations
 * Requirements: 7.2
 */
export const generateEnvironmentalRecommendations = (
  upcomingWeather: RecommendationContext['upcomingWeather'],
  recentRuns: EnrichedRun[]
): TrainingRecommendation[] => {
  if (!upcomingWeather) return [];
  
  const recommendations: TrainingRecommendation[] = [];
  const now = new Date();
  const validUntil = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // Valid for 3 days
  
  const { temperature, humidity, windSpeed, conditions } = upcomingWeather;
  
  // Hot weather recommendations
  if (temperature > 25) {
    const paceAdjustment = Math.round((temperature - 20) * 2); // 2 sec/km per degree above 20°C
    
    recommendations.push({
      id: `hot-weather-${Date.now()}`,
      type: 'environmental',
      priority: temperature > 30 ? 'high' : 'medium',
      title: `Hot Weather Running Strategy (${temperature}°C)`,
      description: `Adjust your pace and hydration strategy for the hot conditions.`,
      actionItems: [
        `Slow your pace by ${paceAdjustment} seconds per km`,
        'Start hydrating 2-3 hours before running',
        'Run during cooler parts of the day (early morning or evening)',
        'Wear light-colored, breathable clothing',
        'Consider shorter runs or indoor alternatives for very hot days',
        'Take walk breaks if you feel overheated'
      ],
      timeframe: 'Next 2-3 days',
      reasoning: [
        `Temperature of ${temperature}°C requires pace adjustment`,
        'Heat stress increases cardiovascular strain',
        'Dehydration risk is elevated in hot conditions'
      ],
      confidence: 'high',
      environmentalGuidance: {
        temperatureRange: { min: 15, max: 22, unit: 'celsius' },
        paceAdjustments: { temperature: paceAdjustment, humidity: 0, wind: 0 },
        hydrationStrategy: 'Pre-hydrate 2-3 hours before, carry fluids for runs >60 minutes',
        timingAdvice: 'Run before 8 AM or after 6 PM'
      },
      createdAt: now.toISOString(),
      validUntil: validUntil.toISOString()
    });
  }
  
  // High humidity recommendations
  if (humidity > 70) {
    const humidityAdjustment = Math.round((humidity - 60) / 10 * 2); // 2 sec/km per 10% above 60%
    
    recommendations.push({
      id: `high-humidity-${Date.now()}`,
      type: 'environmental',
      priority: 'medium',
      title: `High Humidity Adjustments (${humidity}%)`,
      description: `Modify your approach for the humid conditions.`,
      actionItems: [
        `Reduce pace by ${humidityAdjustment} seconds per km`,
        'Allow extra time for cooling down',
        'Focus on perceived effort rather than pace',
        'Increase fluid intake during and after running',
        'Consider electrolyte replacement for longer runs'
      ],
      timeframe: 'Next 2-3 days',
      reasoning: [
        `Humidity of ${humidity}% impairs sweat evaporation`,
        'Reduced cooling efficiency increases heat stress',
        'Higher cardiovascular demand at same pace'
      ],
      confidence: 'medium',
      environmentalGuidance: {
        paceAdjustments: { temperature: 0, humidity: humidityAdjustment, wind: 0 },
        hydrationStrategy: 'Increase fluid intake by 20-30%',
        timingAdvice: 'Avoid midday when humidity is typically highest'
      },
      createdAt: now.toISOString(),
      validUntil: validUntil.toISOString()
    });
  }
  
  // Strong wind recommendations
  if (windSpeed > 15) {
    recommendations.push({
      id: `windy-conditions-${Date.now()}`,
      type: 'environmental',
      priority: 'medium',
      title: `Windy Conditions Strategy (${windSpeed} km/h)`,
      description: `Adapt your running strategy for strong winds.`,
      actionItems: [
        'Plan out-and-back routes to balance headwind/tailwind',
        'Start into the wind when you\'re fresh, return with tailwind',
        'Reduce pace by 5-10 seconds per km in strong headwinds',
        'Focus on maintaining effort rather than pace',
        'Consider shorter intervals if doing speed work',
        'Be extra cautious of debris and unstable footing'
      ],
      timeframe: 'Next 1-2 days',
      reasoning: [
        `Wind speed of ${windSpeed} km/h significantly affects running effort`,
        'Headwinds increase energy cost by 5-15%',
        'Route planning can minimize wind impact'
      ],
      confidence: 'medium',
      environmentalGuidance: {
        paceAdjustments: { temperature: 0, humidity: 0, wind: 8 },
        timingAdvice: 'Check wind direction and plan route accordingly'
      },
      createdAt: now.toISOString(),
      validUntil: validUntil.toISOString()
    });
  }
  
  // Cold weather recommendations
  if (temperature < 5) {
    recommendations.push({
      id: `cold-weather-${Date.now()}`,
      type: 'environmental',
      priority: 'medium',
      title: `Cold Weather Running (${temperature}°C)`,
      description: `Stay safe and comfortable in cold conditions.`,
      actionItems: [
        'Dress in layers that you can remove as you warm up',
        'Protect extremities with gloves, hat, and warm socks',
        'Extend your warm-up to prepare muscles and joints',
        'Be cautious of icy or slippery surfaces',
        'Stay hydrated - cold air is often dry',
        'Cool down indoors to prevent rapid temperature drop'
      ],
      timeframe: 'Next 2-3 days',
      reasoning: [
        `Temperature of ${temperature}°C requires cold weather precautions`,
        'Cold muscles and joints are more injury-prone',
        'Hypothermia risk in extreme conditions'
      ],
      confidence: 'high',
      environmentalGuidance: {
        temperatureRange: { min: 10, max: 20, unit: 'celsius' },
        timingAdvice: 'Midday often provides warmest conditions'
      },
      createdAt: now.toISOString(),
      validUntil: validUntil.toISOString()
    });
  }
  
  return recommendations;
};

/**
 * Generate progressive training increase suggestions
 * Requirements: 7.3
 */
export const generateProgressionRecommendations = (
  recentTrainingLoad: RecommendationContext['recentTrainingLoad'],
  performanceContext: RecommendationContext['recentPerformance'],
  experienceLevel: string,
  availableTime: number
): TrainingRecommendation[] => {
  const recommendations: TrainingRecommendation[] = [];
  const now = new Date();
  const validUntil = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // Valid for 2 weeks
  
  // Only suggest progression if performance is stable or improving and injury risk is low
  if (performanceContext.trend === 'declining' || performanceContext.injuryRisk === 'high') {
    return recommendations;
  }
  
  // Calculate safe progression rates based on experience
  const progressionRates = {
    beginner: { weekly: 0.10, monthly: 0.25 }, // 10% weekly, 25% monthly max
    intermediate: { weekly: 0.15, monthly: 0.35 },
    advanced: { weekly: 0.20, monthly: 0.45 },
    elite: { weekly: 0.25, monthly: 0.50 }
  };
  
  const rates = progressionRates[experienceLevel as keyof typeof progressionRates] || progressionRates.intermediate;
  
  // Volume progression recommendation
  if (recentTrainingLoad.weeklyDistance < availableTime * 8) { // Assuming 8km per hour capacity
    const suggestedIncrease = Math.round(recentTrainingLoad.weeklyDistance * rates.weekly);
    
    recommendations.push({
      id: `volume-progression-${Date.now()}`,
      type: 'progression',
      priority: 'medium',
      title: 'Gradual Volume Increase',
      description: `Your training load suggests room for safe volume progression.`,
      actionItems: [
        `Increase weekly distance by ${suggestedIncrease}km (${Math.round(rates.weekly * 100)}% increase)`,
        'Add the extra distance to your easiest runs first',
        'Monitor how you feel after 1 week before further increases',
        'Take a recovery week (reduce by 20%) every 4th week',
        'Prioritize consistency over big jumps in volume'
      ],
      timeframe: 'Next 2-4 weeks',
      reasoning: [
        `Current weekly distance of ${recentTrainingLoad.weeklyDistance}km allows for progression`,
        `${experienceLevel} runners can typically handle ${Math.round(rates.weekly * 100)}% weekly increases`,
        'Performance trend supports training progression'
      ],
      confidence: 'medium',
      targetMetrics: {
        weeklyDistance: {
          min: recentTrainingLoad.weeklyDistance + suggestedIncrease,
          max: recentTrainingLoad.weeklyDistance + Math.round(suggestedIncrease * 1.2),
          unit: 'km'
        }
      },
      createdAt: now.toISOString(),
      validUntil: validUntil.toISOString()
    });
  }
  
  // Intensity progression recommendation
  const currentHardPercentage = recentTrainingLoad.intensityDistribution.zone4 + 
                               recentTrainingLoad.intensityDistribution.zone5;
  
  if (currentHardPercentage < 20 && performanceContext.fatigueLevel === 'low') {
    recommendations.push({
      id: `intensity-progression-${Date.now()}`,
      type: 'progression',
      priority: 'medium',
      title: 'Add Structured Intensity',
      description: `Your current intensity distribution suggests room for more structured hard training.`,
      actionItems: [
        'Add one tempo run or interval session per week',
        'Start with shorter intervals (4-6 x 3 minutes at threshold pace)',
        'Ensure 48-72 hours recovery between hard sessions',
        'Maintain easy effort on recovery days',
        'Build intensity gradually over 4-6 weeks'
      ],
      timeframe: 'Next 4-6 weeks',
      reasoning: [
        `Current hard training is only ${Math.round(currentHardPercentage)}% of total`,
        'Low fatigue level supports intensity addition',
        'Structured intensity improves performance more than volume alone'
      ],
      confidence: 'medium',
      targetMetrics: {
        intensityDistribution: { easy: 75, moderate: 15, hard: 10 }
      },
      createdAt: now.toISOString(),
      validUntil: validUntil.toISOString()
    });
  }
  
  return recommendations;
};

/**
 * Generate recovery strategy recommendations
 * Requirements: 7.4, 7.5
 */
export const generateRecoveryRecommendations = (
  performanceContext: RecommendationContext['recentPerformance'],
  recentTrainingLoad: RecommendationContext['recentTrainingLoad'],
  upcomingWeather?: RecommendationContext['upcomingWeather']
): TrainingRecommendation[] => {
  const recommendations: TrainingRecommendation[] = [];
  const now = new Date();
  const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Valid for 1 week
  
  // High fatigue recovery recommendations
  if (performanceContext.fatigueLevel === 'high') {
    recommendations.push({
      id: `high-fatigue-recovery-${Date.now()}`,
      type: 'recovery',
      priority: 'high',
      title: 'Active Recovery Protocol',
      description: `Your fatigue level indicates need for focused recovery strategies.`,
      actionItems: [
        'Reduce training intensity by 30-50% for 3-5 days',
        'Focus on easy-paced runs of 30-45 minutes maximum',
        'Add extra sleep (aim for 8+ hours per night)',
        'Include active recovery activities (walking, gentle yoga, swimming)',
        'Consider massage or foam rolling sessions',
        'Monitor resting heart rate for recovery indicators',
        'Prioritize nutrition and hydration'
      ],
      timeframe: 'Next 3-7 days',
      reasoning: [
        'High fatigue level indicates accumulated training stress',
        'Active recovery promotes blood flow and adaptation',
        'Reduced intensity allows physiological recovery'
      ],
      confidence: 'high',
      targetMetrics: {
        intensityDistribution: { easy: 95, moderate: 5, hard: 0 },
        restDays: 1
      },
      createdAt: now.toISOString(),
      validUntil: validUntil.toISOString()
    });
  }
  
  // Environmental stress recovery
  if (upcomingWeather && (upcomingWeather.temperature > 28 || upcomingWeather.humidity > 80)) {
    recommendations.push({
      id: `environmental-stress-recovery-${Date.now()}`,
      type: 'recovery',
      priority: 'medium',
      title: 'Environmental Stress Recovery',
      description: `Hot/humid conditions increase recovery needs.`,
      actionItems: [
        'Increase fluid intake by 20-30% on training days',
        'Include electrolyte replacement in longer sessions',
        'Cool down thoroughly after hot weather runs',
        'Consider ice baths or cold showers for heat dissipation',
        'Monitor for signs of heat exhaustion',
        'Allow extra recovery time between hard sessions'
      ],
      timeframe: 'During hot weather period',
      reasoning: [
        'Heat stress increases cardiovascular strain',
        'Dehydration impairs recovery processes',
        'Environmental stress compounds training stress'
      ],
      confidence: 'medium',
      environmentalGuidance: {
        hydrationStrategy: 'Increase intake by 500-750ml per hour in hot conditions',
        timingAdvice: 'Schedule recovery runs during cooler parts of day'
      },
      createdAt: now.toISOString(),
      validUntil: validUntil.toISOString()
    });
  }
  
  // Insufficient rest days recommendation
  if (recentTrainingLoad.restDays < 1) {
    recommendations.push({
      id: `rest-days-${Date.now()}`,
      type: 'recovery',
      priority: 'medium',
      title: 'Schedule Regular Rest Days',
      description: `You haven't taken enough complete rest days recently.`,
      actionItems: [
        'Schedule at least 1 complete rest day per week',
        'Use rest days for complete physical inactivity or very light activities',
        'Focus on sleep, nutrition, and stress management on rest days',
        'Consider 2 rest days per week if training volume is high',
        'Listen to your body - take extra rest if feeling overly fatigued'
      ],
      timeframe: 'Ongoing weekly schedule',
      reasoning: [
        `Only ${recentTrainingLoad.restDays} rest days in recent training`,
        'Complete rest allows physiological adaptation',
        'Prevents accumulation of fatigue and overuse injuries'
      ],
      confidence: 'high',
      targetMetrics: {
        restDays: 1
      },
      createdAt: now.toISOString(),
      validUntil: validUntil.toISOString()
    });
  }
  
  return recommendations;
};

/**
 * Main recommendation engine that combines all recommendation types
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
export const generateTrainingRecommendations = (
  runs: EnrichedRun[],
  context: RecommendationContext
): TrainingRecommendation[] => {
  const allRecommendations: TrainingRecommendation[] = [];
  
  // Generate ACWR-based recommendations
  const acwrRecs = generateACWRRecommendations(
    context.acwr,
    context.recentTrainingLoad,
    context.experienceLevel
  );
  allRecommendations.push(...acwrRecs);
  
  // Generate environmental recommendations
  const envRecs = generateEnvironmentalRecommendations(
    context.upcomingWeather,
    runs
  );
  allRecommendations.push(...envRecs);
  
  // Generate progression recommendations (only if not in high-risk state)
  if (context.acwr.status !== 'high-risk' && context.recentPerformance.injuryRisk !== 'high') {
    const progressionRecs = generateProgressionRecommendations(
      context.recentTrainingLoad,
      context.recentPerformance,
      context.experienceLevel,
      context.availableTime
    );
    allRecommendations.push(...progressionRecs);
  }
  
  // Generate recovery recommendations
  const recoveryRecs = generateRecoveryRecommendations(
    context.recentPerformance,
    context.recentTrainingLoad,
    context.upcomingWeather
  );
  allRecommendations.push(...recoveryRecs);
  
  // Sort by priority and return
  const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  return allRecommendations.sort((a, b) => 
    priorityOrder[b.priority] - priorityOrder[a.priority]
  );
};

/**
 * Filter recommendations based on user preferences and context
 */
export const filterRecommendations = (
  recommendations: TrainingRecommendation[],
  filters: {
    maxRecommendations?: number;
    minPriority?: 'critical' | 'high' | 'medium' | 'low';
    excludeTypes?: string[];
    timeframe?: 'immediate' | 'short-term' | 'long-term';
  }
): TrainingRecommendation[] => {
  let filtered = [...recommendations];
  
  // Filter by minimum priority
  if (filters.minPriority) {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const minLevel = priorityOrder[filters.minPriority];
    filtered = filtered.filter(rec => priorityOrder[rec.priority] >= minLevel);
  }
  
  // Filter by excluded types
  if (filters.excludeTypes) {
    filtered = filtered.filter(rec => !filters.excludeTypes!.includes(rec.type));
  }
  
  // Filter by timeframe
  if (filters.timeframe) {
    const timeframeKeywords = {
      immediate: ['immediate', 'next 1-2 days', 'next 3-7 days'],
      'short-term': ['next 1-2 weeks', 'next 2-4 weeks'],
      'long-term': ['next 4-6 weeks', 'ongoing', 'long-term']
    };
    
    const keywords = timeframeKeywords[filters.timeframe];
    filtered = filtered.filter(rec => 
      keywords.some(keyword => 
        rec.timeframe.toLowerCase().includes(keyword.toLowerCase())
      )
    );
  }
  
  // Limit number of recommendations
  if (filters.maxRecommendations) {
    filtered = filtered.slice(0, filters.maxRecommendations);
  }
  
  return filtered;
};