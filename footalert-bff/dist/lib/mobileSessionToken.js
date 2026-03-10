import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
const TOKEN_ALG = 'HS256';
function encodeBase64Url(value) {
    return Buffer.from(value, 'utf8')
        .toString('base64')
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replaceAll('=', '');
}
function decodeBase64Url(value) {
    const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
    const padLength = (4 - (normalized.length % 4)) % 4;
    const padded = normalized.padEnd(normalized.length + padLength, '=');
    try {
        return Buffer.from(padded, 'base64').toString('utf8');
    }
    catch {
        return null;
    }
}
function sign(unsignedToken, secret) {
    return createHmac('sha256', secret)
        .update(unsignedToken)
        .digest('base64')
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replaceAll('=', '');
}
function isValidClaims(payload) {
    if (!payload || typeof payload !== 'object') {
        return false;
    }
    const claims = payload;
    if (typeof claims.sub !== 'string'
        || (claims.platform !== 'android' && claims.platform !== 'ios')
        || (claims.integrity !== 'strong'
            && claims.integrity !== 'device'
            && claims.integrity !== 'basic'
            && claims.integrity !== 'unknown')
        || !Array.isArray(claims.scope)
        || !claims.scope.every(scope => scope === 'api:read'
            || scope === 'notifications:write'
            || scope === 'telemetry:write'
            || scope === 'privacy:erase')
        || typeof claims.iat !== 'number'
        || typeof claims.exp !== 'number'
        || typeof claims.jti !== 'string') {
        return false;
    }
    return true;
}
export function createMobileSessionToken(input) {
    const nowMs = input.nowMs ?? Date.now();
    const iat = Math.floor(nowMs / 1_000);
    const exp = Math.floor((nowMs + input.ttlMs) / 1_000);
    const claims = {
        sub: input.subject,
        platform: input.platform,
        integrity: input.integrity,
        scope: input.scope,
        iat,
        exp,
        jti: randomUUID(),
    };
    const header = encodeBase64Url(JSON.stringify({ alg: TOKEN_ALG, typ: 'JWT' }));
    const payload = encodeBase64Url(JSON.stringify(claims));
    const unsignedToken = `${header}.${payload}`;
    const signature = sign(unsignedToken, input.secret);
    return {
        token: `${unsignedToken}.${signature}`,
        expiresAtMs: exp * 1_000,
        claims,
    };
}
export function verifyMobileSessionToken(token, secret, nowMs = Date.now()) {
    const [headerPart, payloadPart, signaturePart, overflow] = token.split('.');
    if (!headerPart || !payloadPart || !signaturePart || typeof overflow !== 'undefined') {
        return {
            ok: false,
            code: 'MOBILE_SESSION_TOKEN_INVALID',
            message: 'Malformed mobile session token.',
        };
    }
    const headerRaw = decodeBase64Url(headerPart);
    const payloadRaw = decodeBase64Url(payloadPart);
    if (!headerRaw || !payloadRaw) {
        return {
            ok: false,
            code: 'MOBILE_SESSION_TOKEN_INVALID',
            message: 'Invalid mobile session token encoding.',
        };
    }
    let header;
    let payload;
    try {
        header = JSON.parse(headerRaw);
        payload = JSON.parse(payloadRaw);
    }
    catch {
        return {
            ok: false,
            code: 'MOBILE_SESSION_TOKEN_INVALID',
            message: 'Invalid mobile session token payload.',
        };
    }
    if (!header || typeof header !== 'object' || header.alg !== TOKEN_ALG) {
        return {
            ok: false,
            code: 'MOBILE_SESSION_TOKEN_INVALID',
            message: 'Unsupported mobile session token algorithm.',
        };
    }
    if (!isValidClaims(payload)) {
        return {
            ok: false,
            code: 'MOBILE_SESSION_TOKEN_INVALID',
            message: 'Invalid mobile session token claims.',
        };
    }
    const expectedSignature = sign(`${headerPart}.${payloadPart}`, secret);
    const providedBuffer = Buffer.from(signaturePart, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
        return {
            ok: false,
            code: 'MOBILE_SESSION_TOKEN_INVALID',
            message: 'Invalid mobile session token signature.',
        };
    }
    const nowSec = Math.floor(nowMs / 1_000);
    if (payload.exp <= nowSec) {
        return {
            ok: false,
            code: 'MOBILE_SESSION_TOKEN_EXPIRED',
            message: 'Mobile session token is expired.',
        };
    }
    return {
        ok: true,
        claims: payload,
    };
}
