// netlify/functions/check-db-status.js
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');

const JWT_SECRET = process.env.JWT_SECRET;

exports.handler = async (event, context) => {
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

  // --- Authentication Check ---
  const cookies = cookie.parse(event.headers.cookie || '');
  const sessionToken = cookies['sb-session'];

  if (!sessionToken) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'AUTH_REQUIRED' }) };
  }
  try {
    jwt.verify(sessionToken, JWT_SECRET);
  } catch (jwtError) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'INVALID_TOKEN' }) };
  }
  // --- END Authentication Check ---

  const { VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  const supabaseAdmin = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // A lightweight query to check for the 'runs' table's existence.
    const { error } = await supabaseAdmin.from('runs').select('id').limit(1);

    if (error && error.code === '42P01') { // 42P01: relation "runs" does not exist
      console.log('[check-db-status] Database needs setup. "runs" table not found.');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: 'needs_setup' }),
      };
    } else if (error) {
      // Any other database error is a server error
      throw error;
    }

    console.log('[check-db-status] Database is ready.');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'ready' }),
    };

  } catch (error) {
    console.error('[check-db-status] Critical error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'INTERNAL_ERROR', message: error.message }),
    };
  }
};
