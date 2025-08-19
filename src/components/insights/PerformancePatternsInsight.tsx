import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity, Target, BarChart3 } from 'lucide-react';
import { EnrichedRun } from '../../types';
import { 
  analyzeAdvancedPerformance, 
  formatPace
} from '../../lib/insights/advancedPerformanceUtils';
import { Section } from '../common/VisualHierarchy';

interface PerformancePatternsInsightProps {
  runs: EnrichedRun[];
}

export const PerformancePatternsInsight: React.FC<PerformancePatternsInsightProps> = ({ runs }) => {
  const analysis = useMemo(() => analyzeAdvancedPerformance(runs), [runs]);
  const { improvementRates, insights } = analysis;

  if (runs.length < 5) {
    return (
      <Section
        title="Performance Patterns"
        subtitle="Track your improvement trends and performance consistency"
        level={2}
        icon={BarChart3}
        className="mb-6"
      >
        <div className="text-center py-8 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Need at least 5 runs for performance pattern analysis.</p>
          <p className="text-sm">Keep running to unlock detailed insights!</p>
        </div>
      </Section>
    );
  }

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'declining': return <TrendingDown className="w-5 h-5 text-red-500" />;
      default: return <Activity className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTrendColor = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving': return 'text-green-700 bg-green-50 border-green-200';
      case 'declining': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  const getTrendMessage = (trend: 'improving' | 'declining' | 'stable', type: string) => {
    switch (trend) {
      case 'improving':
        return `Your ${type} is improving - great progress!`;
      case 'declining':
        return `Your ${type} has declined recently - consider adjusting your training.`;
      default:
        return `Your ${type} is stable - consistent performance.`;
    }
  };

  return (
    <Section
      title="Performance Patterns"
      subtitle={`Track your improvement trends and performance consistency across ${runs.length} runs`}
      level={2}
      icon={BarChart3}
      badge={{
        text: `Last ${Math.min(runs.length, 30)} runs analyzed`,
        color: 'purple'
      }}
      className="mb-6"
    >
      <div className="space-y-6">
        {/* Key Insights */}
        {insights.length > 0 && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2 flex items-center">
              <Target className="w-4 h-4 mr-2" />
              Key Performance Insights
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              {insights.slice(0, 3).map((insight, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Performance Trends */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pace Improvement */}
          <div className={`p-4 border rounded-lg ${getTrendColor(improvementRates.paceImprovement.trend)}`}>
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-medium">Pace Trend</h5>
              {getTrendIcon(improvementRates.paceImprovement.trend)}
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {Math.abs(improvementRates.paceImprovement.rate).toFixed(1)}s/km
              </div>
              <div className="text-sm opacity-75">
                {improvementRates.paceImprovement.trend === 'improving' ? 'faster' : 'change'} per month
              </div>
              <div className="text-xs opacity-60">
                Confidence: {(improvementRates.paceImprovement.confidence * 100).toFixed(0)}%
              </div>
            </div>
            <div className="mt-3 text-sm">
              {getTrendMessage(improvementRates.paceImprovement.trend, 'pace')}
            </div>
          </div>

          {/* Distance Progress */}
          <div className={`p-4 border rounded-lg ${getTrendColor(improvementRates.distanceImprovement.trend)}`}>
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-medium">Distance Trend</h5>
              {getTrendIcon(improvementRates.distanceImprovement.trend)}
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {(Math.abs(improvementRates.distanceImprovement.rate) / 1000).toFixed(1)}km
              </div>
              <div className="text-sm opacity-75">
                {improvementRates.distanceImprovement.trend === 'improving' ? 'increase' : 'change'} per month
              </div>
              <div className="text-xs opacity-60">
                Confidence: {(improvementRates.distanceImprovement.confidence * 100).toFixed(0)}%
              </div>
            </div>
            <div className="mt-3 text-sm">
              {getTrendMessage(improvementRates.distanceImprovement.trend, 'distance')}
            </div>
          </div>

          {/* Consistency Growth */}
          <div className={`p-4 border rounded-lg ${getTrendColor(improvementRates.consistencyImprovement.trend)}`}>
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-medium">Consistency</h5>
              {getTrendIcon(improvementRates.consistencyImprovement.trend)}
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                +{improvementRates.consistencyImprovement.rate.toFixed(1)}
              </div>
              <div className="text-sm opacity-75">
                improvement per month
              </div>
              <div className="text-xs opacity-60">
                Confidence: {(improvementRates.consistencyImprovement.confidence * 100).toFixed(0)}%
              </div>
            </div>
            <div className="mt-3 text-sm">
              {getTrendMessage(improvementRates.consistencyImprovement.trend, 'consistency')}
            </div>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-800 mb-3">Performance Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">3-Month Pace Projection:</span>
              <div className="mt-1 text-lg font-mono text-gray-900">
                {formatPace(improvementRates.paceImprovement.projection)}
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Overall Trend:</span>
              <div className="mt-1">
                {improvementRates.paceImprovement.trend === 'improving' && 
                 improvementRates.consistencyImprovement.trend === 'improving' ? (
                  <span className="text-green-600 font-medium">Excellent Progress</span>
                ) : improvementRates.paceImprovement.trend === 'improving' || 
                       improvementRates.consistencyImprovement.trend === 'improving' ? (
                  <span className="text-blue-600 font-medium">Good Progress</span>
                ) : (
                  <span className="text-orange-600 font-medium">Focus on Consistency</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
};