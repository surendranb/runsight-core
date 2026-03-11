// src/lib/insights/workoutTypeUtils.ts
import { EnrichedRun } from '../../types';
import { calculatePaceMinPerKm } from '../insightsUtils';

export interface WorkoutTypePerformanceBucket {
  label: string; // e.g., "Long Run", "Race", "Workout", "General Run"
  avgPace: number | null; // min/km
  avgDistance: number | null; // km
  avgHeartRate: number | null; // bpm
  runCount: number;
}

// Strava workout_type: null (or 0) is default run. Others include 1 (Race), 2 (Long Run), 3 (Workout).
// Some clients might send "Run" as a string for default.
const getWorkoutTypeLabel = (workoutType: string | number | undefined | null): string => {
  if (workoutType === null || workoutType === undefined || workoutType === 0 || String(workoutType).toLowerCase() === 'run') {
    return "General Run";
  }
  if (workoutType === 1 || String(workoutType).toLowerCase() === 'race') return "Race";
  if (workoutType === 2 || String(workoutType).toLowerCase() === 'long run') return "Long Run";
  if (workoutType === 3 || String(workoutType).toLowerCase() === 'workout') return "Workout";
  // If it's a string and not 'run', use it as is (custom workout type)
  if (typeof workoutType === 'string') return workoutType;
  return "Other"; // Fallback for unknown numeric types
};

interface AggregatedWorkoutTypeData {
    totalPaceSecondsPerKm: number;
    totalDistanceMeters: number;
    totalHeartRate: number;
    paceDataPoints: number;
    distanceDataPoints: number;
    hrDataPoints: number;
    runCount: number;
}

export const getPerformanceByWorkoutType = (runs: EnrichedRun[]): WorkoutTypePerformanceBucket[] => {
  const grouped: Record<string, AggregatedWorkoutTypeData> = {};

  runs.forEach(run => {
    // Access workout_type from strava_data.workout_type
    const rawWorkoutType = run.strava_data?.workout_type;
    const workoutLabel = getWorkoutTypeLabel(rawWorkoutType);

    if (!grouped[workoutLabel]) {
      grouped[workoutLabel] = {
        totalPaceSecondsPerKm: 0, totalDistanceMeters: 0, totalHeartRate: 0,
        paceDataPoints: 0, distanceDataPoints: 0, hrDataPoints: 0, runCount: 0
      };
    }

    const paceMinPerKm = calculatePaceMinPerKm(run.average_speed);
    if (paceMinPerKm > 0) {
      grouped[workoutLabel].totalPaceSecondsPerKm += paceMinPerKm * 60;
      grouped[workoutLabel].paceDataPoints++;
    }
    if (run.distance > 0) {
        grouped[workoutLabel].totalDistanceMeters += run.distance;
        grouped[workoutLabel].distanceDataPoints++;
    }
    if (run.average_heartrate) {
      grouped[workoutLabel].totalHeartRate += run.average_heartrate;
      grouped[workoutLabel].hrDataPoints++;
    }
    grouped[workoutLabel].runCount++;
  });

  return Object.keys(grouped).map(label => {
     const data = grouped[label];
     if (data.runCount === 0) return null; // Should not happen if logic is correct

     return {
         label: label,
         avgPace: data.paceDataPoints > 0 ? (data.totalPaceSecondsPerKm / data.paceDataPoints) / 60 : null,
         avgDistance: data.distanceDataPoints > 0 ? (data.totalDistanceMeters / data.distanceDataPoints) / 1000 : null, // Convert to km
         avgHeartRate: data.hrDataPoints > 0 ? data.totalHeartRate / data.hrDataPoints : null,
         runCount: data.runCount,
     };
  }).filter(b => b !== null && b.runCount > 0) as WorkoutTypePerformanceBucket[];
};
