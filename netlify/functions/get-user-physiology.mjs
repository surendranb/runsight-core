
import { createClient } from '@supabase/supabase-js';

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
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
        message: 'Only GET method is allowed',
      }),
    };
  }

  const userId = event.queryStringParameters?.userId;

  if (!userId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'MISSING_USER_ID',
        message: 'userId is required as a query parameter',
      }),
    };
  }

  console.log(`[get-user-physiology] Fetching physiology for user ${userId}`);

  try {
    console.log('Supabase URL:', process.env.VITE_SUPABASE_URL);
    console.log('Supabase Key:', process.env.SUPABASE_SERVICE_KEY);
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

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('user_training_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('[get-user-physiology] Error fetching data:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'DB_ERROR',
          message: 'Failed to fetch user physiology data',
          details: error.message,
        }),
      };
    }

    console.log(`[get-user-physiology] Successfully fetched data for user ${userId}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('[get-user-physiology] Critical error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch user physiology due to an unexpected server error',
        details: error.message,
      }),
    };
  }
};
