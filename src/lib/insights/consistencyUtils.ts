// src/lib/insights/consistencyUtils.ts
import { EnrichedRun } from '../../types';
import { formatRunDate } from '../dateUtils';

export interface TimeGroupData {
  label: string; // e.g., "Week of Oct 26", "Nov 2023"
  year: number;
  period: number; // Week number or month number (1-12)
  totalDistance: number; // in meters
  totalMovingTime: number; // in seconds
  runCount: number;
  startDate: Date; // The start date of this period for sorting
}

// Helper to get ISO week number
const getISOWeek = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const getMonthName = (monthNumber: number): string => {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[monthNumber -1] || "Unknown";
}

export const groupRunsByWeek = (runs: EnrichedRun[]): TimeGroupData[] => {
  const grouped: Record<string, TimeGroupData> = {};

  runs.forEach(run => {
    const localYear = parseInt(run.start_date_local.substring(0, 4), 10);
    const localMonth = parseInt(run.start_date_local.substring(5, 7), 10) - 1; // 0-11 for Date constructor
    const localDay = parseInt(run.start_date_local.substring(8, 10), 10);

    // Use UTC components of the local date to ensure getISOWeek works correctly
    const activityLocalDateAsUtc = new Date(Date.UTC(localYear, localMonth, localDay));
    const week = getISOWeek(activityLocalDateAsUtc);

    // Calculate weekStartDate based on the activity's local calendar date
    // This ensures that the week grouping is consistent with the local date
    const tempDateForWeekCalcs = new Date(localYear, localMonth, localDay);
    const dayOfWeek = tempDateForWeekCalcs.getDay(); // 0 (Sunday) - 6 (Saturday)
    // Adjust diff to get Monday. If Sunday (0), subtract 6 days. If Monday (1), subtract 0 days. If Tuesday (2), subtract 1 day, etc.
    const diffToMonday = (dayOfWeek === 0) ? 6 : (dayOfWeek - 1);
    const weekStartDate = new Date(tempDateForWeekCalcs.setDate(tempDateForWeekCalcs.getDate() - diffToMonday));
    weekStartDate.setHours(0, 0, 0, 0);

    const weekYear = weekStartDate.getFullYear(); // Year of the week (can differ from localYear for year-end weeks)
    const key = `${weekYear}-W${week}`;

    if (!grouped[key]) {
      grouped[key] = {
        label: `Week of ${formatRunDate(weekStartDate.toISOString())}`,
        year: weekYear,
        period: week,
        totalDistance: 0,
        totalMovingTime: 0,
        runCount: 0,
        startDate: weekStartDate,
      };
    }
    grouped[key].totalDistance += run.distance;
    grouped[key].totalMovingTime += run.moving_time;
    grouped[key].runCount += 1;
  });

  return Object.values(grouped).sort((a,b) => a.startDate.getTime() - b.startDate.getTime());
};

export const groupRunsByMonth = (runs: EnrichedRun[]): TimeGroupData[] => {
  const grouped: Record<string, TimeGroupData> = {};

  runs.forEach(run => {
    // Parse year and month directly from the start_date_local string
    const year = parseInt(run.start_date_local.substring(0, 4), 10);
    const month = parseInt(run.start_date_local.substring(5, 7), 10); // month is 1-12
    const key = `${year}-M${month}`;

    if (!grouped[key]) {
      // Create the Date object for monthStartDate using the parsed year and month
      const monthStartDate = new Date(year, month - 1, 1); // month - 1 because Date constructor expects 0-11
      grouped[key] = {
        label: `${getMonthName(month)} ${year}`,
        year,
        period: month,
        totalDistance: 0,
        totalMovingTime: 0,
        runCount: 0,
        startDate: monthStartDate,
      };
    }
    grouped[key].totalDistance += run.distance;
    grouped[key].totalMovingTime += run.moving_time;
    grouped[key].runCount += 1;
  });
  return Object.values(grouped).sort((a,b) => a.startDate.getTime() - b.startDate.getTime());
};

// Advanced consistency analysis
export interface ConsistencyAnalysis {
  consistencyScore: number; // 0-100 scale
  trend: 'improving' | 'stable' | 'declining';
  streaks: {
    current: number;
    longest: number;
    type: 'days' | 'weeks';
  };
  frequency: {
    runsPerWeek: number;
    averageGapDays: number;
    mostConsistentDay: string;
  };
  recommendations: string[];
}

export const analyzeConsistency = (runs: EnrichedRun[]): ConsistencyAnalysis => {
  if (runs.length === 0) {
    return {
      consistencyScore: 0,
      trend: 'stable',
      streaks: { current: 0, longest: 0, type: 'days' },
      frequency: { runsPerWeek: 0, averageGapDays: 0, mostConsistentDay: 'None' },
      recommendations: ['Start running regularly to build consistency']
    };
  }

  // Sort runs by date
  const sortedRuns = [...runs].sort((a, b) => 
    new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
  );

  // Calculate consistency score based on regularity
  const consistencyScore = calculateConsistencyScore(sortedRuns);
  
  // Analyze trends
  const trend = analyzeTrend(sortedRuns);
  
  // Calculate streaks
  const streaks = calculateStreaks(sortedRuns);
  
  // Analyze frequency patterns
  const frequency = analyzeFrequency(sortedRuns);
  
  // Generate recommendations
  const recommendations = generateConsistencyRecommendations(consistencyScore, trend, frequency);

  return {
    consistencyScore,
    trend,
    streaks,
    frequency,
    recommendations
  };
};

const calculateConsistencyScore = (runs: EnrichedRun[]): number => {
  if (runs.length < 2) return 0;

  // Calculate gaps between runs
  const gaps: number[] = [];
  for (let i = 1; i < runs.length; i++) {
    const prevDate = new Date(runs[i - 1].start_date_local);
    const currDate = new Date(runs[i].start_date_local);
    const gapDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
    gaps.push(gapDays);
  }

  // Calculate consistency based on gap variance
  const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / gaps.length;
  const stdDev = Math.sqrt(variance);
  
  // Score: lower variance = higher consistency
  const consistencyScore = Math.max(0, 100 - (stdDev / avgGap) * 50);
  return Math.min(100, consistencyScore);
};

const analyzeTrend = (runs: EnrichedRun[]): 'improving' | 'stable' | 'declining' => {
  if (runs.length < 6) return 'stable';

  const weeklyData = groupRunsByWeek(runs);
  if (weeklyData.length < 3) return 'stable';

  // Compare recent weeks to earlier weeks
  const recentWeeks = weeklyData.slice(-3);
  const earlierWeeks = weeklyData.slice(0, 3);

  const recentAvg = recentWeeks.reduce((sum, week) => sum + week.runCount, 0) / recentWeeks.length;
  const earlierAvg = earlierWeeks.reduce((sum, week) => sum + week.runCount, 0) / earlierWeeks.length;

  const improvement = (recentAvg - earlierAvg) / earlierAvg;
  
  if (improvement > 0.2) return 'improving';
  if (improvement < -0.2) return 'declining';
  return 'stable';
};

const calculateStreaks = (runs: EnrichedRun[]): { current: number; longest: number; type: 'days' | 'weeks' } => {
  if (runs.length === 0) return { current: 0, longest: 0, type: 'days' };

  // Calculate day streaks (consecutive days with runs)
  const runDates = runs.map(run => {
    // Extract just the date part to avoid timezone issues
    return run.start_date_local.substring(0, 10); // "2025-08-09"
  });

  const uniqueDates = [...new Set(runDates)].sort();
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i - 1]);
    const currDate = new Date(uniqueDates[i]);
    const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

    if (dayDiff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  
  longestStreak = Math.max(longestStreak, tempStreak);

  // Calculate current streak from today
  const today = new Date();
  const lastRunDate = new Date(runs[runs.length - 1].start_date_local);
  const daysSinceLastRun = (today.getTime() - lastRunDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceLastRun <= 1) {
    // Count backwards from last run
    for (let i = uniqueDates.length - 1; i >= 0; i--) {
      const date = new Date(uniqueDates[i]);
      const daysDiff = (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff <= currentStreak + 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return { current: currentStreak, longest: longestStreak, type: 'days' };
};

const analyzeFrequency = (runs: EnrichedRun[]): { runsPerWeek: number; averageGapDays: number; mostConsistentDay: string } => {
  if (runs.length === 0) {
    return { runsPerWeek: 0, averageGapDays: 0, mostConsistentDay: 'None' };
  }

  // Calculate runs per week
  const firstRun = new Date(runs[0].start_date_local);
  const lastRun = new Date(runs[runs.length - 1].start_date_local);
  const totalWeeks = Math.max(1, (lastRun.getTime() - firstRun.getTime()) / (1000 * 60 * 60 * 24 * 7));
  const runsPerWeek = runs.length / totalWeeks;

  // Calculate average gap
  let totalGap = 0;
  for (let i = 1; i < runs.length; i++) {
    const prevDate = new Date(runs[i - 1].start_date_local);
    const currDate = new Date(runs[i].start_date_local);
    totalGap += (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
  }
  const averageGapDays = runs.length > 1 ? totalGap / (runs.length - 1) : 0;

  // Find most consistent day
  const dayCount = new Map<string, number>();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  runs.forEach(run => {
    const date = new Date(run.start_date_local);
    const dayName = dayNames[date.getDay()];
    dayCount.set(dayName, (dayCount.get(dayName) || 0) + 1);
  });

  const mostConsistentDay = Array.from(dayCount.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

  return { runsPerWeek, averageGapDays, mostConsistentDay };
};

const generateConsistencyRecommendations = (
  score: number, 
  trend: 'improving' | 'stable' | 'declining',
  frequency: { runsPerWeek: number; averageGapDays: number; mostConsistentDay: string }
): string[] => {
  const recommendations: string[] = [];

  if (score < 30) {
    recommendations.push('Focus on building a regular running routine');
    recommendations.push('Try to run every other day to establish consistency');
  } else if (score < 60) {
    recommendations.push('Good progress! Try to reduce gaps between runs');
    recommendations.push('Consider setting weekly running goals');
  } else if (score < 80) {
    recommendations.push('Great consistency! Maintain your current routine');
    if (trend === 'declining') {
      recommendations.push('Watch for signs of overtraining or burnout');
    }
  } else {
    recommendations.push('Excellent consistency! You have a solid routine');
    recommendations.push('Consider gradually increasing volume or intensity');
  }

  if (frequency.runsPerWeek < 2) {
    recommendations.push('Aim for at least 2-3 runs per week for better fitness gains');
  } else if (frequency.runsPerWeek > 6) {
    recommendations.push('Consider adding rest days to prevent overtraining');
  }

  if (frequency.averageGapDays > 5) {
    recommendations.push('Try to reduce the gap between runs to maintain fitness');
  }

  if (frequency.mostConsistentDay !== 'None') {
    recommendations.push(`You run most often on ${frequency.mostConsistentDay}s - great routine!`);
  }

  return recommendations;
};
