import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { BffError } from '../errors.js';

const CURSOR_VERSION = 1;

export type PaginationCursorPayload = {
  v: 1;
  route: string;
  filtersHash: string;
  position: number;
  issuedAt: number;
};

type EncodeCursorInput = {
  route: string;
  filtersHash: string;
  position: number;
  issuedAt?: number;
};

type DecodeCursorInput = {
  route: string;
  filtersHash: string;
  nowMs?: number;
};

function invalidCursor(message: string, details?: unknown): BffError {
  return new BffError(400, 'PAGINATION_CURSOR_INVALID', message, details);
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw invalidCursor(`Invalid pagination cursor field "${field}".`);
  }
}

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function fromBase64Url(value: string): string {
  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch {
    throw invalidCursor('Malformed pagination cursor.');
  }
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(item => stableSerialize(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableSerialize(entryValue)}`);

  return `{${entries.join(',')}}`;
}

function asCursorPayload(raw: unknown): PaginationCursorPayload {
  if (!raw || typeof raw !== 'object') {
    throw invalidCursor('Malformed pagination cursor payload.');
  }

  const payload = raw as Partial<PaginationCursorPayload>;
  if (payload.v !== CURSOR_VERSION) {
    throw invalidCursor('Unsupported pagination cursor version.');
  }
  if (typeof payload.route !== 'string' || payload.route.length === 0) {
    throw invalidCursor('Malformed pagination cursor route.');
  }
  if (typeof payload.filtersHash !== 'string' || payload.filtersHash.length === 0) {
    throw invalidCursor('Malformed pagination cursor filters hash.');
  }
  if (typeof payload.position !== 'number') {
    throw invalidCursor('Malformed pagination cursor position.');
  }
  if (typeof payload.issuedAt !== 'number') {
    throw invalidCursor('Malformed pagination cursor issue timestamp.');
  }

  assertPositiveInteger(payload.position, 'position');
  assertPositiveInteger(payload.issuedAt, 'issuedAt');

  return {
    v: CURSOR_VERSION,
    route: payload.route,
    filtersHash: payload.filtersHash,
    position: payload.position,
    issuedAt: payload.issuedAt,
  };
}

export function computePaginationFiltersHash(value: unknown): string {
  return createHash('sha256').update(stableSerialize(value)).digest('hex');
}

export class PaginationCursorCodec {
  constructor(
    private readonly secret: string,
    private readonly ttlMs: number,
  ) {
    if (!secret) {
      throw new Error('Pagination cursor secret cannot be empty.');
    }
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
      throw new Error('Pagination cursor TTL must be a positive integer.');
    }
  }

  encode(input: EncodeCursorInput): string {
    const position = Math.floor(input.position);
    assertPositiveInteger(position, 'position');

    const issuedAt = Math.floor(typeof input.issuedAt === 'number' ? input.issuedAt : Date.now());
    assertPositiveInteger(issuedAt, 'issuedAt');

    const payload: PaginationCursorPayload = {
      v: CURSOR_VERSION,
      route: input.route,
      filtersHash: input.filtersHash,
      position,
      issuedAt,
    };

    const payloadSerialized = JSON.stringify(payload);
    const payloadEncoded = toBase64Url(payloadSerialized);
    const signature = createHmac('sha256', this.secret).update(payloadEncoded).digest('base64url');
    return `${payloadEncoded}.${signature}`;
  }

  decode(cursor: string, input: DecodeCursorInput): PaginationCursorPayload {
    if (!cursor || typeof cursor !== 'string') {
      throw invalidCursor('Missing pagination cursor.');
    }

    const [payloadEncoded, signature] = cursor.split('.');
    if (!payloadEncoded || !signature || cursor.split('.').length !== 2) {
      throw invalidCursor('Malformed pagination cursor token.');
    }

    const expectedSignature = createHmac('sha256', this.secret)
      .update(payloadEncoded)
      .digest('base64url');

    const receivedBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      throw invalidCursor('Invalid pagination cursor signature.');
    }

    const payloadRaw = fromBase64Url(payloadEncoded);
    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(payloadRaw);
    } catch {
      throw invalidCursor('Malformed pagination cursor payload.');
    }

    const payload = asCursorPayload(parsedPayload);

    if (payload.route !== input.route) {
      throw invalidCursor('Pagination cursor route mismatch.');
    }
    if (payload.filtersHash !== input.filtersHash) {
      throw invalidCursor('Pagination cursor filters mismatch.');
    }

    const nowMs = typeof input.nowMs === 'number' ? input.nowMs : Date.now();
    if (nowMs - payload.issuedAt > this.ttlMs) {
      throw invalidCursor('Pagination cursor has expired.');
    }

    return payload;
  }
}
