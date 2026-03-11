import React, { useMemo, useState } from 'react';
import { Trophy, TrendingUp, Award, Target } from 'lucide-react';
import { EnrichedRun } from '../../types';
import {
  ALL_DISTANCES,
  detectPersonalRecords,
  filterPRAnalysisByDistance,
  formatTime,
  formatPace,
  getCurrentPersonalRecord
} from '../../lib/insights/personalRecordsUtils';
import { formatRunDate } from '../../lib/dateUtils';

interface PersonalRecordsInsightProps {
  runs: EnrichedRun[];
}

export const PersonalRecordsInsight: React.FC<PersonalRecordsInsightProps> = ({ runs }) => {
  const [selectedDistance, setSelectedDistance] = useState<string>(ALL_DISTANCES);

  const prAnalysis = useMemo(() => detectPersonalRecords(runs), [runs]);
  const { personalRecords } = prAnalysis;
  const distances = [ALL_DISTANCES, ...Array.from(new Set(personalRecords.map((pr) => pr.distance)))];
  const scopedAnalysis = useMemo(
    () => filterPRAnalysisByDistance(prAnalysis, selectedDistance),
    [prAnalysis, selectedDistance]
  );
  const {
    personalRecords: filteredRecords,
    recentPRs: filteredRecentPRs,
    prsByConditions: filteredConditions
  } = scopedAnalysis;
  const currentBest = useMemo(() => getCurrentPersonalRecord(filteredRecords), [filteredRecords]);
  const scopedLabel = selectedDistance === ALL_DISTANCES ? 'All PR distances' : `${selectedDistance} only`;
  const latestScopedPR = filteredRecentPRs[0] ?? filteredRecords[filteredRecords.length - 1] ?? null;

  const formatDate = (dateString: string) => {
    return formatRunDate(dateString);
  };

  if (personalRecords.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center mb-4">
          <Trophy className="w-6 h-6 text-yellow-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800">Personal Records</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No personal records found yet.</p>
          <p className="text-sm">Keep running to set your first PRs!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Trophy className="w-6 h-6 text-yellow-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800">Personal Records</h3>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedDistance}
            onChange={(e) => setSelectedDistance(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {distances.map(distance => (
              <option key={distance} value={distance}>
                {distance === ALL_DISTANCES ? 'All Distances' : distance}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-yellow-800">Current scope</p>
            <p className="mt-1 text-sm text-yellow-900">{scopedLabel}</p>
            <p className="mt-2 text-sm text-yellow-800">
              {selectedDistance === ALL_DISTANCES
                ? 'Scan the full spread of breakthroughs, then narrow to a single distance when you want a cleaner PR story.'
                : 'This view now shows only the PR history, recent breakthroughs, and context for the selected distance.'}
            </p>
          </div>
          {currentBest && (
            <div className="min-w-[180px] rounded-lg bg-white/70 p-3 text-right">
              <div className="flex items-center justify-end text-xs font-semibold uppercase tracking-wide text-yellow-700">
                <Target className="mr-1 h-3.5 w-3.5" />
                Current Best
              </div>
              <div className="mt-1 text-lg font-bold text-gray-900">{formatTime(currentBest.time)}</div>
              <div className="text-sm text-gray-700">{formatPace(currentBest.pace)}</div>
              <div className="mt-1 text-xs text-gray-500">{currentBest.distance} • {formatDate(currentBest.date)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Recent PRs Highlight */}
      {filteredRecentPRs.length > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
          <div className="flex items-center mb-2">
            <Award className="w-5 h-5 text-yellow-600 mr-2" />
            <h4 className="font-medium text-yellow-800">Recent Personal Records</h4>
          </div>
          <div className="space-y-2">
            {filteredRecentPRs.slice(0, 3).map((pr, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="font-medium text-yellow-700">{pr.distance}</span>
                <span className="text-yellow-600">{formatTime(pr.time)} on {formatDate(pr.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HIDDEN: PR Table - Focus on insights instead of raw data */}
      {/* 
      <div className="overflow-x-auto">
        <table className="w-full">
          ... PR table content hidden to focus on insights ...
        </table>
      </div>
      */}

      {/* PR Conditions Analysis */}
      {filteredConditions.bestWeatherConditions.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center">
            <TrendingUp className="w-4 h-4 mr-2" />
            PR Conditions Analysis
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {filteredConditions.bestWeatherConditions.length > 0 && (
              <div>
                <span className="font-medium text-gray-700">Best Weather:</span>
                <div className="mt-1">
                  {filteredConditions.bestWeatherConditions.map((condition, index) => (
                    <span key={index} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-1 mb-1">
                      {condition}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {filteredConditions.bestLocations.length > 0 && (
              <div>
                <span className="font-medium text-gray-700">Best Locations:</span>
                <div className="mt-1">
                  {filteredConditions.bestLocations.map((location, index) => (
                    <span key={index} className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs mr-1 mb-1">
                      {location}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {filteredConditions.temperatureRange.min > 0 && (
              <div>
                <span className="font-medium text-gray-700">Temperature Range:</span>
                <div className="mt-1 text-gray-600">
                  {Math.round(filteredConditions.temperatureRange.min)}°C - {Math.round(filteredConditions.temperatureRange.max)}°C
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-yellow-600">{filteredRecords.length}</div>
            <div className="text-sm text-gray-600">PR Breakthroughs</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{filteredRecentPRs.length}</div>
            <div className="text-sm text-gray-600">Recent PRs</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{selectedDistance === ALL_DISTANCES ? distances.length - 1 : 1}</div>
            <div className="text-sm text-gray-600">Distance Scope</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {latestScopedPR ? formatDate(latestScopedPR.date) : '—'}
            </div>
            <div className="text-sm text-gray-600">Latest PR</div>
          </div>
        </div>
      </div>
    </div>
  );
};
