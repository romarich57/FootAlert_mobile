import { appEnv } from '@data/config/env';
import { buildMobileRequestSecurityHeaders } from '@data/security/mobileRequestSignature';

export type TelemetryAttributes = Record<
  string,
  string | number | boolean | null | undefined
>;

export type TelemetryErrorContext = {
  feature?: string;
  status?: number;
  url?: string;
  method?: string;
  details?: TelemetryAttributes;
};

type TelemetryEndpointPath =
  | '/telemetry/events'
  | '/telemetry/errors'
  | '/telemetry/breadcrumbs';

type TelemetryBatchEndpointPath =
  | '/telemetry/events/batch'
  | '/telemetry/errors/batch'
  | '/telemetry/breadcrumbs/batch';

type TelemetryScalar = string | number | boolean | null;
type TelemetryPayload = Record<string, TelemetryScalar>;

export type TelemetryBatchEvent = {
  path: TelemetryEndpointPath;
  payload: Record<string, unknown>;
};

export type TelemetryFlushReason =
  | 'interval'
  | 'batch_size'
  | 'app_state_change'
  | 'shutdown'
  | 'manual';

export interface MobileTelemetry {
  trackEvent: (eventName: string, attributes?: TelemetryAttributes) => void;
  trackError: (
    error: unknown,
    context?: TelemetryErrorContext,
  ) => void;
  setUserContext: (attributes: TelemetryAttributes) => void;
  addBreadcrumb: (name: string, attributes?: TelemetryAttributes) => void;
  trackBatch: (events: TelemetryBatchEvent[]) => void;
  flush: (reason?: TelemetryFlushReason) => Promise<void>;
}

const TELEMETRY_QUEUE_MAX_EVENTS = 100;
const TELEMETRY_FLUSH_BATCH_SIZE = 20;
const TELEMETRY_FLUSH_INTERVAL_MS = 5_000;

function toTelemetryPayload(attributes: TelemetryAttributes | undefined): TelemetryPayload {
  if (!attributes) {
    return {};
  }

  return Object.entries(attributes).reduce<TelemetryPayload>((accumulator, [key, value]) => {
    if (typeof value === 'undefined') {
      return accumulator;
    }

    accumulator[key] = value;
    return accumulator;
  }, {});
}

export function createNoopMobileTelemetry(): MobileTelemetry {
  return {
    trackEvent: () => undefined,
    trackError: () => undefined,
    setUserContext: () => undefined,
    addBreadcrumb: () => undefined,
    trackBatch: () => undefined,
    flush: async () => undefined,
  };
}

function createConsoleMobileTelemetry(): MobileTelemetry {
  const userContext: TelemetryAttributes = {};

  const shouldLogAsWarning = (
    error: unknown,
    context?: TelemetryErrorContext,
  ): boolean => {
    if (
      context?.feature === 'network' &&
      typeof context.status === 'number' &&
      context.status >= 400 &&
      context.status < 500
    ) {
      return true;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      return true;
    }

    return false;
  };

  return {
    trackEvent: (eventName, attributes) => {
      console.info('[telemetry:event]', eventName, {
        ...userContext,
        ...(attributes ?? {}),
      });
    },
    trackError: (error, context) => {
      const payload = {
        error,
        context,
        userContext,
      };

      if (shouldLogAsWarning(error, context)) {
        console.warn('[telemetry:warn]', payload);
        return;
      }

      console.error('[telemetry:error]', payload);
    },
    setUserContext: attributes => {
      Object.assign(userContext, attributes);
    },
    addBreadcrumb: (name, attributes) => {
      console.info('[telemetry:breadcrumb]', name, {
        ...userContext,
        ...(attributes ?? {}),
      });
    },
    trackBatch: events => {
      events.forEach(event => {
        console.info('[telemetry:batch]', event.path, event.payload);
      });
    },
    flush: async () => undefined,
  };
}

function resolveTelemetryEndpoint(path: string): string {
  const baseUrl = appEnv.mobileApiBaseUrl.replace(/\/+$/, '');
  return `${baseUrl}${path}`;
}

class TelemetryRequestError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number) {
    super(`Telemetry request failed (${statusCode})`);
    this.name = 'TelemetryRequestError';
    this.statusCode = statusCode;
  }
}

function resolveTelemetryBatchPath(path: TelemetryEndpointPath): TelemetryBatchEndpointPath {
  if (path === '/telemetry/events') {
    return '/telemetry/events/batch';
  }
  if (path === '/telemetry/errors') {
    return '/telemetry/errors/batch';
  }
  return '/telemetry/breadcrumbs/batch';
}

function isBatchFallbackError(error: unknown): boolean {
  if (!(error instanceof TelemetryRequestError)) {
    return false;
  }

  return error.statusCode === 404 || error.statusCode === 415;
}

async function postTelemetry(
  path: TelemetryEndpointPath | TelemetryBatchEndpointPath,
  payload: unknown,
): Promise<void> {
  const endpoint = resolveTelemetryEndpoint(path);
  const securityHeaders = buildMobileRequestSecurityHeaders({
    method: 'POST',
    url: endpoint,
    body: payload,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...securityHeaders,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new TelemetryRequestError(response.status);
  }
}

function serializeError(error: unknown): {
  name: string;
  message: string;
  stack?: string;
} {
  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: error.message || 'Unknown error',
      stack: error.stack,
    };
  }

  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: error,
    };
  }

  let serialized = '[unserializable-error]';
  try {
    serialized = JSON.stringify(error);
  } catch {
    serialized = String(error);
  }

  return {
    name: 'UnknownError',
    message: serialized,
  };
}

export function createBffMobileTelemetry(): MobileTelemetry {
  const userContext: TelemetryAttributes = {};
  const queue: TelemetryBatchEvent[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let inFlightFlush: Promise<void> | null = null;

  const clearFlushTimer = (): void => {
    if (flushTimer === null) {
      return;
    }

    clearTimeout(flushTimer);
    flushTimer = null;
  };

  const scheduleFlush = (flush: () => Promise<void>): void => {
    if (queue.length === 0 || flushTimer !== null) {
      return;
    }

    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush().catch(() => undefined);
    }, TELEMETRY_FLUSH_INTERVAL_MS);
  };

  const enqueueBatch = (events: TelemetryBatchEvent[]): void => {
    if (events.length === 0) {
      return;
    }

    queue.push(...events);
    if (queue.length > TELEMETRY_QUEUE_MAX_EVENTS) {
      queue.splice(0, queue.length - TELEMETRY_QUEUE_MAX_EVENTS);
    }
  };

  const flushBatchByEndpoint = async (batch: TelemetryBatchEvent[]): Promise<void> => {
    const groupedByEndpoint = new Map<TelemetryEndpointPath, Record<string, unknown>[]>();

    for (const event of batch) {
      const existingPayloads = groupedByEndpoint.get(event.path);
      if (existingPayloads) {
        existingPayloads.push(event.payload);
      } else {
        groupedByEndpoint.set(event.path, [event.payload]);
      }
    }

    await Promise.allSettled(
      Array.from(groupedByEndpoint.entries()).map(async ([path, payloads]) => {
        try {
          await postTelemetry(resolveTelemetryBatchPath(path), payloads);
        } catch (error) {
          if (!isBatchFallbackError(error)) {
            throw error;
          }

          // Fallback for older backends that only support single-event ingestion.
          await Promise.allSettled(payloads.map(payload => postTelemetry(path, payload)));
        }
      }),
    );
  };

  const flushQueue = async (reason: TelemetryFlushReason = 'manual'): Promise<void> => {
    if (reason === 'shutdown') {
      clearFlushTimer();
    }

    if (inFlightFlush) {
      return inFlightFlush;
    }

    if (queue.length === 0) {
      clearFlushTimer();
      return;
    }

    clearFlushTimer();
    const batch = queue.splice(0, TELEMETRY_FLUSH_BATCH_SIZE);

    // Drop policy: failed requests are intentionally not re-queued.
    inFlightFlush = flushBatchByEndpoint(batch)
      .then(() => undefined)
      .finally(() => {
        inFlightFlush = null;

        if (queue.length >= TELEMETRY_FLUSH_BATCH_SIZE) {
          flushQueue('batch_size').catch(() => undefined);
          return;
        }

        scheduleFlush(() => flushQueue('interval'));
      });

    return inFlightFlush;
  };

  const enqueueAndMaybeFlush = (events: TelemetryBatchEvent[]): void => {
    enqueueBatch(events);

    if (queue.length >= TELEMETRY_FLUSH_BATCH_SIZE) {
      flushQueue('batch_size').catch(() => undefined);
      return;
    }

    scheduleFlush(() => flushQueue('interval'));
  };

  const buildEventPayload = (
    eventName: string,
    attributes?: TelemetryAttributes,
  ): Record<string, unknown> => ({
    name: eventName,
    attributes: toTelemetryPayload(attributes),
    userContext: toTelemetryPayload(userContext),
    timestamp: new Date().toISOString(),
  });

  const buildBreadcrumbPayload = (
    name: string,
    attributes?: TelemetryAttributes,
  ): Record<string, unknown> => ({
    name,
    attributes: toTelemetryPayload(attributes),
    userContext: toTelemetryPayload(userContext),
    timestamp: new Date().toISOString(),
  });

  return {
    trackEvent: (eventName, attributes) => {
      enqueueAndMaybeFlush([
        {
          path: '/telemetry/events',
          payload: buildEventPayload(eventName, attributes),
        },
      ]);
    },
    trackError: (error, context) => {
      const serializedError = serializeError(error);
      enqueueAndMaybeFlush([
        {
          path: '/telemetry/errors',
          payload: {
            ...serializedError,
            context: context
              ? {
                  feature: context.feature,
                  status: context.status,
                  url: context.url,
                  method: context.method,
                  details: toTelemetryPayload(context.details),
                }
              : undefined,
            userContext: toTelemetryPayload(userContext),
            timestamp: new Date().toISOString(),
          },
        },
      ]);
    },
    setUserContext: attributes => {
      Object.assign(userContext, attributes);
    },
    addBreadcrumb: (name, attributes) => {
      enqueueAndMaybeFlush([
        {
          path: '/telemetry/breadcrumbs',
          payload: buildBreadcrumbPayload(name, attributes),
        },
      ]);
    },
    trackBatch: events => {
      enqueueAndMaybeFlush(events);
    },
    flush: flushQueue,
  };
}

export function createDefaultMobileTelemetry(): MobileTelemetry {
  if (typeof __DEV__ === 'boolean' && __DEV__) {
    return createConsoleMobileTelemetry();
  }

  return createBffMobileTelemetry();
}

let activeTelemetry: MobileTelemetry = createNoopMobileTelemetry();

export function setMobileTelemetry(telemetry: MobileTelemetry): void {
  if (activeTelemetry !== telemetry) {
    activeTelemetry.flush('shutdown').catch(() => undefined);
  }
  activeTelemetry = telemetry;
}

export function getMobileTelemetry(): MobileTelemetry {
  return activeTelemetry;
}
