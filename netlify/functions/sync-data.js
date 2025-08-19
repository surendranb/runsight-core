// netlify/functions/sync-data.js - Simple sync function for single user
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        error: 'METHOD_NOT_ALLOWED', 
        message: 'Only POST method is allowed' 
      }),
    };
  }

  console.log('[sync-data] Starting sync process...');

  try {
    // Parse request body
    let requestData = {};
    if (event.body) {
      try {
        requestData = JSON.parse(event.body);
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'INVALID_JSON',
            message: 'Request body must be valid JSON'
          })
        };
      }
    }

    const stravaUserId = requestData.userId || event.queryStringParameters?.userId;
    
    if (!stravaUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'MISSING_USER_ID',
          message: 'userId is required in request body or query parameters'
        })
      };
    }

    // Environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const openWeatherApiKey = process.env.VITE_OPENWEATHER_API_KEY;

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

    // Get user's Strava tokens from user_tokens table
    console.log(`[sync-data] Looking up tokens for Strava user ${stravaUserId}...`);
    const { data: userTokens, error: tokenError } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('strava_user_id', stravaUserId)
      .single();

    if (tokenError || !userTokens) {
      console.error('[sync-data] User tokens not found:', tokenError);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'AUTH_REQUIRED',
          message: 'User not found or not authenticated with Strava. Please re-authenticate.',
          details: tokenError?.message
        })
      };
    }

    // Check if token is expired and refresh if needed
    const now = Math.floor(Date.now() / 1000);
    let accessToken = userTokens.strava_access_token;

    if (userTokens.strava_expires_at <= now) {
      console.log('[sync-data] Access token expired, refreshing...');
      
      const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.VITE_STRAVA_CLIENT_ID,
          client_secret: process.env.VITE_STRAVA_CLIENT_SECRET,
          refresh_token: userTokens.strava_refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        console.error('[sync-data] Token refresh failed:', refreshResponse.status);
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            error: 'TOKEN_REFRESH_FAILED',
            message: 'Failed to refresh Strava token. Please re-authenticate with Strava.'
          })
        };
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update tokens in database
      await supabase
        .from('user_tokens')
        .update({
          strava_access_token: refreshData.access_token,
          strava_refresh_token: refreshData.refresh_token,
          strava_expires_at: refreshData.expires_at,
          updated_at: new Date().toISOString()
        })
        .eq('strava_user_id', stravaUserId);

      console.log('[sync-data] Tokens refreshed successfully');
    }

    // Fetch activities from Strava with proper pagination (no arbitrary limits)
    const timeRange = requestData.timeRange || {};
    let allActivities = [];
    let page = 1;
    const perPage = 200; // Use max per page to reduce API calls
    
    console.log(`[sync-data] Fetching activities from Strava with date range:`, {
      after: timeRange.after ? new Date(timeRange.after * 1000).toISOString() : 'none',
      before: timeRange.before ? new Date(timeRange.before * 1000).toISOString() : 'none'
    });

    // Fetch all pages until we get all activities in the date range
    while (true) {
      let stravaUrl = `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=${page}`;
      
      if (timeRange.after) {
        stravaUrl += `&after=${timeRange.after}`;
      }
      if (timeRange.before) {
        stravaUrl += `&before=${timeRange.before}`;
      }

      console.log(`[sync-data] Fetching page ${page} (${allActivities.length} activities so far)...`);
      const stravaResponse = await fetch(stravaUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!stravaResponse.ok) {
        console.error('[sync-data] Strava API error:', stravaResponse.status);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'STRAVA_API_ERROR',
            message: stravaResponse.status === 401 ? 'Strava token expired' : 'Failed to fetch activities from Strava'
          })
        };
      }

      const pageActivities = await stravaResponse.json();
      console.log(`[sync-data] Page ${page}: received ${pageActivities.length} activities`);
      
      // No more activities available
      if (pageActivities.length === 0) {
        console.log(`[sync-data] No more activities available, stopping pagination`);
        break;
      }
      
      allActivities.push(...pageActivities);
      
      // If we got less than perPage activities, we've reached the end
      if (pageActivities.length < perPage) {
        console.log(`[sync-data] Received ${pageActivities.length} < ${perPage} activities, reached end of data`);
        break;
      }
      
      // Check if we're outside our date range (activities are returned in reverse chronological order)
      if (timeRange.after && pageActivities.length > 0) {
        const oldestActivityInPage = pageActivities[pageActivities.length - 1];
        const oldestActivityTime = new Date(oldestActivityInPage.start_date).getTime() / 1000;
        
        if (oldestActivityTime < timeRange.after) {
          console.log(`[sync-data] Reached activities older than requested range, stopping pagination`);
          // Filter out activities outside our date range
          allActivities = allActivities.filter(activity => {
            const activityTime = new Date(activity.start_date).getTime() / 1000;
            return activityTime >= timeRange.after;
          });
          break;
        }
      }
      
      page++;
      
      // Reasonable safety limit for very large datasets (10,000 activities)
      if (page > 50) {
        console.log(`[sync-data] Reached safety limit of 50 pages (${allActivities.length} activities), stopping`);
        break;
      }
      
      // Small delay between requests to respect Strava API rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const runningActivities = allActivities.filter(activity => 
      activity.type === 'Run' || activity.sport_type === 'Run'
    );

    console.log(`[sync-data] Total activities fetched: ${allActivities.length}, running activities: ${runningActivities.length}`);

    // Location geocoding cache to avoid duplicate API calls
    const locationCache = new Map();

    // Location geocoding function
    const enrichWithLocation = async (activity) => {
      if (!openWeatherApiKey || !activity.start_latlng || activity.start_latlng.length !== 2) {
        return null;
      }

      const [lat, lon] = activity.start_latlng;
      const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`; // Round to ~100m precision for caching
      
      if (locationCache.has(cacheKey)) {
        return locationCache.get(cacheKey);
      }

      try {
        const geocodeUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${openWeatherApiKey}`;
        
        const geocodeResponse = await fetch(geocodeUrl);
        if (!geocodeResponse.ok) {
          console.warn(`[sync-data] Geocoding API failed for activity ${activity.id}: ${geocodeResponse.status}`);
          return null;
        }

        const geocodeData = await geocodeResponse.json();
        if (geocodeData && geocodeData.length > 0) {
          const location = geocodeData[0];
          const locationData = {
            city: location.name,
            state: location.state,
            country: location.country
          };
          
          locationCache.set(cacheKey, locationData);
          return locationData;
        }
      } catch (error) {
        console.warn(`[sync-data] Location geocoding failed for activity ${activity.id}:`, error.message);
      }
      
      return null;
    };

    // Weather enrichment function with fallback for free tier
    const enrichWithWeather = async (activity) => {
      if (!openWeatherApiKey || !activity.start_latlng || activity.start_latlng.length !== 2) {
        console.log(`[sync-data] Skipping weather for activity ${activity.id}: ${!openWeatherApiKey ? 'No API key' : 'No GPS coordinates'}`);
        return null;
      }

      const [lat, lon] = activity.start_latlng;
      const timestamp = Math.floor(new Date(activity.start_date).getTime() / 1000);
      const activityDate = new Date(activity.start_date);
      const now = new Date();
      const daysDiff = (now - activityDate) / (1000 * 60 * 60 * 24);
      
      console.log(`[sync-data] Attempting weather enrichment for activity ${activity.id} (${daysDiff.toFixed(1)} days ago)`);
      
      try {
        // Try historical API first (requires paid plan)
        let weatherUrl = `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${timestamp}&appid=${openWeatherApiKey}&units=metric`;
        
        let weatherResponse = await fetch(weatherUrl);
        
        // If historical API fails with 402 (payment required) or 401, try current weather for recent runs
        if (!weatherResponse.ok && (weatherResponse.status === 402 || weatherResponse.status === 401) && daysDiff <= 5) {
          console.log(`[sync-data] Historical weather API failed (${weatherResponse.status}), trying current weather for recent activity ${activity.id}`);
          weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${openWeatherApiKey}&units=metric`;
          weatherResponse = await fetch(weatherUrl);
        }
        
        if (!weatherResponse.ok) {
          const errorText = await weatherResponse.text();
          console.warn(`[sync-data] Weather API failed for activity ${activity.id}: ${weatherResponse.status} - ${errorText}`);
          
          if (weatherResponse.status === 402) {
            console.warn(`[sync-data] OpenWeather 3.0 timemachine API requires paid subscription. Consider upgrading or using current weather for recent runs only.`);
          }
          return null;
        }

        const weatherData = await weatherResponse.json();
        
        // Handle historical weather response (3.0 API)
        if (weatherData.data && weatherData.data.length > 0) {
          const weather = weatherData.data[0];
          console.log(`[sync-data] Successfully enriched activity ${activity.id} with historical weather`);
          return {
            temperature: weather.temp,
            feels_like: weather.feels_like,
            humidity: weather.humidity,
            pressure: weather.pressure,
            wind_speed: weather.wind_speed,
            wind_deg: weather.wind_deg,
            weather: weather.weather[0],
            visibility: weather.visibility,
            uv_index: weather.uvi,
            source: 'historical'
          };
        }
        
        // Handle current weather response (2.5 API)
        if (weatherData.main && weatherData.weather) {
          console.log(`[sync-data] Successfully enriched activity ${activity.id} with current weather (fallback)`);
          return {
            temperature: weatherData.main.temp,
            feels_like: weatherData.main.feels_like,
            humidity: weatherData.main.humidity,
            pressure: weatherData.main.pressure,
            wind_speed: weatherData.wind?.speed || 0,
            wind_deg: weatherData.wind?.deg || 0,
            weather: weatherData.weather[0],
            visibility: weatherData.visibility,
            uv_index: null, // Not available in current weather API
            source: 'current'
          };
        }
        
      } catch (error) {
        console.warn(`[sync-data] Weather enrichment failed for activity ${activity.id}:`, error.message);
      }
      
      return null;
    };

    // Prepare all run data for batch upsert
    const runDataArray = runningActivities.map(activity => ({
      strava_id: activity.id,
      name: activity.name,
      distance_meters: activity.distance,
      moving_time_seconds: activity.moving_time,
      elapsed_time_seconds: activity.elapsed_time,
      start_date: activity.start_date,
      start_date_local: activity.start_date_local,
      start_latitude: activity.start_latlng ? activity.start_latlng[0] : null,
      start_longitude: activity.start_latlng ? activity.start_latlng[1] : null,
      end_latitude: activity.end_latlng ? activity.end_latlng[0] : null,
      end_longitude: activity.end_latlng ? activity.end_latlng[1] : null,
      average_speed_ms: activity.average_speed,
      max_speed_ms: activity.max_speed,
      // Convert heart rate values to integers (round decimal values)
      average_heartrate_bpm: activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
      max_heartrate_bpm: activity.max_heartrate ? Math.round(activity.max_heartrate) : null,
      total_elevation_gain_meters: activity.total_elevation_gain,
      activity_type: activity.type || activity.sport_type || 'Run',
      strava_data: activity,
      updated_at: new Date().toISOString()
    }));

    // Process activities with progress tracking and better error handling
    let processedCount = 0;
    let failedCount = 0;
    let errors = [];
    const startTime = Date.now();

    console.log(`[sync-data] Starting to process ${runDataArray.length} runs with progress tracking...`);

    // Implement chunked processing for large datasets
    const isLargeDataset = runDataArray.length > 20;
    const chunkSize = requestData.chunkSize || 20; // Process 20 runs at a time
    const chunkIndex = requestData.chunkIndex || 0;
    
    let runsToProcess = runDataArray;
    let isChunkedSync = false;
    
    if (isLargeDataset && !requestData.processAll) {
      // For large datasets, process in chunks
      const startIndex = chunkIndex * chunkSize;
      const endIndex = Math.min(startIndex + chunkSize, runDataArray.length);
      runsToProcess = runDataArray.slice(startIndex, endIndex);
      isChunkedSync = true;
      
      console.log(`[sync-data] Chunked sync: Processing chunk ${chunkIndex + 1} (runs ${startIndex + 1}-${endIndex} of ${runDataArray.length})`);
    } else {
      console.log(`[sync-data] Processing all ${runDataArray.length} runs in single batch`);
    }
    
    const batchSize = 5; // Keep small batches for weather API calls
    let weatherEnrichedCount = 0;
    let totalGeocodedCount = 0;
    
    for (let i = 0; i < runsToProcess.length; i += batchSize) {
      const batch = runsToProcess.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(runsToProcess.length / batchSize);
      
      console.log(`[sync-data] Processing batch ${batchNumber}/${totalBatches} (${batch.length} activities)...`);
      
      // Enrich batch with weather and location data if API key is available
      let batchGeocodedCount = 0;
      if (openWeatherApiKey && !requestData.options?.skipWeatherEnrichment) {
        console.log(`[sync-data] Enriching batch ${batchNumber} with weather and location data...`);
        
        for (let j = 0; j < batch.length; j++) {
          // Find the corresponding activity from the original array
          const activityIndex = isChunkedSync ? (chunkIndex * chunkSize) + i + j : i + j;
          const activity = runningActivities[activityIndex];
          if (activity && activity.start_latlng) {
            // Get location data first (uses caching)
            const locationData = await enrichWithLocation(activity);
            if (locationData) {
              batch[j].city = locationData.city;
              batch[j].state = locationData.state;
              batch[j].country = locationData.country;
              batchGeocodedCount++;
            }
            
            // Get weather data
            const weatherData = await enrichWithWeather(activity);
            if (weatherData) {
              batch[j].weather_data = weatherData;
              weatherEnrichedCount++;
            }
            
            // Rate limiting for weather API (max 1000 calls/day)
            await new Promise(resolve => setTimeout(resolve, 150));
          }
        }
      }
      
      try {
        const { data: batchResult, error: batchError } = await supabase
          .from('runs')
          .upsert(batch, { 
            onConflict: 'strava_id',
            ignoreDuplicates: false
          })
          .select('strava_id, name');

        if (batchError) {
          console.error(`[sync-data] Batch ${batchNumber} failed:`, batchError);
          failedCount += batch.length;
          errors.push({
            batch: batchNumber,
            error: batchError.message,
            activities: batch.map(r => ({ id: r.strava_id, name: r.name }))
          });
          
          // If we get a critical error, abort the sync
          if (batchError.code === '22P02' || batchError.code === '23505' || batchError.code === '42703') {
            console.error(`[sync-data] Critical error detected, aborting sync:`, batchError);
            throw new Error(`Database error: ${batchError.message}. Sync aborted to prevent data corruption.`);
          }
        } else {
          const batchProcessed = batchResult ? batchResult.length : batch.length;
          processedCount += batchProcessed;
          console.log(`[sync-data] Batch ${batchNumber} completed: ${batchProcessed}/${batch.length} activities saved`);
          totalGeocodedCount += batchGeocodedCount;
          
          if (batchResult && batchResult.length > 0) {
            console.log(`[sync-data] Sample saved activities:`, batchResult.slice(0, 2).map(r => `${r.name} (${r.strava_id})`));
          }
        }
      } catch (batchError) {
        console.error(`[sync-data] Batch ${batchNumber} exception:`, batchError);
        failedCount += batch.length;
        errors.push({
          batch: batchNumber,
          error: batchError.message,
          activities: batch.map(r => ({ id: r.strava_id, name: r.name }))
        });
      }
      
      // Add small delay between batches to be gentle on the database
      if (i + batchSize < runDataArray.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`[sync-data] Processing completed in ${duration}s: ${processedCount} saved, ${failedCount} failed`);
    
    if (errors.length > 0) {
      console.log(`[sync-data] Errors encountered:`, errors);
    }

    // Prepare response with chunking information
    const results = {
      success: true,
      message: isChunkedSync ? 
        `Chunk ${chunkIndex + 1} completed successfully` : 
        'Sync completed successfully',
      timestamp: new Date().toISOString(),
      status: isChunkedSync ? 'chunk_completed' : 'completed',
      chunking: isChunkedSync ? {
        currentChunk: chunkIndex,
        totalChunks: Math.ceil(runDataArray.length / chunkSize),
        hasMoreChunks: (chunkIndex + 1) * chunkSize < runDataArray.length,
        nextChunkIndex: chunkIndex + 1,
        totalActivities: runDataArray.length,
        processedSoFar: (chunkIndex + 1) * chunkSize
      } : null,
      results: {
        total_processed: isChunkedSync ? runsToProcess.length : runningActivities.length,
        activities_saved: processedCount,
        activities_updated: 0,
        activities_skipped: 0,
        activities_failed: failedCount,
        weather_enriched: weatherEnrichedCount,
        geocoded: totalGeocodedCount,
        duration_seconds: duration
      }
    };

    console.log('[sync-data] Sync completed:', results);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results)
    };

  } catch (error) {
    console.error('[sync-data] Critical error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: 'Sync failed due to an unexpected server error',
        details: error.message
      })
    };
  }
};