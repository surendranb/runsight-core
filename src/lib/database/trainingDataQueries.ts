// Database utility functions for training data queries
import { supabase } from '../supabase';
import { EnrichedRun } from '../../types';

export interface UserTrainingProfile {
  id: string;
  user_id: string;
  resting_heart_rate?: number;
  max_heart_rate?: number;
  estimated_weight?: number;
  current_vo2_max?: number;
  current_ctl?: number;
  current_atl?: number;
  current_tsb?: number;
  optimal_temperature?: number;
  heat_tolerance_level?: 'low' | 'medium' | 'high';
  heart_rate_zones?: any;
  pace_zones?: any;
  last_calculated: string;
  created_at: string;
  updated_at: string;
}

export interface DailyTrainingLoad {
  id: string;
  user_id: string;
  date: string;
  total_distance: number;
  total_trimp: number;
  total_moving_time: number;
  run_count: number;
  created_at: string;
  updated_at: string;
}

export interface TrainingLoadSummary {
  user_id: string;
  date: string;
  total_distance: number;
  total_trimp: number;
  total_moving_time: number;
  run_count: number;
  acute_distance_load: number;
  acute_trimp_load: number;
  chronic_distance_load: number;
  chronic_trimp_load: number;
}

/**
 * Get user's training profile with physiological data
 */
export const getUserTrainingProfile = async (userId: string): Promise<UserTrainingProfile | null> => {
  const { data, error } = await supabase
    .from('user_training_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching user training profile:', error);
    throw error;
  }

  return data;
};

/**
 * Create or update user's training profile
 */
export const upsertUserTrainingProfile = async (profile: Partial<UserTrainingProfile>): Promise<UserTrainingProfile> => {
  const { data, error } = await supabase
    .from('user_training_profiles')
    .upsert({
      ...profile,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting user training profile:', error);
    throw error;
  }

  return data;
};

/**
 * Get daily training load data for a date range
 */
export const getDailyTrainingLoad = async (
  userId: string, 
  startDate: string, 
  endDate: string
): Promise<DailyTrainingLoad[]> => {
  const { data, error } = await supabase
    .from('daily_training_load')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching daily training load:', error);
    throw error;
  }

  return data || [];
};

/**
 * Get training load summary with ACWR calculations
 */
export const getTrainingLoadSummary = async (
  userId: string, 
  days: number = 42
): Promise<TrainingLoadSummary[]> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('user_training_load_summary')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching training load summary:', error);
    throw error;
  }

  return data || [];
};

/**
 * Get runs with advanced metrics for a user within a date range
 */
export const getRunsWithAdvancedMetrics = async (
  userId: string,
  startDate?: string,
  endDate?: string,
  limit?: number
): Promise<EnrichedRun[]> => {
  let query = supabase
    .from('runs')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false });

  if (startDate) {
    query = query.gte('start_date', startDate);
  }

  if (endDate) {
    query = query.lte('start_date', endDate);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = query;

  if (error) {
    console.error('Error fetching runs with advanced metrics:', error);
    throw error;
  }

  return data || [];
};

/**
 * Update run with calculated advanced metrics
 */
export const updateRunAdvancedMetrics = async (
  runId: string, 
  advancedMetrics: any
): Promise<void> => {
  const { error } = await supabase
    .from('runs')
    .update({ 
      advanced_metrics: advancedMetrics,
      updated_at: new Date().toISOString()
    })
    .eq('id', runId);

  if (error) {
    console.error('Error updating run advanced metrics:', error);
    throw error;
  }
};

/**
 * Batch update multiple runs with advanced metrics
 */
export const batchUpdateRunsAdvancedMetrics = async (
  updates: Array<{ id: string; advanced_metrics: any }>
): Promise<void> => {
  const { error } = await supabase
    .from('runs')
    .upsert(
      updates.map(update => ({
        id: update.id,
        advanced_metrics: update.advanced_metrics,
        updated_at: new Date().toISOString()
      }))
    );

  if (error) {
    console.error('Error batch updating runs advanced metrics:', error);
    throw error;
  }
};

/**
 * Get runs that need advanced metrics calculation (missing or outdated)
 */
export const getRunsNeedingCalculation = async (
  userId: string,
  limit: number = 100
): Promise<EnrichedRun[]> => {
  const { data, error } = await supabase
    .from('runs')
    .select('*')
    .eq('user_id', userId)
    .or('advanced_metrics.is.null,advanced_metrics->>"calculatedAt".lt.' + 
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // 7 days old
    .order('start_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching runs needing calculation:', error);
    throw error;
  }

  return data || [];
};

/**
 * Refresh the materialized view for training load summary
 */
export const refreshTrainingLoadSummary = async (): Promise<void> => {
  const { error } = await supabase.rpc('refresh_training_load_summary');

  if (error) {
    console.error('Error refreshing training load summary:', error);
    throw error;
  }
};

/**
 * Get user's recent training load trends for dashboard
 */
export const getRecentTrainingTrends = async (userId: string): Promise<{
  weeklyTRIMP: Array<{ week: string; trimp: number }>;
  currentACWR: { distance: number; trimp: number };
  currentFitness: { ctl: number; atl: number; tsb: number };
}> => {
  // Get last 8 weeks of data
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 56); // 8 weeks

  const trainingData = await getTrainingLoadSummary(userId, 56);
  
  if (trainingData.length === 0) {
    return {
      weeklyTRIMP: [],
      currentACWR: { distance: 0, trimp: 0 },
      currentFitness: { ctl: 0, atl: 0, tsb: 0 }
    };
  }

  // Calculate weekly TRIMP totals
  const weeklyTRIMP: Array<{ week: string; trimp: number }> = [];
  const weeklyData = new Map<string, number>();

  trainingData.forEach(day => {
    const date = new Date(day.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
    const weekKey = weekStart.toISOString().split('T')[0];
    
    weeklyData.set(weekKey, (weeklyData.get(weekKey) || 0) + day.total_trimp);
  });

  Array.from(weeklyData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8) // Last 8 weeks
    .forEach(([week, trimp]) => {
      weeklyTRIMP.push({
        week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        trimp
      });
    });

  // Get current ACWR and fitness metrics
  const latest = trainingData[trainingData.length - 1];
  const currentACWR = {
    distance: latest.chronic_distance_load > 0 ? latest.acute_distance_load / latest.chronic_distance_load : 0,
    trimp: latest.chronic_trimp_load > 0 ? latest.acute_trimp_load / latest.chronic_trimp_load : 0
  };

  // Get current fitness from user profile
  const profile = await getUserTrainingProfile(userId);
  const currentFitness = {
    ctl: profile?.current_ctl || 0,
    atl: profile?.current_atl || 0,
    tsb: profile?.current_tsb || 0
  };

  return {
    weeklyTRIMP,
    currentACWR,
    currentFitness
  };
};