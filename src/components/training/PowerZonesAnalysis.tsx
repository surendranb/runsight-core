import React, { useMemo, useState } from 'react';
import { EnrichedRun, User } from '../../types';
import { Zap, TrendingUp, Target, Activity, BarChart3, Settings } from 'lucide-react';
import { 
  estimateRunningPower, 
  calculateTrainingZones,
  analyzeZoneDistribution,
  type PowerEstimationResult,
  type TrainingZones,
  type ZoneDistributionAnalysis
} from '../../lib/training/powerEstimationUtils';
import { UserProfileSetup } from '../common/UserProfileSetup';
import { useUserPhysiologyNetlify } from '../../hooks/useUserPhysiologyNetlify';

interface PowerZonesAnalysisProps {
  runs: EnrichedRun[];
  user: User;
  userPhysiology?: {
    bodyWeight?: number;
    maxHeartRate?: number;
    restingHeartRate?: number;
    fitnessLevel?: string;
  };
  className?: string;
}

export const PowerZonesAnalysis: React.FC<PowerZonesAnalysisProps> = ({
  runs,
  user,
  userPhysiology = {},
  className = ''
}) => {
  // CRITICAL FIX: Force new bundle generation - timestamp: 2025-01-15-19:30
  // Use Supabase user physiology data
  console.log('PowerZonesAnalysis Debug:', { userId: user.id, userObject: user });
  const { data: supabaseUserData, updateData, isLoading, error } = useUserPhysiologyNetlify(user.id);
  const effectiveUserPhysiology = Object.keys(userPhysiology).length > 0 ? userPhysiology : supabaseUserData;
  
  // State for profile setup modal
  const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);
  // All zone mapping uses Object.entries() - no .map() on zone objects
  // Calculate power estimates for recent runs
  const powerAnalysis = useMemo(() => {
    if (!effectiveUserPhysiology.bodyWeight || runs.length === 0) return null;
    
    const recentRuns = runs.slice(0, 20); // Last 20 runs
    const powerEstimates = recentRuns.map(run => ({
      run,
      power: estimateRunningPower(run, effectiveUserPhysiology.bodyWeight!)
    }));
    
    const validPowers = powerEstimates.filter(p => p.power.confidence !== 'low');
    if (validPowers.length === 0) return null;
    
    const avgPower = validPowers.reduce((sum, p) => sum + p.power.estimatedPower, 0) / validPowers.length;
    const maxPower = Math.max(...validPowers.map(p => p.power.estimatedPower));
    
    return {
      averagePower: Math.round(avgPower),
      maxPower: Math.round(maxPower),
      powerEstimates: validPowers,
      confidence: validPowers.reduce((sum, p) => {
        const confidenceValue = p.power.confidence === 'high' ? 1 : p.power.confidence === 'medium' ? 0.7 : 0.3;
        return sum + confidenceValue;
      }, 0) / validPowers.length
    };
  }, [runs, effectiveUserPhysiology.bodyWeight]);

  // Calculate training zones
  const trainingZones = useMemo(() => {
    if (!effectiveUserPhysiology.maxHeartRate || !effectiveUserPhysiology.restingHeartRate) return null;
    return calculateTrainingZones(runs, effectiveUserPhysiology);
  }, [runs, effectiveUserPhysiology]);

  // Analyze zone distribution
  const zoneDistribution = useMemo(() => {
    if (!trainingZones) return null;
    return analyzeZoneDistribution(runs, trainingZones);
  }, [runs, trainingZones]);

  const formatPace = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}/km`;
  };

  const getZoneColor = (zone: number): string => {
    const colors = [
      'bg-gray-100 text-gray-800',     // Zone 1
      'bg-blue-100 text-blue-800',    // Zone 2
      'bg-green-100 text-green-800',  // Zone 3
      'bg-yellow-100 text-yellow-800', // Zone 4
      'bg-red-100 text-red-800'       // Zone 5
    ];
    return colors[zone - 1] || colors[0];
  };

  if (runs.length < 5) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Power & Training Zones
        </h2>
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">
            Need at least 5 runs for power and zone analysis
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
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Power & Training Zones Analysis
        </h2>

        {/* Power Estimation Section */}
        {powerAnalysis && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Running Power Estimation</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Zap className="w-5 h-5 text-blue-600 mr-2" />
                  <h4 className="font-medium text-gray-900">Average Power</h4>
                </div>
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {powerAnalysis.averagePower}W
                </div>
                <div className="text-sm text-gray-600">
                  Based on {powerAnalysis.powerEstimates.length} runs
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
                  <h4 className="font-medium text-gray-900">Peak Power</h4>
                </div>
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {powerAnalysis.maxPower}W
                </div>
                <div className="text-sm text-gray-600">
                  Maximum estimated
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Target className="w-5 h-5 text-purple-600 mr-2" />
                  <h4 className="font-medium text-gray-900">Confidence</h4>
                </div>
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {Math.round(powerAnalysis.confidence * 100)}%
                </div>
                <div className="text-sm text-gray-600">
                  Estimation accuracy
                </div>
              </div>
            </div>

            {/* Recent Power Estimates */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Recent Power Estimates</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Distance</th>
                      <th className="pb-2">Pace</th>
                      <th className="pb-2">Power</th>
                      <th className="pb-2">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {powerAnalysis.powerEstimates.slice(0, 8).map(({ run, power }, index) => (
                      <tr key={run.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="py-2">
                          {new Date(run.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-2">{(run.distance / 1000).toFixed(1)}km</td>
                        <td className="py-2">{formatPace(run.moving_time / (run.distance / 1000))}</td>
                        <td className="py-2 font-medium">{Math.round(power.estimatedPower)}W</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            power.confidence === 'high' ? 'bg-green-100 text-green-800' :
                            power.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {power.confidence}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Training Zones Section */}
        {trainingZones && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Personalized Training Zones</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Heart Rate Zones */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Activity className="w-4 h-4 mr-2" />
                  Heart Rate Zones
                </h4>
                <div className="space-y-2">
                  {Object.entries(trainingZones.heartRateZones).map(([zoneKey, zone], index) => (
                    <div key={zoneKey} className="flex justify-between items-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getZoneColor(index + 1)}`}>
                        Zone {index + 1}
                      </span>
                      <span className="text-sm font-medium">
                        {Math.round(zone.min)} - {Math.round(zone.max)} bpm
                      </span>
                      <span className="text-xs text-gray-600">{zone.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pace Zones */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Target className="w-4 h-4 mr-2" />
                  Pace Zones
                </h4>
                <div className="space-y-2">
                  {Object.entries(trainingZones.paceZones).map(([zoneKey, zone], index) => (
                    <div key={zoneKey} className="flex justify-between items-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getZoneColor(index + 1)}`}>
                        {zone.name}
                      </span>
                      <span className="text-sm font-medium">
                        {formatPace(zone.min)} - {formatPace(zone.max)}
                      </span>
                      <span className="text-xs text-gray-600">{zone.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Zone Distribution Analysis */}
        {zoneDistribution && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Training Distribution Analysis</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Current Distribution */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Current Distribution
                </h4>
                <div className="space-y-3">
                  {Object.entries(zoneDistribution.currentDistribution).map(([zoneKey, zone], index) => (
                    <div key={zoneKey}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getZoneColor(index + 1)}`}>
                          Zone {index + 1}
                        </span>
                        <span className="font-medium">{zone.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getZoneColor(index + 1).replace('text-', 'bg-').replace('100', '500')}`}
                          style={{ width: `${zone.percentage}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {zone.totalTime} minutes total
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Distribution Recommendations</h4>
                <div className="space-y-3">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 mb-2">Optimal Distribution:</div>
                    <div className="space-y-1 text-gray-600">
                      <div>Zone 1-2: 80% (Easy/Aerobic)</div>
                      <div>Zone 3: 10% (Tempo)</div>
                      <div>Zone 4-5: 10% (Threshold/VO2)</div>
                    </div>
                  </div>
                  
                  {zoneDistribution.recommendations.length > 0 && (
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 mb-2">Your Focus Areas:</div>
                      <ul className="space-y-1">
                        {zoneDistribution.recommendations.slice(0, 3).map((rec, index) => (
                          <li key={index} className="flex items-start text-gray-600">
                            <span className="text-blue-500 mr-2 mt-0.5">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-gray-600">Loading your profile...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <div className="text-red-600 mr-2">⚠️</div>
              <div>
                <h4 className="font-medium text-red-800">Error Loading Profile</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Profile Setup Interface */}
        {!isLoading && (!powerAnalysis || !trainingZones) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Target className="w-5 h-5 text-blue-600 mr-2" />
                <h4 className="font-medium text-blue-800">Complete Your Profile</h4>
              </div>
              <button
                onClick={() => setIsProfileSetupOpen(true)}
                disabled={isLoading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Settings className="w-4 h-4 mr-2" />
                Set Up Profile
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${effectiveUserPhysiology.bodyWeight ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-700">Body Weight {effectiveUserPhysiology.bodyWeight ? '✓' : '(required for power)'}</span>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${effectiveUserPhysiology.maxHeartRate ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-700">Max Heart Rate {effectiveUserPhysiology.maxHeartRate ? '✓' : '(required for zones)'}</span>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${effectiveUserPhysiology.restingHeartRate ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-700">Resting Heart Rate {effectiveUserPhysiology.restingHeartRate ? '✓' : '(required for zones)'}</span>
              </div>
            </div>
            <div className="text-sm text-blue-700">
              Complete physiological data enables accurate power estimates and personalized training zones for better training insights.
            </div>
          </div>
        )}

        {/* Profile Setup Modal */}
        <UserProfileSetup
          isOpen={isProfileSetupOpen}
          onClose={() => setIsProfileSetupOpen(false)}
          onSave={async (data) => {
            const success = await updateData(data);
            if (success) {
              setIsProfileSetupOpen(false);
            }
            // If failed, keep modal open and show error (handled by the hook)
          }}
          initialData={effectiveUserPhysiology}
          title="Complete Your Physiological Profile"
          description="Enter your physiological data to unlock accurate power estimates and personalized training zones."
        />
      </div>
    </div>
  );
};

export default PowerZonesAnalysis;