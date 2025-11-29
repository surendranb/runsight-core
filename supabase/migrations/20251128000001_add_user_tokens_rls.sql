-- Add user_id to user_tokens table and enable RLS
-- This migration ensures the user_tokens table is properly linked to auth.users and secured

-- Add user_id column to user_tokens if it doesn't exist
-- This assumes user_tokens table is already created elsewhere
ALTER TABLE public.user_tokens ADD COLUMN IF NOT EXISTS user_id UUID;

-- Link user_id to auth.users table
-- This is a soft link as we cannot directly add a foreign key constraint to auth.users from public schema
-- It is critical that user_id in user_tokens always corresponds to a valid auth.users.id

-- Update existing user_tokens records to link to auth.users
-- This assumes that strava_user_id is somehow linked to auth.users.id during initial authentication
-- Or, if a user logs in via Strava and their user_id is not yet set, it will be updated in auth-strava function
UPDATE public.user_tokens ut
SET user_id = au.id
FROM auth.users au
WHERE ut.strava_user_id = (au.raw_user_meta_data->>'strava_id')::bigint
  AND ut.user_id IS NULL;

-- Make user_id NOT NULL after initial population (if not already done)
ALTER TABLE public.user_tokens ALTER COLUMN user_id SET NOT NULL;

-- Add unique constraint for user_id to ensure one set of tokens per Supabase user
ALTER TABLE public.user_tokens ADD CONSTRAINT unique_user_id UNIQUE (user_id);


-- Enable RLS on the user_tokens table
ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for user_tokens
CREATE POLICY "Users can only see their own Strava tokens" ON public.user_tokens
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Strava tokens" ON public.user_tokens
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Strava tokens" ON public.user_tokens
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Strava tokens" ON public.user_tokens
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Grant specific permissions to authenticated users only (best practice after RLS)
REVOKE ALL ON public.user_tokens FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_tokens TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.user_tokens IS 'Stores Strava access/refresh tokens securely per Supabase user, with full RLS protection.';
