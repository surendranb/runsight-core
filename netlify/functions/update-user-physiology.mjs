import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken'; // Using ES module import
import cookie from 'cookie'; // Using ES module import

// IMPORTANT: Must be the same secret used in auth-strava.js and get-user.js
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-please-change-me-in-production';
const NODE_ENV = process.env.NODE_ENV || 'development';

export const handler = async (event) => {
  // Determine allowed origin for CORS
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
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: 'METHOD_NOT_ALLOWED',
        message: 'Only POST method is allowed',
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
    console.error('[update-user-physiology] JWT verification failed:', jwtError.message);
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

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (parseError) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'INVALID_JSON', message: 'Request body must be valid JSON' }),
    };
  }

  const { userId, ...physiologyData } = body;

  // IMPORTANT: Ignore userId from request body and use authenticated supabaseUid
  if (userId && userId !== supabaseUid) {
    console.warn(`[update-user-physiology] Request body contained userId ${userId} but authenticated user is ${supabaseUid}. Using authenticated user's ID.`);
  }

  console.log(`[update-user-physiology] Authenticated user ${supabaseUid} is updating physiology data.`);

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'CONFIG_ERROR',
          message: 'Supabase environment variables not configured',
        }),
      };
    }

    // Pass the authenticated user's JWT to the Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${decodedToken.supabase_access_token}`
        }
      }
    });

    // Ensure the update operation is explicitly tied to the authenticated user's ID
    const { data, error } = await supabase
      .from('user_training_profiles')
      .update(physiologyData)
      .eq('user_id', supabaseUid) // IMPORTANT: Filter by authenticated user's ID
      .select(); // Select the updated record to return (or single if expecting one)

    if (error) {
      console.error('[update-user-physiology] Error updating data:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'DB_ERROR',
          message: 'Failed to update user physiology data',
          details: error.message,
        }),
      };
    }
    
    // Check if any record was actually updated (if it exists)
    if (!data || data.length === 0) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
                error: 'NOT_FOUND',
                message: 'User training profile not found for authenticated user, or no data changed.'
            })
        }
    }

    console.log(`[update-user-physiology] Successfully updated data for user ${supabaseUid}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, profile: data[0] }), // Return updated profile
    };
  } catch (error) {
    console.error('[update-user-physiology] Critical error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: 'Failed to update user physiology due to an unexpected server error',
        details: error.message,
      }),
    };
  }
};