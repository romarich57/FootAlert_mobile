import { env } from '../config/env.js';
import { UpstreamBffError } from './errors.js';

const RETRIABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildTimeoutSignal(timeoutMs: number, parentSignal?: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  parentSignal?.addEventListener('abort', () => controller.abort(), {
    once: true,
  });

  controller.signal.addEventListener(
    'abort',
    () => {
      clearTimeout(timeoutId);
    },
    { once: true },
  );

  return controller.signal;
}

function normalizeBody(body: string): string {
  return body.slice(0, 1_000);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function shouldRetryStatus(status: number): boolean {
  return RETRIABLE_STATUS_CODES.has(status);
}

function buildUrl(pathWithQuery: string): string {
  return `${env.apiFootballBaseUrl}${pathWithQuery}`;
}

export async function apiFootballGet<T>(
  pathWithQuery: string,
  signal?: AbortSignal,
): Promise<T> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= env.apiMaxRetries; attempt += 1) {
    const requestSignal = buildTimeoutSignal(env.apiTimeoutMs, signal);

    try {
      const response = await fetch(buildUrl(pathWithQuery), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'x-apisports-key': env.apiFootballKey,
        },
        signal: requestSignal,
      });

      if (!response.ok) {
        const responseBody = normalizeBody(await response.text());
        if (attempt < env.apiMaxRetries && shouldRetryStatus(response.status)) {
          await sleep(150 * (attempt + 1));
          continue;
        }

        throw new UpstreamBffError(
          response.status,
          'UPSTREAM_HTTP_ERROR',
          `API-Football returned HTTP ${response.status}.`,
          responseBody,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof UpstreamBffError) {
        throw error;
      }

      lastError = error;
      const canRetry = attempt < env.apiMaxRetries;

      if (canRetry && (isAbortError(error) || error instanceof TypeError)) {
        await sleep(150 * (attempt + 1));
        continue;
      }

      throw new UpstreamBffError(
        502,
        'UPSTREAM_UNAVAILABLE',
        'Unable to reach API-Football from BFF.',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  throw new UpstreamBffError(
    502,
    'UPSTREAM_UNAVAILABLE',
    'Unable to reach API-Football from BFF.',
    lastError,
  );
}
