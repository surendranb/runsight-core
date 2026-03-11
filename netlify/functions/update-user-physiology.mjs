
import { createClient } from '@supabase/supabase-js';
import sessionUtils from './session.cjs';
import httpUtils from './http.cjs';

const ALLOWED_FIELDS = ['age', 'bodyWeight', 'fitnessLevel', 'maxHeartRate', 'restingHeartRate'];
const { getSession } = sessionUtils;
const { buildJsonHeaders } = httpUtils;

export const handler = async (event) => {
  const headers = buildJsonHeaders(event, 'POST, OPTIONS');
  const isVerboseLogging = process.env.NODE_ENV !== 'production';
  const debugLog = (...args) => {
    if (isVerboseLogging) {
      console.log(...args);
    }
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

  let requestBody;

  try {
    requestBody = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'INVALID_JSON',
        message: 'Request body must be valid JSON',
      }),
    };
  }

  const session = getSession(event);
  const userId = session?.stravaUserId;
  const { userId: ignoredUserId, ...physiologyData } = requestBody;

  if (!userId) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        error: 'AUTH_REQUIRED',
        message: 'Authentication required',
      }),
    };
  }

  debugLog('[update-user-physiology] Updating physiology');

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
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

    const supabase = createClient(supabaseUrl, supabaseKey);

    const sanitizedData = Object.fromEntries(
      Object.entries(physiologyData).filter(([key]) => ALLOWED_FIELDS.includes(key))
    );

    const { data, error } = await supabase
      .from('user_training_profiles')
      .upsert(
        {
          user_id: String(userId),
          ...sanitizedData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select('*')
      .single();

    if (error) {
      console.error('[update-user-physiology] Error updating data');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'DB_ERROR',
          message: 'Failed to update user physiology data',
        }),
      };
    }

    debugLog('[update-user-physiology] Successfully updated data');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(
        Object.fromEntries(Object.entries(data || {}).filter(([key]) => ALLOWED_FIELDS.includes(key)))
      ),
    };
  } catch (error) {
    console.error('[update-user-physiology] Critical error');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: 'Failed to update user physiology due to an unexpected server error',
      }),
    };
  }
};
