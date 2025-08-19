import React, { useState } from 'react';
import { Trophy, Calendar, MapPin, Thermometer, Cloud, TrendingUp, Award } from 'lucide-react';
import { EnrichedRun } from '../../types';
import { detectPersonalRecords, formatTime, formatPace, PersonalRecord } from '../../lib/insights/personalRecordsUtils';
import { formatRunDate } from '../../lib/dateUtils';

interface PersonalRecordsInsightProps {
  runs: EnrichedRun[];
}

export const PersonalRecordsInsight: React.FC<PersonalRecordsInsightProps> = ({ runs }) => {
  const [selectedDistance, setSelectedDistance] = useState<string>('all');
  
  const prAnalysis = detectPersonalRecords(runs);
  const { personalRecords, recentPRs, prProgression, prsByConditions } = prAnalysis;

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

  const distances = ['all', ...Array.from(new Set(personalRecords.map(pr => pr.distance)))];
  const filteredRecords = selectedDistance === 'all' 
    ? personalRecords 
    : personalRecords.filter(pr => pr.distance === selectedDistance);

  const formatDate = (dateString: string) => {
    return formatRunDate(dateString);
  };

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
                {distance === 'all' ? 'All Distances' : distance}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Recent PRs Highlight */}
      {recentPRs.length > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
          <div className="flex items-center mb-2">
            <Award className="w-5 h-5 text-yellow-600 mr-2" />
            <h4 className="font-medium text-yellow-800">Recent Personal Records</h4>
          </div>
          <div className="space-y-2">
            {recentPRs.slice(0, 3).map((pr, index) => (
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
      {prsByConditions.bestWeatherConditions.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center">
            <TrendingUp className="w-4 h-4 mr-2" />
            PR Conditions Analysis
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {prsByConditions.bestWeatherConditions.length > 0 && (
              <div>
                <span className="font-medium text-gray-700">Best Weather:</span>
                <div className="mt-1">
                  {prsByConditions.bestWeatherConditions.map((condition, index) => (
                    <span key={index} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-1 mb-1">
                      {condition}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {prsByConditions.bestLocations.length > 0 && (
              <div>
                <span className="font-medium text-gray-700">Best Locations:</span>
                <div className="mt-1">
                  {prsByConditions.bestLocations.map((location, index) => (
                    <span key={index} className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs mr-1 mb-1">
                      {location}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {prsByConditions.temperatureRange.min > 0 && (
              <div>
                <span className="font-medium text-gray-700">Temperature Range:</span>
                <div className="mt-1 text-gray-600">
                  {Math.round(prsByConditions.temperatureRange.min)}°C - {Math.round(prsByConditions.temperatureRange.max)}°C
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
            <div className="text-2xl font-bold text-yellow-600">{personalRecords.length}</div>
            <div className="text-sm text-gray-600">Total PRs</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{recentPRs.length}</div>
            <div className="text-sm text-gray-600">Recent PRs</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{distances.length - 1}</div>
            <div className="text-sm text-gray-600">Distances</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {prProgression.reduce((sum, prog) => sum + prog.records.length, 0)}
            </div>
            <div className="text-sm text-gray-600">Improvements</div>
          </div>
        </div>
      </div>
    </div>
  );
};