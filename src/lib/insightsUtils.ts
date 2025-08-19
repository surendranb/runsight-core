// src/lib/insightsUtils.ts
/**
 * Calculates pace in minutes per kilometer (min/km).
 * @param averageSpeedMps Average speed in meters per second.
 * @returns Pace in min/km. Returns 0 if speed is 0 or not provided.
 */
export const calculatePaceMinPerKm = (averageSpeedMps?: number): number => {
  if (!averageSpeedMps || averageSpeedMps === 0) {
    return 0;
  }
  return (1 / averageSpeedMps) * (1000 / 60);
};

/**
 * Extracts the hour from a local date string.
 * @param dateString ISO date string or a string recognized by Date constructor.
 * @returns The hour of the day (0-23). Returns null if dateString is invalid.
 */
export const getHourFromDateString = (dateString?: string): number | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  return date.getHours();
};

export const convertSecondsToHoursMinutes = (totalSeconds: number): { hours: number; minutes: number } => {
  if (totalSeconds < 0) {
    return { hours: 0, minutes: 0 };
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return { hours, minutes };
};
