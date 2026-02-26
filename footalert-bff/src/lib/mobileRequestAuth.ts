import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { buildRequestSignaturePayload } from '@footalert/app-core/security/requestSignaturePayload';

const HEADER_TIMESTAMP = 'x-mobile-request-timestamp';
const HEADER_NONCE = 'x-mobile-request-nonce';
const HEADER_SIGNATURE = 'x-mobile-request-signature';

type MobileRequestAuthOptions = {
  signingKey?: string | null;
  maxSkewMs: number;
  nowMs?: () => number;
};

export type MobileRequestAuthFailure = {
  statusCode: 401 | 403;
  code: string;
  message: string;
};

const seenNonceStore = new Map<string, number>();

function computeMobileRequestSignature(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('hex');
}

function resolveHeaderValue(
  headers: FastifyRequest['headers'],
  headerName: string,
): string | null {
  const rawHeader = headers[headerName];
  if (Array.isArray(rawHeader)) {
    return rawHeader[0]?.trim() || null;
  }

  if (typeof rawHeader === 'string') {
    return rawHeader.trim() || null;
  }

  return null;
}

function isSameSignature(providedSignature: string, expectedSignature: string): boolean {
  const normalizedSignature = providedSignature.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalizedSignature)) {
    return false;
  }

  const providedBuffer = Buffer.from(normalizedSignature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

function pruneExpiredNonces(now: number): void {
  for (const [nonce, expiresAt] of seenNonceStore.entries()) {
    if (expiresAt <= now) {
      seenNonceStore.delete(nonce);
    }
  }
}

function isReplayNonce(nonce: string, now: number, maxSkewMs: number): boolean {
  pruneExpiredNonces(now);
  const currentExpiry = seenNonceStore.get(nonce);
  if (typeof currentExpiry === 'number' && currentExpiry > now) {
    return true;
  }

  seenNonceStore.set(nonce, now + maxSkewMs);
  return false;
}

function resolvePathWithQuery(request: FastifyRequest): string {
  return request.raw.url || request.url;
}

export function verifyMobileRequestAuth(
  request: FastifyRequest,
  options: MobileRequestAuthOptions,
): MobileRequestAuthFailure | null {
  const signingKey = options.signingKey?.trim();
  if (!signingKey) {
    return null;
  }

  const timestamp = resolveHeaderValue(request.headers, HEADER_TIMESTAMP);
  const nonce = resolveHeaderValue(request.headers, HEADER_NONCE);
  const signature = resolveHeaderValue(request.headers, HEADER_SIGNATURE);

  if (!timestamp || !nonce || !signature) {
    return {
      statusCode: 401,
      code: 'MOBILE_REQUEST_SIGNATURE_MISSING',
      message: 'Missing signed mobile request headers.',
    };
  }

  const timestampMs = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(timestampMs)) {
    return {
      statusCode: 401,
      code: 'MOBILE_REQUEST_TIMESTAMP_INVALID',
      message: 'Invalid mobile request timestamp.',
    };
  }

  const now = options.nowMs?.() ?? Date.now();
  if (Math.abs(now - timestampMs) > options.maxSkewMs) {
    return {
      statusCode: 401,
      code: 'MOBILE_REQUEST_TIMESTAMP_EXPIRED',
      message: 'Mobile request timestamp is outside the allowed window.',
    };
  }

  const signaturePayload = buildRequestSignaturePayload({
    method: request.method,
    pathWithQuery: resolvePathWithQuery(request),
    timestamp,
    nonce,
    body: request.body ?? null,
  });
  const expectedSignature = computeMobileRequestSignature(signaturePayload, signingKey);
  if (!isSameSignature(signature, expectedSignature)) {
    return {
      statusCode: 401,
      code: 'MOBILE_REQUEST_SIGNATURE_INVALID',
      message: 'Invalid mobile request signature.',
    };
  }

  if (isReplayNonce(nonce, now, options.maxSkewMs)) {
    return {
      statusCode: 403,
      code: 'MOBILE_REQUEST_REPLAY_DETECTED',
      message: 'Replay mobile request detected.',
    };
  }

  return null;
}

export function resetMobileRequestNonceStoreForTests(): void {
  seenNonceStore.clear();
}
