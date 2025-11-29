// netlify/functions/auth-strava.js - Secure Cookie-based Authentication
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const fetch = require('node-fetch');
// const { ensureSchemaIsReady } = require('./lib/db-setup'); // REMOVED: Silent setup is no longer used

const JWT_SECRET = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'development';

exports.handler = async (event, context) => {
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

  const {
    VITE_STRAVA_CLIENT_ID: STRAVA_CLIENT_ID,
    VITE_STRAVA_CLIENT_SECRET: STRAVA_CLIENT_SECRET,
    VITE_STRAVA_REDIRECT_URI: STRAVA_REDIRECT_URI_ENV,
    VITE_SUPABASE_URL: SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
  } = process.env;

  const STRAVA_REDIRECT_URI = STRAVA_REDIRECT_URI_ENV || 'http://localhost:8888/auth/callback';
  const FRONTEND_URL = process.env.VITE_FRONTEND_URL || 'http://localhost:8888';

  const missingVars = ['VITE_STRAVA_CLIENT_ID', 'VITE_STRAVA_CLIENT_SECRET', 'VITE_STRAVA_REDIRECT_URI', 'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'JWT_SECRET']
    .filter(key => !process.env[key]);
    
  if (missingVars.length > 0) {
    const errorBody = { 
      error: 'CONFIG_REQUIRED', 
      message: `Configuration is incomplete. Required variables are missing: ${missingVars.join(', ')}`
    };
    if (event.httpMethod === 'GET') {
      return { statusCode: 200, headers, body: JSON.stringify({ ...errorBody, authUrl: '#' }) };
    }
    return { statusCode: 400, headers, body: JSON.stringify(errorBody) };
  }
  
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // The silent DB setup call has been removed from here.
    // The new flow requires the frontend to detect missing tables and guide the user.

    if (event.httpMethod === 'GET') {
      const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(STRAVA_REDIRECT_URI)}&approval_prompt=force&scope=read,activity:read_all`;
      return { statusCode: 200, headers, body: JSON.stringify({ authUrl }) };
    }

    if (event.httpMethod === 'POST') {
      const { code } = JSON.parse(event.body);
      if (!code) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'MISSING_CODE', message: 'Authorization code is required' }) };
      }

      console.log('[auth-strava] Exchanging code for Strava tokens...');
      const stravaTokenResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: STRAVA_CLIENT_ID,
          client_secret: STRAVA_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
        }),
      });

      if (!stravaTokenResponse.ok) {
        const errorBody = await stravaTokenResponse.json().catch(() => ({}));
        throw new Error(`Strava token exchange failed: ${errorBody.message || 'Unknown error'}`);
      }
      const stravaData = await stravaTokenResponse.json();
      const { athlete, access_token, refresh_token, expires_at } = stravaData;
      
      console.log(`[auth-strava] Strava token exchange successful for user ${athlete.id}`);

      let supabaseUser;
      
      const { data: users, error: findError } = await supabaseAdmin.auth.admin.listUsers();
      if (findError) throw findError;
      
      const existingUser = users.users.find(u => u.user_metadata?.strava_id === athlete.id);

      if (existingUser) {
        supabaseUser = existingUser;
      } else {
        const { data: newUserResponse, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: athlete.email || `${athlete.id}@strava.local`,
          email_confirm: true,
          user_metadata: {
            name: `${athlete.firstname || ''} ${athlete.lastname || ''}`.trim(),
            strava_id: athlete.id,
          },
        });
        if (createError) throw createError;
        supabaseUser = newUserResponse.user;
      }

      const supabaseUid = supabaseUser.id;
      
      const { error: upsertTokenError } = await supabaseAdmin
        .from('user_tokens')
        .upsert({
          user_id: supabaseUid,
          strava_user_id: athlete.id,
          strava_access_token: access_token,
          strava_refresh_token: refresh_token,
          strava_expires_at: expires_at,
          user_name: `${athlete.firstname || ''} ${athlete.lastname || ''}`.trim(),
          user_email: athlete.email,
        }, { onConflict: 'user_id' });

      if (upsertTokenError) throw upsertTokenError;

      const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: supabaseUser.email,
      });

      if (tokenError || !tokenData?.properties?.access_token) {
        throw new Error('Failed to generate Supabase session token.');
      }
      
      const supabaseAccessToken = tokenData.properties.access_token;
      
      const tokenPayload = { 
        sub: supabaseUid,
        supabase_access_token: supabaseAccessToken,
        name: supabaseUser.user_metadata.name,
        email: supabaseUser.email
      };
      const sessionToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });

      const sessionCookie = cookie.serialize('sb-session', sessionToken, {
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: 'Lax',
        path: '/',
        maxAge: 60 * 60 * 1,
      });

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
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }) };
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
