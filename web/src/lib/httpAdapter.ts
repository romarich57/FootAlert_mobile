import type { HttpAdapter, QueryValue } from '@app-core';

export class WebApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload: string,
  ) {
    super(message);
  }
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, QueryValue>): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${baseUrl}${normalizedPath}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === null || typeof value === 'undefined') {
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

function withTimeout(signal: AbortSignal | undefined, timeoutMs: number): {
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

export function createWebHttpAdapter(baseUrl: string): HttpAdapter {
  return {
    async get<T = unknown>(path: string, query?: Record<string, QueryValue>, options?: { signal?: AbortSignal; timeoutMs?: number; headers?: Record<string, string> }): Promise<T> {
      const url = buildUrl(baseUrl, path, query);
      const timeoutMs = options?.timeoutMs ?? 15000;
      const timeoutController = withTimeout(options?.signal, timeoutMs);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            ...(options?.headers ?? {}),
          },
          signal: timeoutController.signal,
        });

        if (!response.ok) {
          const payload = await response.text();
          throw new WebApiError(`HTTP ${response.status}`, response.status, payload.slice(0, 500));
        }

        return (await response.json()) as T;
      } finally {
        timeoutController.cleanup();
      }
    },
  };
}
