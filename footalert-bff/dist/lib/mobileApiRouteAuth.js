const EXCLUDED_PATHS = new Set([
    '/v1/mobile/session/challenge',
    '/v1/mobile/session/attest',
    '/v1/mobile/session/refresh',
    '/v1/mobile/session/revoke',
    '/v1/mobile/privacy/erase',
]);
function normalizeHost(rawHost) {
    return rawHost.trim().toLowerCase().split(',')[0].split(':')[0];
}
function resolveRequestHost(request) {
    const forwardedHostHeader = request.headers['x-forwarded-host'];
    if (typeof forwardedHostHeader === 'string' && forwardedHostHeader.trim().length > 0) {
        return normalizeHost(forwardedHostHeader);
    }
    const hostHeader = request.headers.host;
    if (typeof hostHeader === 'string' && hostHeader.trim().length > 0) {
        return normalizeHost(hostHeader);
    }
    return null;
}
export function shouldEnforceHostScopedMobileAuth(request, enforcedHosts) {
    if (enforcedHosts.length === 0) {
        return false;
    }
    const host = resolveRequestHost(request);
    if (!host) {
        return false;
    }
    return enforcedHosts.includes(host);
}
export function requiresGlobalMobileReadAuth(request) {
    const routePath = request.routeOptions.url;
    if (typeof routePath !== 'string' || !routePath.startsWith('/v1/')) {
        return false;
    }
    if (EXCLUDED_PATHS.has(routePath)) {
        return false;
    }
    if (routePath.startsWith('/v1/notifications/') || routePath.startsWith('/v1/telemetry/')) {
        return false;
    }
    return true;
}
