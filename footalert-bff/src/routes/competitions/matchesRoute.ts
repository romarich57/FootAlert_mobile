import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { env } from '../../config/env.js';
import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { buildCanonicalCacheKey, withCache } from '../../lib/cache.js';
import {
  PaginationCursorCodec,
  computePaginationFiltersHash,
} from '../../lib/pagination/cursor.js';
import { sliceByOffset } from '../../lib/pagination/slice.js';
import { boundedPositiveIntSchema, seasonSchema } from '../../lib/schemas.js';
import { parseOrThrow } from '../../lib/validation.js';

import { competitionIdParamsSchema } from './schemas.js';

const ROUTE_PATH = '/v1/competitions/:id/matches';
const DEFAULT_PAGINATION_LIMIT = 50;
const cursorCodec = new PaginationCursorCodec(
  env.paginationCursorSecret,
  env.paginationCursorTtlMs,
);
const paginationCursorSchema = z.string().trim().min(1).max(2048);
const competitionMatchesQuerySchema = z
  .object({
    season: seasonSchema,
    limit: boundedPositiveIntSchema(10, 100).optional(),
    cursor: paginationCursorSchema.optional(),
    anchor: z.enum(['smart', 'start']).default('smart'),
  })
  .strict();

type CompetitionMatchesEnvelope = {
  response?: unknown[];
} & Record<string, unknown>;

type RawCompetitionFixture = Record<string, unknown>;

type OrderedFixture = {
  item: RawCompetitionFixture;
  originalIndex: number;
  roundKey: string;
  timestamp: number;
  statusShort: string;
  statusLong: string;
  elapsed: number | null;
};

type OrderedFixtureRound = {
  fixtures: OrderedFixture[];
  roundKey: string;
  sortIndex: number;
  sortTimestamp: number;
};

type CompetitionMatchesPageInfo = {
  hasMore: boolean;
  nextCursor: string | null;
  returnedCount: number;
  hasPrevious: boolean;
  previousCursor: string | null;
};

const TERMINAL_SHORT_STATUSES = new Set(['FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO']);
const NON_TERMINAL_SHORT_STATUSES = new Set([
  'TBD',
  'NS',
  'PST',
  'SUSP',
  'INT',
  'LIVE',
  '1H',
  'HT',
  '2H',
  'ET',
  'BT',
  'P',
]);
const TERMINAL_LONG_STATUS_HINTS = [
  'finished',
  'after penalties',
  'penalties',
  'fulltime',
  'full time',
  'awarded',
  'walkover',
  'abandoned',
  'cancelled',
  'canceled',
];
const NON_TERMINAL_LONG_STATUS_HINTS = [
  'not started',
  'to be defined',
  'postponed',
  'delayed',
  'interrupted',
  'suspended',
  'in play',
  '1st half',
  '2nd half',
  'half time',
  'extra time',
  'penalty shootout',
  'break',
];

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function toText(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return '';
  }

  return String(value).trim();
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some(needle => haystack.includes(needle));
}

function isTerminalMatchStatus(
  shortStatus: string,
  longStatus: string,
  elapsed: number | null,
): boolean {
  const normalizedShortStatus = shortStatus.trim().toUpperCase();
  const normalizedLongStatus = longStatus.trim().toLowerCase();

  if (TERMINAL_SHORT_STATUSES.has(normalizedShortStatus)) {
    return true;
  }

  if (NON_TERMINAL_SHORT_STATUSES.has(normalizedShortStatus)) {
    return false;
  }

  if (normalizedLongStatus.length > 0) {
    if (includesAny(normalizedLongStatus, NON_TERMINAL_LONG_STATUS_HINTS)) {
      return false;
    }

    if (includesAny(normalizedLongStatus, TERMINAL_LONG_STATUS_HINTS)) {
      return true;
    }
  }

  if (typeof elapsed === 'number' && Number.isFinite(elapsed) && elapsed > 0) {
    return false;
  }

  return false;
}

function getFixtureTimestamp(fixture: RawCompetitionFixture, originalIndex: number): number {
  const fixturePayload = toRecord(fixture.fixture);
  const timestampSeconds = toNumber(fixturePayload?.timestamp);
  if (timestampSeconds !== null) {
    return timestampSeconds * 1000;
  }

  const dateValue = toText(fixturePayload?.date);
  if (dateValue.length > 0) {
    const parsedTimestamp = Date.parse(dateValue);
    if (Number.isFinite(parsedTimestamp)) {
      return parsedTimestamp;
    }
  }

  return Number.MAX_SAFE_INTEGER - 10_000 + originalIndex;
}

function normalizeOrderedFixtures(items: RawCompetitionFixture[]): OrderedFixture[] {
  return items.map((item, originalIndex) => {
    const fixturePayload = toRecord(item.fixture);
    const leaguePayload = toRecord(item.league);
    const statusPayload = toRecord(fixturePayload?.status);
    const roundLabel = toText(leaguePayload?.round);

    return {
      item,
      originalIndex,
      roundKey: roundLabel.length > 0 ? roundLabel : `__missing_round__:${originalIndex}`,
      timestamp: getFixtureTimestamp(item, originalIndex),
      statusShort: toText(statusPayload?.short),
      statusLong: toText(statusPayload?.long),
      elapsed: toNumber(statusPayload?.elapsed),
    };
  });
}

function buildOrderedFixtureRounds(items: RawCompetitionFixture[]): OrderedFixtureRound[] {
  const normalizedFixtures = normalizeOrderedFixtures(items).sort((first, second) => {
    return first.timestamp - second.timestamp || first.originalIndex - second.originalIndex;
  });
  const rounds = new Map<string, OrderedFixtureRound>();

  normalizedFixtures.forEach(fixture => {
    const existingRound = rounds.get(fixture.roundKey);
    if (existingRound) {
      existingRound.fixtures.push(fixture);
      return;
    }

    rounds.set(fixture.roundKey, {
      roundKey: fixture.roundKey,
      sortIndex: fixture.originalIndex,
      sortTimestamp: fixture.timestamp,
      fixtures: [fixture],
    });
  });

  return Array.from(rounds.values())
    .sort((first, second) => {
      return (
        first.sortTimestamp - second.sortTimestamp ||
        first.sortIndex - second.sortIndex ||
        first.roundKey.localeCompare(second.roundKey)
      );
    })
    .map(round => ({
      ...round,
      fixtures: [...round.fixtures].sort((first, second) => {
        return first.timestamp - second.timestamp || first.originalIndex - second.originalIndex;
      }),
    }));
}

function flattenOrderedFixtureRounds(rounds: OrderedFixtureRound[]): RawCompetitionFixture[] {
  return rounds.flatMap(round => round.fixtures.map(fixture => fixture.item));
}

function resolveSmartAnchorStartPosition(rounds: OrderedFixtureRound[]): number {
  if (rounds.length === 0) {
    return 0;
  }

  const anchorRoundIndex = rounds.findIndex(round =>
    round.fixtures.some(
      fixture => !isTerminalMatchStatus(fixture.statusShort, fixture.statusLong, fixture.elapsed),
    ),
  );
  const resolvedRoundIndex = anchorRoundIndex >= 0 ? anchorRoundIndex : rounds.length - 1;

  return rounds
    .slice(0, resolvedRoundIndex)
    .reduce((total, round) => total + round.fixtures.length, 0);
}

function buildCompetitionMatchesPageInfo(input: {
  filtersHash: string;
  limit: number;
  returnedCount: number;
  startPosition: number;
  totalCount: number;
}): CompetitionMatchesPageInfo {
  const hasMore = input.startPosition + input.returnedCount < input.totalCount;
  const hasPrevious = input.startPosition > 0;

  return {
    hasMore,
    nextCursor: hasMore
      ? cursorCodec.encode({
        route: ROUTE_PATH,
        filtersHash: input.filtersHash,
        position: input.startPosition + input.returnedCount,
      })
      : null,
    returnedCount: input.returnedCount,
    hasPrevious,
    previousCursor: hasPrevious
      ? cursorCodec.encode({
        route: ROUTE_PATH,
        filtersHash: input.filtersHash,
        position: Math.max(0, input.startPosition - input.limit),
      })
      : null,
  };
}

export function registerCompetitionMatchesRoute(app: FastifyInstance): void {
  app.get(
    '/v1/competitions/:id/matches',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
    const params = parseOrThrow(competitionIdParamsSchema, request.params);
    const query = parseOrThrow(competitionMatchesQuerySchema, request.query);
    const isCursorPagination = typeof query.limit === 'number' || typeof query.cursor === 'string';

    const upstreamCacheKey = buildCanonicalCacheKey('competition:matches:upstream', {
      competitionId: params.id,
      season: query.season,
    });
    const payload = await withCache(upstreamCacheKey, 90_000, () =>
      apiFootballGet<CompetitionMatchesEnvelope>(
        `/fixtures?league=${encodeURIComponent(params.id)}&season=${encodeURIComponent(String(query.season))}`,
      ),
    );

    if (!isCursorPagination) {
      return payload;
    }

    const limit = query.limit ?? DEFAULT_PAGINATION_LIMIT;
    const filtersHash = computePaginationFiltersHash({
      competitionId: params.id,
      season: query.season,
      anchor: query.anchor,
    });
    const orderedRounds = buildOrderedFixtureRounds(
      (Array.isArray(payload.response) ? payload.response : []) as RawCompetitionFixture[],
    );
    const orderedItems = flattenOrderedFixtureRounds(orderedRounds);
    const startPosition = query.cursor
      ? cursorCodec.decode(query.cursor, {
        route: ROUTE_PATH,
        filtersHash,
      }).position
      : query.anchor === 'smart'
        ? resolveSmartAnchorStartPosition(orderedRounds)
        : 0;
    const sliced = sliceByOffset({
      items: orderedItems,
      startPosition,
      limit,
    });
    const pageInfo = buildCompetitionMatchesPageInfo({
      filtersHash,
      limit,
      startPosition,
      returnedCount: sliced.sliced.length,
      totalCount: orderedItems.length,
    });

    return {
      ...payload,
      response: sliced.sliced,
      pageInfo,
    };
  });
}
