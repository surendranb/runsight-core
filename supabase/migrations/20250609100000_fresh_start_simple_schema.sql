-- Fresh Start: Simple, Robust Schema
-- Drop complex tables and start with a single, simple runs table

-- Drop existing complex tables
DROP TABLE IF EXISTS public.run_splits CASCADE;
DROP TABLE IF EXISTS public.enriched_runs CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.weather CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.generate_strava_user_uuid(bigint);

-- Create simple runs table
CREATE TABLE public.runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  strava_id bigint UNIQUE NOT NULL,
  name text NOT NULL,
  distance real NOT NULL,
  moving_time integer NOT NULL,
  elapsed_time integer NOT NULL,
  start_date timestamptz NOT NULL,
  start_date_local timestamptz NOT NULL,
  start_latlng point,
  end_latlng point,
  average_speed real,
  max_speed real,
  average_heartrate real,
  max_heartrate real,
  total_elevation_gain real,
  weather_data jsonb,
  strava_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_runs_user_id ON public.runs(user_id);
CREATE INDEX idx_runs_strava_id ON public.runs(strava_id);
CREATE INDEX idx_runs_start_date ON public.runs(start_date DESC);

-- Simple permissions - no RLS initially
GRANT ALL ON public.runs TO authenticated;
GRANT ALL ON public.runs TO anon;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Comment on table
COMMENT ON TABLE public.runs IS 'Simple runs table with all data in one place - weather and strava data stored as JSONB';