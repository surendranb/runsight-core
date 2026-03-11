// src/lib/insights/elevationEffortUtils.ts
import { EnrichedRun } from '../../types';
import { calculatePaceMinPerKm } from '../insightsUtils';

export interface ElevationEffortBucket {
  label: string; // e.g., "Flat (0-5 m/km)"
  avgPace: number | null; // min/km
  avgHeartRate: number | null; // bpm
  runCount: number;
  avgElevationPerKm: number | null; // For context
}

const ELEVATION_CATEGORIES = [
  { label: "Mostly Flat (<5 m/km)", minGainPerKm: 0, maxGainPerKm: 5 },
  { label: "Rolling Hills (5-10 m/km)", minGainPerKm: 5, maxGainPerKm: 10 },
  { label: "Moderately Hilly (10-15 m/km)", minGainPerKm: 10, maxGainPerKm: 15 },
  { label: "Very Hilly (15-20 m/km)", minGainPerKm: 15, maxGainPerKm: 20 },
  { label: "Extremely Hilly (>20 m/km)", minGainPerKm: 20, maxGainPerKm: Infinity },
];

const getElevationCategory = (gainPerKm: number | undefined | null): typeof ELEVATION_CATEGORIES[0] | null => {
  if (gainPerKm === undefined || gainPerKm === null) return null;
  for (const category of ELEVATION_CATEGORIES) {
    if (gainPerKm >= category.minGainPerKm && gainPerKm < category.maxGainPerKm) return category;
  }
  return null;
};

interface AggregatedElevationData {
    totalPaceSecondsPerKm: number;
    totalHeartRate: number;
    totalElevationGainPerKm: number;
    elevationDataPoints: number; // Count for averaging elevation gain itself
    paceDataPoints: number;
    hrDataPoints: number;
    runCount: number;
}

export const getPerformanceByElevation = (runs: EnrichedRun[]): ElevationEffortBucket[] => {
  const grouped: Record<string, AggregatedElevationData> = {};

  ELEVATION_CATEGORIES.forEach(cat => {
     grouped[cat.label] = {
         totalPaceSecondsPerKm: 0, totalHeartRate: 0, totalElevationGainPerKm: 0,
         elevationDataPoints: 0, paceDataPoints: 0, hrDataPoints: 0, runCount: 0
     };
  });

  runs.forEach(run => {
    if (run.distance === 0 || run.total_elevation_gain === undefined || run.total_elevation_gain === null) {
        return; // Skip runs with no distance or elevation gain
    }
    const gainPerKm = (run.total_elevation_gain / (run.distance / 1000));
    const category = getElevationCategory(gainPerKm);

    if (category) {
      grouped[category.label].totalElevationGainPerKm += gainPerKm;
      grouped[category.label].elevationDataPoints++;

      const paceMinPerKm = calculatePaceMinPerKm(run.average_speed);
      if (paceMinPerKm > 0) {
        grouped[category.label].totalPaceSecondsPerKm += paceMinPerKm * 60;
        grouped[category.label].paceDataPoints++;
      }
      if (run.average_heartrate) {
        grouped[category.label].totalHeartRate += run.average_heartrate;
        grouped[category.label].hrDataPoints++;
      }
      grouped[category.label].runCount++;
    }
  });

  return ELEVATION_CATEGORIES.map(catConfig => {
     const data = grouped[catConfig.label];
     return {
         label: catConfig.label,
         avgPace: data.paceDataPoints > 0 ? (data.totalPaceSecondsPerKm / data.paceDataPoints) / 60 : null,
         avgHeartRate: data.hrDataPoints > 0 ? data.totalHeartRate / data.hrDataPoints : null,
         runCount: data.runCount,
         avgElevationPerKm: data.elevationDataPoints > 0 ? data.totalElevationGainPerKm / data.elevationDataPoints : null,
     };
  }).filter(b => b.runCount > 0); // Only return buckets with data
};
