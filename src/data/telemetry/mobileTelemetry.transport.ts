import { appEnv } from '@data/config/env';

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
}) => Record<string, string>;

let securityHeaderBuilderPromise: Promise<SecurityHeaderBuilder | null> | null = null;

async function getSecurityHeaderBuilder(): Promise<SecurityHeaderBuilder | null> {
  if (!securityHeaderBuilderPromise) {
    securityHeaderBuilderPromise = import('@data/security/mobileRequestSignature')
      .then(module => module.buildMobileRequestSecurityHeaders)
      .catch(() => null);
  }

  return securityHeaderBuilderPromise;
}

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
  const buildSecurityHeaders = await getSecurityHeaderBuilder();
  const securityHeaders = buildSecurityHeaders
    ? buildSecurityHeaders({
      method: 'POST',
      url: endpoint,
      body: payload,
    })
    : {};

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
