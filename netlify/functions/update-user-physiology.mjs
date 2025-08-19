
import { createClient } from '@supabase/supabase-js';

export const handler = async (event) => {
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
        message: 'Only POST method is allowed',
      }),
    };
  }

  const { userId, ...physiologyData } = JSON.parse(event.body);

  if (!userId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'MISSING_USER_ID',
        message: 'userId is required in the request body',
      }),
    };
  }

  console.log(`[update-user-physiology] Updating physiology for user ${userId}`);

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
      .update(physiologyData)
      .eq('user_id', userId);

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

    console.log(`[update-user-physiology] Successfully updated data for user ${userId}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
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
