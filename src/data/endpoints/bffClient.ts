import {
  httpDelete,
  httpGet,
  httpPost,
  type HttpGetOptions,
  type HttpMutationOptions,
} from '@data/api/http/client';
import { getMobileApiEnvOrThrow } from '@data/config/env';
import { buildSensitiveMobileAuthHeaders } from '@data/security/mobileSessionAuth';
import { MobileAttestationProviderUnavailableError } from '@data/security/mobileAttestationProvider';

type QueryValue = string | number | boolean | null | undefined;

type BffGetOptions = HttpGetOptions;
type BffMutationOptions = HttpMutationOptions;
type BffSensitiveScope = 'api:read' | 'notifications:write' | 'telemetry:write' | 'privacy:erase';

function isDevRuntime(): boolean {
  return typeof __DEV__ === 'boolean' && __DEV__;
}

async function resolveGetAuthHeaders(params: {
  url: string;
  scope: BffSensitiveScope;
}): Promise<Record<string, string>> {
  try {
    return await buildSensitiveMobileAuthHeaders({
      method: 'GET',
      url: params.url,
      scope: params.scope,
    });
  } catch (error) {
    // Dev-only fallback: allows local/staging debugging when native attestation bridge modules are not linked.
    if (
      isDevRuntime() &&
      params.scope === 'api:read' &&
      error instanceof MobileAttestationProviderUnavailableError
    ) {
      console.info(
        `[FootAlert][auth] ${error.message} Falling back to unauthenticated GET for ${params.url} in dev runtime.`,
      );
      return {};
    }

    throw error;
  }
}

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
  options?: BffGetOptions & { scope?: BffSensitiveScope },
): Promise<T> {
  const url = buildBffUrl(path, query);
  const scope = options?.scope ?? 'api:read';
  const authHeaders = await resolveGetAuthHeaders({
    url,
    scope,
  });

  return httpGet<T>(url, {
    ...options,
    headers: {
      ...options?.headers,
      ...authHeaders,
    },
  });
}

export async function bffGetSensitive<T>(
  path: string,
  query?: Record<string, QueryValue>,
  options?: HttpGetOptions & { scope?: BffSensitiveScope },
): Promise<T> {
  const url = buildBffUrl(path, query);
  const scope = options?.scope ?? 'notifications:write';
  const authHeaders = await resolveGetAuthHeaders({
    url,
    scope,
  });

  return httpGet<T>(url, {
    ...options,
    headers: {
      ...options?.headers,
      ...authHeaders,
    },
  });
}

export async function bffPost<TResponse, TBody = unknown>(
  path: string,
  body: TBody,
  options?: BffMutationOptions,
): Promise<TResponse> {
  const url = buildBffUrl(path);
  let scope: BffSensitiveScope = 'notifications:write';
  if (path.startsWith('/telemetry')) {
    scope = 'telemetry:write';
  } else if (path.startsWith('/mobile/privacy')) {
    scope = 'privacy:erase';
  }
  const authHeaders = await buildSensitiveMobileAuthHeaders({
    method: 'POST',
    url,
    body,
    scope,
  });
  return httpPost<TResponse>(url, body, {
    ...options,
    headers: {
      ...options?.headers,
      ...authHeaders,
    },
  });
}

export async function bffDelete<TResponse = void>(
  path: string,
  options?: BffMutationOptions,
): Promise<TResponse> {
  const url = buildBffUrl(path);
  const authHeaders = await buildSensitiveMobileAuthHeaders({
    method: 'DELETE',
    url,
    scope: 'notifications:write',
  });
  return httpDelete<TResponse>(url, {
    ...options,
    headers: {
      ...options?.headers,
      ...authHeaders,
    },
  });
}
