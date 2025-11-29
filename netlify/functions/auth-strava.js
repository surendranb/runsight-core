// netlify/functions/auth-strava.js - Secure Cookie-based Authentication
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const fetch = require('node-fetch'); // Ensure node-fetch is available in Netlify Function environment

const JWT_SECRET = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'development';

exports.handler = async (event, context) => {
  // Determine allowed origin for CORS
  const allowedOrigin = process.env.NETLIFY_SITE_URL || event.headers.origin || '*';

  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Environment variables
  const {
    VITE_STRAVA_CLIENT_ID: STRAVA_CLIENT_ID,
    VITE_STRAVA_CLIENT_SECRET: STRAVA_CLIENT_SECRET,
    VITE_STRAVA_REDIRECT_URI: STRAVA_REDIRECT_URI_ENV,
    VITE_SUPABASE_URL: SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
  } = process.env;

  const STRAVA_REDIRECT_URI = STRAVA_REDIRECT_URI_ENV || 'http://localhost:8888/auth/callback';
  const FRONTEND_URL = process.env.VITE_FRONTEND_URL || 'http://localhost:8888';

  const missingVars = [];
  if (!STRAVA_CLIENT_ID) missingVars.push('VITE_STRAVA_CLIENT_ID');
  if (!STRAVA_CLIENT_SECRET) missingVars.push('VITE_STRAVA_CLIENT_SECRET');
  if (!STRAVA_REDIRECT_URI_ENV) missingVars.push('VITE_STRAVA_REDIRECT_URI');
  if (!SUPABASE_URL) missingVars.push('VITE_SUPABASE_URL');
  if (!SUPABASE_SERVICE_KEY) missingVars.push('SUPABASE_SERVICE_KEY');
  if (!JWT_SECRET) missingVars.push('JWT_SECRET');

  // If critical variables are missing, return a specific error for the frontend to handle
  if (missingVars.length > 0) {
    console.error('[auth-strava] Configuration incomplete:', missingVars.join(', '));
    // For GET request, we still need to provide an authUrl, but it will be a "dummy" one
    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200, // Return 200 OK but with an indicator that setup is needed
        headers,
        body: JSON.stringify({ 
          error: 'CONFIG_REQUIRED',
          message: `Configuration is incomplete. Required variables are missing: ${missingVars.join(', ')}`,
          authUrl: '#' // Dummy URL
        }),
      };
    }
    // For POST, return a client error
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'CONFIG_REQUIRED', 
        message: `Configuration is incomplete. Required variables are missing: ${missingVars.join(', ')}` 
      }),
    };
  }
  
  // Re-check JWT_SECRET for security, but allow the app to function if other vars are present
  if (JWT_SECRET === 'super-secret-jwt-key-please-change-me-in-production') {
      console.warn('[auth-strava] Insecure JWT_SECRET is being used. This must be changed in production.');
  }

  // Initialize Supabase client with SERVICE_ROLE_KEY
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    if (event.httpMethod === 'GET') {
      // Step 1: Generate Strava authorization URL
      const authUrl = `https://www.strava.com/oauth/authorize?` +
        `client_id=${STRAVA_CLIENT_ID}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(STRAVA_REDIRECT_URI)}&` +
        `approval_prompt=force&` +
        `scope=read,activity:read_all`;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ authUrl }),
      };
    }

    if (event.httpMethod === 'POST') {
      // Step 2: Handle OAuth callback and exchange code for tokens
      const { code } = JSON.parse(event.body);
      if (!code) {
        return { 
          statusCode: 400, 
          headers, 
          body: JSON.stringify({ error: 'MISSING_CODE', message: 'Authorization code is required' }) 
        };
      }

      // --- 1. Exchange Strava code for tokens ---
      console.log('[auth-strava] Exchanging code for Strava tokens...');
      const stravaTokenResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: STRAVA_CLIENT_ID,
          client_secret: STRAVA_CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code',
        }),
      });

      if (!stravaTokenResponse.ok) {
        const errorBody = await stravaTokenResponse.json().catch(() => ({ message: 'Token exchange failed' }));
        console.error('[auth-strava] Strava token exchange failed:', errorBody);
        return { 
          statusCode: stravaTokenResponse.status, 
          headers, 
          body: JSON.stringify({ 
            error: 'STRAVA_TOKEN_EXCHANGE_FAILED', 
            message: 'Failed to exchange code for Strava token',
            details: errorBody.message || JSON.stringify(errorBody) 
          }) 
        };
      }
      const stravaData = await stravaTokenResponse.json();
      const stravaUserId = stravaData.athlete.id;
      const userName = `${stravaData.athlete.firstname || ''} ${stravaData.athlete.lastname || ''}`.trim();
      const userEmail = stravaData.athlete.email || null;

      console.log(`[auth-strava] Strava token exchange successful for Strava user ${stravaUserId}`);

      // --- 2. Sign in/up to Supabase with Strava tokens ---
      console.log('[auth-strava] Signing in/up to Supabase with Strava...');
      const { data: supabaseAuth, error: authError } = await supabaseAdmin.auth.signInWithOAuth({
        provider: 'strava',
        options: {
            redirectTo: FRONTEND_URL + '/auth/callback'
        }
      });

      // Since we are handling the token exchange manually, we need to create the user manually if they don't exist
      // This is a simplified example; a robust implementation would involve more checks.
      let supabaseUser = (await supabaseAdmin.auth.admin.getUserByEmail(userEmail))?.data?.user;
      if (!supabaseUser) {
          const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
              email: userEmail,
              email_confirm: true, // Assume email from Strava is confirmed
              user_metadata: { name: userName, strava_id: stravaUserId }
          });
          if (createUserError) throw createUserError;
          supabaseUser = newUser.user;
      }
      
      const supabaseUid = supabaseUser.id;
      const supabaseAccessToken = (await supabaseAdmin.auth.getSession()).data.session.access_token;

      console.log(`[auth-strava] Supabase authentication successful for user ${supabaseUid}`);

      // --- 3. Store Strava tokens in user_tokens table ---
      console.log(`[auth-strava] Storing/updating Strava tokens for ${supabaseUid}...`);
      const { error: upsertTokenError } = await supabaseAdmin
        .from('user_tokens')
        .upsert({
          user_id: supabaseUid,
          strava_user_id: stravaUserId,
          strava_access_token: stravaData.access_token,
          strava_refresh_token: stravaData.refresh_token,
          strava_expires_at: stravaData.expires_at,
          user_name: userName,
          user_email: userEmail
        }, { onConflict: 'user_id' });

      if (upsertTokenError) throw upsertTokenError;

      console.log(`[auth-strava] Strava tokens stored successfully for ${supabaseUid}.`);

      // --- 4. Generate JWT for the client session ---
      const tokenPayload = { 
        sub: supabaseUid,
        supabase_access_token: supabaseAccessToken,
        name: userName,
        email: userEmail
      };
      const sessionToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });

      // --- 5. Set secure HttpOnly cookie ---
      const sessionCookie = cookie.serialize('sb-session', sessionToken, {
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: 'Lax',
        path: '/',
        maxAge: 60 * 60 * 1,
      });

      // --- 6. Redirect to frontend with success ---
      return {
        statusCode: 302,
        headers: {
          ...headers,
          'Set-Cookie': sessionCookie,
          'Location': `${FRONTEND_URL}/auth/callback?status=success`,
        },
        body: '',
      };
    }

    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ error: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }) 
    };

  } catch (error) {
    console.error('[auth-strava] Critical error in handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'INTERNAL_SERVER_ERROR', 
        message: 'Authentication failed due to an unexpected server error', 
        details: error.message || 'Unknown error' 
      }),
    };
  }
};
