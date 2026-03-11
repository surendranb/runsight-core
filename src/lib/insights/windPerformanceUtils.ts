// src/lib/insights/windPerformanceUtils.ts
import { EnrichedRun } from '../../types';
import { calculatePaceMinPerKm } from '../insightsUtils';

export interface WindPerformanceBucket {
  label: string; // e.g., "Calm (0-2 m/s)"
  avgPace: number | null; // min/km
  avgHeartRate: number | null; // bpm
  runCount: number;
}

// Wind speed is typically in m/s from OpenWeatherMap
const WIND_CATEGORIES = [
  { label: "Calm (<2 m/s)", minSpeed: 0, maxSpeed: 2 },
  { label: "Light Breeze (2-4 m/s)", minSpeed: 2, maxSpeed: 4 },
  { label: "Moderate Wind (4-7 m/s)", minSpeed: 4, maxSpeed: 7 },
  { label: "Strong Wind (7-10 m/s)", minSpeed: 7, maxSpeed: 10 },
  { label: "Very Strong Wind (>10 m/s)", minSpeed: 10, maxSpeed: Infinity },
];

const getWindCategory = (windSpeed: number | undefined | null): typeof WIND_CATEGORIES[0] | null => {
  if (windSpeed === undefined || windSpeed === null) return null;
  for (const category of WIND_CATEGORIES) {
    if (windSpeed >= category.minSpeed && windSpeed < category.maxSpeed) return category;
  }
  return null;
};

interface AggregatedWindData {
    totalPaceSecondsPerKm: number;
    totalHeartRate: number;
    paceDataPoints: number;
    hrDataPoints: number;
    runCount: number;
}

export const getPerformanceByWind = (runs: EnrichedRun[]): WindPerformanceBucket[] => {
  const grouped: Record<string, AggregatedWindData> = {};

  WIND_CATEGORIES.forEach(cat => {
     grouped[cat.label] = {
         totalPaceSecondsPerKm: 0, totalHeartRate: 0,
         paceDataPoints: 0, hrDataPoints: 0, runCount: 0
     };
  });

  runs.forEach(run => {
    const windSpeed = run.weather_data?.wind_speed; // Assuming wind_speed is at weather_data.wind_speed
    const category = getWindCategory(windSpeed);

    if (category) {
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

  return WIND_CATEGORIES.map(catConfig => {
     const data = grouped[catConfig.label];
     return {
         label: catConfig.label,
         avgPace: data.paceDataPoints > 0 ? (data.totalPaceSecondsPerKm / data.paceDataPoints) / 60 : null,
         avgHeartRate: data.hrDataPoints > 0 ? data.totalHeartRate / data.hrDataPoints : null,
         runCount: data.runCount,
     };
  }).filter(b => b.runCount > 0); // Only return buckets with data
};
