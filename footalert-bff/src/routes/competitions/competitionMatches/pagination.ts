import { env } from '../../../config/env.js';
import { PaginationCursorCodec } from '../../../lib/pagination/cursor.js';

import type { CompetitionMatchesPageInfo, OrderedFixtureRound } from './schemas.js';
import { ROUTE_PATH } from './schemas.js';
import { isTerminalMatchStatus } from './status.js';

const cursorCodec = new PaginationCursorCodec(
  env.paginationCursorSecret,
  env.paginationCursorTtlMs,
);

export function resolveSmartAnchorStartPosition(rounds: OrderedFixtureRound[]): number {
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

export function decodeCompetitionMatchesCursor(
  cursor: string,
  filtersHash: string,
): number {
  return cursorCodec.decode(cursor, {
    route: ROUTE_PATH,
    filtersHash,
  }).position;
}

export function buildCompetitionMatchesPageInfo(input: {
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
