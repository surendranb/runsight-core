-- Fix critical RLS gaps for daily_training_load table
-- This migration adds missing INSERT, UPDATE, and DELETE RLS policies

-- Ensure RLS is enabled on public.daily_training_load (should be from previous migration, but good to ensure)
ALTER TABLE public.daily_training_load ENABLE ROW LEVEL SECURITY;

-- Add missing RLS policies for INSERT, UPDATE, and DELETE
CREATE POLICY "Users can insert their own daily training load" ON public.daily_training_load
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily training load" ON public.daily_training_load
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily training load" ON public.daily_training_load
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Optional: Revoke ALL permissions and re-grant specific ones to enforce least privilege
-- This is a more aggressive step, but good practice if not done previously
REVOKE ALL ON public.daily_training_load FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_training_load TO authenticated;
GRANT SELECT ON public.user_training_load_summary TO authenticated; -- Ensure materialized view is still selectable

-- Re-comment on table for clarity
COMMENT ON TABLE public.daily_training_load IS 'Daily aggregated training load data for efficient ACWR and CTL/ATL calculations, with full RLS protection.';
