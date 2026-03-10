import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { BffError } from '../errors.js';
const CURSOR_VERSION = 1;
function invalidCursor(message, details) {
    return new BffError(400, 'PAGINATION_CURSOR_INVALID', message, details);
}
function assertPositiveInteger(value, field) {
    if (!Number.isInteger(value) || value < 0) {
        throw invalidCursor(`Invalid pagination cursor field "${field}".`);
    }
}
function toBase64Url(value) {
    return Buffer.from(value, 'utf8').toString('base64url');
}
function fromBase64Url(value) {
    try {
        return Buffer.from(value, 'base64url').toString('utf8');
    }
    catch {
        throw invalidCursor('Malformed pagination cursor.');
    }
}
function stableSerialize(value) {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map(item => stableSerialize(item)).join(',')}]`;
    }
    const entries = Object.entries(value)
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableSerialize(entryValue)}`);
    return `{${entries.join(',')}}`;
}
function asCursorPayload(raw) {
    if (!raw || typeof raw !== 'object') {
        throw invalidCursor('Malformed pagination cursor payload.');
    }
    const payload = raw;
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
export function computePaginationFiltersHash(value) {
    return createHash('sha256').update(stableSerialize(value)).digest('hex');
}
export class PaginationCursorCodec {
    secret;
    ttlMs;
    constructor(secret, ttlMs) {
        this.secret = secret;
        this.ttlMs = ttlMs;
        if (!secret) {
            throw new Error('Pagination cursor secret cannot be empty.');
        }
        if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
            throw new Error('Pagination cursor TTL must be a positive integer.');
        }
    }
    encode(input) {
        const position = Math.floor(input.position);
        assertPositiveInteger(position, 'position');
        const issuedAt = Math.floor(typeof input.issuedAt === 'number' ? input.issuedAt : Date.now());
        assertPositiveInteger(issuedAt, 'issuedAt');
        const payload = {
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
    decode(cursor, input) {
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
        if (receivedBuffer.length !== expectedBuffer.length ||
            !timingSafeEqual(receivedBuffer, expectedBuffer)) {
            throw invalidCursor('Invalid pagination cursor signature.');
        }
        const payloadRaw = fromBase64Url(payloadEncoded);
        let parsedPayload;
        try {
            parsedPayload = JSON.parse(payloadRaw);
        }
        catch {
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
