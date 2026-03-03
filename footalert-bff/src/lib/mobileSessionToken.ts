import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import type { MobileIntegrityLevel, MobilePlatform } from './mobileAttestation/index.js';

const TOKEN_ALG = 'HS256';

export type MobileSessionScope =
  | 'api:read'
  | 'notifications:write'
  | 'telemetry:write'
  | 'privacy:erase';

export type MobileSessionTokenClaims = {
  sub: string;
  platform: MobilePlatform;
  integrity: MobileIntegrityLevel;
  scope: MobileSessionScope[];
  iat: number;
  exp: number;
  jti: string;
};

export type MobileSessionTokenVerificationResult =
  | {
    ok: true;
    claims: MobileSessionTokenClaims;
  }
  | {
    ok: false;
    code: 'MOBILE_SESSION_TOKEN_INVALID' | 'MOBILE_SESSION_TOKEN_EXPIRED';
    message: string;
  };

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function decodeBase64Url(value: string): string | null {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized.padEnd(normalized.length + padLength, '=');

  try {
    return Buffer.from(padded, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function sign(unsignedToken: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(unsignedToken)
    .digest('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function isValidClaims(payload: unknown): payload is MobileSessionTokenClaims {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const claims = payload as Partial<MobileSessionTokenClaims>;
  if (
    typeof claims.sub !== 'string'
    || (claims.platform !== 'android' && claims.platform !== 'ios')
    || (claims.integrity !== 'strong'
      && claims.integrity !== 'device'
      && claims.integrity !== 'basic'
      && claims.integrity !== 'unknown')
    || !Array.isArray(claims.scope)
    || !claims.scope.every(
      scope =>
        scope === 'api:read'
        || scope === 'notifications:write'
        || scope === 'telemetry:write'
        || scope === 'privacy:erase',
    )
    || typeof claims.iat !== 'number'
    || typeof claims.exp !== 'number'
    || typeof claims.jti !== 'string'
  ) {
    return false;
  }

  return true;
}

export function createMobileSessionToken(input: {
  subject: string;
  platform: MobilePlatform;
  integrity: MobileIntegrityLevel;
  scope: MobileSessionScope[];
  ttlMs: number;
  secret: string;
  nowMs?: number;
}): {
  token: string;
  expiresAtMs: number;
  claims: MobileSessionTokenClaims;
} {
  const nowMs = input.nowMs ?? Date.now();
  const iat = Math.floor(nowMs / 1_000);
  const exp = Math.floor((nowMs + input.ttlMs) / 1_000);

  const claims: MobileSessionTokenClaims = {
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

export function verifyMobileSessionToken(
  token: string,
  secret: string,
  nowMs = Date.now(),
): MobileSessionTokenVerificationResult {
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

  let header: unknown;
  let payload: unknown;
  try {
    header = JSON.parse(headerRaw);
    payload = JSON.parse(payloadRaw);
  } catch {
    return {
      ok: false,
      code: 'MOBILE_SESSION_TOKEN_INVALID',
      message: 'Invalid mobile session token payload.',
    };
  }

  if (!header || typeof header !== 'object' || (header as { alg?: string }).alg !== TOKEN_ALG) {
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
