import { ActionableInsight } from '../../components/insights/ActionableInsightCard';

/**
 * Utility functions to categorize insights for redistribution from Overview tab
 * to Performance, Training, and Environment tabs
 */

export type TabDomain = 'performance' | 'training' | 'environment';

export interface CategorizedInsights {
  performance: ActionableInsight[];
  training: ActionableInsight[];
  environment: ActionableInsight[];
  uncategorized: ActionableInsight[];
}

/**
 * Maps insight categories to target tabs based on domain relevance
 */
const INSIGHT_CATEGORY_MAPPING: Record<string, TabDomain> = {
  // Performance tab - pace, speed, efficiency, achievements
  'performance': 'performance',
  'achievement': 'performance',
  
  // Training tab - consistency, training structure, health/recovery
  'consistency': 'training',
  'training': 'training',
  'health': 'training',
  
  // Environment tab - weather, location, time-based insights
  // Note: Weather insights are identified by insight ID patterns
};

/**
 * Identifies weather/environment-related insights by ID patterns
 */
const WEATHER_INSIGHT_IDS = [
  'weather_performance',
  'location_intelligence',
  'time_of_day_patterns',
  'elevation_performance',
  'wind_performance'
];

/**
 * Categorizes a single insight into the appropriate tab domain
 */
export function categorizeInsight(insight: ActionableInsight): TabDomain | 'uncategorized' {
  // Check for weather/environment insights first
  if (WEATHER_INSIGHT_IDS.some(id => insight.id.includes(id.split('_')[0]))) {
    return 'environment';
  }
  
  // Check for specific weather-related insight patterns
  if (insight.id.includes('weather') || 
      insight.title.toLowerCase().includes('weather') ||
      insight.title.toLowerCase().includes('temperature') ||
      insight.title.toLowerCase().includes('location') ||
      insight.title.toLowerCase().includes('time of day')) {
    return 'environment';
  }
  
  // Use category mapping for other insights
  const domain = INSIGHT_CATEGORY_MAPPING[insight.category];
  return domain || 'uncategorized';
}

/**
 * Categorizes all insights into tab domains
 */
export function categorizeInsights(insights: ActionableInsight[]): CategorizedInsights {
  const categorized: CategorizedInsights = {
    performance: [],
    training: [],
    environment: [],
    uncategorized: []
  };
  
  insights.forEach(insight => {
    const domain = categorizeInsight(insight);
    if (domain === 'uncategorized') {
      categorized.uncategorized.push(insight);
    } else {
      categorized[domain].push(insight);
    }
  });
  
  return categorized;
}

/**
 * Filters insights for a specific tab domain
 */
export function getInsightsForTab(insights: ActionableInsight[], tab: TabDomain): ActionableInsight[] {
  return insights.filter(insight => categorizeInsight(insight) === tab);
}

/**
 * Gets performance-related insights (pace, speed, achievements)
 */
export function getPerformanceInsights(insights: ActionableInsight[]): ActionableInsight[] {
  return getInsightsForTab(insights, 'performance');
}

/**
 * Gets training-related insights (consistency, recovery, training structure)
 */
export function getTrainingInsights(insights: ActionableInsight[]): ActionableInsight[] {
  return getInsightsForTab(insights, 'training');
}

/**
 * Gets environment-related insights (weather, location, time patterns)
 */
export function getEnvironmentInsights(insights: ActionableInsight[]): ActionableInsight[] {
  return getInsightsForTab(insights, 'environment');
}

/**
 * Validates that all insights are properly categorized
 */
export function validateInsightCategorization(insights: ActionableInsight[]): {
  totalInsights: number;
  categorizedInsights: number;
  uncategorizedInsights: number;
  categoryBreakdown: Record<TabDomain, number>;
} {
  const categorized = categorizeInsights(insights);
  
  return {
    totalInsights: insights.length,
    categorizedInsights: insights.length - categorized.uncategorized.length,
    uncategorizedInsights: categorized.uncategorized.length,
    categoryBreakdown: {
      performance: categorized.performance.length,
      training: categorized.training.length,
      environment: categorized.environment.length
    }
  };
}

/**
 * Debug function to show how insights would be categorized
 */
export function debugInsightCategorization(insights: ActionableInsight[]): void {
  console.log('=== Insight Categorization Debug ===');
  
  const categorized = categorizeInsights(insights);
  
  console.log(`Total insights: ${insights.length}`);
  console.log(`Performance: ${categorized.performance.length}`);
  console.log(`Training: ${categorized.training.length}`);
  console.log(`Environment: ${categorized.environment.length}`);
  console.log(`Uncategorized: ${categorized.uncategorized.length}`);
  
  if (categorized.uncategorized.length > 0) {
    console.log('\nUncategorized insights:');
    categorized.uncategorized.forEach(insight => {
      console.log(`- ${insight.id}: ${insight.title} (category: ${insight.category})`);
    });
  }
  
  console.log('\nPerformance insights:');
  categorized.performance.forEach(insight => {
    console.log(`- ${insight.id}: ${insight.title}`);
  });
  
  console.log('\nTraining insights:');
  categorized.training.forEach(insight => {
    console.log(`- ${insight.id}: ${insight.title}`);
  });
  
  console.log('\nEnvironment insights:');
  categorized.environment.forEach(insight => {
    console.log(`- ${insight.id}: ${insight.title}`);
  });
}