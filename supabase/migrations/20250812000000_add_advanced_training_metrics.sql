-- Add advanced training metrics infrastructure
-- This migration adds support for advanced training load calculations and user physiological data

-- Add advanced_metrics JSONB column to runs table for storing calculated metrics
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS advanced_metrics JSONB;

-- Create user training profiles table for physiological data and calculated fitness metrics
CREATE TABLE IF NOT EXISTS public.user_training_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Physiological Data
  resting_heart_rate integer CHECK (resting_heart_rate > 30 AND resting_heart_rate < 100),
  max_heart_rate integer CHECK (max_heart_rate > 120 AND max_heart_rate < 250),
  estimated_weight real CHECK (estimated_weight > 30 AND estimated_weight < 200), -- kg
  
  -- Current Fitness Metrics (calculated values)
  current_vo2_max real CHECK (current_vo2_max > 20 AND current_vo2_max < 90),
  current_ctl real CHECK (current_ctl >= 0), -- Chronic Training Load
  current_atl real CHECK (current_atl >= 0), -- Acute Training Load  
  current_tsb real, -- Training Stress Balance (can be negative)
  
  -- Environmental Profile
  optimal_temperature real CHECK (optimal_temperature > -20 AND optimal_temperature < 50),
  heat_tolerance_level text CHECK (heat_tolerance_level IN ('low', 'medium', 'high')),
  
  -- Training Zones (stored as JSONB for flexibility)
  heart_rate_zones jsonb,
  pace_zones jsonb,
  
  -- Metadata
  last_calculated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Create daily training load summary table for efficient ACWR calculations
CREATE TABLE IF NOT EXISTS public.daily_training_load (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  
  -- Daily aggregated metrics
  total_distance real DEFAULT 0 CHECK (total_distance >= 0),
  total_trimp real DEFAULT 0 CHECK (total_trimp >= 0),
  total_moving_time integer DEFAULT 0 CHECK (total_moving_time >= 0),
  run_count integer DEFAULT 0 CHECK (run_count >= 0),
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, date)
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_runs_advanced_metrics ON public.runs USING GIN (advanced_metrics);
CREATE INDEX IF NOT EXISTS idx_user_training_profiles_user_id ON public.user_training_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_training_profiles_last_calculated ON public.user_training_profiles(last_calculated DESC);
CREATE INDEX IF NOT EXISTS idx_daily_training_load_user_date ON public.daily_training_load(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_training_load_date_range ON public.daily_training_load(user_id, date) WHERE date >= CURRENT_DATE - INTERVAL '42 days';

-- Create materialized view for efficient ACWR calculations
CREATE MATERIALIZED VIEW IF NOT EXISTS public.user_training_load_summary AS
SELECT 
  user_id,
  date,
  total_distance,
  total_trimp,
  total_moving_time,
  run_count,
  -- 7-day acute load (for ACWR)
  AVG(total_distance) OVER (
    PARTITION BY user_id 
    ORDER BY date 
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) as acute_distance_load,
  AVG(total_trimp) OVER (
    PARTITION BY user_id 
    ORDER BY date 
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) as acute_trimp_load,
  -- 28-day chronic load (for ACWR)
  AVG(total_distance) OVER (
    PARTITION BY user_id 
    ORDER BY date 
    ROWS BETWEEN 27 PRECEDING AND CURRENT ROW
  ) as chronic_distance_load,
  AVG(total_trimp) OVER (
    PARTITION BY user_id 
    ORDER BY date 
    ROWS BETWEEN 27 PRECEDING AND CURRENT ROW
  ) as chronic_trimp_load
FROM public.daily_training_load
WHERE date >= CURRENT_DATE - INTERVAL '42 days';

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_training_load_summary_user_date 
ON public.user_training_load_summary(user_id, date);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_training_load_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_training_load_summary;
END;
$$ LANGUAGE plpgsql;

-- Function to update daily training load when runs are inserted/updated
CREATE OR REPLACE FUNCTION update_daily_training_load()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update daily training load summary
  INSERT INTO public.daily_training_load (user_id, date, total_distance, total_trimp, total_moving_time, run_count)
  VALUES (
    NEW.user_id,
    DATE(NEW.start_date_local),
    NEW.distance,
    COALESCE((NEW.advanced_metrics->>'trimp')::real, 0),
    NEW.moving_time,
    1
  )
  ON CONFLICT (user_id, date) 
  DO UPDATE SET
    total_distance = daily_training_load.total_distance + NEW.distance - COALESCE(OLD.distance, 0),
    total_trimp = daily_training_load.total_trimp + COALESCE((NEW.advanced_metrics->>'trimp')::real, 0) - COALESCE((OLD.advanced_metrics->>'trimp')::real, 0),
    total_moving_time = daily_training_load.total_moving_time + NEW.moving_time - COALESCE(OLD.moving_time, 0),
    run_count = CASE 
      WHEN TG_OP = 'INSERT' THEN daily_training_load.run_count + 1
      ELSE daily_training_load.run_count
    END,
    updated_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle run deletions
CREATE OR REPLACE FUNCTION handle_run_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Update daily training load summary
  UPDATE public.daily_training_load 
  SET 
    total_distance = total_distance - OLD.distance,
    total_trimp = total_trimp - COALESCE((OLD.advanced_metrics->>'trimp')::real, 0),
    total_moving_time = total_moving_time - OLD.moving_time,
    run_count = run_count - 1,
    updated_at = now()
  WHERE user_id = OLD.user_id AND date = DATE(OLD.start_date_local);
  
  -- Delete the daily record if no runs remain
  DELETE FROM public.daily_training_load 
  WHERE user_id = OLD.user_id 
    AND date = DATE(OLD.start_date_local) 
    AND run_count <= 0;
    
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic daily training load updates
DROP TRIGGER IF EXISTS trigger_update_daily_training_load ON public.runs;
CREATE TRIGGER trigger_update_daily_training_load
  AFTER INSERT OR UPDATE ON public.runs
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_training_load();

DROP TRIGGER IF EXISTS trigger_handle_run_deletion ON public.runs;
CREATE TRIGGER trigger_handle_run_deletion
  AFTER DELETE ON public.runs
  FOR EACH ROW
  EXECUTE FUNCTION handle_run_deletion();

-- Set up RLS policies for new tables
ALTER TABLE public.user_training_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_training_load ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_training_profiles
CREATE POLICY "Users can view their own training profile" ON public.user_training_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training profile" ON public.user_training_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training profile" ON public.user_training_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training profile" ON public.user_training_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for daily_training_load
CREATE POLICY "Users can view their own training load data" ON public.daily_training_load
  FOR SELECT USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.user_training_profiles TO authenticated;
GRANT ALL ON public.daily_training_load TO authenticated;
GRANT SELECT ON public.user_training_load_summary TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.user_training_profiles IS 'Stores user physiological data and calculated fitness metrics for advanced training analysis';
COMMENT ON TABLE public.daily_training_load IS 'Daily aggregated training load data for efficient ACWR and CTL/ATL calculations';
COMMENT ON MATERIALIZED VIEW public.user_training_load_summary IS 'Pre-calculated training load metrics with rolling averages for ACWR analysis';
COMMENT ON COLUMN public.runs.advanced_metrics IS 'JSONB storage for calculated training metrics (TRIMP, VO2 max estimates, environmental adjustments, etc.)';