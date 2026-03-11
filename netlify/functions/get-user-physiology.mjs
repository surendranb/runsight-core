
import { createClient } from '@supabase/supabase-js';
import sessionUtils from './session.cjs';
import httpUtils from './http.cjs';

const ALLOWED_FIELDS = ['age', 'bodyWeight', 'fitnessLevel', 'maxHeartRate', 'restingHeartRate'];
const { getSession } = sessionUtils;
const { buildJsonHeaders } = httpUtils;

export const handler = async (event) => {
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
        message: 'Only GET method is allowed',
      }),
    };
  }

  const session = getSession(event);
  const userId = session?.stravaUserId;

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

  debugLog('[get-user-physiology] Fetching physiology');

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

    const { data, error } = await supabase
      .from('user_training_profiles')
      .select('*')
      .eq('user_id', String(userId))
      .maybeSingle();

    if (error) {
      console.error('[get-user-physiology] Error fetching data');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'DB_ERROR',
          message: 'Failed to fetch user physiology data',
        }),
      };
    }

    const sanitized = data
      ? Object.fromEntries(Object.entries(data).filter(([key]) => ALLOWED_FIELDS.includes(key)))
      : {};

    debugLog('[get-user-physiology] Successfully fetched data');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(sanitized),
    };
  } catch (error) {
    console.error('[get-user-physiology] Critical error');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch user physiology due to an unexpected server error',
      }),
    };
  }
};
