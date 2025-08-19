import { EnrichedRun } from '../../types';
import { ActionableInsight } from '../../components/insights/ActionableInsightCard';

export interface InsightGenerationConfig {
  minSampleSize: number;
  minConfidence: number;
  maxInsights: number;
  prioritizeActionable: boolean;
  includeAchievements: boolean;
}

export interface InsightPrioritizationScore {
  impactScore: number; // 0-1: Potential performance improvement
  confidenceScore: number; // 0-1: Data reliability
  actionabilityScore: number; // 0-1: How easily user can act on it
  urgencyScore: number; // 0-1: How time-sensitive the insight is
  totalScore: number; // Weighted combination
}

export interface InsightFilter {
  categories?: string[];
  priorities?: string[];
  minConfidence?: number;
  onlyActionable?: boolean;
  timeframe?: string[];
  difficulty?: string[];
}

const defaultConfig: InsightGenerationConfig = {
  minSampleSize: 3,
  minConfidence: 0.6,
  maxInsights: 7, // Following 7±2 rule
  prioritizeActionable: true,
  includeAchievements: true
};

/**
 * Actionable Insights Engine
 * Generates prioritized, structured insights with clear findings, interpretations, and recommendations
 */
export class ActionableInsightsEngine {
  private config: InsightGenerationConfig;

  constructor(config: Partial<InsightGenerationConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Generate actionable insights from running data
   */
  generateInsights(runs: EnrichedRun[]): ActionableInsight[] {
    if (runs.length < this.config.minSampleSize) {
      return [];
    }

    const insights: ActionableInsight[] = [];

    // Sort runs by date for trend analysis
    const sortedRuns = [...runs].sort((a, b) => 
      new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
    );

    // Generate different types of insights
    insights.push(...this.generatePerformanceInsights(sortedRuns));
    insights.push(...this.generateConsistencyInsights(sortedRuns));
    insights.push(...this.generateTrainingInsights(sortedRuns));
    insights.push(...this.generateHealthInsights(sortedRuns));
    
    if (this.config.includeAchievements) {
      insights.push(...this.generateAchievementInsights(sortedRuns));
    }

    // Filter, prioritize, and limit insights
    return this.prioritizeInsights(insights);
  }

  private generatePerformanceInsights(runs: EnrichedRun[]): ActionableInsight[] {
    const insights: ActionableInsight[] = [];

    // Pace trend analysis
    const paceInsight = this.analyzePaceTrend(runs);
    if (paceInsight) insights.push(paceInsight);

    // Distance progression analysis
    const distanceInsight = this.analyzeDistanceProgression(runs);
    if (distanceInsight) insights.push(distanceInsight);

    // Weather performance analysis
    const weatherInsight = this.analyzeWeatherPerformance(runs);
    if (weatherInsight) insights.push(weatherInsight);

    return insights;
  }

  private generateConsistencyInsights(runs: EnrichedRun[]): ActionableInsight[] {
    const insights: ActionableInsight[] = [];

    // Frequency analysis
    const frequencyInsight = this.analyzeRunningFrequency(runs);
    if (frequencyInsight) insights.push(frequencyInsight);

    // Weekly pattern analysis
    const patternInsight = this.analyzeWeeklyPatterns(runs);
    if (patternInsight) insights.push(patternInsight);

    return insights;
  }

  private generateTrainingInsights(runs: EnrichedRun[]): ActionableInsight[] {
    const insights: ActionableInsight[] = [];

    // Training variety analysis
    const varietyInsight = this.analyzeTrainingVariety(runs);
    if (varietyInsight) insights.push(varietyInsight);

    // Recovery analysis
    const recoveryInsight = this.analyzeRecoveryPatterns(runs);
    if (recoveryInsight) insights.push(recoveryInsight);

    return insights;
  }

  private generateHealthInsights(runs: EnrichedRun[]): ActionableInsight[] {
    const insights: ActionableInsight[] = [];

    // Heart rate analysis (if available)
    const hrInsight = this.analyzeHeartRatePatterns(runs);
    if (hrInsight) insights.push(hrInsight);

    return insights;
  }

  private generateAchievementInsights(runs: EnrichedRun[]): ActionableInsight[] {
    const insights: ActionableInsight[] = [];

    // Personal records
    const prInsight = this.analyzePersonalRecords(runs);
    if (prInsight) insights.push(prInsight);

    // Milestone achievements
    const milestoneInsight = this.analyzeMilestones(runs);
    if (milestoneInsight) insights.push(milestoneInsight);

    return insights;
  }

  private analyzePaceTrend(runs: EnrichedRun[]): ActionableInsight | null {
    if (runs.length < 5) return null;

    const recentRuns = runs.slice(-10);
    const olderRuns = runs.slice(0, Math.max(1, runs.length - 10));

    const recentAvgPace = this.calculateAveragePace(recentRuns);
    const olderAvgPace = this.calculateAveragePace(olderRuns);

    if (!recentAvgPace || !olderAvgPace) return null;

    const improvement = (olderAvgPace - recentAvgPace) / olderAvgPace;
    const confidence = Math.min(0.9, 0.6 + Math.abs(improvement));

    if (Math.abs(improvement) < 0.03) return null; // Less than 3% change

    const isImproving = improvement > 0;
    const changePercent = Math.abs(improvement * 100);

    return {
      id: 'pace_trend',
      title: isImproving ? 'Pace Improvement Detected' : 'Pace Decline Noticed',
      category: 'performance',
      priority: changePercent > 10 ? 'high' : changePercent > 5 ? 'medium' : 'low',
      
      finding: `Your average pace has ${isImproving ? 'improved' : 'slowed'} by ${changePercent.toFixed(1)}% in recent runs`,
      interpretation: isImproving 
        ? 'This indicates improving fitness and running efficiency. Your training is paying off!'
        : 'This could indicate fatigue, overtraining, or the need for more recovery time.',
      recommendation: isImproving
        ? 'Keep up the great work! Consider maintaining this pace while gradually increasing distance or adding variety to your training.'
        : 'Consider if you need more recovery time, or if you\'re pushing too hard on easy runs. Focus on running most of your miles at an easy, conversational pace.',
      
      confidence,
      sampleSize: recentRuns.length + olderRuns.length,
      dataQuality: runs.length >= 15 ? 'high' : runs.length >= 8 ? 'medium' : 'low',
      
      actionable: true,
      difficulty: isImproving ? 'easy' : 'moderate',
      timeframe: isImproving ? 'short-term' : 'immediate',
      
      data: {
        current: recentAvgPace,
        previous: olderAvgPace,
        trend: isImproving ? 'improving' : 'declining',
        unit: 'min/km'
      }
    };
  }

  private analyzeDistanceProgression(runs: EnrichedRun[]): ActionableInsight | null {
    if (runs.length < 6) return null;

    const recentRuns = runs.slice(-5);
    const olderRuns = runs.slice(0, Math.max(1, runs.length - 5));

    const recentAvgDistance = recentRuns.reduce((sum, run) => sum + run.distance, 0) / recentRuns.length;
    const olderAvgDistance = olderRuns.reduce((sum, run) => sum + run.distance, 0) / olderRuns.length;

    const increase = (recentAvgDistance - olderAvgDistance) / olderAvgDistance;

    if (Math.abs(increase) < 0.1) return null; // Less than 10% change

    const isIncreasing = increase > 0;
    const changePercent = Math.abs(increase * 100);

    // Check if increase is too rapid (>10% per week is risky)
    const weeklyIncrease = increase * 7 / (runs.length / 7); // Approximate weekly increase
    const tooRapid = weeklyIncrease > 0.1;

    return {
      id: 'distance_progression',
      title: isIncreasing ? 'Distance Progression Detected' : 'Distance Reduction Noticed',
      category: 'training',
      priority: tooRapid ? 'high' : 'medium',
      
      finding: `Your average run distance has ${isIncreasing ? 'increased' : 'decreased'} by ${changePercent.toFixed(1)}%`,
      interpretation: isIncreasing
        ? tooRapid 
          ? 'You\'re increasing distance rapidly, which raises injury risk.'
          : 'Good progression in building endurance capacity.'
        : 'Reduced distance could indicate fatigue, injury prevention, or intentional recovery.',
      recommendation: isIncreasing
        ? tooRapid
          ? 'Consider slowing your distance progression. The 10% rule suggests increasing weekly distance by no more than 10% each week.'
          : 'Great progression! Continue building gradually while listening to your body.'
        : 'If this is intentional recovery, that\'s smart. If not, consider if you need more motivation or if other factors are limiting your runs.',
      
      confidence: 0.8,
      sampleSize: runs.length,
      dataQuality: runs.length >= 10 ? 'high' : 'medium',
      
      actionable: true,
      difficulty: tooRapid ? 'moderate' : 'easy',
      timeframe: 'short-term',
      
      data: {
        current: recentAvgDistance / 1000,
        previous: olderAvgDistance / 1000,
        trend: isIncreasing ? 'improving' : 'declining',
        unit: 'km'
      }
    };
  }

  private analyzeRunningFrequency(runs: EnrichedRun[]): ActionableInsight | null {
    if (runs.length < 7) return null;

    const last30Days = runs.filter(run => 
      (Date.now() - new Date(run.start_date_local).getTime()) <= 30 * 24 * 60 * 60 * 1000
    );

    const runsPerWeek = (last30Days.length / 30) * 7;
    
    let priority: 'high' | 'medium' | 'low' = 'medium';
    let finding: string;
    let interpretation: string;
    let recommendation: string;
    let actionable = true;

    if (runsPerWeek >= 5) {
      priority = 'low';
      finding = `You're running ${runsPerWeek.toFixed(1)} times per week - excellent consistency!`;
      interpretation = 'This frequency is ideal for building and maintaining fitness while allowing adequate recovery.';
      recommendation = 'Keep up this excellent consistency! Consider varying your run types (easy, tempo, long) for balanced training.';
    } else if (runsPerWeek >= 3) {
      priority = 'medium';
      finding = `You're running ${runsPerWeek.toFixed(1)} times per week - good foundation.`;
      interpretation = 'This is a solid base for fitness improvement, though there\'s room to increase frequency.';
      recommendation = 'Consider adding one more run per week to accelerate your fitness improvements. Start with an easy, short run.';
    } else {
      priority = 'high';
      finding = `You're running ${runsPerWeek.toFixed(1)} times per week - opportunity for more consistency.`;
      interpretation = 'Running less than 3 times per week limits fitness gains and makes each run feel harder.';
      recommendation = 'Try to aim for at least 3 runs per week. Start by adding short, easy runs to build the habit.';
    }

    return {
      id: 'running_frequency',
      title: 'Running Frequency Analysis',
      category: 'consistency',
      priority,
      
      finding,
      interpretation,
      recommendation,
      
      confidence: 0.9,
      sampleSize: last30Days.length,
      dataQuality: last30Days.length >= 8 ? 'high' : 'medium',
      
      actionable,
      difficulty: runsPerWeek >= 3 ? 'easy' : 'moderate',
      timeframe: 'short-term',
      
      data: {
        current: runsPerWeek,
        target: 4,
        unit: 'runs/week'
      }
    };
  }

  private analyzeWeatherPerformance(runs: EnrichedRun[]): ActionableInsight | null {
    const runsWithWeather = runs.filter(run => run.weather_data?.temperature !== undefined);
    if (runsWithWeather.length < 10) return null;

    const coolRuns = runsWithWeather.filter(run => (run.weather_data as any).temperature < 15);
    const warmRuns = runsWithWeather.filter(run => (run.weather_data as any).temperature >= 20);

    if (coolRuns.length < 3 || warmRuns.length < 3) return null;

    const coolAvgPace = this.calculateAveragePace(coolRuns);
    const warmAvgPace = this.calculateAveragePace(warmRuns);

    if (!coolAvgPace || !warmAvgPace) return null;

    const difference = (warmAvgPace - coolAvgPace) / coolAvgPace;

    if (Math.abs(difference) < 0.05) return null; // Less than 5% difference

    const isSlowerInWarmth = difference > 0;
    const changePercent = Math.abs(difference * 100);

    if (!isSlowerInWarmth) return null; // Only highlight if slower in warm weather (normal pattern)

    return {
      id: 'weather_performance',
      title: 'Weather Performance Pattern',
      category: 'performance',
      priority: changePercent > 15 ? 'high' : 'medium',
      
      finding: `You run ${changePercent.toFixed(1)}% slower in warm weather (20°C+) compared to cool weather (<15°C)`,
      interpretation: 'This is normal - your body works harder to cool itself in warm conditions, affecting performance.',
      recommendation: 'Consider running during cooler parts of the day (early morning or evening) for better performance, especially for key workouts.',
      
      confidence: 0.75,
      sampleSize: coolRuns.length + warmRuns.length,
      dataQuality: runsWithWeather.length >= 20 ? 'high' : 'medium',
      
      actionable: true,
      difficulty: 'easy',
      timeframe: 'immediate',
      
      data: {
        current: warmAvgPace,
        previous: coolAvgPace,
        unit: 'min/km'
      }
    };
  }

  private analyzeWeeklyPatterns(runs: EnrichedRun[]): ActionableInsight | null {
    if (runs.length < 14) return null;

    const runsByDay = runs.reduce((acc, run) => {
      const day = new Date(run.start_date_local).getDay();
      acc[day] = acc[day] || [];
      acc[day].push(run);
      return acc;
    }, {} as Record<number, EnrichedRun[]>);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayStats = Object.entries(runsByDay)
      .map(([day, dayRuns]) => ({
        day: parseInt(day),
        count: dayRuns.length,
        avgPace: this.calculateAveragePace(dayRuns) || 0
      }))
      .sort((a, b) => b.count - a.count);

    const mostFrequentDay = dayStats[0];

    if (!mostFrequentDay || mostFrequentDay.count < runs.length * 0.25) return null;

    return {
      id: 'weekly_pattern',
      title: 'Weekly Running Pattern',
      category: 'consistency',
      priority: 'low',
      
      finding: `You run most often on ${dayNames[mostFrequentDay.day]}s (${mostFrequentDay.count} times)`,
      interpretation: 'Having a preferred running day shows good routine building, which supports consistency.',
      recommendation: `Consider scheduling your key workouts on ${dayNames[mostFrequentDay.day]}s when you're most consistent. Also try to add runs on other days for better weekly distribution.`,
      
      confidence: 0.8,
      sampleSize: runs.length,
      dataQuality: runs.length >= 20 ? 'high' : 'medium',
      
      actionable: true,
      difficulty: 'easy',
      timeframe: 'short-term',
      
      data: {
        current: mostFrequentDay.count,
        unit: 'runs'
      }
    };
  }

  private analyzeTrainingVariety(runs: EnrichedRun[]): ActionableInsight | null {
    if (runs.length < 10) return null;

    // Analyze distance variety
    const distances = runs.map(run => run.distance);
    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const distanceVariance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;
    const distanceCV = Math.sqrt(distanceVariance) / avgDistance; // Coefficient of variation

    // Low variety if CV < 0.3
    if (distanceCV >= 0.3) return null;

    return {
      id: 'training_variety',
      title: 'Training Variety Analysis',
      category: 'training',
      priority: 'medium',
      
      finding: 'Your runs are very similar in distance, with limited variety in training stimulus.',
      interpretation: 'Running the same distance repeatedly can lead to plateaus and doesn\'t prepare you for different challenges.',
      recommendation: 'Add variety to your training: include one long run per week, some shorter faster runs, and vary your routes and paces.',
      
      confidence: 0.8,
      sampleSize: runs.length,
      dataQuality: runs.length >= 15 ? 'high' : 'medium',
      
      actionable: true,
      difficulty: 'moderate',
      timeframe: 'short-term',
      
      data: {
        current: distanceCV,
        target: 0.4,
        unit: 'variety score'
      }
    };
  }

  private analyzeRecoveryPatterns(runs: EnrichedRun[]): ActionableInsight | null {
    if (runs.length < 10) return null;

    // Calculate gaps between runs
    const sortedRuns = [...runs].sort((a, b) => 
      new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
    );

    const gaps = [];
    for (let i = 1; i < sortedRuns.length; i++) {
      const gap = (new Date(sortedRuns[i].start_date_local).getTime() - 
                   new Date(sortedRuns[i-1].start_date_local).getTime()) / (1000 * 60 * 60 * 24);
      gaps.push(gap);
    }

    const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    const shortGaps = gaps.filter(gap => gap < 1).length; // Back-to-back days

    if (shortGaps < gaps.length * 0.3) return null; // Not enough consecutive days to warrant advice

    return {
      id: 'recovery_patterns',
      title: 'Recovery Pattern Analysis',
      category: 'health',
      priority: shortGaps > gaps.length * 0.5 ? 'high' : 'medium',
      
      finding: `You run on consecutive days ${((shortGaps / gaps.length) * 100).toFixed(0)}% of the time`,
      interpretation: 'Frequent consecutive running days can increase injury risk, especially without proper recovery strategies.',
      recommendation: 'Consider adding rest days or easy recovery runs between harder efforts. Listen to your body and don\'t hesitate to take extra rest when needed.',
      
      confidence: 0.7,
      sampleSize: gaps.length,
      dataQuality: runs.length >= 15 ? 'high' : 'medium',
      
      actionable: true,
      difficulty: 'moderate',
      timeframe: 'immediate',
      
      data: {
        current: avgGap,
        target: 1.5,
        unit: 'days between runs'
      }
    };
  }

  private analyzeHeartRatePatterns(runs: EnrichedRun[]): ActionableInsight | null {
    const runsWithHR = runs.filter(run => run.average_heartrate && run.average_heartrate > 0);
    if (runsWithHR.length < 8) return null;

    const avgHR = runsWithHR.reduce((sum, run) => sum + (run.average_heartrate || 0), 0) / runsWithHR.length;
    
    // Rough estimate: if average HR is consistently high (>85% of estimated max), might be running too hard
    const estimatedMaxHR = 220 - 35; // Assuming average age of 35
    const hrPercentage = avgHR / estimatedMaxHR;

    if (hrPercentage < 0.8) return null; // HR seems reasonable

    return {
      id: 'heart_rate_patterns',
      title: 'Heart Rate Analysis',
      category: 'health',
      priority: hrPercentage > 0.9 ? 'high' : 'medium',
      
      finding: `Your average heart rate during runs is ${avgHR.toFixed(0)} bpm (${(hrPercentage * 100).toFixed(0)}% of estimated max)`,
      interpretation: 'Running at consistently high heart rates may indicate you\'re training too intensely for most of your runs.',
      recommendation: 'Follow the 80/20 rule: 80% of your runs should be at an easy, conversational pace. Slow down on your easy days to improve your aerobic base.',
      
      confidence: 0.7,
      sampleSize: runsWithHR.length,
      dataQuality: runsWithHR.length >= 15 ? 'high' : 'medium',
      
      actionable: true,
      difficulty: 'moderate',
      timeframe: 'short-term',
      
      data: {
        current: avgHR,
        target: estimatedMaxHR * 0.7,
        unit: 'bpm'
      }
    };
  }

  private analyzePersonalRecords(runs: EnrichedRun[]): ActionableInsight | null {
    if (runs.length < 5) return null;

    // Simple PR detection: fastest pace for any distance
    const fastestRun = runs.reduce((fastest, run) => {
      const pace = run.moving_time / (run.distance / 1000);
      const fastestPace = fastest.moving_time / (fastest.distance / 1000);
      return pace < fastestPace ? run : fastest;
    });

    const fastestRunDate = new Date(fastestRun.start_date_local);
    const daysSinceFastest = (Date.now() - fastestRunDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceFastest > 30) return null; // No recent PRs

    return {
      id: 'personal_records',
      title: 'Recent Personal Record',
      category: 'achievement',
      priority: 'medium',
      
      finding: `You set a pace personal record ${Math.floor(daysSinceFastest)} days ago!`,
      interpretation: 'Personal records indicate improving fitness and are great motivation boosters.',
      recommendation: 'Celebrate this achievement! Use it as motivation while focusing on consistent training to build on this success.',
      
      confidence: 0.95,
      sampleSize: runs.length,
      dataQuality: 'high',
      
      actionable: true,
      difficulty: 'easy',
      timeframe: 'immediate',
      
      data: {
        current: fastestRun.moving_time / (fastestRun.distance / 1000),
        unit: 'min/km'
      }
    };
  }

  private analyzeMilestones(runs: EnrichedRun[]): ActionableInsight | null {
    const totalDistance = runs.reduce((sum, run) => sum + run.distance, 0) / 1000; // in km
    const totalRuns = runs.length;

    // Check for milestone achievements
    const distanceMilestones = [100, 250, 500, 1000, 2000];
    const runMilestones = [10, 25, 50, 100, 200];

    const recentDistanceMilestone = distanceMilestones.find(milestone => 
      totalDistance >= milestone && totalDistance < milestone + 50
    );

    const recentRunMilestone = runMilestones.find(milestone =>
      totalRuns >= milestone && totalRuns < milestone + 10
    );

    if (!recentDistanceMilestone && !recentRunMilestone) return null;

    const milestone = recentDistanceMilestone || recentRunMilestone;
    const type = recentDistanceMilestone ? 'distance' : 'runs';
    const unit = type === 'distance' ? 'km' : 'runs';

    return {
      id: 'milestone_achievement',
      title: 'Milestone Achievement',
      category: 'achievement',
      priority: 'low',
      
      finding: `You've reached ${milestone} total ${unit}!`,
      interpretation: 'Milestones represent significant commitment to your running journey and show consistent progress.',
      recommendation: `Celebrate this achievement! You're building great habits. Keep up the consistency to reach your next milestone.`,
      
      confidence: 1.0,
      sampleSize: runs.length,
      dataQuality: 'high',
      
      actionable: true,
      difficulty: 'easy',
      timeframe: 'immediate',
      
      data: {
        current: type === 'distance' ? totalDistance : totalRuns,
        unit
      }
    };
  }

  private calculateAveragePace(runs: EnrichedRun[]): number | null {
    if (runs.length === 0) return null;
    
    const totalTime = runs.reduce((sum, run) => sum + run.moving_time, 0);
    const totalDistance = runs.reduce((sum, run) => sum + run.distance, 0);
    
    return totalDistance > 0 ? totalTime / (totalDistance / 1000) : null;
  }

  /**
   * Calculate comprehensive prioritization score for an insight
   */
  calculatePrioritizationScore(insight: ActionableInsight): InsightPrioritizationScore {
    // Impact Score: Based on priority and potential performance improvement
    const impactScore = this.calculateImpactScore(insight);
    
    // Confidence Score: Based on data quality and sample size
    const confidenceScore = this.calculateConfidenceScore(insight);
    
    // Actionability Score: How easily user can act on the insight
    const actionabilityScore = this.calculateActionabilityScore(insight);
    
    // Urgency Score: How time-sensitive the insight is
    const urgencyScore = this.calculateUrgencyScore(insight);
    
    // Weighted total score (impact and actionability weighted higher)
    const totalScore = (
      impactScore * 0.35 +
      confidenceScore * 0.25 +
      actionabilityScore * 0.30 +
      urgencyScore * 0.10
    );
    
    return {
      impactScore,
      confidenceScore,
      actionabilityScore,
      urgencyScore,
      totalScore
    };
  }

  private calculateImpactScore(insight: ActionableInsight): number {
    let score = 0;
    
    // Base score from priority
    switch (insight.priority) {
      case 'high': score += 0.8; break;
      case 'medium': score += 0.6; break;
      case 'low': score += 0.4; break;
    }
    
    // Bonus for performance-related insights
    if (insight.category === 'performance') score += 0.2;
    
    // Bonus for health-related insights (injury prevention)
    if (insight.category === 'health') score += 0.15;
    
    return Math.min(1, score);
  }

  private calculateConfidenceScore(insight: ActionableInsight): number {
    let score = insight.confidence;
    
    // Adjust based on sample size
    if (insight.sampleSize >= 20) score += 0.1;
    else if (insight.sampleSize < 5) score -= 0.2;
    
    // Adjust based on data quality
    switch (insight.dataQuality) {
      case 'high': score += 0.1; break;
      case 'low': score -= 0.1; break;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  private calculateActionabilityScore(insight: ActionableInsight): number {
    if (!insight.actionable) return 0;
    
    let score = 0.8; // Base score for actionable insights
    
    // Adjust based on difficulty
    switch (insight.difficulty) {
      case 'easy': score += 0.2; break;
      case 'moderate': score += 0.1; break;
      case 'challenging': score -= 0.1; break;
    }
    
    // Bonus for immediate or short-term results
    switch (insight.timeframe) {
      case 'immediate': score += 0.15; break;
      case 'short-term': score += 0.1; break;
      case 'long-term': score -= 0.05; break;
    }
    
    return Math.min(1, score);
  }

  private calculateUrgencyScore(insight: ActionableInsight): number {
    let score = 0.5; // Base urgency
    
    // High urgency for health-related insights
    if (insight.category === 'health' && insight.priority === 'high') {
      score = 1.0;
    }
    
    // Medium urgency for performance declines
    if (insight.category === 'performance' && insight.data?.trend === 'declining') {
      score = 0.8;
    }
    
    // Lower urgency for achievements
    if (insight.category === 'achievement') {
      score = 0.2;
    }
    
    return score;
  }

  /**
   * Filter insights based on criteria
   */
  filterInsights(insights: ActionableInsight[], filter: InsightFilter): ActionableInsight[] {
    return insights.filter(insight => {
      // Category filter
      if (filter.categories && filter.categories.length > 0) {
        if (!filter.categories.includes(insight.category)) return false;
      }
      
      // Priority filter
      if (filter.priorities && filter.priorities.length > 0) {
        if (!filter.priorities.includes(insight.priority)) return false;
      }
      
      // Confidence filter
      if (filter.minConfidence !== undefined) {
        if (insight.confidence < filter.minConfidence) return false;
      }
      
      // Actionable filter
      if (filter.onlyActionable && !insight.actionable) return false;
      
      // Timeframe filter
      if (filter.timeframe && filter.timeframe.length > 0) {
        if (!filter.timeframe.includes(insight.timeframe)) return false;
      }
      
      // Difficulty filter
      if (filter.difficulty && filter.difficulty.length > 0) {
        if (!filter.difficulty.includes(insight.difficulty)) return false;
      }
      
      return true;
    });
  }

  private prioritizeInsights(insights: ActionableInsight[]): ActionableInsight[] {
    // Filter by minimum confidence and sample size
    const filtered = insights.filter(insight => 
      insight.confidence >= this.config.minConfidence &&
      insight.sampleSize >= this.config.minSampleSize
    );

    // Calculate prioritization scores for each insight
    const insightsWithScores = filtered.map(insight => ({
      insight,
      score: this.calculatePrioritizationScore(insight)
    }));

    // Sort by total score (highest first)
    const sorted = insightsWithScores
      .sort((a, b) => b.score.totalScore - a.score.totalScore)
      .map(item => item.insight);

    // Return top insights up to max limit
    return sorted.slice(0, this.config.maxInsights);
  }
}

// Default instance for easy use
export const actionableInsightsEngine = new ActionableInsightsEngine();

// Helper function to get actionable insights with default config
export const getActionableInsights = (runs: EnrichedRun[]): ActionableInsight[] => {
  return actionableInsightsEngine.generateInsights(runs);
};

// Helper function to get prioritized insights with scoring
export const getPrioritizedInsights = (runs: EnrichedRun[], filter?: InsightFilter): ActionableInsight[] => {
  const allInsights = actionableInsightsEngine.generateInsights(runs);
  
  if (filter) {
    return actionableInsightsEngine.filterInsights(allInsights, filter);
  }
  
  return allInsights;
};

// Helper function to get insight categories for filtering
export const getInsightCategories = (): Array<{value: string, label: string, description: string}> => {
  return [
    { 
      value: 'performance', 
      label: 'Performance', 
      description: 'Insights about pace, speed, and running efficiency' 
    },
    { 
      value: 'consistency', 
      label: 'Consistency', 
      description: 'Insights about training frequency and patterns' 
    },
    { 
      value: 'health', 
      label: 'Health', 
      description: 'Insights about recovery, injury prevention, and wellbeing' 
    },
    { 
      value: 'training', 
      label: 'Training', 
      description: 'Insights about workout variety and training structure' 
    },
    { 
      value: 'achievement', 
      label: 'Achievement', 
      description: 'Personal records and milestone celebrations' 
    }
  ];
};

// Helper function to get "Most Important" insights (top 4 by score)
export const getMostImportantInsights = (runs: EnrichedRun[]): ActionableInsight[] => {
  const engine = new ActionableInsightsEngine({ maxInsights: 4, prioritizeActionable: true });
  return engine.generateInsights(runs);
};