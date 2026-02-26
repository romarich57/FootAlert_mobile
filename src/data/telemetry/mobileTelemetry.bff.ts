import { serializeError, toTelemetryPayload } from './mobileTelemetry.payload';
import {
  isBatchFallbackError,
  postTelemetry,
  resolveTelemetryBatchPath,
} from './mobileTelemetry.transport';
import type {
  MobileTelemetry,
  TelemetryAttributes,
  TelemetryBatchEvent,
  TelemetryEndpointPath,
  TelemetryFlushReason,
} from './mobileTelemetry.types';
import {
  TELEMETRY_FLUSH_BATCH_SIZE,
  TELEMETRY_FLUSH_INTERVAL_MS,
  TELEMETRY_QUEUE_MAX_EVENTS,
} from './mobileTelemetry.types';

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
