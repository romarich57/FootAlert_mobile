import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload: string,
  ) {
    super(message);
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

function withTimeout(
  signal: AbortSignal | undefined,
  timeoutMs: number,
): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const abortFromParent = () => controller.abort();
  signal?.addEventListener('abort', abortFromParent, { once: true });

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abortFromParent);
    },
  };
}

async function httpRequest<T>(
  method: HttpMethod,
  url: string,
  options: HttpRequestOptions = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const hasJsonBody = typeof options.body !== 'undefined';
  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  };

  if (hasJsonBody) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  let response: Response;
  const timeoutController = withTimeout(options.signal, timeoutMs);

  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: hasJsonBody ? JSON.stringify(options.body) : undefined,
      signal: timeoutController.signal,
    });
  } catch (error) {
    getMobileTelemetry().trackError(error, {
      feature: 'network',
      method,
      url,
    });
    throw error;
  } finally {
    timeoutController.cleanup();
  }

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
