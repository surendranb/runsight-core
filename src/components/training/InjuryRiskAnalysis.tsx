import React, { useMemo } from 'react';
import { EnrichedRun } from '../../types';
import { AlertTriangle, Shield, TrendingDown, Activity, Heart, Calendar, TrendingUp } from 'lucide-react';
import { calculateACWRFromRuns } from '../../lib/training/acwrUtils';
import {
  assessInjuryRisk,
  generateInjuryPreventionPlan,
  monitorRiskFactorResolution,
  type InjuryRiskAssessment,
  type OverreachingIndicator,
  type TrainingLoadPattern
} from '../../lib/training/injuryRiskUtils';

interface InjuryRiskAnalysisProps {
  runs: EnrichedRun[];
  userPhysiology?: {
    maxHeartRate?: number;
    restingHeartRate?: number;
    age?: number;
  };
  className?: string;
}

export const InjuryRiskAnalysis: React.FC<InjuryRiskAnalysisProps> = ({
  runs,
  userPhysiology = {},
  className = ''
}) => {
  // Calculate ACWR for risk assessment
  const acwrResult = useMemo(() => {
    if (runs.length < 28) return null;
    return calculateACWRFromRuns(runs, 'trimp').value;
  }, [runs]);

  // Injury risk assessment
  const injuryRiskAssessment = useMemo(() => {
    if (runs.length < 21) return null;
    
    try {
      return assessInjuryRisk(runs);
    } catch (error) {
      console.error('Injury risk calculation failed:', error);
      return null;
    }
  }, [runs]);

  // Prevention plan
  const preventionPlan = useMemo(() => {
    if (!injuryRiskAssessment) return null;
    return generateInjuryPreventionPlan(injuryRiskAssessment);
  }, [injuryRiskAssessment]);

  const getRiskColor = (level: string): string => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getOverreachingColor = (status: string): string => {
    switch (status) {
      case 'none': return 'text-green-600 bg-green-50';
      case 'functional': return 'text-blue-600 bg-blue-50';
      case 'non-functional': return 'text-orange-600 bg-orange-50';
      case 'overtraining': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (runs.length < 14) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Injury Risk Detection
        </h2>
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">
            Need at least 14 runs for injury risk analysis
          </div>
          <div className="text-sm text-gray-400">
            Current runs: {runs.length}
          </div>
        </div>
      </div>
    );
  }

  // If injury risk assessment failed, show error state
  if (!injuryRiskAssessment) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Injury Risk Detection
        </h2>
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">
            Unable to calculate injury risk at this time
          </div>
          <div className="text-sm text-gray-400">
            Please try again later or check your data quality
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Injury Risk Detection & Prevention
        </h2>

        {/* Overall Risk Assessment */}
        {injuryRiskAssessment && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Current Risk Assessment</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className={`rounded-lg p-4 border ${getRiskColor(injuryRiskAssessment.riskLevel)}`}>
                <div className="flex items-center mb-2">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  <h4 className="font-medium">Overall Risk</h4>
                </div>
                <div className="text-2xl font-bold mb-1 capitalize">
                  {injuryRiskAssessment.riskLevel || 'Unknown'}
                </div>
                <div className="text-sm opacity-75">
                  {Math.round(injuryRiskAssessment.overallRiskScore || 0)}/100
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center mb-2">
                  <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
                  <h4 className="font-medium text-gray-900">ACWR Status</h4>
                </div>
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {acwrResult ? acwrResult.acwr.toFixed(2) : 'N/A'}
                </div>
                <div className="text-sm text-blue-600">
                  {acwrResult ? acwrResult.status : 'Insufficient data'}
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center mb-2">
                  <Heart className="w-5 h-5 text-purple-600 mr-2" />
                  <h4 className="font-medium text-gray-900">Warning Level</h4>
                </div>
                <div className="text-2xl font-bold text-purple-600 mb-1 capitalize">
                  {(injuryRiskAssessment.warningLevel || 'unknown').replace('-', ' ')}
                </div>
                <div className="text-sm text-purple-600">
                  Current status
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Risk Indicators */}
        {injuryRiskAssessment && injuryRiskAssessment.overreachingStatus?.indicators && Array.isArray(injuryRiskAssessment.overreachingStatus.indicators) && injuryRiskAssessment.overreachingStatus.indicators.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Indicators</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(injuryRiskAssessment.overreachingStatus.indicators || []).slice(0, 4).map((indicator, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{indicator.indicator}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      indicator.severity === 'high' ? 'bg-red-100 text-red-800' :
                      indicator.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {indicator.severity}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {indicator.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Training Load Pattern */}
        {injuryRiskAssessment && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Training Load Analysis</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {runs.slice(0, 7).reduce((sum, run) => sum + run.distance, 0) / 1000}km
                  </div>
                  <div className="text-sm text-gray-600">This Week</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {Math.round(injuryRiskAssessment.overallRiskScore)}
                  </div>
                  <div className="text-sm text-gray-600">Risk Score</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {injuryRiskAssessment.overreachingStatus.status === 'normal' ? '✓' :
                     injuryRiskAssessment.overreachingStatus.status === 'functional' ? '⚠' : '⚠'}
                  </div>
                  <div className="text-sm text-gray-600 capitalize">
                    {injuryRiskAssessment.overreachingStatus.status}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Prevention Plan */}
        {preventionPlan && preventionPlan.immediateActions && preventionPlan.longTermStrategies && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Injury Prevention Plan</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Immediate Actions */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-3 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Immediate Actions
                </h4>
                <ul className="space-y-2">
                  {(preventionPlan.immediateActions || []).map((action, index) => (
                    <li key={index} className="flex items-start text-sm text-red-700">
                      <span className="text-red-500 mr-2 mt-0.5">•</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Long-term Strategies */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-3 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Long-term Strategies
                </h4>
                <ul className="space-y-2">
                  {(preventionPlan.longTermStrategies || []).map((strategy, index) => (
                    <li key={index} className="flex items-start text-sm text-blue-700">
                      <span className="text-blue-500 mr-2 mt-0.5">•</span>
                      {strategy}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Monitoring Recommendations */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <Shield className="w-5 h-5 text-green-600 mr-2" />
            <h4 className="font-medium text-green-800">Injury Prevention Tips</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700">
            <div>
              <div className="font-medium mb-2">Daily Monitoring:</div>
              <ul className="space-y-1">
                <li>• Track morning resting heart rate</li>
                <li>• Monitor sleep quality and duration</li>
                <li>• Rate perceived exertion after runs</li>
                <li>• Note any unusual aches or pains</li>
              </ul>
            </div>
            <div>
              <div className="font-medium mb-2">Weekly Assessment:</div>
              <ul className="space-y-1">
                <li>• Review training load progression</li>
                <li>• Ensure adequate recovery days</li>
                <li>• Check for persistent fatigue</li>
                <li>• Adjust training based on life stress</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InjuryRiskAnalysis;