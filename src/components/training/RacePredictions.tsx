import React, { useMemo } from 'react';
import { EnrichedRun } from '../../types';
import { Trophy, Target, TrendingUp, Clock, Thermometer, Calendar } from 'lucide-react';
import { useFitnessMetrics } from '../../hooks/useFitnessMetrics';
import { ProfileSetupPrompt } from '../common/ProfileSetupPrompt';
import { useUserPhysiology } from '../common/UserProfileSetup';
import {
  calculateAdvancedRacePrediction,
  createRaceStrategy,
  formatRaceTime,
  formatPace,
  type RacePrediction,
  type RaceStrategy
} from '../../lib/training/racePredictionUtils';
import { calculateTRIMP } from '../../lib/training/trainingLoadUtils';

interface RacePredictionsProps {
  runs: EnrichedRun[];
  userPhysiology?: {
    maxHeartRate?: number;
    restingHeartRate?: number;
    age?: number;
  };
  className?: string;
}

const RACE_DISTANCES = [
  { name: '5K', distance: 5000, label: '5 Kilometers' },
  { name: '10K', distance: 10000, label: '10 Kilometers' },
  { name: 'Half Marathon', distance: 21097, label: '21.1 Kilometers' },
  { name: 'Marathon', distance: 42195, label: '42.2 Kilometers' }
];

export const RacePredictions: React.FC<RacePredictionsProps> = ({
  runs = [],
  userPhysiology = {},
  className = ''
}) => {
  // Use local user physiology data if not provided via props
  const { data: localUserData, hasCompleteData, updateData } = useUserPhysiology();
  const effectiveUserPhysiology = Object.keys(userPhysiology).length > 0 ? userPhysiology : localUserData;
  
  // Process runs with TRIMP scores (same as Training Load Dashboard)
  const processedRuns = useMemo(() => {
    return runs.map(run => {
      const trimp = calculateTRIMP(run, effectiveUserPhysiology);
      return {
        ...run,
        trimpScore: trimp?.value || 0
      };
    });
  }, [runs, effectiveUserPhysiology]);
  
  // Calculate current fitness metrics using processed runs (same as Training Load Dashboard)
  const { fitnessMetrics } = useFitnessMetrics(processedRuns, 1);
  
  // Debug: Log fitness metrics to verify the fix
  console.log('🏁 RacePredictions - Fitness metrics debug (FIXED):', {
    totalRuns: runs.length,
    processedRuns: processedRuns.length,
    fitnessMetrics,
    sampleProcessedRuns: processedRuns.slice(0, 3).map(r => ({
      date: r.start_date_local || r.start_date,
      distance: r.distance,
      trimpScore: r.trimpScore,
      hasTrimp: !!r.trimpScore
    }))
  });

  // Generate race predictions for all distances
  const racePredictions = useMemo(() => {
    if (!fitnessMetrics || processedRuns.length < 15) return null;
    
    return RACE_DISTANCES.map(race => {
      const prediction = calculateAdvancedRacePrediction(processedRuns, race.distance);
      const strategy = createRaceStrategy(prediction);
      
      return {
        ...race,
        prediction,
        strategy
      };
    });
  }, [processedRuns, fitnessMetrics]);

  // Environmental adjustment examples
  const environmentalAdjustments = useMemo(() => {
    if (!racePredictions) return null;
    
    const baseRace = racePredictions.find(r => r.name === '10K');
    if (!baseRace) return null;
    
    return [
      {
        condition: 'Ideal (15°C, 50% humidity)',
        adjustment: 0,
        predictedTime: baseRace.prediction.predictedTime
      },
      {
        condition: 'Hot (30°C, 70% humidity)',
        adjustment: 45,
        predictedTime: baseRace.prediction.predictedTime + 45
      },
      {
        condition: 'Cold (5°C, 60% humidity)',
        adjustment: -15,
        predictedTime: baseRace.prediction.predictedTime - 15
      },
      {
        condition: 'Altitude (1500m)',
        adjustment: 30,
        predictedTime: baseRace.prediction.predictedTime + 30
      }
    ];
  }, [racePredictions]);



  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getFormColor = (tsb: number): string => {
    if (tsb > 10) return 'text-blue-600'; // Fresh
    if (tsb < -10) return 'text-red-600'; // Fatigued
    return 'text-green-600'; // Balanced
  };

  if (runs.length < 10) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Race Time Predictions
        </h2>
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">
            Need at least 10 runs for race predictions
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
          Race Time Predictions
        </h2>

        {/* Profile Setup Prompt */}
        {!hasCompleteData && (
          <ProfileSetupPrompt
            variant="banner"
            title="Improve Race Predictions"
            message="Complete your profile to get more accurate race time predictions and personalized pacing strategies."
            missingFields={[
              ...(!effectiveUserPhysiology.maxHeartRate ? ['maxHeartRate'] : []),
              ...(!effectiveUserPhysiology.restingHeartRate ? ['restingHeartRate'] : []),
              ...(!effectiveUserPhysiology.bodyWeight ? ['bodyWeight'] : []),
              ...(!effectiveUserPhysiology.age ? ['age'] : [])
            ]}
            onComplete={updateData}
            className="mb-6"
          />
        )}

        {/* Current Fitness Status */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Current Fitness Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
                <h4 className="font-medium text-gray-900">Fitness (CTL)</h4>
              </div>
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {fitnessMetrics ? Math.round(fitnessMetrics.ctl) : '0'}
              </div>
              <div className="text-sm text-gray-600">
                Long-term fitness
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Target className="w-5 h-5 text-purple-600 mr-2" />
                <h4 className="font-medium text-gray-900">Form (TSB)</h4>
              </div>
              <div className={`text-2xl font-bold mb-1 ${getFormColor(fitnessMetrics?.tsb || 0)}`}>
                {fitnessMetrics ? (fitnessMetrics.tsb > 0 ? '+' : '') + Math.round(fitnessMetrics.tsb) : '0'}
              </div>
              <div className="text-sm text-gray-600">
                Race readiness
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Trophy className="w-5 h-5 text-green-600 mr-2" />
                <h4 className="font-medium text-gray-900">Prediction Quality</h4>
              </div>
              <div className="text-2xl font-bold text-green-600 mb-1">
                {runs.length >= 30 ? 'High' : runs.length >= 20 ? 'Good' : 'Fair'}
              </div>
              <div className="text-sm text-gray-600">
                Based on {runs.length} runs
              </div>
            </div>
          </div>
        </div>

        {/* Race Predictions */}
        {racePredictions && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Predicted Race Times</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {racePredictions.map((race, index) => (
                <div key={race.name} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 flex items-center">
                      <Trophy className="w-4 h-4 mr-2 text-yellow-600" />
                      {race.name}
                    </h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      getConfidenceColor(race.prediction.confidence)
                    }`}>
                      {Math.round(race.prediction.confidence * 100)}% confidence
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Predicted Time:</span>
                      <span className="font-bold text-lg">
                        {formatRaceTime(race.prediction.predictedTime)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Target Pace:</span>
                      <span className="font-medium">
                        {formatPace(race.prediction.predictedPace)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Range:</span>
                      <span className="font-medium text-gray-700">
                        {formatRaceTime(race.prediction.confidenceInterval.optimistic)} - {formatRaceTime(race.prediction.confidenceInterval.conservative)}
                      </span>
                    </div>
                    
                    {/* Strategy Preview */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-600 mb-1">Strategy:</div>
                      <div className="text-sm text-gray-700">
                        Start: {formatPace(race.strategy.paceStrategy.firstQuarter.pace)} • 
                        Finish: {formatPace(race.strategy.paceStrategy.finalQuarter.pace)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Environmental Adjustments */}
        {environmentalAdjustments && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Environmental Impact (10K Example)</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {environmentalAdjustments.map((env, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-white rounded border">
                    <div className="flex items-center">
                      <Thermometer className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm font-medium">{env.condition}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatRaceTime(env.predictedTime)}</div>
                      <div className={`text-xs ${
                        env.adjustment > 0 ? 'text-red-600' : 
                        env.adjustment < 0 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {env.adjustment > 0 ? '+' : ''}{env.adjustment}s
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Race Strategy Details */}
        {racePredictions && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Detailed Race Strategy (10K)</h3>
            {(() => {
              const tenKStrategy = racePredictions.find(r => r.name === '10K')?.strategy;
              if (!tenKStrategy) return null;
              
              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Pacing Plan
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">First Quarter:</span>
                        <span className="font-medium">{formatPace(tenKStrategy.paceStrategy.firstQuarter.pace)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Second Quarter:</span>
                        <span className="font-medium">{formatPace(tenKStrategy.paceStrategy.secondQuarter.pace)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Third Quarter:</span>
                        <span className="font-medium">{formatPace(tenKStrategy.paceStrategy.thirdQuarter.pace)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Final Quarter:</span>
                        <span className="font-medium">{formatPace(tenKStrategy.paceStrategy.finalQuarter.pace)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Target className="w-4 h-4 mr-2" />
                      Key Advice
                    </h4>
                    <ul className="space-y-2">
                      {tenKStrategy.pacingAdvice.slice(0, 4).map((advice: string, index: number) => (
                        <li key={index} className="flex items-start text-sm text-gray-700">
                          <span className="text-blue-500 mr-2 mt-0.5">•</span>
                          {advice}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Training Recommendations */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <Calendar className="w-5 h-5 text-blue-600 mr-2" />
            <h4 className="font-medium text-blue-800">Race Preparation Tips</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <div className="font-medium mb-2">4-6 Weeks Before:</div>
              <ul className="space-y-1">
                <li>• Build weekly mileage to peak</li>
                <li>• Include race-pace workouts</li>
                <li>• Practice fueling strategy</li>
                <li>• Test race-day gear</li>
              </ul>
            </div>
            <div>
              <div className="font-medium mb-2">1-2 Weeks Before:</div>
              <ul className="space-y-1">
                <li>• Taper training volume by 40-60%</li>
                <li>• Maintain intensity with shorter sessions</li>
                <li>• Focus on sleep and recovery</li>
                <li>• Finalize race strategy</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Prediction Limitations */}
        {runs.length < 30 && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <Target className="w-5 h-5 text-yellow-600 mr-2" />
              <h4 className="font-medium text-yellow-800">Improve Prediction Accuracy</h4>
            </div>
            <div className="mt-2 text-sm text-yellow-700">
              <div>• More training data improves prediction accuracy</div>
              <div>• Include tempo runs and intervals for better race pace estimates</div>
              <div>• Add physiological data (max HR, resting HR) for personalized zones</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RacePredictions;