// netlify/functions/get-user.js - Securely retrieves authenticated user data via cookie
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');

// IMPORTANT: Must be the same secret used in auth-strava.js
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-please-change-me-in-production';
const NODE_ENV = process.env.NODE_ENV || 'development';

exports.handler = async (event, context) => {
  // Determine allowed origin for CORS
  const allowedOrigin = process.env.NETLIFY_SITE_URL || event.headers.origin || '*';

  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', // Allow GET for session check, OPTIONS for preflight
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const {
    VITE_SUPABASE_URL: SUPABASE_URL,
    SUPABASE_SERVICE_KEY, // Use service key for admin operations
  } = process.env;

  const missingVars = [];
  if (!SUPABASE_URL) missingVars.push('VITE_SUPABASE_URL');
  if (!SUPABASE_SERVICE_KEY) missingVars.push('SUPABASE_SERVICE_KEY');
  if (!JWT_SECRET || JWT_SECRET === 'super-secret-jwt-key-please-change-me-in-production') {
      missingVars.push('JWT_SECRET (CRITICAL: CHANGE ME IN PRODUCTION!)');
  }

  if (missingVars.length > 0) {
    console.error('[get-user] Missing environment variables:', missingVars.join(', '));
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'CONFIG_ERROR', 
        message: `Missing or insecure environment variables: ${missingVars.join(', ')}` 
      }),
    };
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
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
      console.error('[get-user] JWT verification failed:', jwtError.message);
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
    
    // Fetch the user's data from Supabase auth.users or a linked profile table
    // For now, let's fetch from auth.users and user_tokens for display data
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(supabaseUid);
    
    if (userError || !userData.user) {
        console.error('[get-user] Error fetching Supabase user:', userError?.message || 'User not found');
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'USER_NOT_FOUND', message: 'Authenticated user not found' }),
        };
    }
    
    // Fetch related user_tokens data to get Strava-specific info (name, strava_id)
    const { data: userTokens, error: tokensError } = await supabaseAdmin
        .from('user_tokens')
        .select('strava_user_id, user_name, user_email')
        .eq('user_id', supabaseUid)
        .single();
        
    if (tokensError) {
        console.error('[get-user] Error fetching user tokens:', tokensError.message);
        // This might not be a critical failure, but indicates data inconsistency
        // For now, we'll proceed with basic user data
    }

    // Construct the User object to return to the frontend
    const user = {
      id: supabaseUid,
      strava_id: userTokens?.strava_user_id || null, // Strava ID from user_tokens
      name: userTokens?.user_name || userData.user.email, // Prefer name from user_tokens, fallback to email
      email: userTokens?.user_email || userData.user.email,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ user }),
    };

  } catch (error) {
    console.error('[get-user] Critical error in handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve user data' }),
    };
  }
};
