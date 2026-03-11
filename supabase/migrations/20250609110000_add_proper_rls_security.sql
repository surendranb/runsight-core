-- Lock direct browser roles out of private tables.
-- RunSight Web uses Netlify functions with the Supabase service role for all private data access.

ALTER TABLE public.runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_training_profiles DISABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.runs FROM anon, authenticated;
REVOKE ALL ON TABLE public.user_tokens FROM anon, authenticated;
REVOKE ALL ON TABLE public.user_training_profiles FROM anon, authenticated;

REVOKE ALL ON SEQUENCE public.runs_id_seq FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.user_tokens_id_seq FROM anon, authenticated;

GRANT ALL ON TABLE public.runs TO service_role;
GRANT ALL ON TABLE public.user_tokens TO service_role;
GRANT ALL ON TABLE public.user_training_profiles TO service_role;

GRANT USAGE, SELECT ON SEQUENCE public.runs_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.user_tokens_id_seq TO service_role;
