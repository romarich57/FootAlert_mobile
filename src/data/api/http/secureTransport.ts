import { ensureSslPinning } from '@data/security/networkPinning';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';

export type SecureTransportMethod = 'GET' | 'POST' | 'DELETE';

export type SecureTransportRequest = {
  method: SecureTransportMethod;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type SecureTransportOptions = {
  feature?: string;
  trackErrors?: boolean;
  telemetryContext?: Record<string, string | number | boolean | null | undefined>;
};

const DEFAULT_SECURE_TRANSPORT_TIMEOUT_MS = 30_000;

export class SecureTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecureTransportError';
  }
}

function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

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

function buildRequestPayload(
  body: unknown,
): { body: RequestInit['body']; isJsonBody: boolean } {
  if (typeof body === 'undefined') {
    return {
      body: undefined,
      isJsonBody: false,
    };
  }

  if (
    typeof body === 'string'
    || body instanceof FormData
    || body instanceof Blob
  ) {
    return {
      body,
      isJsonBody: false,
    };
  }

  return {
    body: JSON.stringify(body),
    isJsonBody: true,
  };
}

export async function secureFetch(
  request: SecureTransportRequest,
  options: SecureTransportOptions = {},
): Promise<Response> {
  const timeoutMs = request.timeoutMs ?? DEFAULT_SECURE_TRANSPORT_TIMEOUT_MS;
  const timeoutController = withTimeout(request.signal, timeoutMs);
  const payload = buildRequestPayload(request.body);
  const requestHeaders: Record<string, string> = {
    ...(request.headers ?? {}),
  };

  if (payload.isJsonBody && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  try {
    await ensureSslPinning(request.url);
    return await fetch(request.url, {
      method: request.method,
      headers: requestHeaders,
      body: payload.body,
      signal: timeoutController.signal,
    });
  } catch (error) {
    const trackedError =
      error instanceof Error
        ? error
        : new SecureTransportError('Network request failed before reaching server.');

    if (options.trackErrors !== false) {
      getMobileTelemetry().trackError(trackedError, {
        feature: options.feature ?? 'network',
        method: request.method,
        url: redactUrl(request.url),
        ...(options.telemetryContext ?? {}),
      });
    }
    throw trackedError;
  } finally {
    timeoutController.cleanup();
  }
}
