import { useMemo } from 'react';
import { EnrichedRun } from '../types';
import { calculateFitnessMetricsFromRuns } from '../lib/training/fitnessModelUtils';

export interface FitnessMetrics {
  ctl: number;
  atl: number;
  tsb: number;
  rampRate: number;
  confidence: number;
}

export interface UseFitnessMetricsResult {
  fitnessMetrics: FitnessMetrics | null;
  isLoading: boolean;
  hasEnoughData: boolean;
}

/**
 * Shared hook for calculating fitness metrics (CTL/ATL/TSB)
 * Ensures consistency across components
 */
export const useFitnessMetrics = (
  runs: EnrichedRun[],
  minRunsRequired: number = 10
): UseFitnessMetricsResult => {
  const result = useMemo(() => {
    const hasEnoughData = runs.length >= minRunsRequired;
    
    if (!hasEnoughData) {
      return {
        fitnessMetrics: null,
        isLoading: false,
        hasEnoughData: false
      };
    }

    try {
      const metrics = calculateFitnessMetricsFromRuns(runs);
      
      return {
        fitnessMetrics: metrics.value,
        isLoading: false,
        hasEnoughData: true
      };
    } catch (error) {
      console.error('Error calculating fitness metrics:', error);
      return {
        fitnessMetrics: null,
        isLoading: false,
        hasEnoughData: false
      };
    }
  }, [runs, minRunsRequired]);

  return result;
};