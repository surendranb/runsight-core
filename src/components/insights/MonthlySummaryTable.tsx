// src/components/insights/MonthlySummaryTable.tsx
import React, { useMemo } from 'react';
import { EnrichedRun } from '../../types'; // Adjust path as needed
// Potentially import getMonthName from consistencyUtils if needed for labels
// Or define a simple month name getter here.

interface MonthlySummaryTableProps {
  runs: EnrichedRun[];
}

interface MonthlySummaryData {
  monthLabel: string; // e.g., "Jan 2023"
  year: number;
  month: number; // 1-12 for sorting
  totalDistance: number; // in meters
  runCount: number;
}

// Helper to get month name (can be local or imported)
const getMonthNameHelper = (monthNumber: number): string => {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[monthNumber - 1] || "Unknown";
};

export const MonthlySummaryTable: React.FC<MonthlySummaryTableProps> = ({ runs }) => {
  const monthlyData = useMemo(() => {
    const grouped: Record<string, { year: number; month: number; totalDistance: number; runCount: number; }> = {};

    runs.forEach(run => {
      const year = parseInt(run.start_date_local.substring(0, 4), 10);
      const month = parseInt(run.start_date_local.substring(5, 7), 10); // 1-12
      const key = `${year}-${month}`;

      if (!grouped[key]) {
        grouped[key] = { year, month, totalDistance: 0, runCount: 0 };
      }
      grouped[key].totalDistance += run.distance;
      grouped[key].runCount += 1;
    });

    return Object.values(grouped)
      .map(data => ({
        ...data,
        monthLabel: `${getMonthNameHelper(data.month)} ${data.year}`,
      }))
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
  }, [runs]);

  if (!monthlyData.length) {
    return (
      <div className="bg-white shadow rounded-lg p-6 my-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Monthly Summary</h3>
        <p className="text-sm text-gray-500">Not enough run data to display monthly summary.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 my-4">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Monthly Summary</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Month
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Runs
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Distance (KM)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {monthlyData.map((data) => (
              <tr key={data.monthLabel}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{data.monthLabel}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{data.runCount}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {(data.totalDistance / 1000).toFixed(1)} km
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
