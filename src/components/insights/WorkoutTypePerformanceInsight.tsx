// src/components/insights/WorkoutTypePerformanceInsight.tsx
import React, { useMemo } from 'react';
import { EnrichedRun } from '../../types';
import { getPerformanceByWorkoutType, WorkoutTypePerformanceBucket } from '../../lib/insights/workoutTypeUtils';

interface WorkoutTypePerformanceInsightProps {
  runs: EnrichedRun[];
}

const formatPaceDisplay = (pace: number | null): string => {
  if (pace === null || pace === 0) return "N/A";
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} min/km`;
};

const formatDistanceDisplay = (distanceKm: number | null): string => {
    if (distanceKm === null) return "N/A";
    return `${distanceKm.toFixed(1)} km`;
}

const formatHeartRateDisplay = (hr: number | null): string => {
  if (hr === null) return "N/A";
  return `${Math.round(hr)} bpm`;
};

export const WorkoutTypePerformanceInsight: React.FC<WorkoutTypePerformanceInsightProps> = ({ runs }) => {
  const performanceByWorkoutType = useMemo(() => getPerformanceByWorkoutType(runs), [runs]);

  // Check if any run has strava_data.workout_type to determine relevance
  const hasWorkoutTypeData = runs.some(r => r.strava_data?.workout_type !== undefined);

  if (!hasWorkoutTypeData || performanceByWorkoutType.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-3">Performance by Workout Type</h3>
        <p className="text-gray-600">No runs with identifiable workout types found, or workout type data is not available in your synced runs.</p>
        <p className="text-xs text-gray-500 mt-1">Strava uses 'Race', 'Long Run', 'Workout'. Others are 'General Run'.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Performance by Workout Type</h3>
      <p className="text-sm text-gray-600 mb-6">Compare your average performance metrics across different types of workouts as categorized in Strava (e.g., General Run, Long Run, Race, Workout).</p>

      <div className="overflow-x-auto">
         <table className="min-w-full text-sm">
             <thead className="bg-gray-50">
                 <tr className="text-left text-gray-600">
                     <th className="p-3 font-medium">Workout Type</th>
                     <th className="p-3 font-medium">Avg Pace</th>
                     <th className="p-3 font-medium">Avg Distance</th>
                     <th className="p-3 font-medium">Avg Heart Rate</th>
                     <th className="p-3 font-medium">Runs</th>
                 </tr>
             </thead>
             <tbody>
                 {performanceByWorkoutType.map(bucket => (
                     <tr key={bucket.label} className="border-b border-gray-200 hover:bg-gray-50">
                         <td className="p-3">{bucket.label}</td>
                         <td className="p-3 font-semibold">{formatPaceDisplay(bucket.avgPace)}</td>
                         <td className="p-3 font-semibold">{formatDistanceDisplay(bucket.avgDistance)}</td>
                         <td className="p-3 font-semibold">{formatHeartRateDisplay(bucket.avgHeartRate)}</td>
                         <td className="p-3 text-gray-500">{bucket.runCount}</td>
                     </tr>
                 ))}
             </tbody>
         </table>
      </div>
      <p className="text-xs text-gray-500 mt-4">
        This table shows your average performance metrics based on the workout type specified in Strava. Runs without a specific type are grouped under "General Run".
      </p>
    </div>
  );
};
