import React, { useMemo } from 'react';
import { EnrichedRun, User } from '../../types';
import { Trophy, Target, TrendingUp, Clock } from 'lucide-react';
import { useFitnessMetrics } from '../../hooks/useFitnessMetrics';
import { ProfileSetupPrompt } from '../common/ProfileSetupPrompt';
import { useUserPhysiologyNetlify } from '../../hooks/useUserPhysiologyNetlify';
import {
  createRaceStrategy,
  getMultipleRacePredictions,
  formatRaceTime,
  formatPace,
  type RacePrediction,
  type RaceStrategy
} from '../../lib/training/racePredictionUtils';
import { calculateTRIMP } from '../../lib/training/trainingLoadUtils';
import { getEvidenceCopy } from '../../lib/productCopy';

interface RacePredictionsProps {
  runs: EnrichedRun[];
  user: User;
  userPhysiology?: {
    maxHeartRate?: number;
    restingHeartRate?: number;
    age?: number;
    bodyWeight?: number;
  };
  className?: string;
}

const RACE_DISTANCES = [
  { name: '5K', distance: 5000, label: '5 Kilometers' },
  { name: '10K', distance: 10000, label: '10 Kilometers' },
  { name: 'Half Marathon', distance: 21097, label: '21.1 Kilometers' },
  { name: 'Marathon', distance: 42195, label: '42.2 Kilometers' }
];

const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return 'text-green-600 bg-green-50';
  if (confidence >= 0.6) return 'text-yellow-700 bg-yellow-50';
  return 'text-red-600 bg-red-50';
};

const getFormColor = (tsb: number): string => {
  if (tsb > 10) return 'text-blue-600';
  if (tsb < -10) return 'text-red-600';
  return 'text-green-600';
};

const buildPredictionReadiness = (
  runs: EnrichedRun[],
  hasCompleteData: boolean
) => {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const recentRuns = runs.filter((run) => new Date(run.start_date) >= ninetyDaysAgo);
  const heartRateRuns = recentRuns.filter((run) => Boolean(run.average_heartrate)).length;
  const longRuns = recentRuns.filter((run) => run.distance >= 12000);
  const longestRunKm = longRuns.length > 0
    ? Math.max(...longRuns.map((run) => run.distance / 1000))
    : 0;

  let score = 0;
  if (recentRuns.length >= 15) score += 1;
  if (recentRuns.length >= 30) score += 1;
  if (heartRateRuns >= 8) score += 1;
  if (longRuns.length >= 2) score += 1;
  if (hasCompleteData) score += 1;

  const label = score >= 4 ? 'Strong' : score >= 3 ? 'Good' : 'Developing';

  return {
    label,
    recentRuns: recentRuns.length,
    heartRateRuns,
    longRuns: longRuns.length,
    longestRunKm,
    notes: [
      `${recentRuns.length} recent runs in the last 90 days`,
      `${heartRateRuns} runs with heart-rate data`,
      longRuns.length > 0
        ? `Longest recent run: ${longestRunKm.toFixed(1)} km`
        : 'No recent long-run evidence yet',
      hasCompleteData ? 'Profile is complete' : 'Profile data is still incomplete'
    ]
  };
};

export const RacePredictions: React.FC<RacePredictionsProps> = ({
  runs = [],
  user,
  userPhysiology = {},
  className = ''
}) => {
  const { data: storedUserData, hasCompleteData, updateData } = useUserPhysiologyNetlify(user.id);
  const effectiveUserPhysiology = Object.keys(userPhysiology).length > 0 ? userPhysiology : storedUserData;

  const processedRuns = useMemo(() => {
    return runs.map((run) => {
      const trimp = calculateTRIMP(run, effectiveUserPhysiology);
      return {
        ...run,
        trimpScore: trimp?.value || 0
      };
    });
  }, [runs, effectiveUserPhysiology]);

  const { fitnessMetrics } = useFitnessMetrics(processedRuns, 1);

  const readiness = useMemo(
    () => buildPredictionReadiness(processedRuns, hasCompleteData),
    [processedRuns, hasCompleteData]
  );

  const racePredictions = useMemo(() => {
    if (!fitnessMetrics || processedRuns.length < 15) return null;

    const predictions = getMultipleRacePredictions(processedRuns, undefined, {
      restingHeartRate: effectiveUserPhysiology.restingHeartRate,
      maxHeartRate: effectiveUserPhysiology.maxHeartRate,
      estimatedWeight: effectiveUserPhysiology.bodyWeight
    });

    return RACE_DISTANCES.map((race) => {
      const prediction = predictions.find((item) => item.distance === race.distance);
      if (!prediction) {
        return null;
      }
      const strategy = createRaceStrategy(prediction);

      return {
        ...race,
        prediction,
        strategy
      };
    }).filter((race): race is {
      name: string;
      distance: number;
      label: string;
      prediction: RacePrediction;
      strategy: RaceStrategy;
    } => Boolean(race));
  }, [processedRuns, fitnessMetrics, effectiveUserPhysiology]);

  const tenKStrategy = racePredictions?.find((race) => race.name === '10K');

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

        {!hasCompleteData && (
          <ProfileSetupPrompt
            variant="banner"
            title="Improve Race Predictions"
            message="Complete your profile to get more accurate race time predictions and more personalized pacing guidance."
            missingFields={[
              ...(!effectiveUserPhysiology.maxHeartRate ? ['maxHeartRate'] : []),
              ...(!effectiveUserPhysiology.restingHeartRate ? ['restingHeartRate'] : []),
              ...(!effectiveUserPhysiology.bodyWeight ? ['bodyWeight'] : []),
              ...(!effectiveUserPhysiology.age ? ['age'] : [])
            ]}
            initialData={effectiveUserPhysiology}
            onComplete={updateData}
            className="mb-6"
          />
        )}

        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">What these estimates are based on</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
                <h4 className="font-medium text-gray-900">Fitness (CTL)</h4>
              </div>
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {fitnessMetrics ? Math.round(fitnessMetrics.ctl) : '0'}
              </div>
              <div className="text-sm text-gray-600">Long-term fitness trend</div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Target className="w-5 h-5 text-purple-600 mr-2" />
                <h4 className="font-medium text-gray-900">Form (TSB)</h4>
              </div>
              <div className={`text-2xl font-bold mb-1 ${getFormColor(fitnessMetrics?.tsb || 0)}`}>
                {fitnessMetrics ? (fitnessMetrics.tsb > 0 ? '+' : '') + Math.round(fitnessMetrics.tsb) : '0'}
              </div>
              <div className="text-sm text-gray-600">How fresh you are for harder efforts</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Trophy className="w-5 h-5 text-green-600 mr-2" />
                <h4 className="font-medium text-gray-900">How much evidence you have</h4>
              </div>
              <div className="text-2xl font-bold text-green-600 mb-1">{readiness.label}</div>
              <div className="text-sm text-gray-600">{readiness.notes[0]}</div>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            <div className="font-medium text-gray-900 mb-2">What supports these estimates</div>
            <ul className="space-y-1">
              {readiness.notes.map((note) => (
                <li key={note} className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {racePredictions && (
          <div className="mb-8">
            <div className="flex flex-col gap-2 mb-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Predicted race times</h3>
                <p className="text-sm text-gray-600">
                  Shorter races usually stand on firmer ground than longer ones unless your recent training includes real long-run evidence.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {racePredictions.map((race) => {
                const longerRace = race.distance >= 21097;
                const limitedLongRunEvidence = longerRace && readiness.longRuns === 0;

                return (
                  <div key={race.name} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3 gap-3">
                      <h4 className="font-medium text-gray-900 flex items-center">
                        <Trophy className="w-4 h-4 mr-2 text-yellow-600" />
                        {race.name}
                      </h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(race.prediction.confidence)}`}>
                        {getEvidenceCopy(race.prediction.confidence).label}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Predicted time</span>
                        <span className="font-bold text-lg">{formatRaceTime(race.prediction.predictedTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Target pace</span>
                        <span className="font-medium">{formatPace(race.prediction.predictedPace)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Likely range</span>
                        <span className="font-medium text-gray-700">
                          {formatRaceTime(race.prediction.confidenceInterval.optimistic)} - {formatRaceTime(race.prediction.confidenceInterval.conservative)}
                        </span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-700 space-y-2">
                        <div>
                          <span className="font-medium">Pacing shape:</span>{' '}
                          Start at {formatPace(race.strategy.paceStrategy.firstQuarter.pace)} and aim to finish around {formatPace(race.strategy.paceStrategy.finalQuarter.pace)}.
                        </div>
                        {limitedLongRunEvidence && (
                          <p className="text-amber-700">
                            Confidence stays conservative because your recent long-run evidence is limited for this distance.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tenKStrategy && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">10K pacing guide</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Pacing plan
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Opening quarter</span>
                    <span className="font-medium">{formatPace(tenKStrategy.strategy.paceStrategy.firstQuarter.pace)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Middle half</span>
                    <span className="font-medium">{formatPace(tenKStrategy.strategy.paceStrategy.secondQuarter.pace)} to {formatPace(tenKStrategy.strategy.paceStrategy.thirdQuarter.pace)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Closing quarter</span>
                    <span className="font-medium">{formatPace(tenKStrategy.strategy.paceStrategy.finalQuarter.pace)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Target className="w-4 h-4 mr-2" />
                  Key advice
                </h4>
                <ul className="space-y-2">
                  {tenKStrategy.strategy.pacingAdvice.slice(0, 4).map((advice: string) => (
                    <li key={advice} className="flex items-start text-sm text-gray-700">
                      <span className="text-blue-500 mr-2 mt-0.5">•</span>
                      {advice}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <Target className="w-5 h-5 text-yellow-600 mr-2" />
            <h4 className="font-medium text-yellow-800">What would make these estimates firmer</h4>
          </div>
          <div className="mt-2 text-sm text-yellow-700 space-y-1">
            <div>• More recent runs give every distance a steadier footing.</div>
            <div>• Longer runs matter most for half-marathon and marathon trust.</div>
            <div>• Completing your profile improves physiology-based adjustments.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RacePredictions;
