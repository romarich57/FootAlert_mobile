import { httpGet, type HttpGetOptions } from '@data/api/http/client';
import { getMobileApiEnvOrThrow } from '@data/config/env';

type QueryValue = string | number | boolean | null | undefined;

type BffGetOptions = Omit<HttpGetOptions, 'headers'>;

function buildQueryString(query?: Record<string, QueryValue>): string {
  if (!query) {
    return '';
  }

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === null || typeof value === 'undefined') {
      return;
    }

    params.set(key, String(value));
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export function buildBffUrl(path: string, query?: Record<string, QueryValue>): string {
  const { mobileApiBaseUrl } = getMobileApiEnvOrThrow();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${mobileApiBaseUrl}${normalizedPath}${buildQueryString(query)}`;
}

export async function bffGet<T>(
  path: string,
  query?: Record<string, QueryValue>,
  options?: BffGetOptions,
): Promise<T> {
  return httpGet<T>(buildBffUrl(path, query), options);
}
