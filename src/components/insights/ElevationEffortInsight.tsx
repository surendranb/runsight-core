// src/components/insights/ElevationEffortInsight.tsx
import React, { useMemo } from 'react';
import { EnrichedRun } from '../../types';
import { getPerformanceByElevation, ElevationEffortBucket } from '../../lib/insights/elevationEffortUtils';

interface ElevationEffortInsightProps {
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

const formatElevationPerKm = (elevPKm: number | null): string => {
    if (elevPKm === null) return "N/A";
    return `${elevPKm.toFixed(1)} m/km`;
}

export const ElevationEffortInsight: React.FC<ElevationEffortInsightProps> = ({ runs }) => {
  const elevationPerformance = useMemo(() => getPerformanceByElevation(runs), [runs]);

  const relevantRuns = runs.filter(r => r.distance > 0 && r.total_elevation_gain !== undefined && r.total_elevation_gain !== null);

  if (relevantRuns.length < 3) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-3">Elevation vs. Effort</h3>
        <p className="text-gray-600">Not enough runs with distance and elevation data to generate this insight. At least 3 such runs are needed.</p>
      </div>
    );
  }

  if (elevationPerformance.length === 0) {
     return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-3">Elevation vs. Effort</h3>
        <p className="text-gray-600">No runs fall into the defined elevation categories.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Elevation Gain vs. Effort</h3>
      <p className="text-sm text-gray-600 mb-6">Understand how different levels of hillyness (elevation gain per kilometer) impact your running effort and pace.</p>

      <div className="overflow-x-auto">
         <table className="min-w-full text-sm">
             <thead className="bg-gray-50">
                 <tr className="text-left text-gray-600">
                     <th className="p-3 font-medium">Hillyness Category</th>
                     <th className="p-3 font-medium">Avg Elev. per Km</th>
                     <th className="p-3 font-medium">Avg Pace</th>
                     <th className="p-3 font-medium">Avg Heart Rate</th>
                     <th className="p-3 font-medium">Runs</th>
                 </tr>
             </thead>
             <tbody>
                 {elevationPerformance.map(bucket => (
                     <tr key={bucket.label} className="border-b border-gray-200 hover:bg-gray-50">
                         <td className="p-3">{bucket.label}</td>
                         <td className="p-3 text-gray-500">{formatElevationPerKm(bucket.avgElevationPerKm)}</td>
                         <td className="p-3 font-semibold">{formatPaceDisplay(bucket.avgPace)}</td>
                         <td className="p-3 font-semibold">{formatHeartRateDisplay(bucket.avgHeartRate)}</td>
                         <td className="p-3 text-gray-500">{bucket.runCount}</td>
                     </tr>
                 ))}
             </tbody>
         </table>
      </div>
      <p className="text-xs text-gray-500 mt-4">
        This table shows your average performance metrics based on the average elevation gain per kilometer of your runs.
      </p>
    </div>
  );
};
