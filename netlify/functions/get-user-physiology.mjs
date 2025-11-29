import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken'; // Using ES module import
import cookie from 'cookie'; // Using ES module import

// IMPORTANT: Must be the same secret used in auth-strava.js and get-user.js
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-please-change-me-in-production';
const NODE_ENV = process.env.NODE_ENV || 'development';

export const handler = async (event) => {
  // Determine allowed origin for CORS
  const allowedOrigin = process.env.NETLIFY_SITE_URL || event.headers.origin || '*';

  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: 'METHOD_NOT_ALLOWED',
        message: 'Only GET method is allowed',
      }),
    };
  }

  // --- Authentication Check ---
  const cookies = cookie.parse(event.headers.cookie || '');
  const sessionToken = cookies['sb-session'];

  if (!sessionToken) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'AUTH_REQUIRED', message: 'No session token found' }),
    };
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(sessionToken, JWT_SECRET);
  } catch (jwtError) {
    console.error('[get-user-physiology] JWT verification failed:', jwtError.message);
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'INVALID_TOKEN', message: 'Session token is invalid or expired' }),
    };
  }

  const supabaseUid = decodedToken.sub; // Subject is the Supabase user ID

  if (!supabaseUid) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'INVALID_TOKEN', message: 'User ID missing in session token' }),
    };
  }
  // --- END Authentication Check ---

  console.log(`[get-user-physiology] Authenticated user ${supabaseUid} is fetching physiology data.`);

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'CONFIG_ERROR',
          message: 'Supabase environment variables not configured',
        }),
      };
    }

    // Pass the authenticated user's JWT to the Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${decodedToken.supabase_access_token}`
        }
      }
    });

    const { data, error } = await supabase
      .from('user_training_profiles')
      .select('*')
      .eq('user_id', supabaseUid) // IMPORTANT: Filter by authenticated user's ID
      .single();

    if (error) {
      console.error('[get-user-physiology] Error fetching data:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'DB_ERROR',
          message: 'Failed to fetch user physiology data',
          details: error.message,
        }),
      };
    }

    console.log(`[get-user-physiology] Successfully fetched data for user ${supabaseUid}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('[get-user-physiology] Critical error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch user physiology due to an unexpected server error',
        details: error.message,
      }),
    };
  }
};