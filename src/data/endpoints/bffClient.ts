import {
  httpDelete,
  httpGet,
  httpPost,
  type HttpGetOptions,
  type HttpMutationOptions,
} from '@data/api/http/client';
import { getMobileApiEnvOrThrow } from '@data/config/env';
import { buildMobileRequestSecurityHeaders } from '@data/security/mobileRequestSignature';

type QueryValue = string | number | boolean | null | undefined;

type BffGetOptions = Omit<HttpGetOptions, 'headers'>;
type BffMutationOptions = Omit<HttpMutationOptions, 'headers'>;

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

export async function bffPost<TResponse, TBody = unknown>(
  path: string,
  body: TBody,
  options?: BffMutationOptions,
): Promise<TResponse> {
  const url = buildBffUrl(path);
  return httpPost<TResponse>(url, body, {
    ...options,
    headers: {
      ...buildMobileRequestSecurityHeaders({
        method: 'POST',
        url,
        body,
      }),
    },
  });
}

export async function bffDelete<TResponse = void>(
  path: string,
  options?: BffMutationOptions,
): Promise<TResponse> {
  const url = buildBffUrl(path);
  return httpDelete<TResponse>(url, {
    ...options,
    headers: {
      ...buildMobileRequestSecurityHeaders({
        method: 'DELETE',
        url,
      }),
    },
  });
}
