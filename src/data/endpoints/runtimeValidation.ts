import { z } from 'zod';

import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';

type ParseRuntimePayloadOptions<T> = {
  schema: z.ZodType<T>;
  payload: unknown;
  fallback: T;
  feature: string;
  endpoint: string;
};

export function parseRuntimePayloadOrFallback<T>({
  schema,
  payload,
  fallback,
  feature,
  endpoint,
}: ParseRuntimePayloadOptions<T>): T {
  const parsedPayload = schema.safeParse(payload);
  if (parsedPayload.success) {
    return parsedPayload.data;
  }

  const firstIssue = parsedPayload.error.issues[0];
  const firstIssueSummary = firstIssue
    ? `${firstIssue.path.join('.') || 'root'}:${firstIssue.message}`
    : 'unknown';
  const telemetry = getMobileTelemetry();
  telemetry.trackError(new Error('Invalid BFF payload shape'), {
    feature,
    url: endpoint,
    details: {
      issueCount: parsedPayload.error.issues.length,
      firstIssue: firstIssueSummary,
    },
  });
  telemetry.addBreadcrumb('network.payload_validation_failed', {
    feature,
    endpoint,
  });
  return fallback;
}
