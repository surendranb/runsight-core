/**
 * Outlier Detection and Filtering for Run Data
 * 
 * This module provides functions to detect and filter out runs with unrealistic
 * pace values that are likely caused by GPS errors or data issues.
 */

import { EnrichedRun } from '../types';

// Constants for pace outlier detection (in seconds per kilometer)
const MIN_REALISTIC_PACE = 300;  // 5:00 min/km (fast but realistic)
const MAX_REALISTIC_PACE = 720;  // 12:00 min/km (slow but realistic)

// Constants for distance outlier detection
const MIN_REALISTIC_DISTANCE = 100;  // 100 meters (very short, but could be a quick test)
const MAX_REALISTIC_DISTANCE = 100000;  // 100km (very long, but possible for ultramarathoners)

// Constants for elevation gain outlier detection
const MAX_ELEVATION_GAIN_RATIO = 0.5;  // Maximum elevation gain as a ratio of distance

/**
 * Calculate pace in seconds per kilometer for a run
 */
export function calculatePace(run: EnrichedRun): number {
  if (!run.distance || run.distance <= 0 || !run.moving_time || run.moving_time <= 0) {
    return 0;
  }
  
  // Pace = time / distance (in seconds per kilometer)
  return run.moving_time / (run.distance / 1000);
}

/**
 * Check if a run has a realistic pace (between 5:00 and 12:00 min/km)
 */
export function hasRealisticPace(run: EnrichedRun): boolean {
  const pace = calculatePace(run);
  
  // If pace calculation failed, consider it unrealistic
  if (pace <= 0) return false;
  
  return pace >= MIN_REALISTIC_PACE && pace <= MAX_REALISTIC_PACE;
}

/**
 * Check if a run has a realistic distance
 */
export function hasRealisticDistance(run: EnrichedRun): boolean {
  return run.distance >= MIN_REALISTIC_DISTANCE && run.distance <= MAX_REALISTIC_DISTANCE;
}

/**
 * Check if a run has realistic elevation data
 * Some GPS errors result in extreme elevation gains
 */
export function hasRealisticElevation(run: EnrichedRun): boolean {
  // If no elevation data, consider it realistic
  if (!run.total_elevation_gain) return true;
  
  // Check if elevation gain is unrealistically high compared to distance
  return run.total_elevation_gain / run.distance <= MAX_ELEVATION_GAIN_RATIO;
}

/**
 * Check if a run is an outlier based on multiple criteria
 */
export function isOutlier(run: EnrichedRun): boolean {
  // A run is an outlier if it fails any of the reality checks
  return !hasRealisticPace(run) || !hasRealisticDistance(run) || !hasRealisticElevation(run);
}

/**
 * Filter out outlier runs from an array
 */
export function filterOutliers(runs: EnrichedRun[]): EnrichedRun[] {
  return runs.filter(run => !isOutlier(run));
}

/**
 * Get statistics about filtered outliers
 */
export function getOutlierStats(runs: EnrichedRun[]): {
  total: number;
  outliers: number;
  validRuns: number;
  outlierReasons: {
    unrealisticPace: number;
    unrealisticDistance: number;
    unrealisticElevation: number;
  };
} {
  const stats = {
    total: runs.length,
    outliers: 0,
    validRuns: 0,
    outlierReasons: {
      unrealisticPace: 0,
      unrealisticDistance: 0,
      unrealisticElevation: 0
    }
  };

  runs.forEach(run => {
    let isValid = true;
    
    if (!hasRealisticPace(run)) {
      stats.outlierReasons.unrealisticPace++;
      isValid = false;
    }
    
    if (!hasRealisticDistance(run)) {
      stats.outlierReasons.unrealisticDistance++;
      isValid = false;
    }
    
    if (!hasRealisticElevation(run)) {
      stats.outlierReasons.unrealisticElevation++;
      isValid = false;
    }
    
    if (isValid) {
      stats.validRuns++;
    } else {
      stats.outliers++;
    }
  });

  return stats;
}

/**
 * Format pace for display (seconds per km to MM:SS format)
 */
export function formatPace(secondsPerKm: number): string {
  if (!secondsPerKm || secondsPerKm <= 0) return '-';
  
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.floor(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Get detailed outlier information for debugging
 */
export function getOutlierDetails(runs: EnrichedRun[]): {
  outlierRuns: Array<{
    run: EnrichedRun;
    reasons: string[];
    pace: number;
  }>;
} {
  const outlierRuns: Array<{
    run: EnrichedRun;
    reasons: string[];
    pace: number;
  }> = [];

  runs.forEach(run => {
    const reasons: string[] = [];
    const pace = calculatePace(run);
    
    if (!hasRealisticPace(run)) {
      if (pace > 0) {
        reasons.push(`Unrealistic pace: ${formatPace(pace)} (should be between 5:00-12:00 min/km)`);
      } else {
        reasons.push('Invalid pace calculation (zero or negative values)');
      }
    }
    
    if (!hasRealisticDistance(run)) {
      reasons.push(`Unrealistic distance: ${(run.distance / 1000).toFixed(2)}km`);
    }
    
    if (!hasRealisticElevation(run)) {
      reasons.push(`Unrealistic elevation: ${run.total_elevation_gain}m gain over ${(run.distance / 1000).toFixed(2)}km`);
    }
    
    if (reasons.length > 0) {
      outlierRuns.push({
        run,
        reasons,
        pace
      });
    }
  });

  return { outlierRuns };
}