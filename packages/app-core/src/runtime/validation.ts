import { z } from 'zod';

import type { TelemetryAdapter } from '../adapters/telemetry.js';

export type RuntimeValidationOptions<T> = {
  schema: z.ZodType<T>;
  payload: unknown;
  fallback: T;
  telemetry: TelemetryAdapter;
  feature: string;
  endpoint: string;
};

export function parseRuntimePayloadOrFallback<T>({
  schema,
  payload,
  fallback,
  telemetry,
  feature,
  endpoint,
}: RuntimeValidationOptions<T>): T {
  const parsedPayload = schema.safeParse(payload);
  if (parsedPayload.success) {
    return parsedPayload.data;
  }

  telemetry.addBreadcrumb('network.payload_validation_failed', {
    endpoint,
    feature,
  });
  telemetry.trackError(parsedPayload.error, {
    feature,
    endpoint,
  });

  return fallback;
}
