export function resolveServiceUrls(rawBaseUrl) {
  const trimmedBaseUrl = rawBaseUrl?.trim();
  if (!trimmedBaseUrl) {
    throw new Error('Missing MOBILE_API_BASE_URL.');
  }

  const apiBaseUrl = trimmedBaseUrl.replace(/\/+$/, '');
  const hasVersionPrefix = /\/v1$/.test(apiBaseUrl);
  const serviceBaseUrl = hasVersionPrefix ? apiBaseUrl.replace(/\/v1$/, '') : apiBaseUrl;
  const apiPrefix = hasVersionPrefix ? '' : '/v1';

  return {
    apiBaseUrl,
    apiPrefix,
    hasVersionPrefix,
    serviceBaseUrl,
  };
}

export function readBooleanEnv(rawValue, fallback = false) {
  if (!rawValue) {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes') {
    return true;
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'no') {
    return false;
  }

  return fallback;
}

export function buildBearerHeaders(token, acceptHeader = 'application/json') {
  const headers = {
    Accept: acceptHeader,
  };

  if (token?.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  return headers;
}
