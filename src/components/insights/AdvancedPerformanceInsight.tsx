import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Target, 
  BarChart3, 
  Zap,
  Brain,
  Award
} from 'lucide-react';
import { EnrichedRun } from '../../types';
import { 
  analyzeAdvancedPerformance, 
  EffortScore,
  formatPace,
  formatTime
} from '../../lib/insights/advancedPerformanceUtils';
import { formatRunDate } from '../../lib/dateUtils';

interface AdvancedPerformanceInsightProps {
  runs: EnrichedRun[];
}

export const AdvancedPerformanceInsight: React.FC<AdvancedPerformanceInsightProps> = ({ runs }) => {
  const [selectedTab, setSelectedTab] = useState<'effort' | 'variability' | 'improvement' | 'prediction'>('effort');
  
  const analysis = useMemo(() => analyzeAdvancedPerformance(runs), [runs]);
  const { effortScores, variabilityAnalysis, improvementRates, predictions, insights } = analysis;

  if (runs.length < 5) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center mb-4">
          <BarChart3 className="w-6 h-6 text-purple-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800">Advanced Performance Metrics</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Need at least 5 runs for advanced performance analysis.</p>
          <p className="text-sm">Keep running to unlock detailed insights!</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'effort', label: 'Effort Analysis', icon: Zap },
    { id: 'variability', label: 'Variability', icon: Activity },
    { id: 'improvement', label: 'Improvement', icon: TrendingUp },
    { id: 'prediction', label: 'Predictions', icon: Brain }
  ];

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTrendColor = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving': return 'text-green-600 bg-green-100';
      case 'declining': return 'text-red-600 bg-red-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getEffortColor = (score: number) => {
    if (score >= 80) return 'text-red-600 bg-red-100';
    if (score >= 60) return 'text-orange-600 bg-orange-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <BarChart3 className="w-6 h-6 text-purple-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800">Advanced Performance Metrics</h3>
        </div>
        
        <div className="flex bg-gray-100 rounded-lg p-1">
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  selectedTab === tab.id
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <IconComponent className="w-4 h-4 mr-1" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Insights Summary */}
      {insights.length > 0 && (
        <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <h4 className="font-medium text-purple-800 mb-2 flex items-center">
            <Brain className="w-4 h-4 mr-2" />
            Key Insights
          </h4>
          <ul className="text-sm text-purple-700 space-y-1">
            {insights.map((insight, index) => (
              <li key={index} className="flex items-start">
                <span className="text-purple-500 mr-2">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab Content */}
      {selectedTab === 'effort' && (
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-gray-800 mb-3 flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              Recent Effort Scores
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {effortScores.slice(0, 6).map((score, index) => (
                <div key={score.runId} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">
                      {formatRunDate(score.date)}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getEffortColor(score.effortScore)}`}>
                      {score.effortScore}/100
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Pace:</span>
                      <span>{score.paceEffort}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Elevation:</span>
                      <span>{score.elevationEffort}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Weather:</span>
                      <span>{score.weatherEffort}/100</span>
                    </div>
                    {score.heartRateEffort && (
                      <div className="flex justify-between">
                        <span>Heart Rate:</span>
                        <span>{score.heartRateEffort}/100</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'variability' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h5 className="font-medium text-blue-800 mb-2">Pace Variability</h5>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">Coefficient:</span>
                  <span className="font-medium text-blue-900">
                    {variabilityAnalysis.paceVariability.coefficient.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">Trend:</span>
                  <div className="flex items-center">
                    {getTrendIcon(variabilityAnalysis.paceVariability.trend)}
                    <span className="ml-1 text-sm font-medium">
                      {variabilityAnalysis.paceVariability.trend}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-blue-600 mt-2">
                  Avg: {formatPace(variabilityAnalysis.paceVariability.mean)}
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h5 className="font-medium text-green-800 mb-2">Distance Consistency</h5>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-700">Level:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    variabilityAnalysis.distanceVariability.consistency === 'high' ? 'bg-green-200 text-green-800' :
                    variabilityAnalysis.distanceVariability.consistency === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-red-200 text-red-800'
                  }`}>
                    {variabilityAnalysis.distanceVariability.consistency}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-700">Coefficient:</span>
                  <span className="font-medium text-green-900">
                    {variabilityAnalysis.distanceVariability.coefficient.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-green-600 mt-2">
                  Avg: {(variabilityAnalysis.distanceVariability.mean / 1000).toFixed(1)}km
                </div>
              </div>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h5 className="font-medium text-purple-800 mb-2">Overall Reliability</h5>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-purple-700">Level:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    variabilityAnalysis.effortVariability.reliability === 'high' ? 'bg-green-200 text-green-800' :
                    variabilityAnalysis.effortVariability.reliability === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-red-200 text-red-800'
                  }`}>
                    {variabilityAnalysis.effortVariability.reliability}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-purple-700">Coefficient:</span>
                  <span className="font-medium text-purple-900">
                    {variabilityAnalysis.effortVariability.coefficient.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'improvement' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h5 className="font-medium text-gray-800 mb-3 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                Pace Improvement
              </h5>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Monthly Rate:</span>
                  <span className="font-medium">
                    {Math.abs(improvementRates.paceImprovement.rate).toFixed(1)}s/km
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Trend:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getTrendColor(improvementRates.paceImprovement.trend)}`}>
                    {improvementRates.paceImprovement.trend}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Confidence:</span>
                  <span className="font-medium">
                    {(improvementRates.paceImprovement.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  3-month projection: {formatPace(improvementRates.paceImprovement.projection)}
                </div>
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h5 className="font-medium text-gray-800 mb-3 flex items-center">
                <Activity className="w-4 h-4 mr-2" />
                Distance Progress
              </h5>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Monthly Rate:</span>
                  <span className="font-medium">
                    {(improvementRates.distanceImprovement.rate / 1000).toFixed(1)}km
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Trend:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getTrendColor(improvementRates.distanceImprovement.trend)}`}>
                    {improvementRates.distanceImprovement.trend}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Confidence:</span>
                  <span className="font-medium">
                    {(improvementRates.distanceImprovement.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h5 className="font-medium text-gray-800 mb-3 flex items-center">
                <Target className="w-4 h-4 mr-2" />
                Consistency Growth
              </h5>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Monthly Rate:</span>
                  <span className="font-medium">
                    +{improvementRates.consistencyImprovement.rate.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Trend:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getTrendColor(improvementRates.consistencyImprovement.trend)}`}>
                    {improvementRates.consistencyImprovement.trend}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Confidence:</span>
                  <span className="font-medium">
                    {(improvementRates.consistencyImprovement.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'prediction' && (
        <div className="space-y-6">
          {/* Next Run Prediction */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-3 flex items-center">
              <Brain className="w-4 h-4 mr-2" />
              Next Run Prediction
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatPace(predictions.nextRunPrediction.predictedPace)}
                </div>
                <div className="text-sm text-blue-700">Predicted Pace</div>
                <div className="text-xs text-blue-600 mt-1">
                  Confidence: {(predictions.nextRunPrediction.confidence * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-blue-700 mb-2">Based on:</div>
                <ul className="text-xs text-blue-600 space-y-1">
                  {predictions.nextRunPrediction.factors.map((factor, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-500 mr-1">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Goal Achievement Probabilities */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3 flex items-center">
              <Award className="w-4 h-4 mr-2" />
              Goal Achievement Probability
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(predictions.goalAchievementProbability).map(([distance, goal]) => (
                <div key={distance} className="p-3 border border-gray-200 rounded-lg text-center">
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    {distance === 'fiveK' ? '5K' : 
                     distance === 'tenK' ? '10K' : 
                     distance === 'halfMarathon' ? 'Half' : 'Marathon'}
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatTime(goal.time)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(goal.probability * 100).toFixed(0)}% likely
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                    <div 
                      className="bg-blue-500 h-1 rounded-full" 
                      style={{ width: `${goal.probability * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Training Recommendations */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-medium text-green-800 mb-3">Training Recommendations</h4>
            <ul className="space-y-2">
              {predictions.trainingRecommendations.map((rec, index) => (
                <li key={index} className="flex items-start text-sm text-green-700">
                  <span className="text-green-500 mr-2">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};