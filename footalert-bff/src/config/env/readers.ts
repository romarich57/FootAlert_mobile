import type {
  AppEnv,
  AttestationEnforcementMode,
  CacheBackend,
  NodeRole,
  NotificationsPersistenceBackend,
} from './types.js';
import {
  DEFAULT_MOBILE_ATTESTATION_ENFORCEMENT_MODE,
  DEFAULT_REDIS_CACHE_PREFIX,
} from './defaults.js';

export function normalizeUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

export function readPositiveInt(rawValue: string | undefined, fallback: number): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function readNonNegativeInt(rawValue: string | undefined, fallback: number): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

export function readRequiredTrimmedValue(
  rawValue: string | undefined,
  errorMessage: string,
): string {
  const value = rawValue?.trim();
  if (!value) {
    throw new Error(errorMessage);
  }

  return value;
}

export function readBoolean(rawValue: string | undefined, fallback: boolean): boolean {
  if (!rawValue) {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes') {
    return true;
  }

  if (normalized === '0' || normalized === 'false' || normalized === 'no') {
    return false;
  }

  return fallback;
}

export function readCacheBackend(rawValue: string | undefined, fallback: CacheBackend): CacheBackend {
  const normalized = rawValue?.trim().toLowerCase();
  if (normalized === 'redis') {
    return 'redis';
  }
  if (normalized === 'memory') {
    return 'memory';
  }

  return fallback;
}

export function readNotificationsPersistenceBackend(
  rawValue: string | undefined,
  fallback: NotificationsPersistenceBackend,
): NotificationsPersistenceBackend {
  const normalized = rawValue?.trim().toLowerCase();
  if (normalized === 'postgres') {
    return 'postgres';
  }
  if (normalized === 'memory') {
    return 'memory';
  }

  return fallback;
}

export function readOptionalValue(rawValue: string | undefined): string | null {
  const value = rawValue?.trim();
  return value ? value : null;
}

export function readRedisCachePrefix(rawValue: string | undefined): string {
  const prefix = rawValue?.trim();
  return prefix || DEFAULT_REDIS_CACHE_PREFIX;
}

export function readCsvList(rawValue: string | undefined): string[] {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

export function readAttestationEnforcementMode(
  rawValue: string | undefined,
): AttestationEnforcementMode {
  const normalized = rawValue?.trim().toLowerCase();
  if (normalized === 'report_only' || normalized === 'report-only') {
    return 'report_only';
  }

  return DEFAULT_MOBILE_ATTESTATION_ENFORCEMENT_MODE;
}

export function readHostList(rawValue: string | undefined): string[] {
  return readCsvList(rawValue).map(host => host.toLowerCase());
}

export function readOptionalOrigin(rawValue: string | undefined): string | null {
  const trimmed = rawValue?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    throw new Error(`Invalid WEB_APP_ORIGIN value: "${trimmed}"`);
  }
}

export function buildCorsAllowedOrigins(
  rawOrigins: string | undefined,
  webAppOrigin: string | null,
): string[] {
  const normalizedOrigins = new Set<string>(readCsvList(rawOrigins));
  if (webAppOrigin) {
    normalizedOrigins.add(webAppOrigin);
  }

  return [...normalizedOrigins];
}

export function isProxyLikeEnvironment(trustProxyHops: number, source: NodeJS.ProcessEnv): boolean {
  const runtimeEnv = source.APP_ENV?.trim().toLowerCase() || source.NODE_ENV?.trim().toLowerCase();
  if (runtimeEnv === 'production' || runtimeEnv === 'staging') {
    return true;
  }

  return trustProxyHops > 0;
}

export function readAppEnv(rawValue: string | undefined): AppEnv {
  const normalized = rawValue?.trim().toLowerCase();
  if (normalized === 'production' || normalized === 'staging' || normalized === 'test') {
    return normalized;
  }

  return 'development';
}

export function readNodeRole(rawValue: string | undefined): NodeRole {
  const normalized = rawValue?.trim().toLowerCase();
  if (normalized === 'worker') {
    return 'worker';
  }

  return 'api';
}
