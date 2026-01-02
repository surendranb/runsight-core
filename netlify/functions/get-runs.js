// netlify/functions/get-runs.js - Securely retrieves authenticated user's running data
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');

// IMPORTANT: Must be the same secret used in auth-strava.js and get-user.js
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-please-change-me-in-production';
const NODE_ENV = process.env.NODE_ENV || 'development';

exports.handler = async (event, context) => {
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
        message: 'Only GET method is allowed' 
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
    console.error('[get-runs] JWT verification failed:', jwtError.message);
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

  console.log(`[get-runs] Authenticated user ${supabaseUid} is fetching runs.`);

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for admin operations
    
    // Create Supabase client with service key for admin operations
    // We'll use the user_id from the JWT to filter data manually since we're using service key
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all runs from the runs table, filtered by the authenticated user's ID
    const { data: runs, error: runsError } = await supabase
      .from('runs')
      .select('*')
      .eq('user_id', supabaseUid) // IMPORTANT: Filter by authenticated user's ID
      .order('start_date', { ascending: false })
      .limit(1000); // Reasonable limit

    if (runsError) {
      console.error('[get-runs] Error fetching runs:', runsError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'DB_ERROR',
          message: 'Failed to fetch runs from database',
          details: runsError.message
        })
      };
    }

    console.log(`[get-runs] Successfully fetched ${runs.length} runs for user ${supabaseUid}`);

    // Transform runs to match frontend expectations
    const transformedRuns = runs.map(run => ({
      id: run.id,
      strava_id: run.strava_id,
      name: run.name,
      distance: run.distance,
      moving_time: run.moving_time,
      elapsed_time: run.elapsed_time,
      start_date: run.start_date,
      start_date_local: run.start_date_local,
      start_latlng: run.start_latlng,
      end_latlng: run.end_latlng,
      average_speed: run.average_speed,
      max_speed: run.max_speed,
      average_heartrate: run.average_heartrate,
      max_heartrate: run.max_heartrate,
      total_elevation_gain: run.total_elevation_gain,
      weather_data: run.weather_data,
      strava_data: run.strava_data,
      created_at: run.created_at,
      updated_at: run.updated_at,
      // Ensure all necessary fields are present, using original names if changed in DB schema
      // and converting to original frontend expected types
      distance_meters: run.distance, // Assuming DB stores in meters
      moving_time_seconds: run.moving_time, // Assuming DB stores in seconds
      elapsed_time_seconds: run.elapsed_time, // Assuming DB stores in seconds
      average_speed_ms: run.average_speed, // Assuming DB stores in m/s
      max_speed_ms: run.max_speed, // Assuming DB stores in m/s
      average_heartrate_bpm: run.average_heartrate, // Assuming DB stores in bpm
      max_heartrate_bpm: run.max_heartrate, // Assuming DB stores in bpm
      total_elevation_gain_meters: run.total_elevation_gain, // Assuming DB stores in meters
      // Add city, state, country if they exist in DB
      city: run.city || null,
      state: run.state || null,
      country: run.country || null,
    }));

    // Calculate statistics
    const stats = {
      total_runs: runs.length,
      total_distance: 0, // in meters
      total_moving_time: 0, // in seconds
      average_pace_seconds_per_km: 0,
      average_distance_per_run_meters: 0,
    };

    if (runs.length > 0) {
      stats.total_distance = runs.reduce((sum, run) => sum + (run.distance || 0), 0);
      stats.total_moving_time = runs.reduce((sum, run) => sum + (run.moving_time || 0), 0);

      stats.average_distance_per_run_meters = stats.total_distance / runs.length;

      // Calculate average pace (seconds per kilometer)
      const runsWithValidPaceData = runs.filter(r => 
        r.distance && r.distance > 0 && 
        r.moving_time && r.moving_time > 0
      );
      
      if (runsWithValidPaceData.length > 0) {
        const totalPaceSecondsSum = runsWithValidPaceData.reduce((sum, run) => {
          return sum + (run.moving_time / (run.distance / 1000)); // pace in seconds/km for this run
        }, 0);
        stats.average_pace_seconds_per_km = totalPaceSecondsSum / runsWithValidPaceData.length;
      }
    }

    console.log(`[get-runs] Calculated stats:`, stats);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        runs: transformedRuns,
        stats: stats,
        count: runs.length,
        total: runs.length
      }),
    };

  } catch (error) {
    console.error('[get-runs] Critical error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch runs due to an unexpected server error', 
        details: error.message 
      }),
    };
  }
};
