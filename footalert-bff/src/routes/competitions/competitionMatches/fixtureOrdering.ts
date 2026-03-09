import type {
  OrderedFixture,
  OrderedFixtureRound,
  RawCompetitionFixture,
} from './schemas.js';
import { toNumber, toRecord, toText } from './status.js';

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

export function buildOrderedFixtureRounds(
  items: RawCompetitionFixture[],
): OrderedFixtureRound[] {
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

export function flattenOrderedFixtureRounds(
  rounds: OrderedFixtureRound[],
): RawCompetitionFixture[] {
  return rounds.flatMap(round => round.fixtures.map(fixture => fixture.item));
}
