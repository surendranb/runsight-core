// netlify/functions/auth-strava.js - Simplified for single user
const { createClient } = require('@supabase/supabase-js');
const {
  createSessionCookie,
  clearSessionCookie,
  createOAuthStateCookie,
  clearOAuthStateCookie,
  getOAuthState,
  getSession,
} = require('./session.cjs');
const { buildJsonHeaders } = require('./http.cjs');

exports.handler = async (event, context) => {
  const headers = buildJsonHeaders(event, 'GET, POST, DELETE, OPTIONS');
  const isVerboseLogging = process.env.NODE_ENV !== 'production';
  const debugLog = (...args) => {
    if (isVerboseLogging) {
      console.log(...args);
    }
  };
  const respond = (statusCode, payload, cookies = []) => {
    const response = {
      statusCode,
      headers,
      body: JSON.stringify(payload),
    };

    if (cookies.length === 1) {
      response.headers = {
        ...headers,
        'Set-Cookie': cookies[0],
      };
    } else if (cookies.length > 1) {
      response.multiValueHeaders = {
        'Set-Cookie': cookies,
      };
    }

    return response;
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const forwardedProto = event.headers['x-forwarded-proto'] || 'https';
  const forwardedHost = event.headers['x-forwarded-host'] || event.headers.host;
  const defaultRedirectUri = forwardedHost ? `${forwardedProto}://${forwardedHost}/auth/callback` : 'http://localhost:8888/auth/callback';
  const rawRedirectUri = process.env.STRAVA_REDIRECT_URI || defaultRedirectUri;
  const parsedRedirectUri = new URL(rawRedirectUri);
  if (parsedRedirectUri.pathname === '/callback') {
    parsedRedirectUri.pathname = '/auth/callback';
  }
  const STRAVA_REDIRECT_URI = parsedRedirectUri.toString();
  const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
  const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[auth-strava] Missing critical environment variables');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'CONFIG_ERROR',
        message: 'Server configuration error'
      }),
    };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    if (event.httpMethod === 'GET') {
      if (event.queryStringParameters?.session === '1') {
        const session = getSession(event);

        if (!session?.stravaUserId) {
          return respond(401, {
            error: 'AUTH_REQUIRED',
            message: 'Authentication required'
          });
        }

        const { data: userData, error: userError } = await supabase
          .from('user_tokens')
          .select('strava_user_id, user_name, user_email')
          .eq('strava_user_id', session.stravaUserId)
          .maybeSingle();

        if (userError || !userData) {
          return respond(401, {
            error: 'AUTH_REQUIRED',
            message: 'Authentication required'
          }, [clearSessionCookie(event)]);
        }

        return respond(200, {
          user: {
            id: userData.strava_user_id,
            strava_id: userData.strava_user_id,
            name: userData.user_name,
            email: userData.user_email || undefined,
          }
        });
      }

      const { state: oauthState, cookie: oauthStateCookie } = createOAuthStateCookie(event);
      const authUrl = `https://www.strava.com/oauth/authorize?` +
        `client_id=${STRAVA_CLIENT_ID}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(STRAVA_REDIRECT_URI)}&` +
        `state=${encodeURIComponent(oauthState)}&` +
        `approval_prompt=force&` +
        `scope=read,activity:read_all`;

      return respond(200, { authUrl }, [oauthStateCookie]);
    }

    if (event.httpMethod === 'DELETE') {
      return respond(200, { success: true }, [
        clearSessionCookie(event),
        clearOAuthStateCookie(event),
      ]);
    }

    if (event.httpMethod === 'POST') {
      const { code, state } = JSON.parse(event.body);
      if (!code) {
        return respond(400, {
          error: 'MISSING_CODE',
          message: 'Authorization code is required'
        }, [clearOAuthStateCookie(event)]);
      }

      const oauthState = getOAuthState(event);
      if (!state || !oauthState?.state || state !== oauthState.state) {
        return respond(400, {
          error: 'INVALID_OAUTH_STATE',
          message: 'Authentication state validation failed. Please start the Strava login flow again.'
        }, [clearOAuthStateCookie(event)]);
      }

      debugLog('[auth-strava] Exchanging code for tokens');
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
          console.error('[auth-strava] Strava token exchange failed');
          return respond(tokenResponse.status, {
            error: 'TOKEN_EXCHANGE_FAILED',
            message: 'Failed to exchange code for token'
          }, [clearOAuthStateCookie(event)]);
        }

      const tokenData = await tokenResponse.json();
      const stravaUserId = tokenData.athlete.id;
      const userName = `${tokenData.athlete.firstname || ''} ${tokenData.athlete.lastname || ''}`.trim();

      debugLog('[auth-strava] Token exchange successful');

      const { data: userData, error: dbError } = await supabase
        .from('user_tokens')
        .upsert({
          strava_user_id: stravaUserId,
          strava_access_token: tokenData.access_token,
          strava_refresh_token: tokenData.refresh_token,
          strava_expires_at: tokenData.expires_at,
          user_name: userName,
          updated_at: new Date().toISOString()
        }, { onConflict: 'strava_user_id' })
        .select()
        .single();

      if (dbError) {
        console.error('[auth-strava] Error upserting user tokens');
        return respond(500, {
          error: 'DB_ERROR',
          message: 'Failed to synchronize user tokens'
        }, [clearOAuthStateCookie(event)]);
      }

      debugLog('[auth-strava] Authentication successful');

      return respond(200, {
        success: true,
        user: {
          id: userData.strava_user_id,
          strava_id: userData.strava_user_id,
          name: userData.user_name,
          email: userData.user_email || undefined,
        },
        session_url: '/'
      }, [
        createSessionCookie(event, stravaUserId),
        clearOAuthStateCookie(event),
      ]);
    }

    return respond(405, {
      error: 'METHOD_NOT_ALLOWED',
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('[auth-strava] Critical error in handler');
    return respond(500, {
      error: 'INTERNAL_ERROR',
      message: 'Authentication failed due to an unexpected server error'
    });
  }
};
