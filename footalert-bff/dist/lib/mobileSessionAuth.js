import { verifyMobileSessionToken, } from './mobileSessionToken.js';
const INTEGRITY_RANK = {
    unknown: 0,
    basic: 1,
    device: 2,
    strong: 3,
};
function resolveAuthorizationHeader(request) {
    const rawAuthorization = request.headers.authorization;
    if (Array.isArray(rawAuthorization)) {
        return rawAuthorization[0]?.trim() || null;
    }
    if (typeof rawAuthorization === 'string') {
        return rawAuthorization.trim();
    }
    return null;
}
function resolveBearerToken(request) {
    const authorization = resolveAuthorizationHeader(request);
    if (!authorization || !authorization.startsWith('Bearer ')) {
        return null;
    }
    return authorization.slice('Bearer '.length).trim() || null;
}
function hasRequiredIntegrity(actual, minimum) {
    return INTEGRITY_RANK[actual] >= INTEGRITY_RANK[minimum];
}
export function verifySensitiveMobileAuth(request, options) {
    const bearerToken = resolveBearerToken(request);
    const minimumIntegrity = options.minIntegrity ?? 'device';
    if (bearerToken) {
        if (!options.jwtSecret) {
            return {
                ok: false,
                failure: {
                    statusCode: 401,
                    code: 'MOBILE_SESSION_TOKEN_INVALID',
                    message: 'Mobile session token validation is not configured.',
                },
            };
        }
        const verification = verifyMobileSessionToken(bearerToken, options.jwtSecret);
        if (!verification.ok) {
            return {
                ok: false,
                failure: {
                    statusCode: 401,
                    code: verification.code,
                    message: verification.message,
                },
            };
        }
        if (!verification.claims.scope.includes(options.requiredScope)) {
            return {
                ok: false,
                failure: {
                    statusCode: 403,
                    code: 'MOBILE_SESSION_TOKEN_INVALID',
                    message: 'Missing required mobile session scope.',
                },
            };
        }
        if (!hasRequiredIntegrity(verification.claims.integrity, minimumIntegrity)) {
            return {
                ok: false,
                failure: {
                    statusCode: 403,
                    code: 'DEVICE_INTEGRITY_FAILED',
                    message: 'Device integrity is insufficient for this operation.',
                },
            };
        }
        return {
            ok: true,
            context: {
                authType: 'token',
                subject: verification.claims.sub,
                platform: verification.claims.platform,
                integrity: verification.claims.integrity,
                scope: verification.claims.scope,
            },
        };
    }
    return {
        ok: false,
        failure: {
            statusCode: 401,
            code: 'MOBILE_ATTESTATION_REQUIRED',
            message: 'Missing mobile session token.',
        },
    };
}
