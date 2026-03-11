// src/components/insights/TimeOfDayInsight.tsx
import React, { useMemo } from 'react';
import { EnrichedRun } from '../../types';
import { getPerformanceByTimeOfDay, TimeOfDayPerformanceBucket } from '../../lib/insights/timeOfDayUtils';

interface TimeOfDayInsightProps {
  runs: EnrichedRun[];
}

const formatPaceDisplay = (pace: number | null): string => {
  if (pace === null || pace === 0) return "N/A";
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} min/km`;
};

const formatHeartRateDisplay = (hr: number | null): string => {
  if (hr === null) return "N/A";
  return `${Math.round(hr)} bpm`;
};

export const TimeOfDayInsight: React.FC<TimeOfDayInsightProps> = ({ runs }) => {
  const timeOfDayPerformance = useMemo(() => getPerformanceByTimeOfDay(runs), [runs]);

  if (runs.filter(r => r.start_date_local).length < 3) { // Need at least a few runs with local start times
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-3">Performance by Time of Day</h3>
        <p className="text-gray-600">Not enough run data with local start times to generate this insight.</p>
      </div>
    );
  }

  if (timeOfDayPerformance.length === 0) {
     return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-3">Performance by Time of Day</h3>
        <p className="text-gray-600">No runs found within the defined time slots.</p>
      </div>
    );
  }


  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Performance by Time of Day</h3>
      <p className="text-sm text-gray-600 mb-6">Discover if you tend to run faster or with a different heart rate based on the time of day you start your runs.</p>

      <div className="overflow-x-auto">
         <table className="min-w-full text-sm">
             <thead className="bg-gray-50">
                 <tr className="text-left text-gray-600">
                     <th className="p-3 font-medium">Time Slot</th>
                     <th className="p-3 font-medium">Avg Pace</th>
                     <th className="p-3 font-medium">Avg Heart Rate</th>
                     <th className="p-3 font-medium">Runs</th>
                 </tr>
             </thead>
             <tbody>
                 {timeOfDayPerformance.map(bucket => (
                     <tr key={bucket.label} className="border-b border-gray-200 hover:bg-gray-50">
                         <td className="p-3">{bucket.label}</td>
                         <td className="p-3 font-semibold">{formatPaceDisplay(bucket.avgPace)}</td>
                         <td className="p-3 font-semibold">{formatHeartRateDisplay(bucket.avgHeartRate)}</td>
                         <td className="p-3 text-gray-500">{bucket.runCount}</td>
                     </tr>
                 ))}
             </tbody>
         </table>
      </div>
      <p className="text-xs text-gray-500 mt-4">
        This table shows your average performance metrics based on the local time your runs were started.
      </p>
    </div>
  );
};
