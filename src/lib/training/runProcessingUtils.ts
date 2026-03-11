// Run Processing Utilities - Add advanced metrics during data sync
import { EnrichedRun, UserPhysiologyData, AdvancedRunMetrics } from '../../types';
import { calculateTRIMP, getDefaultPhysiologyData } from './trainingLoadUtils';
import { calculatePSI } from './psiUtils';
import { calculatePaceDecoupling } from './paceDecouplingUtils';

/**
 * Process a run and add advanced training metrics
 */
export const processRunWithAdvancedMetrics = (
  run: EnrichedRun,
  userPhysiology?: UserPhysiologyData
): EnrichedRun => {
  try {
    // Use default physiology if not provided
    const physiology = userPhysiology || getDefaultPhysiologyData();
    
    // Calculate TRIMP
    const trimpResult = calculateTRIMP(run, physiology);
    
    // Calculate PSI (Physiological Strain Index)
    const psiResult = calculatePSI(run, physiology);
    
    // Calculate Pace Decoupling for long runs (60+ minutes)
    const paceDecouplingResult = calculatePaceDecoupling(run, physiology);
    
    // Determine overall data quality based on all calculations
    const overallDataQuality = Math.min(
      trimpResult.dataQuality.qualityScore,
      psiResult.dataQuality.qualityScore,
      paceDecouplingResult?.dataQuality.qualityScore || 100 // Don't penalize if not applicable
    );
    
    // Create advanced metrics object
    const advancedMetrics: AdvancedRunMetrics = {
      trimp: trimpResult.value,
      psiScore: psiResult.psiScore,
      paceDecoupling: paceDecouplingResult?.decouplingPercentage,
      dataQuality: overallDataQuality > 80 ? 'high' : 
                   overallDataQuality > 60 ? 'medium' : 'low',
      calculatedAt: new Date().toISOString(),
      calculationVersion: '1.2.0', // Updated version to include pace decoupling
      confidenceScore: Math.min(
        trimpResult.confidence, 
        psiResult.confidence,
        paceDecouplingResult?.confidence || 1.0 // Don't penalize if not applicable
      )
    };

    // Add estimated TRIMP if using pace-based calculation
    if (trimpResult.calculationMethod.includes('Estimated')) {
      advancedMetrics.estimatedTRIMP = trimpResult.value;
      delete advancedMetrics.trimp; // Use estimatedTRIMP instead
    }

    // Return run with advanced metrics
    return {
      ...run,
      advanced_metrics: advancedMetrics
    };
  } catch (error) {
    console.error('Error processing run with advanced metrics:', error);
    return run; // Return original run if processing fails
  }
};

/**
 * Batch process multiple runs with advanced metrics
 */
export const batchProcessRunsWithAdvancedMetrics = (
  runs: EnrichedRun[],
  userPhysiology?: UserPhysiologyData
): EnrichedRun[] => {
  return runs.map(run => processRunWithAdvancedMetrics(run, userPhysiology));
};

/**
 * Check if a run needs advanced metrics calculation
 */
export const needsAdvancedMetricsCalculation = (run: EnrichedRun): boolean => {
  // Check if advanced_metrics exists and is recent (within last 7 days)
  if (!run.advanced_metrics) return true;
  
  const calculatedAt = new Date(run.advanced_metrics.calculatedAt);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  return calculatedAt < weekAgo;
};

/**
 * Get runs that need advanced metrics calculation
 */
export const getRunsNeedingCalculation = (runs: EnrichedRun[]): EnrichedRun[] => {
  return runs.filter(needsAdvancedMetricsCalculation);
};