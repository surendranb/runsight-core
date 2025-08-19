// src/lib/insights/weatherPerformanceUtils.ts
import { EnrichedRun } from '../../types';
import { calculatePaceMinPerKm } from '../insightsUtils';

export interface PerformanceBucket {
  label: string; // e.g., "10-15°C", "50-70%"
  avgPace: number | null; // min/km
  avgHeartRate: number | null; // bpm
  runCount: number;
}

// Define Temperature Ranges
const TEMP_RANGES = [
  { label: "<0°C", min: -Infinity, max: 0 },
  { label: "0-5°C", min: 0, max: 5 },
  { label: "5-10°C", min: 5, max: 10 },
  { label: "10-15°C", min: 10, max: 15 },
  { label: "15-20°C", min: 15, max: 20 },
  { label: "20-25°C", min: 20, max: 25 },
  { label: "25-30°C", min: 25, max: 30 },
  { label: ">30°C", min: 30, max: Infinity },
];

// Define Humidity Ranges
const HUMIDITY_RANGES = [
  { label: "<40%", min: 0, max: 40 },
  { label: "40-50%", min: 40, max: 50 },
  { label: "50-60%", min: 50, max: 60 },
  { label: "60-70%", min: 60, max: 70 },
  { label: "70-80%", min: 70, max: 80 },
  { label: "80-90%", min: 80, max: 90 },
  { label: ">90%", min: 90, max: 101 }, // Max 101 to include 100
];

const getTemperatureBucket = (temp: number | undefined | null): string | null => {
  if (temp === undefined || temp === null) return null;
  for (const range of TEMP_RANGES) {
    if (temp >= range.min && temp < range.max) return range.label;
  }
  // Special case for exact max of last range if not covered by <
  if (temp === TEMP_RANGES[TEMP_RANGES.length -1].max) return TEMP_RANGES[TEMP_RANGES.length -1].label;
  return null;
};

const getHumidityBucket = (humidity: number | undefined | null): string | null => {
  if (humidity === undefined || humidity === null) return null;
  for (const range of HUMIDITY_RANGES) {
    if (humidity >= range.min && humidity < range.max) return range.label;
  }
   // Special case for exact max of last range if not covered by < (e.g. 100% humidity)
  if (humidity === HUMIDITY_RANGES[HUMIDITY_RANGES.length -1].max) return HUMIDITY_RANGES[HUMIDITY_RANGES.length -1].label;
  return null;
};

interface AggregatedData {
    totalPaceSecondsPerKm: number;
    totalHeartRate: number;
    paceDataPoints: number;
    hrDataPoints: number;
    runCount: number;
}

export const getPerformanceByTemperature = (runs: EnrichedRun[]): PerformanceBucket[] => {
  const grouped: Record<string, AggregatedData> = {};

  TEMP_RANGES.forEach(range => {
     grouped[range.label] = { totalPaceSecondsPerKm: 0, totalHeartRate: 0, paceDataPoints: 0, hrDataPoints: 0, runCount: 0 };
  });

  runs.forEach(run => {
    const temp = run.weather_data?.temperature;
    const bucketLabel = getTemperatureBucket(temp);

    if (bucketLabel) {
      const paceMinPerKm = calculatePaceMinPerKm(run.average_speed);
      if (paceMinPerKm > 0) { // calculatePaceMinPerKm returns 0 for invalid speed, ensure positive pace
        grouped[bucketLabel].totalPaceSecondsPerKm += paceMinPerKm * 60;
        grouped[bucketLabel].paceDataPoints++;
      }
      if (run.average_heartrate) {
        grouped[bucketLabel].totalHeartRate += run.average_heartrate;
        grouped[bucketLabel].hrDataPoints++;
      }
      grouped[bucketLabel].runCount++;
    }
  });

  return TEMP_RANGES.map(range => {
     const data = grouped[range.label];
     return {
         label: range.label,
         avgPace: data.paceDataPoints > 0 ? (data.totalPaceSecondsPerKm / data.paceDataPoints) / 60 : null,
         avgHeartRate: data.hrDataPoints > 0 ? data.totalHeartRate / data.hrDataPoints : null,
         runCount: data.runCount,
     };
  }).filter(b => b.runCount > 0); // Only return buckets with data
};

export const getPerformanceByHumidity = (runs: EnrichedRun[]): PerformanceBucket[] => {
  const grouped: Record<string, AggregatedData> = {};

  HUMIDITY_RANGES.forEach(range => {
     grouped[range.label] = { totalPaceSecondsPerKm: 0, totalHeartRate: 0, paceDataPoints: 0, hrDataPoints: 0, runCount: 0 };
  });

  runs.forEach(run => {
    const humidity = run.weather_data?.humidity;
    const bucketLabel = getHumidityBucket(humidity);

    if (bucketLabel) {
      const paceMinPerKm = calculatePaceMinPerKm(run.average_speed);
      if (paceMinPerKm > 0) { // calculatePaceMinPerKm returns 0 for invalid speed, ensure positive pace
        grouped[bucketLabel].totalPaceSecondsPerKm += paceMinPerKm * 60;
        grouped[bucketLabel].paceDataPoints++;
      }
      if (run.average_heartrate) {
        grouped[bucketLabel].totalHeartRate += run.average_heartrate;
        grouped[bucketLabel].hrDataPoints++;
      }
      grouped[bucketLabel].runCount++;
    }
  });

  return HUMIDITY_RANGES.map(range => {
     const data = grouped[range.label];
     return {
         label: range.label,
         avgPace: data.paceDataPoints > 0 ? (data.totalPaceSecondsPerKm / data.paceDataPoints) / 60 : null,
         avgHeartRate: data.hrDataPoints > 0 ? data.totalHeartRate / data.hrDataPoints : null,
         runCount: data.runCount,
     };
  }).filter(b => b.runCount > 0); // Only return buckets with data
};
