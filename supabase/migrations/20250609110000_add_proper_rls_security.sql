-- Add proper Row Level Security to ensure users can only see their own data
-- This is CRITICAL for multi-user security

-- Enable RLS on the runs table
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

-- Remove the overly permissive grants
REVOKE ALL ON public.runs FROM anon;
REVOKE ALL ON public.runs FROM authenticated;

-- Create secure RLS policies that ensure users can only access their own data
CREATE POLICY "Users can only see their own runs" ON public.runs
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own runs" ON public.runs
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own runs" ON public.runs
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own runs" ON public.runs
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Grant specific permissions to authenticated users only
GRANT SELECT, INSERT, UPDATE, DELETE ON public.runs TO authenticated;

-- Ensure the user_id column cannot be modified after insert (additional security)
-- Note: This would require a trigger, but for now the RLS policies above are sufficient

-- Add a comment explaining the security model
COMMENT ON TABLE public.runs IS 'Runs table with RLS enabled - users can only access their own data via auth.uid() = user_id';

-- Verify RLS is working by checking policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'runs';