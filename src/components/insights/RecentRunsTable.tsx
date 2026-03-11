import React, { useMemo } from 'react';
import { Calendar, MapPin, Clock, Activity, Thermometer } from 'lucide-react';
import { EnrichedRun } from '../../types';
import { formatRunDate } from '../../lib/dateUtils';
import { Section } from '../common/VisualHierarchy';

interface RecentRunsTableProps {
  runs: EnrichedRun[];
  maxRuns?: number;
}

export const RecentRunsTable: React.FC<RecentRunsTableProps> = ({ runs, maxRuns = 10 }) => {
  const recentRuns = useMemo(() => {
    return [...runs]
      .sort((a, b) => new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime())
      .slice(0, maxRuns);
  }, [runs, maxRuns]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPace = (movingTime: number, distance: number): string => {
    const paceInSeconds = movingTime / (distance / 1000);
    const minutes = Math.floor(paceInSeconds / 60);
    const seconds = Math.floor(paceInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters: number): string => {
    return (meters / 1000).toFixed(2);
  };

  if (recentRuns.length === 0) {
    return (
      <Section
        title="Recent Runs"
        subtitle="Your latest training activities"
        level={2}
        icon={Activity}
        className="mb-6"
      >
        <div className="text-center py-8 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No recent runs found.</p>
          <p className="text-sm">Start running to see your activities here!</p>
        </div>
      </Section>
    );
  }

  return (
    <Section
      title="Recent Runs"
      subtitle={`Your latest ${recentRuns.length} training activities`}
      level={2}
      icon={Activity}
      badge={{
        text: `${recentRuns.length} runs`,
        color: 'blue'
      }}
      className="mb-6"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 font-medium text-gray-700">Date</th>
              <th className="text-left py-3 px-2 font-medium text-gray-700">Name</th>
              <th className="text-left py-3 px-2 font-medium text-gray-700">Distance</th>
              <th className="text-left py-3 px-2 font-medium text-gray-700">Time</th>
              <th className="text-left py-3 px-2 font-medium text-gray-700">Pace</th>
              <th className="text-left py-3 px-2 font-medium text-gray-700">Conditions</th>
            </tr>
          </thead>
          <tbody>
            {recentRuns.map((run, index) => (
              <tr key={run.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatRunDate(run.start_date_local)}
                  </div>
                </td>
                <td className="py-3 px-2">
                  <div className="font-medium text-gray-900 truncate max-w-32">
                    {run.name}
                  </div>
                </td>
                <td className="py-3 px-2 font-mono text-sm text-gray-900">
                  {formatDistance(run.distance)} km
                </td>
                <td className="py-3 px-2 font-mono text-sm text-gray-900">
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1 text-gray-400" />
                    {formatTime(run.moving_time)}
                  </div>
                </td>
                <td className="py-3 px-2 font-mono text-sm text-gray-600">
                  {formatPace(run.moving_time, run.distance)}/km
                </td>
                <td className="py-3 px-2 text-sm">
                  <div className="flex items-center space-x-2">
                    {run.weather_data?.temperature && (
                      <div className="flex items-center text-gray-600">
                        <Thermometer className="w-3 h-3 mr-1" />
                        <span>{Math.round(run.weather_data.temperature)}°C</span>
                      </div>
                    )}
                    {run.start_latlng && (
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span className="text-xs">GPS</span>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {runs.length > maxRuns && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Showing {recentRuns.length} of {runs.length} total runs
          </p>
        </div>
      )}
    </Section>
  );
};