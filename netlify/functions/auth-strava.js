// netlify/functions/auth-strava.js - Secure Cookie-based Authentication
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const fetch = require('node-fetch'); // Ensure node-fetch is available in Netlify Function environment

// IMPORTANT: Replace with a strong, random key in Netlify Environment Variables
// openssl rand -base64 32 (for HMAC SHA256)
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-please-change-me-in-production';
const NODE_ENV = process.env.NODE_ENV || 'development';

exports.handler = async (event, context) => {
  // Determine allowed origin for CORS (more secure than '*')
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
    VITE_STRAVA_REDIRECT_URI: STRAVA_REDIRECT_URI_ENV, // This should be the frontend callback URL
    VITE_SUPABASE_URL: SUPABASE_URL,
    SUPABASE_SERVICE_KEY, // Supabase service role key for admin operations
  } = process.env;

  // Use the env var for redirect URI, fallback to a sensible default if testing locally
  const STRAVA_REDIRECT_URI = STRAVA_REDIRECT_URI_ENV || 'http://localhost:8888/auth/callback';
  // Frontend URL for redirect after successful authentication
  const FRONTEND_URL = process.env.VITE_FRONTEND_URL || 'http://localhost:8888';

  const missingVars = [];
  if (!STRAVA_CLIENT_ID) missingVars.push('VITE_STRAVA_CLIENT_ID');
  if (!STRAVA_CLIENT_SECRET) missingVars.push('VITE_STRAVA_CLIENT_SECRET');
  if (!STRAVA_REDIRECT_URI_ENV) missingVars.push('VITE_STRAVA_REDIRECT_URI');
  if (!SUPABASE_URL) missingVars.push('VITE_SUPABASE_URL');
  if (!SUPABASE_SERVICE_KEY) missingVars.push('SUPABASE_SERVICE_KEY'); // Ensure service key is present
  if (!JWT_SECRET || JWT_SECRET === 'super-secret-jwt-key-please-change-me-in-production') {
      missingVars.push('JWT_SECRET (CRITICAL: CHANGE ME IN PRODUCTION!)');
  }

  if (missingVars.length > 0) {
    console.error('[auth-strava] Missing environment variables:', missingVars.join(', '));
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'CONFIG_ERROR', 
        message: `Missing or insecure environment variables: ${missingVars.join(', ')}` 
      }),
    };
  }

  // Initialize Supabase client with SERVICE_ROLE_KEY for admin operations (e.g., getting auth.uid())
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
        `scope=read,activity:read_all`; // Request necessary Strava scopes

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
          body: JSON.stringify({ 
            error: 'MISSING_CODE', 
            message: 'Authorization code is required' 
          }) 
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
      const userEmail = stravaData.athlete.email || null; // Strava may not always return email

      console.log(`[auth-strava] Strava token exchange successful for Strava user ${stravaUserId}`);

      // --- 2. Sign in/up to Supabase with Strava tokens ---
      // This will create a user in auth.users or link an existing one
      console('[auth-strava] Signing in/up to Supabase with Strava...');
      const { data: supabaseAuth, error: authError } = await supabaseAdmin.auth.signInWithProvider('strava', {
        access_token: stravaData.access_token,
        refresh_token: stravaData.refresh_token,
        expires_in: stravaData.expires_in,
        // The redirect_uri here should match the one configured in Strava and Netlify for the frontend callback
        // However, since we're handling the full exchange server-side, it's less critical for the signInWithProvider call itself
        // The important part is that the frontend will eventually redirect to a URL that calls this Netlify function.
        // We ensure the original redirect_uri is used to ensure Strava sends us back to the correct place.
        redirect_to: FRONTEND_URL + '/auth/callback' // The URL the user sees in the browser
      });
      
      if (authError || !supabaseAuth.session || !supabaseAuth.user) {
        console.error('[auth-strava] Supabase Auth error:', authError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'SUPABASE_AUTH_FAILED',
            message: 'Failed to authenticate user with Supabase',
            details: authError?.message || 'No session or user returned'
          })
        };
      }

      const supabaseUser = supabaseAuth.user;
      const supabaseUid = supabaseUser.id; // This is the auth.uid()
      const supabaseAccessToken = supabaseAuth.session.access_token; // Supabase JWT for the user

      console.log(`[auth-strava] Supabase authentication successful for user ${supabaseUid}`);

      // --- 3. Store Strava tokens in user_tokens table, linked to auth.uid() ---
      // Assuming 'user_tokens' has a 'user_id' column of type UUID referencing auth.users(id)
      console.log(`[auth-strava] Storing/updating Strava tokens for ${supabaseUid}...`);
      const { error: upsertTokenError } = await supabaseAdmin
        .from('user_tokens')
        .upsert({
          user_id: supabaseUid, // Link to auth.users.id
          strava_user_id: stravaUserId,
          strava_access_token: stravaData.access_token,
          strava_refresh_token: stravaData.refresh_token,
          strava_expires_at: stravaData.expires_at,
          user_name: userName, // Store for convenience, not primary user info
          user_email: userEmail
        }, { onConflict: 'user_id' }); // Conflict on user_id to ensure one record per Supabase user

      if (upsertTokenError) {
        console.error('[auth-strava] Error upserting user tokens:', upsertTokenError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'DB_TOKEN_UPSERT_ERROR',
            message: 'Failed to store/update Strava tokens',
            details: upsertTokenError.message
          })
        };
      }

      console.log(`[auth-strava] Strava tokens stored successfully for ${supabaseUid}.`);

      // --- 4. Generate JWT for the client session ---
      // This JWT will contain the Supabase user's ID (auth.uid()) and their Supabase access token
      const tokenPayload = { 
        sub: supabaseUid, // Subject of the token is the Supabase user ID
        supabase_access_token: supabaseAccessToken, // Include Supabase token for client-side API calls to Supabase
        name: userName,
        email: userEmail
      };
      const sessionToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' }); // Short-lived session token

      // --- 5. Set secure HttpOnly cookie ---
      const sessionCookie = cookie.serialize('sb-session', sessionToken, {
        httpOnly: true, // Prevents client-side JS access
        secure: NODE_ENV === 'production', // Only send over HTTPS in production
        sameSite: 'Lax', // Protects against some CSRF attacks, allows cross-site initial GET
        path: '/', // Available across the entire site
        maxAge: 60 * 60 * 1, // 1 hour (matches JWT expiry)
      });

      // --- 6. Redirect to frontend with success ---
      // We will redirect to the frontend callback URL with a success message
      return {
        statusCode: 302, // Redirect
        headers: {
          ...headers, // Include CORS headers for preflight requests if needed
          'Set-Cookie': sessionCookie,
          'Location': `${FRONTEND_URL}/auth/callback?status=success`, // Redirect to frontend
        },
        body: '', // No body needed for redirect
      };
    }

    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ 
        error: 'METHOD_NOT_ALLOWED', 
        message: 'Method not allowed' 
      }) 
    };

  } catch (error) {
    console.error('[auth-strava] Critical error in handler:', error);
    // Ensure CORS headers are always present even on error
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