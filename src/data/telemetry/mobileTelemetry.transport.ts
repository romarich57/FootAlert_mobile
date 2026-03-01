import { appEnv } from '@data/config/env';
import { secureFetch } from '@data/api/http/secureTransport';
import { buildSensitiveMobileAuthHeaders } from '@data/security/mobileSessionAuth';

import type {
  TelemetryBatchEndpointPath,
  TelemetryEndpointPath,
} from './mobileTelemetry.types';

function resolveTelemetryEndpoint(path: string): string {
  const baseUrl = appEnv.mobileApiBaseUrl.replace(/\/+$/, '');
  return `${baseUrl}${path}`;
}

export class TelemetryRequestError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number) {
    super(`Telemetry request failed (${statusCode})`);
    this.name = 'TelemetryRequestError';
    this.statusCode = statusCode;
  }
}

type SecurityHeaderBuilder = (options: {
  method: string;
  url: string;
  body?: unknown;
  scope: 'telemetry:write';
}) => Promise<Record<string, string>>;

export function resolveTelemetryBatchPath(path: TelemetryEndpointPath): TelemetryBatchEndpointPath {
  if (path === '/telemetry/events') {
    return '/telemetry/events/batch';
  }
  if (path === '/telemetry/errors') {
    return '/telemetry/errors/batch';
  }
  return '/telemetry/breadcrumbs/batch';
}

export function isBatchFallbackError(error: unknown): boolean {
  if (!(error instanceof TelemetryRequestError)) {
    return false;
  }

  return error.statusCode === 404 || error.statusCode === 415;
}

export async function postTelemetry(
  path: TelemetryEndpointPath | TelemetryBatchEndpointPath,
  payload: unknown,
): Promise<void> {
  const endpoint = resolveTelemetryEndpoint(path);
  const buildSecurityHeaders: SecurityHeaderBuilder = buildSensitiveMobileAuthHeaders;
  const securityHeaders = await buildSecurityHeaders({
    method: 'POST',
    url: endpoint,
    body: payload,
    scope: 'telemetry:write',
  });

  const response = await secureFetch(
    {
      method: 'POST',
      url: endpoint,
      headers: {
        Accept: 'application/json',
        ...securityHeaders,
      },
      body: payload,
    },
    {
      feature: 'telemetry',
      telemetryContext: {
        path,
      },
    },
  );

  if (!response.ok) {
    throw new TelemetryRequestError(response.status);
  }
}
