import React from 'react';
import { KeyPerformanceCard } from './KeyPerformanceCard';
import { EnrichedRun } from '../../types';
import { Activity, MapPin, Clock, TrendingUp } from 'lucide-react';
import { runningTerminology } from '../common/ContextualHelp';

interface PrimaryKPISystemProps {
  runs: EnrichedRun[];
  period: string;
  onViewDetails?: (metric: string) => void;
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
  runs,
  period,
  onViewDetails
}) => {
  // Calculate metrics from runs data
  const calculateMetrics = (): KPIMetric[] => {
    if (runs.length === 0) {
      return [];
    }

    const totalDistance = runs.reduce((sum, run) => sum + run.distance, 0);
    const totalTime = runs.reduce((sum, run) => sum + run.moving_time, 0);
    const avgPace = totalTime / (totalDistance / 1000);
    const totalRuns = runs.length;

    // Calculate previous period for comparison (simplified for demo)
    const periodDays = period.includes('30') ? 30 : period.includes('Year') ? 365 : 90;
    const previousPeriodRuns = runs.slice(0, Math.floor(runs.length / 2)); // Simplified comparison
    
    let previousMetrics = {
      avgPace: 0,
      totalDistance: 0,
      totalRuns: 0,
      totalTime: 0
    };

    if (previousPeriodRuns.length > 0) {
      const prevTotalDistance = previousPeriodRuns.reduce((sum, run) => sum + run.distance, 0);
      const prevTotalTime = previousPeriodRuns.reduce((sum, run) => sum + run.moving_time, 0);
      previousMetrics = {
        avgPace: prevTotalTime / (prevTotalDistance / 1000),
        totalDistance: prevTotalDistance,
        totalRuns: previousPeriodRuns.length,
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
    const getPaceInterpretation = (pace: number, trend: number, trendDirection: string) => {
      const paceMinutes = pace / 60;
      let interpretation = '';
      let advice = '';
      
      if (paceMinutes < 4) {
        interpretation = 'You\'re running at a competitive pace, indicating excellent fitness level.';
        advice = 'Focus on maintaining this pace while ensuring adequate recovery between runs.';
      } else if (paceMinutes < 5.5) {
        interpretation = 'You\'re running at a strong recreational pace, showing good fitness.';
        advice = 'Consider incorporating interval training to improve speed, or longer runs to build endurance.';
      } else if (paceMinutes < 7) {
        interpretation = 'You\'re running at a moderate pace, perfect for building aerobic base.';
        advice = 'This is an excellent pace for most training runs. Focus on consistency and gradually increasing distance.';
      } else {
        interpretation = 'You\'re running at an easy, conversational pace - ideal for building endurance.';
        advice = 'This pace is perfect for base building. Consider adding one faster run per week to improve speed.';
      }
      
      if (trendDirection === 'up') {
        advice += ' Your pace is improving - keep up the great work!';
      } else if (trendDirection === 'down') {
        advice += ' Your pace has slowed recently - ensure you\'re getting adequate rest and nutrition.';
      }
      
      return { interpretation, advice };
    };

    const getDistanceInterpretation = (distance: number, runsCount: number, trend: number) => {
      const avgDistance = distance / runsCount / 1000;
      let interpretation = '';
      let advice = '';
      
      if (avgDistance < 3) {
        interpretation = 'You\'re focusing on shorter runs, which is great for building consistency.';
        advice = 'Consider gradually increasing one run per week to build endurance capacity.';
      } else if (avgDistance < 6) {
        interpretation = 'You\'re running moderate distances, building good aerobic fitness.';
        advice = 'This is a solid foundation. Consider adding variety with both shorter and longer runs.';
      } else if (avgDistance < 10) {
        interpretation = 'You\'re covering good distances, showing strong endurance development.';
        advice = 'Great endurance base! Consider adding some shorter, faster runs for speed development.';
      } else {
        interpretation = 'You\'re running long distances, indicating excellent endurance fitness.';
        advice = 'Impressive endurance! Ensure you\'re balancing with adequate recovery and shorter runs.';
      }
      
      return { interpretation, advice };
    };

    const getFrequencyInterpretation = (runsCount: number, periodDays: number) => {
      const runsPerWeek = (runsCount / periodDays) * 7;
      let interpretation = '';
      let advice = '';
      
      if (runsPerWeek < 2) {
        interpretation = 'You\'re running less than twice per week. Consistency is key for improvement.';
        advice = 'Try to aim for at least 3 runs per week to see meaningful fitness gains.';
      } else if (runsPerWeek < 4) {
        interpretation = 'You\'re running 2-3 times per week, which is a good foundation for fitness.';
        advice = 'Consider adding one more run per week to accelerate your fitness improvements.';
      } else if (runsPerWeek < 6) {
        interpretation = 'You\'re running 4-5 times per week, showing excellent consistency.';
        advice = 'Great frequency! Focus on varying your run types (easy, tempo, long) for balanced training.';
      } else {
        interpretation = 'You\'re running very frequently, showing strong commitment to training.';
        advice = 'Excellent consistency! Ensure you\'re including easy runs and rest days to prevent overtraining.';
      }
      
      return { interpretation, advice };
    };

    // Define the maximum 4 primary KPIs based on importance and actionability
    const paceContext = getPaceInterpretation(avgPace, 0, getTrendDirection(avgPace, previousMetrics.avgPace, true));
    const distanceContext = getDistanceInterpretation(totalDistance, totalRuns, 0);
    const frequencyContext = getFrequencyInterpretation(totalRuns, periodDays);

    const metrics: KPIMetric[] = [
      {
        id: 'avg_pace',
        metric: 'Average Pace',
        value: formatPace(avgPace),
        unit: 'min/km',
        trend: previousMetrics.avgPace > 0 ? (avgPace - previousMetrics.avgPace) / previousMetrics.avgPace : 0,
        trendDirection: getTrendDirection(avgPace, previousMetrics.avgPace, true),
        comparisonPeriod: `previous ${period.toLowerCase()}`,
        previousValue: formatPace(previousMetrics.avgPace || avgPace),
        contextTooltip: runningTerminology.pace.basic,
        interpretation: paceContext.interpretation,
        actionableAdvice: paceContext.advice,
        confidence: runs.length >= 5 ? 0.85 : 0.65,
        sampleSize: runs.length,
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
        comparisonPeriod: `previous ${period.toLowerCase()}`,
        previousValue: formatDistance(previousMetrics.totalDistance || totalDistance),
        contextTooltip: 'Total distance covered shows your training volume. Higher volume generally leads to better endurance and fitness.',
        interpretation: distanceContext.interpretation,
        actionableAdvice: distanceContext.advice,
        confidence: runs.length >= 3 ? 0.9 : 0.7,
        sampleSize: runs.length,
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
        comparisonPeriod: `previous ${period.toLowerCase()}`,
        previousValue: (previousMetrics.totalRuns || totalRuns).toString(),
        contextTooltip: runningTerminology.consistency.basic,
        interpretation: frequencyContext.interpretation,
        actionableAdvice: frequencyContext.advice,
        confidence: 0.95, // High confidence in run count
        sampleSize: runs.length,
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
        comparisonPeriod: `previous ${period.toLowerCase()}`,
        previousValue: formatTime(previousMetrics.totalTime || totalTime),
        contextTooltip: 'Time spent running reflects your training commitment. More time generally leads to better endurance and cardiovascular health.',
        interpretation: `You've spent ${formatTime(totalTime)} running this ${period.toLowerCase()}, averaging ${formatTime(totalTime / totalRuns)} per run.`,
        actionableAdvice: totalTime / totalRuns < 1800 ? 'Consider gradually extending some runs to build endurance.' : 'Good training volume! Balance with adequate recovery time.',
        confidence: 0.9,
        sampleSize: runs.length,
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
            onViewDetails={onViewDetails ? () => onViewDetails(metric.id) : undefined}
          />
        ))}
      </div>


    </div>
  );
};