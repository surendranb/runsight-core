const crypto = require('crypto');

const COOKIE_NAME = 'runsight_session';
const OAUTH_STATE_COOKIE_NAME = 'runsight_oauth_state';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10;

function base64urlEncode(value) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64urlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, 'base64').toString('utf8');
}

function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex === -1) {
        return cookies;
      }

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      cookies[key] = value;
      return cookies;
    }, {});
}

function getSessionSecret() {
  return process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_KEY;
}

function signPayload(encodedPayload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function getCookieAttributes(event) {
  const host = event?.headers?.host || event?.headers?.Host || '';
  const isLocalhost = host.includes('localhost') || host.startsWith('127.0.0.1');

  return [
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    isLocalhost ? '' : 'Secure',
  ].filter(Boolean);
}

function createSignedCookie(event, cookieName, payload, maxAgeSeconds) {
  const secret = getSessionSecret();

  if (!secret) {
    throw new Error('Missing session secret');
  }

  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload, secret);

  return [
    `${cookieName}=${encodedPayload}.${signature}`,
    ...getCookieAttributes(event),
    `Max-Age=${maxAgeSeconds}`,
  ].join('; ');
}

function clearCookie(event, cookieName) {
  return [
    `${cookieName}=`,
    ...getCookieAttributes(event),
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ].join('; ');
}

function getSignedCookiePayload(event, cookieName) {
  const secret = getSessionSecret();
  if (!secret) {
    return null;
  }

  const cookies = parseCookies(event?.headers?.cookie || event?.headers?.Cookie || '');
  const token = cookies[cookieName];

  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload, secret);
  const providedSignature = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    providedSignature.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(providedSignature, expectedSignatureBuffer)
  ) {
    return null;
  }

  try {
    return JSON.parse(base64urlDecode(encodedPayload));
  } catch {
    return null;
  }
}

function createSessionCookie(event, stravaUserId) {
  return createSignedCookie(event, COOKIE_NAME, {
    stravaUserId: Number(stravaUserId),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  }, SESSION_MAX_AGE_SECONDS);
}

function clearSessionCookie(event) {
  return clearCookie(event, COOKIE_NAME);
}

function createOAuthStateCookie(event) {
  const now = Math.floor(Date.now() / 1000);
  const state = crypto.randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  return {
    state,
    cookie: createSignedCookie(event, OAUTH_STATE_COOKIE_NAME, {
      state,
      iat: now,
      exp: now + OAUTH_STATE_MAX_AGE_SECONDS,
    }, OAUTH_STATE_MAX_AGE_SECONDS),
  };
}

function clearOAuthStateCookie(event) {
  return clearCookie(event, OAUTH_STATE_COOKIE_NAME);
}

function getOAuthState(event) {
  const payload = getSignedCookiePayload(event, OAUTH_STATE_COOKIE_NAME);

  if (!payload?.state || !payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

function getSession(event) {
  const payload = getSignedCookiePayload(event, COOKIE_NAME);

  if (!payload?.stravaUserId || !payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

module.exports = {
  COOKIE_NAME,
  OAUTH_STATE_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  OAUTH_STATE_MAX_AGE_SECONDS,
  createSessionCookie,
  clearSessionCookie,
  createOAuthStateCookie,
  clearOAuthStateCookie,
  getOAuthState,
  getSession,
};
