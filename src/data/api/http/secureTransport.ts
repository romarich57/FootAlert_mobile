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
type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;
type FetchBody = Exclude<FetchInit['body'], null | undefined>;
type FetchSignal = Exclude<FetchInit['signal'], undefined>;

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
  signal: FetchSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  if (signal?.aborted) {
    controller.abort();
  }
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const abortFromParent = () => controller.abort();
  let isAbortListenerAttached = false;
  if (signal && !signal.aborted) {
    signal.addEventListener('abort', abortFromParent, { once: true });
    isAbortListenerAttached = true;
  }

  return {
    signal: controller.signal as FetchSignal,
    cleanup: () => {
      clearTimeout(timeout);
      if (isAbortListenerAttached) {
        signal?.removeEventListener('abort', abortFromParent);
      }
    },
  };
}

function buildRequestPayload(
  body: unknown,
): { body: FetchInit['body']; isJsonBody: boolean } {
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
      body: body as FetchBody,
      isJsonBody: false,
    };
  }

  return {
    body: JSON.stringify(body) as FetchBody,
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
    const fetchInit: FetchInit = {
      method: request.method,
      headers: requestHeaders,
      body: payload.body,
      signal: timeoutController.signal,
    };
    return await fetch(request.url, fetchInit);
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
