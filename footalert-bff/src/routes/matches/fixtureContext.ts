import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { withCache } from '../../lib/cache.js';

export type FixtureContext = {
  fixture?: {
    id?: number;
    date?: string;
    timestamp?: number;
  };
  league?: {
    id?: number;
    season?: number;
  };
  teams?: {
    home?: {
      id?: number;
    };
    away?: {
      id?: number;
    };
  };
};

type FixtureListResponse = {
  response?: FixtureContext[];
};

export function toNumericId(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function toEpochMilliseconds(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  if (value > 1_000_000_000_000) {
    return value;
  }

  if (value > 1_000_000_000) {
    return value * 1_000;
  }

  return null;
}

export function toDateMilliseconds(value: unknown): number | null {
  if (typeof value !== 'string') {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function buildFixtureContextKey(matchId: string, timezone?: string): string {
  return timezone ? `match:context:${matchId}:${timezone}` : `match:context:${matchId}`;
}

export async function fetchFixtureContext(matchId: string, timezone?: string): Promise<FixtureContext | null> {
  const contextKey = buildFixtureContextKey(matchId, timezone);
  const payload = await withCache(contextKey, 30_000, () =>
    apiFootballGet<FixtureListResponse>(
      timezone
        ? `/fixtures?id=${encodeURIComponent(matchId)}&timezone=${encodeURIComponent(timezone)}`
        : `/fixtures?id=${encodeURIComponent(matchId)}`,
    ),
  );

  return payload.response?.[0] ?? null;
}
