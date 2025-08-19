import React, { useState } from 'react';
import { ChevronDown, ChevronUp, X, TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import { EnrichedRun } from '../../types';

interface ProgressiveDisclosurePanelProps {
  isOpen: boolean;
  onClose: () => void;
  metric: string;
  runs: EnrichedRun[];
  period: string;
}

interface DetailedMetrics {
  current: number;
  previous: number;
  best: number;
  worst: number;
  trend: number[];
  consistency: number;
}

export const ProgressiveDisclosurePanel: React.FC<ProgressiveDisclosurePanelProps> = ({
  isOpen,
  onClose,
  metric,
  runs,
  period
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'breakdown'>('overview');

  if (!isOpen) return null;

  // Calculate detailed metrics based on the selected metric
  const calculateDetailedMetrics = (): DetailedMetrics => {
    if (runs.length === 0) {
      return {
        current: 0,
        previous: 0,
        best: 0,
        worst: 0,
        trend: [],
        consistency: 0
      };
    }

    let values: number[] = [];
    let current = 0;

    switch (metric) {
      case 'avg_pace':
        values = runs.map(run => run.moving_time / (run.distance / 1000));
        current = values.reduce((sum, val) => sum + val, 0) / values.length;
        break;
      case 'total_distance':
        values = runs.map(run => run.distance / 1000);
        current = values.reduce((sum, val) => sum + val, 0);
        break;
      case 'total_runs':
        current = runs.length;
        values = [runs.length];
        break;
      case 'total_time':
        values = runs.map(run => run.moving_time / 3600);
        current = values.reduce((sum, val) => sum + val, 0);
        break;
      default:
        values = [0];
        current = 0;
    }

    const best = Math.min(...values);
    const worst = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    const consistency = 1 - (Math.sqrt(variance) / avg);

    // Create trend data (last 10 data points)
    const trend = values.slice(-10);

    return {
      current,
      previous: current * 0.9, // Simplified for demo
      best,
      worst,
      trend,
      consistency: Math.max(0, Math.min(1, consistency))
    };
  };

  const detailedMetrics = calculateDetailedMetrics();

  const formatValue = (value: number): string => {
    switch (metric) {
      case 'avg_pace':
        const minutes = Math.floor(value / 60);
        const seconds = Math.floor(value % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      case 'total_distance':
        return `${value.toFixed(1)} km`;
      case 'total_runs':
        return `${Math.round(value)} runs`;
      case 'total_time':
        return `${value.toFixed(1)} hours`;
      default:
        return value.toString();
    }
  };

  const getMetricTitle = (): string => {
    switch (metric) {
      case 'avg_pace': return 'Average Pace Analysis';
      case 'total_distance': return 'Distance Analysis';
      case 'total_runs': return 'Running Frequency Analysis';
      case 'total_time': return 'Training Time Analysis';
      default: return 'Metric Analysis';
    }
  };

  const getMetricDescription = (): string => {
    switch (metric) {
      case 'avg_pace': return 'Detailed breakdown of your pace performance, trends, and consistency patterns';
      case 'total_distance': return 'Analysis of your distance coverage, weekly patterns, and volume trends';
      case 'total_runs': return 'Insights into your running frequency, consistency, and training schedule';
      case 'total_time': return 'Time investment analysis, training load, and endurance building patterns';
      default: return 'Detailed analysis of this performance metric';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{getMetricTitle()}</h2>
              <p className="text-gray-600 mt-1">{getMetricDescription()}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-60 rounded-lg transition-colors"
              aria-label="Close detailed view"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mt-6 bg-white bg-opacity-60 rounded-lg p-1">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'trends', label: 'Trends', icon: TrendingUp },
              { id: 'breakdown', label: 'Breakdown', icon: Calendar }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white hover:bg-opacity-40'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
                  <p className="text-sm font-medium text-blue-700 mb-1">Current</p>
                  <p className="text-2xl font-bold text-blue-900">{formatValue(detailedMetrics.current)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
                  <p className="text-sm font-medium text-green-700 mb-1">Best</p>
                  <p className="text-2xl font-bold text-green-900">{formatValue(detailedMetrics.best)}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-200">
                  <p className="text-sm font-medium text-orange-700 mb-1">Consistency</p>
                  <p className="text-2xl font-bold text-orange-900">{(detailedMetrics.consistency * 100).toFixed(0)}%</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
                  <p className="text-sm font-medium text-purple-700 mb-1">Data Points</p>
                  <p className="text-2xl font-bold text-purple-900">{runs.length}</p>
                </div>
              </div>

              {/* Performance Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Period:</span>
                    <span className="font-medium text-gray-900">{period}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Sample Size:</span>
                    <span className="font-medium text-gray-900">{runs.length} activities</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Consistency Score:</span>
                    <span className={`font-medium ${detailedMetrics.consistency > 0.8 ? 'text-green-600' : detailedMetrics.consistency > 0.6 ? 'text-orange-600' : 'text-red-600'}`}>
                      {(detailedMetrics.consistency * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trends' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Trend Analysis</h3>
                <p className="text-gray-600 mb-4">
                  Based on your last {detailedMetrics.trend.length} activities
                </p>
                
                {/* Simple trend visualization */}
                <div className="flex items-end space-x-2 h-32 bg-white rounded-lg p-4">
                  {detailedMetrics.trend.map((value, index) => {
                    const maxValue = Math.max(...detailedMetrics.trend);
                    const height = (value / maxValue) * 100;
                    return (
                      <div
                        key={index}
                        className="bg-blue-400 rounded-t flex-1 transition-all hover:bg-blue-500"
                        style={{ height: `${height}%` }}
                        title={formatValue(value)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'breakdown' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Breakdown</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Performance Range</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Best Performance:</span>
                          <span className="font-medium text-green-600">{formatValue(detailedMetrics.best)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Worst Performance:</span>
                          <span className="font-medium text-red-600">{formatValue(detailedMetrics.worst)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Average:</span>
                          <span className="font-medium text-gray-900">{formatValue(detailedMetrics.current)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Consistency Analysis</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Consistency Score:</span>
                          <span className="font-medium text-gray-900">{(detailedMetrics.consistency * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${detailedMetrics.consistency > 0.8 ? 'bg-green-500' : detailedMetrics.consistency > 0.6 ? 'bg-orange-500' : 'bg-red-500'}`}
                            style={{ width: `${detailedMetrics.consistency * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};