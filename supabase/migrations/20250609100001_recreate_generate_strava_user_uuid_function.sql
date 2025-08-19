-- Recreate the function to generate a deterministic UUID for Strava users
-- This ensures auth-strava.js can correctly map Strava users to Supabase auth users.

CREATE OR REPLACE FUNCTION public.generate_strava_user_uuid(strava_id bigint)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT uuid_generate_v5(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid,
    'strava_user_' || strava_id::text
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.generate_strava_user_uuid TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_strava_user_uuid TO anon;

COMMENT ON FUNCTION public.generate_strava_user_uuid IS 'Generates a deterministic UUID v5 for a given Strava user ID, ensuring consistent user mapping.';
