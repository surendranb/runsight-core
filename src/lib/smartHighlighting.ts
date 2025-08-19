import { EnrichedRun } from '../types';

export interface HighlightedPattern {
  id: string;
  type: 'improvement' | 'achievement' | 'concern' | 'insight';
  title: string;
  description: string;
  confidence: number; // 0-1 scale
  importance: number; // 0-1 scale
  actionable: boolean;
  recommendation?: string;
  data?: any; // Supporting data for the pattern
}

export interface SmartHighlightingConfig {
  minConfidence: number;
  minImportance: number;
  maxHighlights: number;
  prioritizeActionable: boolean;
}

const defaultConfig: SmartHighlightingConfig = {
  minConfidence: 0.6,
  minImportance: 0.5,
  maxHighlights: 5,
  prioritizeActionable: true
};

/**
 * Analyzes runs data to identify significant patterns worth highlighting
 */
export class SmartHighlightingEngine {
  private config: SmartHighlightingConfig;

  constructor(config: Partial<SmartHighlightingConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Identifies patterns in running data that should be highlighted to the user
   */
  identifyPatterns(runs: EnrichedRun[]): HighlightedPattern[] {
    if (runs.length < 3) return [];

    const patterns: HighlightedPattern[] = [];

    // Sort runs by date for trend analysis
    const sortedRuns = [...runs].sort((a, b) => 
      new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
    );

    // Analyze pace improvements
    patterns.push(...this.analyzePacePatterns(sortedRuns));
    
    // Analyze consistency patterns
    patterns.push(...this.analyzeConsistencyPatterns(sortedRuns));
    
    // Analyze distance achievements
    patterns.push(...this.analyzeDistancePatterns(sortedRuns));
    
    // Analyze weather performance patterns
    patterns.push(...this.analyzeWeatherPatterns(sortedRuns));
    
    // Analyze frequency patterns
    patterns.push(...this.analyzeFrequencyPatterns(sortedRuns));

    // Filter and rank patterns
    return this.filterAndRankPatterns(patterns);
  }

  private analyzePacePatterns(runs: EnrichedRun[]): HighlightedPattern[] {
    const patterns: HighlightedPattern[] = [];
    
    if (runs.length < 5) return patterns;

    // Calculate recent vs older pace trends
    const recentRuns = runs.slice(-10);
    const olderRuns = runs.slice(0, Math.max(1, runs.length - 10));
    
    const recentAvgPace = this.calculateAveragePace(recentRuns);
    const olderAvgPace = this.calculateAveragePace(olderRuns);
    
    if (recentAvgPace && olderAvgPace) {
      const improvement = (olderAvgPace - recentAvgPace) / olderAvgPace;
      
      if (improvement > 0.05) { // 5% improvement
        patterns.push({
          id: 'pace_improvement',
          type: 'improvement',
          title: 'Pace Improvement Detected',
          description: `Your average pace has improved by ${(improvement * 100).toFixed(1)}% in recent runs`,
          confidence: Math.min(0.9, 0.6 + improvement),
          importance: Math.min(0.9, 0.5 + improvement),
          actionable: true,
          recommendation: 'Keep up the great work! Consider maintaining this pace while gradually increasing distance.',
          data: { improvement, recentPace: recentAvgPace, olderPace: olderAvgPace }
        });
      } else if (improvement < -0.1) { // 10% decline
        patterns.push({
          id: 'pace_decline',
          type: 'concern',
          title: 'Pace Decline Noticed',
          description: `Your average pace has slowed by ${Math.abs(improvement * 100).toFixed(1)}% recently`,
          confidence: 0.7,
          importance: 0.6,
          actionable: true,
          recommendation: 'Consider if you need more recovery time, or if you\'re pushing too hard on easy runs.',
          data: { decline: Math.abs(improvement), recentPace: recentAvgPace, olderPace: olderAvgPace }
        });
      }
    }

    // Check for personal records
    const fastestRun = runs.reduce((fastest, run) => {
      const pace = run.moving_time / (run.distance / 1000);
      const fastestPace = fastest.moving_time / (fastest.distance / 1000);
      return pace < fastestPace ? run : fastest;
    });

    const fastestRunDate = new Date(fastestRun.start_date_local);
    const daysSinceFastest = (Date.now() - fastestRunDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceFastest <= 30) {
      patterns.push({
        id: 'recent_pr',
        type: 'achievement',
        title: 'Recent Personal Record',
        description: `You set a pace PR ${Math.floor(daysSinceFastest)} days ago`,
        confidence: 0.95,
        importance: 0.8,
        actionable: true,
        recommendation: 'Great achievement! Focus on recovery and building on this success.',
        data: { prDate: fastestRunDate, pace: fastestRun.moving_time / (fastestRun.distance / 1000) }
      });
    }

    return patterns;
  }

  private analyzeConsistencyPatterns(runs: EnrichedRun[]): HighlightedPattern[] {
    const patterns: HighlightedPattern[] = [];
    
    if (runs.length < 7) return patterns;

    // Analyze running frequency over time
    const last30Days = runs.filter(run => 
      (Date.now() - new Date(run.start_date_local).getTime()) <= 30 * 24 * 60 * 60 * 1000
    );
    
    const runsPerWeek = (last30Days.length / 30) * 7;
    
    if (runsPerWeek >= 4) {
      patterns.push({
        id: 'high_consistency',
        type: 'achievement',
        title: 'Excellent Consistency',
        description: `You're averaging ${runsPerWeek.toFixed(1)} runs per week`,
        confidence: 0.9,
        importance: 0.7,
        actionable: true,
        recommendation: 'Outstanding consistency! This regular training will build strong fitness gains.',
        data: { runsPerWeek, totalRuns: last30Days.length }
      });
    } else if (runsPerWeek < 2) {
      patterns.push({
        id: 'low_consistency',
        type: 'concern',
        title: 'Consistency Opportunity',
        description: `You're averaging ${runsPerWeek.toFixed(1)} runs per week`,
        confidence: 0.8,
        importance: 0.6,
        actionable: true,
        recommendation: 'Try to aim for at least 3 runs per week to see meaningful fitness improvements.',
        data: { runsPerWeek, totalRuns: last30Days.length }
      });
    }

    // Check for streaks
    const streak = this.calculateCurrentStreak(runs);
    if (streak >= 7) {
      patterns.push({
        id: 'running_streak',
        type: 'achievement',
        title: 'Running Streak',
        description: `You're on a ${streak}-day running streak`,
        confidence: 0.95,
        importance: 0.8,
        actionable: true,
        recommendation: 'Impressive streak! Remember to include easy days to prevent overuse injuries.',
        data: { streakDays: streak }
      });
    }

    return patterns;
  }

  private analyzeDistancePatterns(runs: EnrichedRun[]): HighlightedPattern[] {
    const patterns: HighlightedPattern[] = [];
    
    if (runs.length < 3) return patterns;

    // Find longest run
    const longestRun = runs.reduce((longest, run) => 
      run.distance > longest.distance ? run : longest
    );

    const longestRunDate = new Date(longestRun.start_date_local);
    const daysSinceLongest = (Date.now() - longestRunDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLongest <= 14) {
      patterns.push({
        id: 'distance_achievement',
        type: 'achievement',
        title: 'Distance Achievement',
        description: `You completed your longest run (${(longestRun.distance / 1000).toFixed(1)}km) recently`,
        confidence: 0.9,
        importance: 0.7,
        actionable: true,
        recommendation: 'Great distance achievement! Allow for proper recovery before your next long run.',
        data: { distance: longestRun.distance, date: longestRunDate }
      });
    }

    // Analyze distance progression
    const recentRuns = runs.slice(-5);
    const avgRecentDistance = recentRuns.reduce((sum, run) => sum + run.distance, 0) / recentRuns.length;
    const olderRuns = runs.slice(0, Math.max(1, runs.length - 5));
    const avgOlderDistance = olderRuns.reduce((sum, run) => sum + run.distance, 0) / olderRuns.length;
    
    const distanceIncrease = (avgRecentDistance - avgOlderDistance) / avgOlderDistance;
    
    if (distanceIncrease > 0.2) { // 20% increase
      patterns.push({
        id: 'distance_progression',
        type: 'improvement',
        title: 'Distance Progression',
        description: `Your average run distance has increased by ${(distanceIncrease * 100).toFixed(1)}%`,
        confidence: 0.8,
        importance: 0.6,
        actionable: true,
        recommendation: 'Good progression! Follow the 10% rule - don\'t increase weekly distance by more than 10%.',
        data: { increase: distanceIncrease, recentAvg: avgRecentDistance, olderAvg: avgOlderDistance }
      });
    }

    return patterns;
  }

  private analyzeWeatherPatterns(runs: EnrichedRun[]): HighlightedPattern[] {
    const patterns: HighlightedPattern[] = [];
    
    const runsWithWeather = runs.filter(run => run.weather_data?.temperature !== undefined);
    if (runsWithWeather.length < 10) return patterns;

    // Analyze temperature performance
    const coolRuns = runsWithWeather.filter(run => (run.weather_data as any).temperature < 15);
    const warmRuns = runsWithWeather.filter(run => (run.weather_data as any).temperature >= 20);
    
    if (coolRuns.length >= 3 && warmRuns.length >= 3) {
      const coolAvgPace = this.calculateAveragePace(coolRuns);
      const warmAvgPace = this.calculateAveragePace(warmRuns);
      
      if (coolAvgPace && warmAvgPace) {
        const difference = (warmAvgPace - coolAvgPace) / coolAvgPace;
        
        if (difference > 0.1) { // 10% slower in warm weather
          patterns.push({
            id: 'weather_impact',
            type: 'insight',
            title: 'Weather Performance Pattern',
            description: `You run ${(difference * 100).toFixed(1)}% slower in warm weather (20°C+)`,
            confidence: 0.75,
            importance: 0.6,
            actionable: true,
            recommendation: 'Consider running during cooler parts of the day for better performance.',
            data: { difference, coolPace: coolAvgPace, warmPace: warmAvgPace }
          });
        }
      }
    }

    return patterns;
  }

  private analyzeFrequencyPatterns(runs: EnrichedRun[]): HighlightedPattern[] {
    const patterns: HighlightedPattern[] = [];
    
    if (runs.length < 14) return patterns;

    // Analyze weekly patterns
    const runsByDay = runs.reduce((acc, run) => {
      const day = new Date(run.start_date_local).getDay();
      acc[day] = acc[day] || [];
      acc[day].push(run);
      return acc;
    }, {} as Record<number, EnrichedRun[]>);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const mostFrequentDay = Object.entries(runsByDay)
      .map(([day, dayRuns]) => ({ day: parseInt(day), count: dayRuns.length }))
      .sort((a, b) => b.count - a.count)[0];

    if (mostFrequentDay && mostFrequentDay.count >= runs.length * 0.3) {
      patterns.push({
        id: 'weekly_pattern',
        type: 'insight',
        title: 'Weekly Running Pattern',
        description: `You run most often on ${dayNames[mostFrequentDay.day]}s (${mostFrequentDay.count} times)`,
        confidence: 0.8,
        importance: 0.5,
        actionable: true,
        recommendation: `Consider scheduling your key workouts on ${dayNames[mostFrequentDay.day]}s when you're most consistent.`,
        data: { preferredDay: mostFrequentDay.day, frequency: mostFrequentDay.count }
      });
    }

    return patterns;
  }

  private calculateAveragePace(runs: EnrichedRun[]): number | null {
    if (runs.length === 0) return null;
    
    const totalTime = runs.reduce((sum, run) => sum + run.moving_time, 0);
    const totalDistance = runs.reduce((sum, run) => sum + run.distance, 0);
    
    return totalDistance > 0 ? totalTime / (totalDistance / 1000) : null;
  }

  private calculateCurrentStreak(runs: EnrichedRun[]): number {
    if (runs.length === 0) return 0;

    const sortedRuns = [...runs].sort((a, b) => 
      new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime()
    );

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const run of sortedRuns) {
      const runDate = new Date(run.start_date_local);
      runDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((currentDate.getTime() - runDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
        currentDate = new Date(runDate);
      } else if (daysDiff > streak) {
        break;
      }
    }

    return streak;
  }

  private filterAndRankPatterns(patterns: HighlightedPattern[]): HighlightedPattern[] {
    // Filter by minimum confidence and importance
    const filtered = patterns.filter(pattern => 
      pattern.confidence >= this.config.minConfidence && 
      pattern.importance >= this.config.minImportance
    );

    // Sort by importance, confidence, and actionability
    const sorted = filtered.sort((a, b) => {
      // Prioritize actionable patterns if configured
      if (this.config.prioritizeActionable) {
        if (a.actionable && !b.actionable) return -1;
        if (!a.actionable && b.actionable) return 1;
      }
      
      // Then by importance
      if (a.importance !== b.importance) {
        return b.importance - a.importance;
      }
      
      // Then by confidence
      return b.confidence - a.confidence;
    });

    // Return top patterns up to max limit
    return sorted.slice(0, this.config.maxHighlights);
  }
}

// Default instance for easy use
export const smartHighlighting = new SmartHighlightingEngine();

// Helper function to get highlighted patterns with default config
export const getHighlightedPatterns = (runs: EnrichedRun[]): HighlightedPattern[] => {
  return smartHighlighting.identifyPatterns(runs);
};