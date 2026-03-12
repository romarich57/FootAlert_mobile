import { createHash } from 'node:crypto';
export function hashSensitiveValue(value) {
    return createHash('sha256').update(value).digest('hex').slice(0, 12);
}
export function toCountBucket(value) {
    if (value <= 0) {
        return '0';
    }
    if (value <= 10) {
        return '1-10';
    }
    if (value <= 100) {
        return '11-100';
    }
    if (value <= 500) {
        return '101-500';
    }
    return '500+';
}
export function buildRedactedEventContext(input) {
    return {
        eventRef: input.eventId ? hashSensitiveValue(input.eventId) : undefined,
        alertTypeRef: input.alertType ? hashSensitiveValue(input.alertType) : undefined,
    };
}
export function logWorker(level, eventName, payload) {
    const logger = level === 'error' ? console.error : console.info;
    logger(`[notifications.worker] ${eventName}`, payload);
}
export function createWorkerServiceLogger() {
    const logger = {
        info: (obj, msg) => logWorker('info', msg ?? 'service_info', { payload: obj }),
        warn: (obj, msg) => logWorker('info', msg ?? 'service_warn', { payload: obj }),
        error: (obj, msg) => logWorker('error', msg ?? 'service_error', { payload: obj }),
        debug: () => undefined,
        trace: () => undefined,
        fatal: (obj, msg) => logWorker('error', msg ?? 'service_fatal', { payload: obj }),
        child: () => logger,
    };
    return logger;
}
export function resolveDateInTimezone(timezone, now = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    return formatter.format(now);
}
export function resolveSeasonFromDate(date) {
    const year = Number.parseInt(date.slice(0, 4), 10);
    const month = Number.parseInt(date.slice(5, 7), 10);
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
        return new Date().getUTCFullYear();
    }
    return month >= 7 ? year : year - 1;
}
export function parseOptionalNumber(value) {
    if (!value || value.trim().length === 0) {
        return undefined;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
}
export function parseOptionalText(value) {
    if (!value) {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
export function resolveRedisConnection(redisUrl) {
    const parsed = new URL(redisUrl);
    const secure = parsed.protocol === 'rediss:';
    return {
        host: parsed.hostname,
        port: parsed.port ? Number.parseInt(parsed.port, 10) : 6379,
        username: parsed.username || undefined,
        password: parsed.password || undefined,
        db: parsed.pathname ? Number.parseInt(parsed.pathname.replace('/', ''), 10) || 0 : 0,
        tls: secure ? {} : undefined,
    };
}
export function buildPushData(payload, eventId) {
    return Object.entries(payload.payload).reduce((acc, [key, value]) => {
        acc[key] = typeof value === 'string' ? value : JSON.stringify(value);
        return acc;
    }, {
        eventId,
        alertType: payload.alertType,
    });
}
