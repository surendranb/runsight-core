import React from 'react';
import { EnrichedRun } from '../../types';
import {
  calculateNegativeSplitProbability,
  analyzeFatigueResistance,
  detectPacingIssues,
  generateOptimalRaceStrategy,
  type NegativeSplitAnalysis,
  type FatigueResistanceProfile,
  type PacingIssueDetection,
  type OptimalRaceStrategy
} from '../../lib/training/advancedPacingUtils';

interface AdvancedPacingAnalysisProps {
  runs: EnrichedRun[];
  className?: string;
}

export const AdvancedPacingAnalysis: React.FC<AdvancedPacingAnalysisProps> = ({
  runs,
  className = ''
}) => {
  // Calculate all pacing metrics
  const negativeSplitAnalysis = React.useMemo(() => 
    calculateNegativeSplitProbability(runs), [runs]);
  
  const fatigueResistance = React.useMemo(() => 
    analyzeFatigueResistance(runs), [runs]);
  
  const pacingIssues = React.useMemo(() => 
    detectPacingIssues(runs), [runs]);
  
  const raceStrategy = React.useMemo(() => 
    generateOptimalRaceStrategy(runs, 10000), [runs]); // 10K example

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPace = (secondsPerKm: number): string => {
    return formatTime(secondsPerKm) + '/km';
  };

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-50';
      case 'B': return 'text-blue-600 bg-blue-50';
      case 'C': return 'text-yellow-600 bg-yellow-50';
      case 'D': return 'text-orange-600 bg-orange-50';
      case 'F': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getResistanceLevelColor = (level: string): string => {
    switch (level) {
      case 'excellent': return 'text-green-600 bg-green-50';
      case 'good': return 'text-blue-600 bg-blue-50';
      case 'average': return 'text-yellow-600 bg-yellow-50';
      case 'needs-improvement': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (runs.length < 5) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Advanced Pacing Analysis
        </h3>
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">
            Need at least 5 runs for pacing analysis
          </div>
          <div className="text-sm text-gray-400">
            Current runs: {runs.length}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Advanced Pacing Analysis
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Negative Split Analysis */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Negative Split Probability</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Probability:</span>
                <span className="font-medium">
                  {Math.round(negativeSplitAnalysis.probability * 100)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Pattern:</span>
                <span className="font-medium capitalize">
                  {negativeSplitAnalysis.historicalPattern.replace('-', ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Confidence:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  negativeSplitAnalysis.confidenceLevel === 'high' ? 'bg-green-100 text-green-800' :
                  negativeSplitAnalysis.confidenceLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {negativeSplitAnalysis.confidenceLevel}
                </span>
              </div>
              {negativeSplitAnalysis.averageSplitDifference !== 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg Split Diff:</span>
                  <span className="font-medium">
                    {negativeSplitAnalysis.averageSplitDifference > 0 ? '+' : ''}
                    {negativeSplitAnalysis.averageSplitDifference.toFixed(1)}s/km
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Fatigue Resistance */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Fatigue Resistance</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Overall Score:</span>
                <span className="font-medium">{fatigueResistance.overallScore}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Level:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  getResistanceLevelColor(fatigueResistance.resistanceLevel)
                }`}>
                  {fatigueResistance.resistanceLevel.replace('-', ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Final Quarter Slowdown:</span>
                <span className="font-medium">
                  {fatigueResistance.paceMaintenance.finalQuarterSlowdown.toFixed(1)}s/km
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Trend:</span>
                <span className={`font-medium ${
                  fatigueResistance.improvementTrend === 'improving' ? 'text-green-600' :
                  fatigueResistance.improvementTrend === 'declining' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {fatigueResistance.improvementTrend}
                </span>
              </div>
            </div>
          </div>

          {/* Pacing Issues */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Pacing Assessment</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Overall Grade:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  getGradeColor(pacingIssues.overallPacingGrade)
                }`}>
                  {pacingIssues.overallPacingGrade}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Issues Found:</span>
                <span className="font-medium">{pacingIssues.issues.length}</span>
              </div>
              {pacingIssues.issues.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-gray-600 mb-1">Top Issue:</div>
                  <div className="text-sm font-medium text-gray-900">
                    {pacingIssues.issues[0].type.replace('-', ' ')}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {Math.round(pacingIssues.issues[0].frequency * 100)}% frequency
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Race Strategy Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">10K Race Strategy</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Target Pace:</span>
                <span className="font-medium">{formatPace(raceStrategy.targetPace)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">First Mile:</span>
                <span className="font-medium">{formatPace(raceStrategy.pacingPlan.firstMile.pace)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Final Miles:</span>
                <span className="font-medium">{formatPace(raceStrategy.pacingPlan.finalMiles.pace)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Fatigue Point:</span>
                <span className="font-medium">
                  {raceStrategy.fatigueManagement.anticipatedFatiguePoint}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {(negativeSplitAnalysis.recommendations.length > 0 || 
          pacingIssues.improvementPriority.length > 0 ||
          raceStrategy.personalizedAdvice.length > 0) && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-4">Recommendations</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Split Recommendations */}
              {negativeSplitAnalysis.recommendations.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Pacing Strategy</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {negativeSplitAnalysis.recommendations.slice(0, 2).map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvement Priorities */}
              {pacingIssues.improvementPriority.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Improvement Focus</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {pacingIssues.improvementPriority.slice(0, 2).map((priority, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-orange-500 mr-2">•</span>
                        {priority}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Race Strategy Advice */}
              {raceStrategy.personalizedAdvice.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Race Strategy</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {raceStrategy.personalizedAdvice.slice(0, 2).map((advice, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        {advice}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Distance Profiles */}
        {fatigueResistance.distanceProfiles.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-4">Fatigue Resistance by Distance</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {fatigueResistance.distanceProfiles.map((profile, index) => (
                <div key={index} className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-xs text-gray-600 mb-1">{profile.distanceRange}</div>
                  <div className="font-medium text-lg">{profile.fatigueResistance}</div>
                  <div className="text-xs text-gray-500">
                    {profile.sampleSize} run{profile.sampleSize !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedPacingAnalysis;