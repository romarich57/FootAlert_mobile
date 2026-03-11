import { LEGACY_HMAC_ENV_KEYS } from './defaults.js';
import { isProxyLikeEnvironment, readOptionalValue } from './readers.js';
import type { BffEnv } from './types.js';

export function validateEnv(env: BffEnv, source: NodeJS.ProcessEnv): void {
  if (isProxyLikeEnvironment(env.trustProxyHops, source) && env.corsAllowedOrigins.length === 0) {
    throw new Error('Missing CORS_ALLOWED_ORIGINS in proxy/staging/production mode.');
  }

  if (!env.mobileSessionJwtSecret) {
    throw new Error('Missing MOBILE_SESSION_JWT_SECRET.');
  }

  for (const key of LEGACY_HMAC_ENV_KEYS) {
    if (readOptionalValue(source[key])) {
      throw new Error(
        `Deprecated legacy HMAC configuration "${key}" is forbidden. Use mobile attestation + session tokens.`,
      );
    }
  }

  if (
    env.mobileAttestationEnforcementMode !== 'strict'
    && env.mobileAttestationEnforcementMode !== 'report_only'
  ) {
    throw new Error('MOBILE_ATTESTATION_ENFORCEMENT_MODE must be "strict" or "report_only".');
  }

  if (env.cacheStrictMode && env.cacheBackend !== 'redis') {
    throw new Error('CACHE_STRICT_MODE=true requires CACHE_BACKEND=redis.');
  }

  if (env.cacheBackend === 'redis' && !env.redisUrl) {
    throw new Error('CACHE_BACKEND=redis requires REDIS_URL.');
  }

  if (env.notificationsPersistenceBackend === 'postgres' && !env.databaseUrl) {
    throw new Error('NOTIFICATIONS_PERSISTENCE_BACKEND=postgres requires DATABASE_URL.');
  }

  if (env.notificationsBackendEnabled && !env.pushTokenEncryptionKey) {
    throw new Error('NOTIFICATIONS_BACKEND_ENABLED=true requires PUSH_TOKEN_ENCRYPTION_KEY.');
  }

  if (env.notificationsEventIngestEnabled && !env.notificationsIngestToken) {
    throw new Error(
      'NOTIFICATIONS_EVENT_INGEST_ENABLED=true requires NOTIFICATIONS_INGEST_TOKEN.',
    );
  }

  if (env.appEnv === 'staging' || env.appEnv === 'production') {
    if (env.notificationsPersistenceBackend !== 'postgres') {
      throw new Error('Staging/production requires NOTIFICATIONS_PERSISTENCE_BACKEND=postgres.');
    }
  }
}
