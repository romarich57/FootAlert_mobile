import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';
import { secureFetch } from '@data/api/http/secureTransport';

const DEFAULT_HTTP_TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload: string,
  ) {
    super(message);
  }
}

export class NetworkSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkSecurityError';
  }
}

type HttpBaseOptions = {
  headers?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal;
};

export type HttpGetOptions = HttpBaseOptions;
export type HttpMutationOptions = HttpBaseOptions;

type HttpRequestOptions = HttpBaseOptions & {
  body?: unknown;
};

type HttpMethod = 'GET' | 'POST' | 'DELETE';

export function isNetworkRequestFailedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const normalizedMessage = error.message.trim().toLowerCase();
  return (
    normalizedMessage.includes('network request failed') ||
    normalizedMessage.includes('failed to fetch')
  );
}

async function httpRequest<T>(
  method: HttpMethod,
  url: string,
  options: HttpRequestOptions = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_HTTP_TIMEOUT_MS;
  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  };

  const response = await secureFetch(
    {
      method,
      url,
      headers: requestHeaders,
      body: options.body,
      signal: options.signal,
      timeoutMs,
    },
    {
      feature: 'network',
    },
  );

  if (!response.ok) {
    const body = await response.text();
    const apiError = new ApiError(`HTTP ${response.status}`, response.status, body.slice(0, 500));
    getMobileTelemetry().trackError(apiError, {
      feature: 'network',
      method,
      status: response.status,
      url,
    });
    throw apiError;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function httpGet<T>(url: string, options: HttpGetOptions = {}): Promise<T> {
  return httpRequest<T>('GET', url, options);
}

export async function httpPost<T>(
  url: string,
  body: unknown,
  options: HttpMutationOptions = {},
): Promise<T> {
  return httpRequest<T>('POST', url, {
    ...options,
    body,
  });
}

export async function httpDelete<T>(
  url: string,
  options: HttpMutationOptions = {},
): Promise<T> {
  return httpRequest<T>('DELETE', url, options);
}
