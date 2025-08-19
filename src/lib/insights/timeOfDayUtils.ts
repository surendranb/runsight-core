// src/lib/insights/timeOfDayUtils.ts
import { EnrichedRun } from '../../types';
import { calculatePaceMinPerKm, getHourFromDateString } from '../insightsUtils';

export interface TimeOfDayPerformanceBucket {
  label: string; // e.g., "Morning (5-9 AM)"
  avgPace: number | null; // min/km
  avgHeartRate: number | null; // bpm
  runCount: number;
  sortOrder: number; // For consistent ordering
}

const TIME_SLOTS = [
  { label: "Early Morning (5-8 AM)", minHour: 5, maxHour: 8, sortOrder: 1 },
  { label: "Morning (8-12 PM)", minHour: 8, maxHour: 12, sortOrder: 2 },
  { label: "Afternoon (12-5 PM)", minHour: 12, maxHour: 17, sortOrder: 3 },
  { label: "Evening (5-9 PM)", minHour: 17, maxHour: 21, sortOrder: 4 },
  { label: "Night (9PM-5AM)", minHour: 21, maxHour: 29, sortOrder: 5 } // maxHour 29 to cover 21 to (24+5)
];

const getTimeSlot = (hour: number | null): typeof TIME_SLOTS[0] | null => {
  if (hour === null) return null;
  for (const slot of TIME_SLOTS) {
    if (slot.label === "Night (9PM-5AM)") { // Special handling for night slot crossing midnight
      if (hour >= slot.minHour || hour < slot.maxHour - 24) return slot;
    } else if (hour >= slot.minHour && hour < slot.maxHour) {
      return slot;
    }
  }
  return null;
};

interface AggregatedTimeData {
    totalPaceSecondsPerKm: number;
    totalHeartRate: number;
    paceDataPoints: number;
    hrDataPoints: number;
    runCount: number;
}

export const getPerformanceByTimeOfDay = (runs: EnrichedRun[]): TimeOfDayPerformanceBucket[] => {
  const grouped: Record<string, AggregatedTimeData> = {};

  TIME_SLOTS.forEach(slot => {
     grouped[slot.label] = { totalPaceSecondsPerKm: 0, totalHeartRate: 0, paceDataPoints: 0, hrDataPoints: 0, runCount: 0 };
  });

  runs.forEach(run => {
    const hour = getHourFromDateString(run.start_date_local);
    const slot = getTimeSlot(hour);

    if (slot) {
      const paceMinPerKm = calculatePaceMinPerKm(run.average_speed);
      if (paceMinPerKm > 0) {
        grouped[slot.label].totalPaceSecondsPerKm += paceMinPerKm * 60;
        grouped[slot.label].paceDataPoints++;
      }
      if (run.average_heartrate) {
        grouped[slot.label].totalHeartRate += run.average_heartrate;
        grouped[slot.label].hrDataPoints++;
      }
      grouped[slot.label].runCount++;
    }
  });

  return TIME_SLOTS.map(slotConfig => {
     const data = grouped[slotConfig.label];
     return {
         label: slotConfig.label,
         avgPace: data.paceDataPoints > 0 ? (data.totalPaceSecondsPerKm / data.paceDataPoints) / 60 : null,
         avgHeartRate: data.hrDataPoints > 0 ? data.totalHeartRate / data.hrDataPoints : null,
         runCount: data.runCount,
         sortOrder: slotConfig.sortOrder,
     };
  })
  .filter(b => b.runCount > 0) // Only return buckets with data
  .sort((a,b) => a.sortOrder - b.sortOrder);
};
