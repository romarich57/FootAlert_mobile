import Config from 'react-native-config';
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

type SignatureInput = {
  method: string;
  pathWithQuery: string;
  timestamp: string;
  nonce: string;
  body: unknown;
};

const HEADER_TIMESTAMP = 'x-mobile-request-timestamp';
const HEADER_NONCE = 'x-mobile-request-nonce';
const HEADER_SIGNATURE = 'x-mobile-request-signature';

function resolveSigningKey(): string | null {
  const signingKey = Config.MOBILE_REQUEST_SIGNING_KEY?.trim();
  if (!signingKey) {
    return null;
  }

  return signingKey;
}

function normalizePrimitive(value: unknown): unknown {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value;
  }

  return null;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringify(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    const keys = Object.keys(objectValue).sort();
    const serializedEntries = keys.map(
      key => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`,
    );
    return `{${serializedEntries.join(',')}}`;
  }

  return JSON.stringify(normalizePrimitive(value));
}

function buildSignaturePayload(input: SignatureInput): string {
  return [
    input.method.toUpperCase(),
    input.pathWithQuery,
    input.timestamp,
    input.nonce,
    stableStringify(input.body ?? null),
  ].join('\n');
}

export function computeMobileRequestSignature(payload: string, key: string): string {
  const digest = hmac(sha256, utf8ToBytes(key), utf8ToBytes(payload));
  return bytesToHex(digest);
}

function buildNonce(): string {
  const runtimeGlobal = globalThis as { crypto?: { randomUUID?: () => string } };
  const runtimeCrypto = runtimeGlobal.crypto;
  if (runtimeCrypto && typeof runtimeCrypto.randomUUID === 'function') {
    return runtimeCrypto.randomUUID();
  }

  return `nonce-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function resolvePathWithQuery(url: string): string {
  const parsedUrl = new URL(url);
  return `${parsedUrl.pathname}${parsedUrl.search}`;
}

export function buildMobileRequestSecurityHeaders(options: {
  method: string;
  url: string;
  body?: unknown;
}): Record<string, string> {
  const signingKey = resolveSigningKey();
  if (!signingKey) {
    return {};
  }

  const timestamp = Date.now().toString();
  const nonce = buildNonce();
  const signaturePayload = buildSignaturePayload({
    method: options.method,
    pathWithQuery: resolvePathWithQuery(options.url),
    timestamp,
    nonce,
    body: options.body ?? null,
  });
  const signature = computeMobileRequestSignature(signaturePayload, signingKey);

  return {
    [HEADER_TIMESTAMP]: timestamp,
    [HEADER_NONCE]: nonce,
    [HEADER_SIGNATURE]: signature,
  };
}
