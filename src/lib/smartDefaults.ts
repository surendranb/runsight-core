// Smart defaults system for user preferences and intelligent selections
// Implements external memory patterns to reduce cognitive load

import { EnrichedRun } from '../types';

export interface UserPreferences {
  timePeriod: string;
  chartSettings: {
    showMovingAverage: boolean;
    highlightPersonalRecords: boolean;
    showWeatherIndicators: boolean;
  };
  dashboardLayout: {
    expandedSections: Record<string, boolean>;
    selectedMetrics: string[];
  };
  lastVisited: {
    section: string;
    timestamp: number;
  };
}

// Default preferences based on common runner needs
export const defaultPreferences: UserPreferences = {
  timePeriod: 'last30', // Most runners want to see recent progress
  chartSettings: {
    showMovingAverage: true, // Helps identify trends
    highlightPersonalRecords: true, // Motivational
    showWeatherIndicators: true // Useful for performance analysis
  },
  dashboardLayout: {
    expandedSections: {
      trends: true, // Primary focus
      activities: true, // Recent activity is important
      insights: false, // Secondary information
      advanced: false // Detailed analysis on demand
    },
    selectedMetrics: ['pace', 'distance', 'consistency', 'improvement']
  },
  lastVisited: {
    section: 'dashboard',
    timestamp: Date.now()
  }
};

// Local storage key for preferences
const PREFERENCES_KEY = 'runsight_user_preferences';

// Smart defaults engine
export class SmartDefaultsEngine {
  private preferences: UserPreferences;

  constructor() {
    this.preferences = this.loadPreferences();
  }

  // Load preferences from localStorage with fallback to defaults
  private loadPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new preference keys
        return { ...defaultPreferences, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
    return { ...defaultPreferences };
  }

  // Save preferences to localStorage
  private savePreferences(): void {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      console.warn('Failed to save user preferences:', error);
    }
  }

  // Get current preferences
  getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  // Update specific preference
  updatePreference<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ): void {
    this.preferences[key] = value;
    this.savePreferences();
  }

  // Update nested preference
  updateNestedPreference(
    path: string,
    value: any
  ): void {
    const keys = path.split('.');
    let current: any = this.preferences;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    this.savePreferences();
  }

  // Get intelligent time period based on data availability and user patterns
  getSmartTimePeriod(runs: EnrichedRun[]): string {
    if (runs.length === 0) return 'allTime';

    // If user has a preferred period and has data for it, use it
    const preferredPeriod = this.preferences.timePeriod;
    const hasRecentData = this.hasDataForPeriod(runs, preferredPeriod);
    
    if (hasRecentData) {
      return preferredPeriod;
    }

    // Otherwise, find the best period based on data availability
    const periods = ['last7', 'last30', 'last90', 'thisYear', 'allTime'];
    
    for (const period of periods) {
      if (this.hasDataForPeriod(runs, period)) {
        // Update preference to this working period
        this.updatePreference('timePeriod', period);
        return period;
      }
    }

    return 'allTime';
  }

  // Check if there's sufficient data for a time period
  private hasDataForPeriod(runs: EnrichedRun[], period: string): boolean {
    const now = new Date();
    let startDate: Date;
    let minRuns = 3; // Minimum runs needed for meaningful analysis

    switch (period) {
      case 'last7':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        minRuns = 2;
        break;
      case 'last30':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        minRuns = 3;
        break;
      case 'last90':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        minRuns = 5;
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        minRuns = 10;
        break;
      default:
        return runs.length >= minRuns;
    }

    const periodRuns = runs.filter(run => 
      new Date(run.start_date_local) >= startDate
    );

    return periodRuns.length >= minRuns;
  }

  // Get smart chart settings based on data characteristics
  getSmartChartSettings(runs: EnrichedRun[]): UserPreferences['chartSettings'] {
    const settings = { ...this.preferences.chartSettings };

    // If there are few runs, don't show moving average
    if (runs.length < 5) {
      settings.showMovingAverage = false;
    }

    // If no weather data, don't show weather indicators
    const hasWeatherData = runs.some(run => run.weather_data);
    if (!hasWeatherData) {
      settings.showWeatherIndicators = false;
    }

    return settings;
  }

  // Identify and highlight significant changes automatically
  getSignificantChanges(runs: EnrichedRun[]): Array<{
    type: 'improvement' | 'decline' | 'achievement' | 'pattern';
    metric: string;
    description: string;
    confidence: number;
    data: any;
  }> {
    if (runs.length < 10) return [];

    const changes = [];
    const sortedRuns = [...runs].sort((a, b) => 
      new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
    );

    // Analyze pace improvements
    const paceChange = this.analyzePaceChange(sortedRuns);
    if (paceChange) {
      changes.push(paceChange);
    }

    // Analyze consistency improvements
    const consistencyChange = this.analyzeConsistencyChange(sortedRuns);
    if (consistencyChange) {
      changes.push(consistencyChange);
    }

    // Analyze distance progression
    const distanceChange = this.analyzeDistanceChange(sortedRuns);
    if (distanceChange) {
      changes.push(distanceChange);
    }

    return changes.sort((a, b) => b.confidence - a.confidence);
  }

  private analyzePaceChange(runs: EnrichedRun[]) {
    const recentRuns = runs.slice(-10);
    const olderRuns = runs.slice(-20, -10);

    if (recentRuns.length < 5 || olderRuns.length < 5) return null;

    const recentAvgPace = recentRuns.reduce((sum, run) => 
      sum + (run.moving_time / (run.distance / 1000)), 0
    ) / recentRuns.length;

    const olderAvgPace = olderRuns.reduce((sum, run) => 
      sum + (run.moving_time / (run.distance / 1000)), 0
    ) / olderRuns.length;

    const improvement = ((olderAvgPace - recentAvgPace) / olderAvgPace) * 100;

    if (Math.abs(improvement) > 5) {
      return {
        type: improvement > 0 ? 'improvement' : 'decline' as const,
        metric: 'pace',
        description: `Your pace has ${improvement > 0 ? 'improved' : 'declined'} by ${Math.abs(improvement).toFixed(1)}% over your last 10 runs`,
        confidence: Math.min(Math.abs(improvement) / 10, 0.9),
        data: { improvement, recentAvgPace, olderAvgPace }
      };
    }

    return null;
  }

  private analyzeConsistencyChange(runs: EnrichedRun[]) {
    const recentRuns = runs.slice(-10);
    if (recentRuns.length < 5) return null;

    const paces = recentRuns.map(run => run.moving_time / (run.distance / 1000));
    const avgPace = paces.reduce((sum, pace) => sum + pace, 0) / paces.length;
    const variance = paces.reduce((sum, pace) => sum + Math.pow(pace - avgPace, 2), 0) / paces.length;
    const consistency = 1 - (Math.sqrt(variance) / avgPace);

    if (consistency > 0.9) {
      return {
        type: 'achievement' as const,
        metric: 'consistency',
        description: `Excellent pacing consistency in your recent runs (${(consistency * 100).toFixed(1)}% consistency score)`,
        confidence: consistency,
        data: { consistency, variance: Math.sqrt(variance) }
      };
    }

    return null;
  }

  private analyzeDistanceChange(runs: EnrichedRun[]) {
    const recentRuns = runs.slice(-10);
    const olderRuns = runs.slice(-20, -10);

    if (recentRuns.length < 5 || olderRuns.length < 5) return null;

    const recentAvgDistance = recentRuns.reduce((sum, run) => sum + run.distance, 0) / recentRuns.length;
    const olderAvgDistance = olderRuns.reduce((sum, run) => sum + run.distance, 0) / olderRuns.length;

    const change = ((recentAvgDistance - olderAvgDistance) / olderAvgDistance) * 100;

    if (Math.abs(change) > 15) {
      return {
        type: change > 0 ? 'improvement' : 'decline' as const,
        metric: 'distance',
        description: `Your average run distance has ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}%`,
        confidence: Math.min(Math.abs(change) / 20, 0.8),
        data: { change, recentAvgDistance: recentAvgDistance / 1000, olderAvgDistance: olderAvgDistance / 1000 }
      };
    }

    return null;
  }

  // Record user interaction to improve future defaults
  recordInteraction(action: string, context: any): void {
    // Update last visited section
    if (action === 'navigate') {
      this.updateNestedPreference('lastVisited', {
        section: context.section,
        timestamp: Date.now()
      });
    }

    // Update preferred time period when user changes it
    if (action === 'changePeriod') {
      this.updatePreference('timePeriod', context.period);
    }

    // Update chart preferences when user toggles settings
    if (action === 'toggleChart') {
      this.updateNestedPreference(`chartSettings.${context.setting}`, context.value);
    }

    // Update section expansion preferences
    if (action === 'toggleSection') {
      this.updateNestedPreference(`dashboardLayout.expandedSections.${context.section}`, context.expanded);
    }
  }

  // Get recommended insights based on user data and preferences
  getRecommendedInsights(runs: EnrichedRun[]): string[] {
    const recommendations = [];

    // Always recommend consistency for regular runners
    if (runs.length >= 10) {
      recommendations.push('consistency');
    }

    // Recommend weather analysis if user has weather data
    const hasWeatherData = runs.some(run => run.weather_data);
    if (hasWeatherData) {
      recommendations.push('weather');
    }

    // Recommend time-of-day analysis if user runs at different times
    const runTimes = runs.map(run => new Date(run.start_date_local).getHours());
    const uniqueTimes = new Set(runTimes);
    if (uniqueTimes.size >= 3) {
      recommendations.push('timeOfDay');
    }

    // Recommend elevation analysis if user has varied elevation
    const elevations = runs.map(run => run.total_elevation_gain || 0);
    const maxElevation = Math.max(...elevations);
    if (maxElevation > 100) {
      recommendations.push('elevation');
    }

    return recommendations;
  }
}

// Singleton instance
export const smartDefaults = new SmartDefaultsEngine();