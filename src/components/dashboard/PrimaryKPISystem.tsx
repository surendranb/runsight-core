import React from 'react';
import { KeyPerformanceCard } from './KeyPerformanceCard';
import { EnrichedRun } from '../../types';
import { Activity, MapPin, Clock, TrendingUp } from 'lucide-react';
import { runningTerminology } from '../common/ContextualHelp';

interface PrimaryKPISystemProps {
  currentRuns: EnrichedRun[];
  comparisonRuns?: EnrichedRun[];
  period: string;
}

interface KPIMetric {
  id: string;
  metric: string;
  value: string;
  unit: string;
  trend: number;
  trendDirection: 'up' | 'down' | 'stable';
  comparisonPeriod: string;
  previousValue: string;
  contextTooltip: string;
  priority: 'primary' | 'secondary';
  icon: React.ReactNode;
  // Enhanced contextual information
  interpretation?: string;
  actionableAdvice?: string;
  confidence?: number;
  sampleSize?: number;
}

export const PrimaryKPISystem: React.FC<PrimaryKPISystemProps> = ({
  currentRuns,
  comparisonRuns = [],
  period
}) => {
  // Calculate metrics from runs data
  const calculateMetrics = (): KPIMetric[] => {
    if (currentRuns.length === 0) {
      return [];
    }

    const totalDistance = currentRuns.reduce((sum, run) => sum + run.distance, 0);
    const totalTime = currentRuns.reduce((sum, run) => sum + run.moving_time, 0);
    const avgPace = totalTime / (totalDistance / 1000);
    const totalRuns = currentRuns.length;
    const comparisonPeriodLabel = comparisonRuns.length > 0
      ? `previous ${period.toLowerCase()}`
      : 'Need another period to compare';
    const periodDays = period.includes('7') ? 7 : period.includes('30') ? 30 : period.includes('90') ? 90 : period.includes('Year') ? 365 : 30;
    
    let previousMetrics = {
      avgPace: 0,
      totalDistance: 0,
      totalRuns: 0,
      totalTime: 0
    };

    if (comparisonRuns.length > 0) {
      const prevTotalDistance = comparisonRuns.reduce((sum, run) => sum + run.distance, 0);
      const prevTotalTime = comparisonRuns.reduce((sum, run) => sum + run.moving_time, 0);
      previousMetrics = {
        avgPace: prevTotalTime / (prevTotalDistance / 1000),
        totalDistance: prevTotalDistance,
        totalRuns: comparisonRuns.length,
        totalTime: prevTotalTime
      };
    }

    // Helper functions
    const formatPace = (seconds: number) => {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDistance = (meters: number) => (meters / 1000).toFixed(0);

    const formatTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    const getTrendDirection = (current: number, previous: number, lowerIsBetter: boolean = false): 'up' | 'down' | 'stable' => {
      if (previous === 0) return 'stable';
      const change = (current - previous) / previous;
      if (Math.abs(change) < 0.05) return 'stable'; // Less than 5% change is stable
      
      if (lowerIsBetter) {
        return change < 0 ? 'up' : 'down'; // For pace, lower is better
      } else {
        return change > 0 ? 'up' : 'down'; // For distance/runs, higher is better
      }
    };

    // Generate contextual interpretations and advice
    const getPaceInterpretation = (pace: number, trendDirection: string) => {
      const paceMinutes = pace / 60;
      let interpretation = '';
      let advice = '';
      
      if (paceMinutes < 4) {
        interpretation = 'You are moving at a genuinely sharp pace right now, which points to strong current fitness.';
        advice = 'Protect the quality of that speed with real recovery, then use your harder sessions carefully.';
      } else if (paceMinutes < 5.5) {
        interpretation = 'Your pace is strong enough that the next gains will likely come from better structure, not just more running.';
        advice = 'Keep one quality session each week and make sure the easier days stay easy enough to support it.';
      } else if (paceMinutes < 7) {
        interpretation = 'This is a useful training pace for building fitness without turning every run into a test.';
        advice = 'Let this pace carry most of your weekly volume and use one faster run to keep your top end moving.';
      } else {
        interpretation = 'You are mostly running at an easy, conversational effort, which is a solid place to build consistency and endurance.';
        advice = 'Keep the easy running, then add one purposeful faster run a week if you want the pace to come down over time.';
      }
      
      if (trendDirection === 'up') {
        advice += ' The recent trend is moving in the right direction.';
      } else if (trendDirection === 'down') {
        advice += ' Because the recent trend is slower, recovery and heat or route context are worth checking before you force the pace.';
      }
      
      return { interpretation, advice };
    };

    const getDistanceInterpretation = (distance: number, runsCount: number) => {
      const avgDistance = distance / runsCount / 1000;
      let interpretation = '';
      let advice = '';
      
      if (avgDistance < 3) {
        interpretation = 'Your running is currently built around short sessions, which is often how consistency starts to stick.';
        advice = 'If you want more endurance, stretch just one run a little longer each week instead of making everything longer at once.';
      } else if (avgDistance < 6) {
        interpretation = 'Your distances are in a useful middle ground: enough to build fitness without making the schedule hard to sustain.';
        advice = 'Keep this foundation, then add variety by letting one run go longer and another stay shorter and lighter.';
      } else if (avgDistance < 10) {
        interpretation = 'You are covering enough ground to build a credible endurance base, not just stacking short maintenance runs.';
        advice = 'Keep the distance base, but leave room for one shorter, quicker session if you want more speed on top of it.';
      } else {
        interpretation = 'Longer runs are doing a lot of the work in your training right now, which is a strong sign of endurance focus.';
        advice = 'Balance that endurance with proper recovery and at least one shorter run that does not carry the same fatigue cost.';
      }
      
      return { interpretation, advice };
    };

    const getFrequencyInterpretation = (runsCount: number, periodDays: number) => {
      const runsPerWeek = (runsCount / periodDays) * 7;
      let interpretation = '';
      let advice = '';
      
      if (runsPerWeek < 2) {
        interpretation = 'Your routine is still a little sparse, so fitness gains will be harder to hold between runs.';
        advice = 'The next unlock is consistency: try to reach three runs most weeks before worrying about anything fancy.';
      } else if (runsPerWeek < 4) {
        interpretation = 'You have the beginnings of a sustainable routine, and that is enough to build from.';
        advice = 'If life allows it, one extra easy run each week would probably move the needle more than making the current runs harder.';
      } else if (runsPerWeek < 6) {
        interpretation = 'Your consistency is doing real work for you now. You are not relying on occasional good weeks.';
        advice = 'Keep the rhythm, then make sure the week has enough variety so every run is not asking for the same thing.';
      } else {
        interpretation = 'You are running often enough that consistency is clearly a strength, but recovery becomes part of the training plan now.';
        advice = 'Protect that consistency with true easy days and enough recovery so frequency stays sustainable.';
      }
      
      return { interpretation, advice };
    };

    // Define the maximum 4 primary KPIs based on importance and actionability
    const paceContext = getPaceInterpretation(avgPace, getTrendDirection(avgPace, previousMetrics.avgPace, true));
    const distanceContext = getDistanceInterpretation(totalDistance, totalRuns);
    const frequencyContext = getFrequencyInterpretation(totalRuns, periodDays);

    const metrics: KPIMetric[] = [
      {
        id: 'avg_pace',
        metric: 'Average Pace',
        value: formatPace(avgPace),
        unit: 'min/km',
        trend: previousMetrics.avgPace > 0 ? (avgPace - previousMetrics.avgPace) / previousMetrics.avgPace : 0,
        trendDirection: getTrendDirection(avgPace, previousMetrics.avgPace, true),
        comparisonPeriod: comparisonPeriodLabel,
        previousValue: comparisonRuns.length > 0 ? formatPace(previousMetrics.avgPace) : '—',
        contextTooltip: runningTerminology.pace.basic,
        interpretation: paceContext.interpretation,
        actionableAdvice: paceContext.advice,
        confidence: currentRuns.length >= 5 ? 0.85 : 0.65,
        sampleSize: currentRuns.length,
        priority: 'primary',
        icon: <TrendingUp className="w-6 h-6" />
      },
      {
        id: 'total_distance',
        metric: 'Total Distance',
        value: formatDistance(totalDistance),
        unit: 'km',
        trend: previousMetrics.totalDistance > 0 ? (totalDistance - previousMetrics.totalDistance) / previousMetrics.totalDistance : 0,
        trendDirection: getTrendDirection(totalDistance, previousMetrics.totalDistance),
        comparisonPeriod: comparisonPeriodLabel,
        previousValue: comparisonRuns.length > 0 ? formatDistance(previousMetrics.totalDistance) : '—',
        contextTooltip: 'Total distance covered shows your training volume. Higher volume generally leads to better endurance and fitness.',
        interpretation: distanceContext.interpretation,
        actionableAdvice: distanceContext.advice,
        confidence: currentRuns.length >= 3 ? 0.9 : 0.7,
        sampleSize: currentRuns.length,
        priority: 'primary',
        icon: <MapPin className="w-6 h-6" />
      },
      {
        id: 'total_runs',
        metric: 'Total Runs',
        value: totalRuns.toString(),
        unit: 'runs',
        trend: previousMetrics.totalRuns > 0 ? (totalRuns - previousMetrics.totalRuns) / previousMetrics.totalRuns : 0,
        trendDirection: getTrendDirection(totalRuns, previousMetrics.totalRuns),
        comparisonPeriod: comparisonPeriodLabel,
        previousValue: comparisonRuns.length > 0 ? previousMetrics.totalRuns.toString() : '—',
        contextTooltip: runningTerminology.consistency.basic,
        interpretation: frequencyContext.interpretation,
        actionableAdvice: frequencyContext.advice,
        confidence: 0.95, // High confidence in run count
        sampleSize: currentRuns.length,
        priority: 'primary',
        icon: <Activity className="w-6 h-6" />
      },
      {
        id: 'total_time',
        metric: 'Total Time',
        value: formatTime(totalTime),
        unit: '',
        trend: previousMetrics.totalTime > 0 ? (totalTime - previousMetrics.totalTime) / previousMetrics.totalTime : 0,
        trendDirection: getTrendDirection(totalTime, previousMetrics.totalTime),
        comparisonPeriod: comparisonPeriodLabel,
        previousValue: comparisonRuns.length > 0 ? formatTime(previousMetrics.totalTime) : '—',
        contextTooltip: 'Time spent running reflects your training commitment. More time generally leads to better endurance and cardiovascular health.',
        interpretation: `You spent ${formatTime(totalTime)} running this ${period.toLowerCase()}, averaging ${formatTime(totalTime / totalRuns)} per run.`,
        actionableAdvice: totalTime / totalRuns < 1800 ? 'Consider gradually extending some runs to build endurance.' : 'Good training volume! Balance with adequate recovery time.',
        confidence: 0.9,
        sampleSize: currentRuns.length,
        priority: 'primary',
        icon: <Clock className="w-6 h-6" />
      }
    ];

    // Training Load (ACWR) card removed - keeping only 4 basic metrics for Overview tab
    // ACWR analysis is available in the Advanced tab

    return metrics;
  };

  const metrics = calculateMetrics();

  if (metrics.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Performance Data</h3>
        <p className="text-gray-600">
          Once you have some runs recorded, your key performance indicators will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary KPI Cards - Maximum 4 cards in responsive grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <KeyPerformanceCard
            key={metric.id}
            metric={metric.metric}
            value={metric.value}
            unit={metric.unit}
            trend={metric.trend}
            trendDirection={metric.trendDirection}
            comparisonPeriod={metric.comparisonPeriod}
            previousValue={metric.previousValue}
            contextTooltip={metric.contextTooltip}
            interpretation={metric.interpretation}
            actionableAdvice={metric.actionableAdvice}
            confidence={metric.confidence}
            sampleSize={metric.sampleSize}
            priority={metric.priority}
          />
        ))}
      </div>


    </div>
  );
};
