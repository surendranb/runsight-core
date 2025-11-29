-- migrations/20251129000000_create_execute_sql_function.sql

-- Create a function that allows executing arbitrary SQL strings.
-- This is a powerful tool and should be used with care.
-- We are securing it to only be callable by the 'service_role' key, which our Netlify functions use.
CREATE OR REPLACE FUNCTION execute_sql(sql_string TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE sql_string;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on this function ONLY to the service_role.
-- This prevents it from being called by authenticated users from the client-side.
GRANT EXECUTE ON FUNCTION execute_sql(TEXT) TO service_role;

-- Revoke execute permission from other roles just in case.
REVOKE EXECUTE ON FUNCTION execute_sql(TEXT) FROM anon, authenticated;
