// netlify/functions/logout.js - Clears the authentication cookie
const cookie = require('cookie');

exports.handler = async (event, context) => {
  const allowedOrigin = process.env.NETLIFY_SITE_URL || event.headers.origin || '*';

  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ error: 'METHOD_NOT_ALLOWED', message: 'Only POST method is allowed' }) 
    };
  }

  try {
    const sessionCookie = cookie.serialize('sb-session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
      expires: new Date(0), // Set expiry to past date to delete the cookie
    });

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Set-Cookie': sessionCookie,
      },
      body: JSON.stringify({ success: true, message: 'Logged out successfully' }),
    };

  } catch (error) {
    console.error('[logout] Critical error in handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'INTERNAL_SERVER_ERROR', message: 'Logout failed due to an unexpected server error' }),
    };
  }
};
