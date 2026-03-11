import { createHash } from 'node:crypto';

import type { DispatchJobPayload } from '../lib/notifications/queue.js';

export type QueueLike = {
  add: (name: string, data: Record<string, unknown>, options?: Record<string, unknown>) => Promise<unknown>;
  close: () => Promise<void>;
};

export type WorkerLike = {
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  close: () => Promise<void>;
};

export type JobLike<TPayload> = {
  id?: string;
  name: string;
  data: TPayload;
  attemptsMade: number;
  opts: {
    attempts?: number;
  };
};

export type WorkerLogLevel = 'info' | 'error';

export type TeamFullWorkerLogger = {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
  debug: (obj: unknown, msg?: string) => void;
  trace: (obj: unknown, msg?: string) => void;
  fatal: (obj: unknown, msg?: string) => void;
  child: () => TeamFullWorkerLogger;
};

export function hashSensitiveValue(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

export function toCountBucket(value: number): string {
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

export function buildRedactedEventContext(input: { eventId?: string; alertType?: string }) {
  return {
    eventRef: input.eventId ? hashSensitiveValue(input.eventId) : undefined,
    alertTypeRef: input.alertType ? hashSensitiveValue(input.alertType) : undefined,
  };
}

export function logWorker(
  level: WorkerLogLevel,
  eventName: string,
  payload: Record<string, unknown>,
): void {
  const logger = level === 'error' ? console.error : console.info;
  logger(`[notifications.worker] ${eventName}`, payload);
}

export function createWorkerServiceLogger(): TeamFullWorkerLogger {
  const logger: TeamFullWorkerLogger = {
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

export function resolveDateInTimezone(timezone: string, now = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(now);
}

export function resolveSeasonFromDate(date: string): number {
  const year = Number.parseInt(date.slice(0, 4), 10);
  const month = Number.parseInt(date.slice(5, 7), 10);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return new Date().getUTCFullYear();
  }

  return month >= 7 ? year : year - 1;
}

export function parseOptionalNumber(value: string | undefined): number | undefined {
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseOptionalText(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function resolveRedisConnection(redisUrl: string): {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: Record<string, unknown>;
} {
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

export function buildPushData(
  payload: DispatchJobPayload['payload'],
  eventId: string,
): Record<string, string> {
  return Object.entries(payload.payload).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key] = typeof value === 'string' ? value : JSON.stringify(value);
    return acc;
  }, {
    eventId,
    alertType: payload.alertType,
  });
}
