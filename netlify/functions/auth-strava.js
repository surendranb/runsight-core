// netlify/functions/auth-strava.js - Simplified for single user
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY
  } = process.env;

  const STRAVA_REDIRECT_URI = STRAVA_REDIRECT_URI_ENV || 'https://resonant-pony-ea7953.netlify.app/auth/callback';

  // Check for missing environment variables
  const missingVars = [];
  if (!STRAVA_CLIENT_ID) missingVars.push('VITE_STRAVA_CLIENT_ID');
  if (!STRAVA_CLIENT_SECRET) missingVars.push('VITE_STRAVA_CLIENT_SECRET');
  if (!STRAVA_REDIRECT_URI) missingVars.push('VITE_STRAVA_REDIRECT_URI');
  if (!SUPABASE_URL) missingVars.push('VITE_SUPABASE_URL');
  if (!SUPABASE_ANON_KEY) missingVars.push('VITE_SUPABASE_ANON_KEY');
  if (!SUPABASE_SERVICE_KEY) missingVars.push('SUPABASE_SERVICE_KEY');

  if (missingVars.length > 0) {
    console.error('[auth-strava] Missing environment variables:', missingVars.join(', '));
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'CONFIG_ERROR', 
        message: `Missing environment variables: ${missingVars.join(', ')}` 
      }),
    };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
          body: JSON.stringify({ 
            error: 'MISSING_CODE', 
            message: 'Authorization code is required' 
          }) 
        };
      }

      // Exchange code for access token
      console.log('[auth-strava] Exchanging code for tokens...');
      const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: STRAVA_CLIENT_ID,
          client_secret: STRAVA_CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorBody = await tokenResponse.json().catch(() => ({ message: 'Token exchange failed' }));
        console.error('[auth-strava] Strava token exchange failed:', errorBody);
        return { 
          statusCode: tokenResponse.status, 
          headers, 
          body: JSON.stringify({ 
            error: 'TOKEN_EXCHANGE_FAILED', 
            message: 'Failed to exchange code for token',
            details: errorBody.message || errorBody 
          }) 
        };
      }

      const tokenData = await tokenResponse.json();
      const stravaUserId = tokenData.athlete.id;
      const userName = `${tokenData.athlete.firstname || ''} ${tokenData.athlete.lastname || ''}`.trim();

      console.log(`[auth-strava] Token exchange successful for Strava user ${stravaUserId}`);

      // Store tokens in simple user_tokens table
      const { data: existingUser, error: checkError } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('strava_user_id', stravaUserId)
        .single();

      let userData;
      if (existingUser) {
        // Update existing user tokens
        console.log(`[auth-strava] Updating tokens for existing user ${stravaUserId}`);
        const { data: updatedUser, error: updateError } = await supabase
          .from('user_tokens')
          .update({
            strava_access_token: tokenData.access_token,
            strava_refresh_token: tokenData.refresh_token,
            strava_expires_at: tokenData.expires_at,
            user_name: userName,
            updated_at: new Date().toISOString()
          })
          .eq('strava_user_id', stravaUserId)
          .select()
          .single();

        if (updateError) {
          console.error('[auth-strava] Error updating user tokens:', updateError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              error: 'DB_UPDATE_ERROR',
              message: 'Failed to update user tokens',
              details: updateError.message
            })
          };
        }
        userData = updatedUser;
      } else {
        // Create new user
        console.log(`[auth-strava] Creating new user for Strava user ${stravaUserId}`);
        const { data: newUser, error: insertError } = await supabase
          .from('user_tokens')
          .insert({
            strava_user_id: stravaUserId,
            strava_access_token: tokenData.access_token,
            strava_refresh_token: tokenData.refresh_token,
            strava_expires_at: tokenData.expires_at,
            user_name: userName,
            user_email: tokenData.athlete.email || null
          })
          .select()
          .single();

        if (insertError) {
          console.error('[auth-strava] Error creating user:', insertError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              error: 'DB_INSERT_ERROR',
              message: 'Failed to create user record',
              details: insertError.message
            })
          };
        }
        userData = newUser;
      }

      console.log(`[auth-strava] Authentication successful for user ${userData.user_name}`);

      // Return simple user data
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          user: {
            id: userData.strava_user_id, // Use Strava user ID as the primary identifier
            strava_id: userData.strava_user_id,
            name: userData.user_name,
            email: userData.user_email
          }
        }),
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'INTERNAL_ERROR', 
        message: 'Authentication failed due to an unexpected server error', 
        details: error.message 
      }),
    };
  }
};
