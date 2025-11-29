// netlify/functions/sync-data.js - Secure sync function for authenticated user
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const fetch = require('node-fetch');

const JWT_SECRET = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'development';

exports.handler = async (event, context) => {
  const allowedOrigin = process.env.NETLIFY_SITE_URL || event.headers.origin || '*';
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }) };
  }

  // --- Authentication Check ---
  const cookies = cookie.parse(event.headers.cookie || '');
  const sessionToken = cookies['sb-session'];

  if (!sessionToken) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'AUTH_REQUIRED' }) };
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(sessionToken, JWT_SECRET);
  } catch (jwtError) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'INVALID_TOKEN' }) };
  }

  const supabaseUid = decodedToken.sub;
  if (!supabaseUid) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'INVALID_TOKEN' }) };
  }
  // --- END Authentication Check ---

  try {
    const requestData = JSON.parse(event.body || '{}');

    const { VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENWEATHER_API_KEY, VITE_STRAVA_CLIENT_ID, VITE_STRAVA_CLIENT_SECRET } = process.env;
    const supabaseAdmin = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // --- Token Refresh Logic ---
    let accessToken = decodedToken.strava_access_token;
    const now = Math.floor(Date.now() / 1000);

    if (decodedToken.strava_expires_at <= now) {
      console.log('[sync-data] Strava token expired, refreshing...');
      const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: VITE_STRAVA_CLIENT_ID,
          client_secret: VITE_STRAVA_CLIENT_SECRET,
          refresh_token: decodedToken.strava_refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh Strava token. Please re-authenticate.');
      }
      
      const newStravaData = await refreshResponse.json();
      accessToken = newStravaData.access_token;

      // Create a new, updated JWT and send it back to the user as a new cookie
      const newTokenPayload = { ...decodedToken, 
        strava_access_token: newStravaData.access_token,
        strava_refresh_token: newStravaData.refresh_token,
        strava_expires_at: newStravaData.expires_at,
      };
      const newSessionToken = jwt.sign(newTokenPayload, JWT_SECRET, { expiresIn: '8h' });
      const newSessionCookie = cookie.serialize('sb-session', newSessionToken, {
        httpOnly: true, secure: NODE_ENV === 'production', sameSite: 'Lax', path: '/', maxAge: 60 * 60 * 8,
      });
      // Add the new cookie to the headers of the eventual response
      headers['Set-Cookie'] = newSessionCookie;
      console.log('[sync-data] Strava token refreshed and new session cookie prepared.');
    }
    // --- End Token Refresh ---

    // Fetch activities from Strava
    const timeRange = requestData.timeRange || {};
    let allActivities = [];
    let page = 1;
    const perPage = 200;

    while (true) {
      let stravaUrl = `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=${page}`;
      if (timeRange.after) stravaUrl += `&after=${timeRange.after}`;
      if (timeRange.before) stravaUrl += `&before=${timeRange.before}`;

      const stravaResponse = await fetch(stravaUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
      if (!stravaResponse.ok) throw new Error('Failed to fetch activities from Strava');

      const pageActivities = await stravaResponse.json();
      if (pageActivities.length === 0) break;
      allActivities.push(...pageActivities);
      if (pageActivities.length < perPage) break;
      page++;
      if (page > 50) break; // Safety break
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const runningActivities = allActivities.filter(a => a.type === 'Run' || a.sport_type === 'Run');
    console.log(`[sync-data] Fetched ${runningActivities.length} running activities for user ${supabaseUid}`);

    // Prepare data for batch upsert
    const runDataArray = runningActivities.map(activity => ({
      user_id: supabaseUid,
      strava_id: activity.id,
      name: activity.name,
      distance: activity.distance,
      moving_time: activity.moving_time,
      elapsed_time: activity.elapsed_time,
      start_date: activity.start_date,
      start_date_local: activity.start_date_local,
      start_latlng: activity.start_latlng ? `(${activity.start_latlng[0]},${activity.start_latlng[1]})` : null,
      end_latlng: activity.end_latlng ? `(${activity.end_latlng[0]},${activity.end_latlng[1]})` : null,
      average_speed: activity.average_speed,
      max_speed: activity.max_speed,
      average_heartrate: activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
      max_heartrate: activity.max_heartrate ? Math.round(activity.max_heartrate) : null,
      total_elevation_gain: activity.total_elevation_gain,
      activity_type: activity.type || activity.sport_type || 'Run',
      strava_data: activity,
    }));
    
    if (runDataArray.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('runs')
        .upsert(runDataArray, { onConflict: 'strava_id' });

      if (upsertError) throw upsertError;
    }

    const results = {
      success: true,
      message: 'Sync completed successfully',
      status: 'completed',
      results: { total_processed: runningActivities.length, activities_saved: runDataArray.length },
    };

    return { statusCode: 200, headers, body: JSON.stringify(results) };

  } catch (error) {
    console.error('[sync-data] Critical error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'INTERNAL_ERROR', 
        message: 'Sync failed due to an unexpected server error', 
        details: error.message 
      }),
    };
  }
};