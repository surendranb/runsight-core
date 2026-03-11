function isLocalHost(hostname = '') {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function getRequestHost(event) {
  return (
    event?.headers?.['x-forwarded-host'] ||
    event?.headers?.host ||
    event?.headers?.Host ||
    ''
  );
}

function getAllowedOrigin(event) {
  const originHeader = event?.headers?.origin || event?.headers?.Origin;
  if (!originHeader) {
    return null;
  }

  try {
    const origin = new URL(originHeader);
    const requestHost = getRequestHost(event);

    if (origin.host === requestHost) {
      return origin.origin;
    }

    if (isLocalHost(origin.hostname)) {
      return origin.origin;
    }
  } catch {
    return null;
  }

  return null;
}

function buildJsonHeaders(event, methods, allowHeaders = 'Content-Type') {
  const headers = {
    'Access-Control-Allow-Headers': allowHeaders,
    'Access-Control-Allow-Methods': methods,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  };

  const allowedOrigin = getAllowedOrigin(event);
  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

module.exports = {
  buildJsonHeaders,
};
