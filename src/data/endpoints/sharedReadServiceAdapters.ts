import type {
  HttpAdapter,
  QueryValue,
  TelemetryAdapter,
  TelemetryAttributes,
} from '@app-core';
import { bffGet } from '@data/endpoints/bffClient';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';

const telemetry = getMobileTelemetry();

export const mobileReadHttpAdapter: HttpAdapter = {
  get<T = unknown>(
    path: string,
    query?: Record<string, QueryValue>,
    options?: {
      signal?: AbortSignal;
      timeoutMs?: number;
      headers?: Record<string, string>;
    },
  ): Promise<T> {
    return bffGet<T>(path, query, options);
  },
};

export const mobileReadTelemetryAdapter: TelemetryAdapter = {
  addBreadcrumb(name: string, attributes?: TelemetryAttributes) {
    telemetry.addBreadcrumb(name, attributes);
  },
  trackError(
    error: unknown,
    context: { feature: string; endpoint: string; details?: TelemetryAttributes },
  ) {
    telemetry.trackError(error, {
      feature: context.feature,
      details: {
        endpoint: context.endpoint,
        ...(context.details ?? {}),
      },
    });
  },
};
