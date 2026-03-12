import { resolveEntityCacheTtlConfig } from '../cacheTtl.js';
import { DEFAULT_API_BASE_URL, DEFAULT_API_MAX_RETRIES, DEFAULT_API_TIMEOUT_MS, DEFAULT_BFF_ENABLE_PLAYER_CANONICAL_CACHE_KEYS, DEFAULT_BFF_ENABLE_PLAYER_MATCHES_SWR, DEFAULT_BFF_ENABLE_PLAYER_OVERVIEW_ROUTE, DEFAULT_BFF_EXPOSE_ERROR_DETAILS, DEFAULT_CACHE_CLEANUP_INTERVAL_MS, DEFAULT_CACHE_COALESCE_WAIT_MS, DEFAULT_CACHE_LOCK_TTL_MS, DEFAULT_CACHE_MAX_ENTRIES, DEFAULT_CACHE_TTL_JITTER_PCT, DEFAULT_HOST, DEFAULT_MOBILE_ATTESTATION_ACCEPT_MOCK, DEFAULT_MOBILE_AUTH_CHALLENGE_TTL_MS, DEFAULT_MOBILE_REFRESH_TOKEN_TTL_MS, DEFAULT_MOBILE_SESSION_TOKEN_TTL_MS, DEFAULT_NOTIFICATIONS_BACKEND_ENABLED, DEFAULT_NOTIFICATIONS_DEFERRED_DELAY_MS, DEFAULT_NOTIFICATIONS_DEFERRED_PROMOTION_BATCH, DEFAULT_NOTIFICATIONS_EVENT_INGEST_ENABLED, DEFAULT_NOTIFICATIONS_FANOUT_MAX_PER_EVENT, DEFAULT_PAGINATION_CURSOR_TTL_MS, DEFAULT_PORT, DEFAULT_RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_WINDOW_MS, DEFAULT_TRUST_PROXY_HOPS, DEFAULT_UPSTREAM_CIRCUIT_BREAKER_WINDOW_MS, DEFAULT_UPSTREAM_GLOBAL_RPM_LIMIT, defaultCacheBackendForEnv, defaultNotificationsPersistenceBackendForEnv, } from './defaults.js';
import { buildCorsAllowedOrigins, normalizeUrl, readAppEnv, readAttestationEnforcementMode, readBoolean, readCacheBackend, readHostList, readNodeRole, readNonNegativeInt, readNotificationsPersistenceBackend, readOptionalOrigin, readOptionalValue, readPositiveInt, readRedisCachePrefix, readRequiredTrimmedValue, } from './readers.js';
import { validateEnv } from './validation.js';
export function buildEnv(source = process.env) {
    const appEnv = readAppEnv(source.APP_ENV || source.NODE_ENV);
    const defaultCacheBackend = defaultCacheBackendForEnv(appEnv);
    const defaultCacheStrictMode = appEnv === 'production' || appEnv === 'staging';
    const defaultNotificationsPersistenceBackend = defaultNotificationsPersistenceBackendForEnv(appEnv);
    const webAppOrigin = readOptionalOrigin(source.WEB_APP_ORIGIN);
    const mobileSessionJwtSecret = readOptionalValue(source.MOBILE_SESSION_JWT_SECRET);
    const env = {
        appEnv,
        nodeRole: readNodeRole(source.NODE_ROLE),
        port: readPositiveInt(source.PORT, DEFAULT_PORT),
        host: source.HOST?.trim() || DEFAULT_HOST,
        apiFootballBaseUrl: normalizeUrl(source.API_FOOTBALL_BASE_URL?.trim() || DEFAULT_API_BASE_URL),
        apiFootballKey: readRequiredTrimmedValue(source.API_FOOTBALL_KEY, 'Missing API_FOOTBALL_KEY in BFF environment.'),
        apiTimeoutMs: readPositiveInt(source.API_TIMEOUT_MS, DEFAULT_API_TIMEOUT_MS),
        apiMaxRetries: readPositiveInt(source.API_MAX_RETRIES, DEFAULT_API_MAX_RETRIES),
        rateLimitMax: readPositiveInt(source.RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_MAX),
        rateLimitWindowMs: readPositiveInt(source.RATE_LIMIT_WINDOW_MS, DEFAULT_RATE_LIMIT_WINDOW_MS),
        trustProxyHops: Math.max(readPositiveInt(source.TRUST_PROXY_HOPS, DEFAULT_TRUST_PROXY_HOPS), 0),
        webAppOrigin,
        corsAllowedOrigins: buildCorsAllowedOrigins(source.CORS_ALLOWED_ORIGINS, webAppOrigin),
        cacheMaxEntries: readPositiveInt(source.CACHE_MAX_ENTRIES, DEFAULT_CACHE_MAX_ENTRIES),
        cacheCleanupIntervalMs: readPositiveInt(source.CACHE_CLEANUP_INTERVAL_MS, DEFAULT_CACHE_CLEANUP_INTERVAL_MS),
        cacheTtlJitterPct: readNonNegativeInt(source.CACHE_TTL_JITTER_PCT, DEFAULT_CACHE_TTL_JITTER_PCT),
        cacheLockTtlMs: readPositiveInt(source.CACHE_LOCK_TTL_MS, DEFAULT_CACHE_LOCK_TTL_MS),
        cacheCoalesceWaitMs: readPositiveInt(source.CACHE_COALESCE_WAIT_MS, DEFAULT_CACHE_COALESCE_WAIT_MS),
        upstreamGlobalRpmLimit: readNonNegativeInt(source.UPSTREAM_GLOBAL_RPM_LIMIT, DEFAULT_UPSTREAM_GLOBAL_RPM_LIMIT),
        upstreamCircuitBreakerWindowMs: readPositiveInt(source.UPSTREAM_CIRCUIT_BREAKER_WINDOW_MS, DEFAULT_UPSTREAM_CIRCUIT_BREAKER_WINDOW_MS),
        cacheBackend: readCacheBackend(source.CACHE_BACKEND, defaultCacheBackend),
        cacheStrictMode: readBoolean(source.CACHE_STRICT_MODE, defaultCacheStrictMode),
        redisUrl: readOptionalValue(source.REDIS_URL),
        redisCachePrefix: readRedisCachePrefix(source.REDIS_CACHE_PREFIX),
        cacheTtl: resolveEntityCacheTtlConfig(source),
        bffExposeErrorDetails: readBoolean(source.BFF_EXPOSE_ERROR_DETAILS, DEFAULT_BFF_EXPOSE_ERROR_DETAILS),
        mobileSessionJwtSecret,
        mobileSessionTokenTtlMs: readPositiveInt(source.MOBILE_SESSION_TOKEN_TTL_MS, DEFAULT_MOBILE_SESSION_TOKEN_TTL_MS),
        mobileRefreshTokenTtlMs: readPositiveInt(source.MOBILE_REFRESH_TOKEN_TTL_MS, DEFAULT_MOBILE_REFRESH_TOKEN_TTL_MS),
        mobileAuthChallengeTtlMs: readPositiveInt(source.MOBILE_AUTH_CHALLENGE_TTL_MS, DEFAULT_MOBILE_AUTH_CHALLENGE_TTL_MS),
        mobileAttestationAcceptMock: readBoolean(source.MOBILE_ATTESTATION_ACCEPT_MOCK, DEFAULT_MOBILE_ATTESTATION_ACCEPT_MOCK),
        mobileAttestationEnforcementMode: readAttestationEnforcementMode(source.MOBILE_ATTESTATION_ENFORCEMENT_MODE),
        mobileAuthEnforcedHosts: readHostList(source.MOBILE_AUTH_ENFORCED_HOSTS),
        mobilePlayIntegrityPackageName: readOptionalValue(source.MOBILE_PLAY_INTEGRITY_PACKAGE_NAME),
        mobilePlayIntegrityServiceAccountEmail: readOptionalValue(source.MOBILE_PLAY_INTEGRITY_SERVICE_ACCOUNT_EMAIL),
        mobilePlayIntegrityServiceAccountPrivateKey: readOptionalValue(source.MOBILE_PLAY_INTEGRITY_SERVICE_ACCOUNT_PRIVATE_KEY),
        mobileAppAttestBundleId: readOptionalValue(source.MOBILE_APP_ATTEST_BUNDLE_ID),
        mobileAppAttestTeamId: readOptionalValue(source.MOBILE_APP_ATTEST_TEAM_ID),
        mobileAppAttestVerificationUrl: readOptionalValue(source.MOBILE_APP_ATTEST_VERIFICATION_URL),
        mobileAppAttestVerificationSecret: readOptionalValue(source.MOBILE_APP_ATTEST_VERIFICATION_SECRET),
        paginationCursorSecret: readOptionalValue(source.PAGINATION_CURSOR_SECRET) ?? mobileSessionJwtSecret ?? '',
        paginationCursorTtlMs: readPositiveInt(source.PAGINATION_CURSOR_TTL_MS, DEFAULT_PAGINATION_CURSOR_TTL_MS),
        notificationsBackendEnabled: readBoolean(source.NOTIFICATIONS_BACKEND_ENABLED, DEFAULT_NOTIFICATIONS_BACKEND_ENABLED),
        notificationsEventIngestEnabled: readBoolean(source.NOTIFICATIONS_EVENT_INGEST_ENABLED, DEFAULT_NOTIFICATIONS_EVENT_INGEST_ENABLED),
        notificationsPersistenceBackend: readNotificationsPersistenceBackend(source.NOTIFICATIONS_PERSISTENCE_BACKEND, defaultNotificationsPersistenceBackend),
        notificationsFanoutMaxPerEvent: readPositiveInt(source.NOTIFICATIONS_FANOUT_MAX_PER_EVENT, DEFAULT_NOTIFICATIONS_FANOUT_MAX_PER_EVENT),
        notificationsDeferredPromotionBatch: readPositiveInt(source.NOTIFICATIONS_DEFERRED_PROMOTION_BATCH, DEFAULT_NOTIFICATIONS_DEFERRED_PROMOTION_BATCH),
        notificationsDeferredDelayMs: readPositiveInt(source.NOTIFICATIONS_DEFERRED_DELAY_MS, DEFAULT_NOTIFICATIONS_DEFERRED_DELAY_MS),
        bffEnablePlayerCanonicalCacheKeys: readBoolean(source.BFF_ENABLE_PLAYER_CANONICAL_CACHE_KEYS, DEFAULT_BFF_ENABLE_PLAYER_CANONICAL_CACHE_KEYS),
        bffEnablePlayerMatchesSwr: readBoolean(source.BFF_ENABLE_PLAYER_MATCHES_SWR, DEFAULT_BFF_ENABLE_PLAYER_MATCHES_SWR),
        bffEnablePlayerOverviewRoute: readBoolean(source.BFF_ENABLE_PLAYER_OVERVIEW_ROUTE, DEFAULT_BFF_ENABLE_PLAYER_OVERVIEW_ROUTE),
        databaseUrl: readOptionalValue(source.DATABASE_URL),
        notificationsIngestToken: readOptionalValue(source.NOTIFICATIONS_INGEST_TOKEN),
        pushTokenEncryptionKey: readOptionalValue(source.PUSH_TOKEN_ENCRYPTION_KEY),
        firebaseProjectId: readOptionalValue(source.FIREBASE_PROJECT_ID),
        firebaseClientEmail: readOptionalValue(source.FIREBASE_CLIENT_EMAIL),
        firebasePrivateKey: readOptionalValue(source.FIREBASE_PRIVATE_KEY),
        opsMetricsToken: readOptionalValue(source.OPS_METRICS_TOKEN),
    };
    validateEnv(env, source);
    return env;
}
