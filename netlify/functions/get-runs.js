// netlify/functions/get-runs.js - Simple function to get running data
const { createClient } = require('@supabase/supabase-js');
const { getSession } = require('./session.cjs');
const { buildJsonHeaders } = require('./http.cjs');

exports.handler = async (event, context) => {
  const headers = buildJsonHeaders(event, 'GET, OPTIONS');
  const isVerboseLogging = process.env.NODE_ENV !== 'production';
  const debugLog = (...args) => {
    if (isVerboseLogging) {
      console.log(...args);
    }
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

  const session = getSession(event);

  if (!session?.stravaUserId) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        error: 'AUTH_REQUIRED',
        message: 'Authentication required'
      })
    };
  }

  debugLog('[get-runs] Fetching runs for authenticated user');

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'CONFIG_ERROR',
          message: 'Supabase environment variables not configured'
        })
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all runs from the runs table (no user filtering needed for single user)
    const { data: runs, error: runsError } = await supabase
      .from('runs')
      .select('*')
      .order('start_date', { ascending: false })
      .limit(1000); // Reasonable limit

    if (runsError) {
      console.error('[get-runs] Error fetching runs');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'DB_ERROR',
          message: 'Failed to fetch runs from database'
        })
      };
    }

    debugLog(`[get-runs] Successfully fetched ${runs.length} runs`);

    // Transform runs to match frontend expectations
    const transformedRuns = runs.map(run => ({
      id: run.id,
      strava_id: run.strava_id,
      name: run.name,
      distance: run.distance_meters,
      distance_meters: run.distance_meters,
      moving_time: run.moving_time_seconds,
      moving_time_seconds: run.moving_time_seconds,
      elapsed_time: run.elapsed_time_seconds,
      elapsed_time_seconds: run.elapsed_time_seconds,
      start_date: run.start_date,
      start_date_local: run.start_date_local,
      start_latitude: run.start_latitude,
      start_longitude: run.start_longitude,
      end_latitude: run.end_latitude,
      end_longitude: run.end_longitude,
      average_speed: run.average_speed_ms,
      average_speed_ms: run.average_speed_ms,
      max_speed: run.max_speed_ms,
      max_speed_ms: run.max_speed_ms,
      average_heartrate: run.average_heartrate_bpm,
      average_heartrate_bpm: run.average_heartrate_bpm,
      max_heartrate: run.max_heartrate_bpm,
      max_heartrate_bpm: run.max_heartrate_bpm,
      total_elevation_gain: run.total_elevation_gain_meters,
      total_elevation_gain_meters: run.total_elevation_gain_meters,
      activity_type: run.activity_type,
      strava_data: run.strava_data,
      weather_data: run.weather_data,
      city: run.city,
      state: run.state,
      country: run.country,
      created_at: run.created_at,
      updated_at: run.updated_at
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
      stats.total_distance = runs.reduce((sum, run) => sum + (run.distance_meters || 0), 0);
      stats.total_moving_time = runs.reduce((sum, run) => sum + (run.moving_time_seconds || 0), 0);

      stats.average_distance_per_run_meters = stats.total_distance / runs.length;

      // Calculate average pace (seconds per kilometer)
      const runsWithValidPaceData = runs.filter(r => 
        r.distance_meters && r.distance_meters > 0 && 
        r.moving_time_seconds && r.moving_time_seconds > 0
      );
      
      if (runsWithValidPaceData.length > 0) {
        const totalPaceSecondsSum = runsWithValidPaceData.reduce((sum, run) => {
          return sum + (run.moving_time_seconds / (run.distance_meters / 1000)); // pace in seconds/km for this run
        }, 0);
        stats.average_pace_seconds_per_km = totalPaceSecondsSum / runsWithValidPaceData.length;
      }
    }

    debugLog('[get-runs] Calculated stats');

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
    console.error('[get-runs] Critical error');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch runs due to an unexpected server error'
      }),
    };
  }
};
