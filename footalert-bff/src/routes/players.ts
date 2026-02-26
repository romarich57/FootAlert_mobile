import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { apiFootballGet } from '../lib/apiFootballClient.js';
import { withCache } from '../lib/cache.js';
import {
  boundedPositiveIntSchema,
  numericStringSchema,
  seasonSchema,
} from '../lib/schemas.js';
import { parseOrThrow } from '../lib/validation.js';

type ApiFootballListResponse<T> = {
  response?: T[];
};

type PlayerDetailsResponseDto = {
  statistics?: Array<{
    team?: {
      id?: number;
      name?: string;
      logo?: string;
    };
    league?: {
      id?: number;
      name?: string;
      season?: number;
    };
    games?: {
      appearences?: number;
      rating?: string | null;
    };
    goals?: {
      total?: number;
      assists?: number;
    };
  }>;
};

type PlayerFixtureDto = {
  fixture?: {
    id?: number;
    date?: string;
  };
  league?: {
    id?: number;
    name?: string;
    logo?: string;
  };
  teams?: {
    home?: {
      id?: number;
      name?: string;
      logo?: string;
    };
    away?: {
      id?: number;
      name?: string;
      logo?: string;
    };
  };
  goals?: {
    home?: number | null;
    away?: number | null;
  };
};

type PlayerFixtureStatsDto = {
  team?: {
    id?: number;
    name?: string;
    logo?: string;
  };
  players?: Array<PlayerFixturePlayerEntry | PlayerFixturePlayersWrapper>;
};

type PlayerFixturePlayerEntry = {
  player?: {
    id?: number;
  };
  statistics?: Array<{
    games?: {
      minutes?: number;
      rating?: string | null;
      substitute?: boolean;
    };
    goals?: {
      total?: number | null;
      assists?: number | null;
      saves?: number | null;
    };
    cards?: {
      yellow?: number | null;
      yellowred?: number | null;
      red?: number | null;
    };
    penalty?: {
      won?: number | null;
      commited?: number | null;
      scored?: number | null;
      missed?: number | null;
      saved?: number | null;
    };
  }>;
};

type PlayerFixturePlayersWrapper = {
  players?: PlayerFixturePlayerEntry[];
};

type PlayerFixtureStat = NonNullable<PlayerFixturePlayerEntry['statistics']>[number];

type PlayerCareerSeasonAggregate = {
  season: string | null;
  leagueId?: string | null;
  leagueName?: string | null;
  team: {
    id: string | null;
    name: string | null;
    logo: string | null;
  };
  matches: number | null;
  goals: number | null;
  assists: number | null;
  rating: string | null;
};

type PlayerCareerTeamAggregate = {
  team: {
    id: string | null;
    name: string | null;
    logo: string | null;
  };
  period: string | null;
  matches: number | null;
  goals: number | null;
  assists: number | null;
};

type PlayerMatchPerformanceAggregate = {
  fixtureId: string;
  date: string | null;
  playerTeamId: string | null;
  competition: {
    id: string | null;
    name: string | null;
    logo: string | null;
  };
  homeTeam: {
    id: string | null;
    name: string | null;
    logo: string | null;
  };
  awayTeam: {
    id: string | null;
    name: string | null;
    logo: string | null;
  };
  goalsHome: number | null;
  goalsAway: number | null;
  playerStats: {
    minutes: number | null;
    rating: string | null;
    goals: number | null;
    assists: number | null;
    yellowCards: number | null;
    secondYellowCards: number | null;
    redCards: number | null;
    saves: number | null;
    penaltiesSaved: number | null;
    penaltiesMissed: number | null;
    isStarter: boolean | null;
  };
};

const playerIdParamsSchema = z
  .object({
    id: numericStringSchema,
  })
  .strict();

const playerDetailsQuerySchema = z
  .object({
    season: seasonSchema,
  })
  .strict();

const teamFixturesParamsSchema = z
  .object({
    teamId: numericStringSchema,
  })
  .strict();

const teamFixturesQuerySchema = z
  .object({
    season: seasonSchema,
    last: boundedPositiveIntSchema(1, 20).optional(),
  })
  .strict();

const fixtureTeamStatsParamsSchema = z
  .object({
    fixtureId: numericStringSchema,
    teamId: numericStringSchema,
  })
  .strict();

const playerMatchesQuerySchema = z
  .object({
    teamId: numericStringSchema,
    season: seasonSchema,
    last: boundedPositiveIntSchema(1, 20).optional(),
  })
  .strict();

const MIN_CAREER_SEASON_YEAR = 2005;
const CAREER_DETAILS_MAX_CONCURRENCY = 4;

function normalizeString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeRating(value: string | number | null | undefined, precision = 2): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed.toFixed(precision);
}

function toId(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function sumNullable(a: number | null, b: number | null): number | null {
  if (a === null && b === null) {
    return null;
  }

  return (a ?? 0) + (b ?? 0);
}

function toSeasonYear(value: string | null | undefined): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function toComparableNumber(value: number | null, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function hasPositiveNumber(value: number | null): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function hasValidRating(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed);
}

function hasCareerSeasonMeaningfulStats(season: PlayerCareerSeasonAggregate): boolean {
  return (
    hasPositiveNumber(season.matches) ||
    hasPositiveNumber(season.goals) ||
    hasPositiveNumber(season.assists) ||
    hasValidRating(season.rating)
  );
}

function extractPlayerStatisticsCandidates(
  performanceDto: PlayerFixtureStatsDto | null,
): PlayerFixturePlayerEntry[] {
  if (!Array.isArray(performanceDto?.players)) {
    return [];
  }

  const candidates: PlayerFixturePlayerEntry[] = [];

  performanceDto.players.forEach(group => {
    const directEntry = group as PlayerFixturePlayerEntry;
    if (directEntry.player || Array.isArray(directEntry.statistics)) {
      candidates.push(directEntry);
    }

    const nestedEntries = (group as PlayerFixturePlayersWrapper).players;
    if (!Array.isArray(nestedEntries)) {
      return;
    }

    nestedEntries.forEach(entry => {
      if (entry.player || Array.isArray(entry.statistics)) {
        candidates.push(entry);
      }
    });
  });

  return candidates;
}

function compareCareerSeasonsDesc(
  first: PlayerCareerSeasonAggregate,
  second: PlayerCareerSeasonAggregate,
): number {
  const firstYear = toSeasonYear(first.season);
  const secondYear = toSeasonYear(second.season);
  if (secondYear !== firstYear) {
    return secondYear - firstYear;
  }

  const firstMatches = toComparableNumber(first.matches, Number.NEGATIVE_INFINITY);
  const secondMatches = toComparableNumber(second.matches, Number.NEGATIVE_INFINITY);
  if (secondMatches !== firstMatches) {
    return secondMatches - firstMatches;
  }

  const firstGoals = toComparableNumber(first.goals, Number.NEGATIVE_INFINITY);
  const secondGoals = toComparableNumber(second.goals, Number.NEGATIVE_INFINITY);
  return secondGoals - firstGoals;
}

async function mapWithConcurrency<T, U>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<U>,
): Promise<U[]> {
  if (items.length === 0) {
    return [];
  }

  const boundedConcurrency = Math.max(1, Math.min(concurrency, items.length));
  const results = new Array<U>(items.length);
  let nextIndex = 0;

  const consume = async (): Promise<void> => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await worker(items[currentIndex] as T);
    }
  };

  await Promise.all(Array.from({ length: boundedConcurrency }, () => consume()));
  return results;
}

function buildCareerSeasonsToFetch(availableSeasons: number[]): number[] {
  const uniqueSortedSeasons = Array.from(
    new Set(availableSeasons.filter(value => Number.isInteger(value))),
  ).sort((a, b) => b - a);

  if (uniqueSortedSeasons.length === 0) {
    return [];
  }

  const earliestAvailableSeason = uniqueSortedSeasons.at(-1);
  if (typeof earliestAvailableSeason !== 'number' || earliestAvailableSeason <= MIN_CAREER_SEASON_YEAR) {
    return uniqueSortedSeasons;
  }

  const backfilledSeasons: number[] = [];
  for (
    let season = earliestAvailableSeason - 1;
    season >= MIN_CAREER_SEASON_YEAR;
    season -= 1
  ) {
    backfilledSeasons.push(season);
  }

  return uniqueSortedSeasons.concat(backfilledSeasons);
}

export function mapCareerSeasons(detailsDto: PlayerDetailsResponseDto): PlayerCareerSeasonAggregate[] {
  if (!detailsDto.statistics) {
    return [];
  }

  return detailsDto.statistics
    .map(stat => ({
      season: stat.league?.season ? String(stat.league.season) : null,
      leagueId: toId(stat.league?.id),
      leagueName: normalizeString(stat.league?.name),
      team: {
        id: toId(stat.team?.id),
        name: normalizeString(stat.team?.name),
        logo: normalizeString(stat.team?.logo),
      },
      matches: normalizeNumber(stat.games?.appearences),
      goals: normalizeNumber(stat.goals?.total),
      assists: normalizeNumber(stat.goals?.assists),
      rating: normalizeRating(stat.games?.rating, 2),
    }))
    .sort(compareCareerSeasonsDesc);
}

export function dedupeCareerSeasons(
  seasons: PlayerCareerSeasonAggregate[],
): PlayerCareerSeasonAggregate[] {
  const aggregatedByCompetition = new Map<
    string,
    PlayerCareerSeasonAggregate & {
      weightedRatingTotal: number;
      weightedRatingWeight: number;
    }
  >();
  const seenSignaturesByCompetition = new Map<string, Set<string>>();

  seasons.forEach((season, index) => {
    const seasonKey = season.season ?? `unknown-season-${index}`;
    const teamKey = season.team.id ?? season.team.name ?? `unknown-team-${index}`;
    const competitionKey = season.leagueId ?? season.leagueName ?? 'unknown-league';
    const key = `${seasonKey}-${teamKey}-${competitionKey}`;
    const signature = [
      season.matches ?? 'null',
      season.goals ?? 'null',
      season.assists ?? 'null',
      season.rating ?? 'null',
    ].join('|');

    let aggregate = aggregatedByCompetition.get(key);
    if (!aggregate) {
      aggregate = {
        ...season,
        matches: null,
        goals: null,
        assists: null,
        rating: null,
        weightedRatingTotal: 0,
        weightedRatingWeight: 0,
      };
      aggregatedByCompetition.set(key, aggregate);
      seenSignaturesByCompetition.set(key, new Set<string>());
    }

    const signatures = seenSignaturesByCompetition.get(key);
    if (!signatures) {
      return;
    }

    if (signatures.has(signature)) {
      return;
    }

    signatures.add(signature);
    aggregate.matches = sumNullable(aggregate.matches, season.matches);
    aggregate.goals = sumNullable(aggregate.goals, season.goals);
    aggregate.assists = sumNullable(aggregate.assists, season.assists);

    if (season.rating) {
      const parsedRating = Number.parseFloat(season.rating);
      if (Number.isFinite(parsedRating)) {
        const appearances = toComparableNumber(season.matches, 0);
        const ratingWeight = appearances > 0 ? appearances : 1;
        aggregate.weightedRatingTotal += parsedRating * ratingWeight;
        aggregate.weightedRatingWeight += ratingWeight;
      }
    }
  });

  const dedupedByCompetition = Array.from(aggregatedByCompetition.values())
    .map(competition => {
      const weightedRatingTotal = competition.weightedRatingTotal;
      const weightedRatingWeight = competition.weightedRatingWeight;

      return {
        season: competition.season,
        leagueId: competition.leagueId,
        leagueName: competition.leagueName,
        team: competition.team,
        matches: competition.matches,
        goals: competition.goals,
        assists: competition.assists,
        rating: weightedRatingWeight > 0
          ? (weightedRatingTotal / weightedRatingWeight).toFixed(2)
          : null,
      };
    });

  const aggregatedBySeasonTeam = new Map<
    string,
    PlayerCareerSeasonAggregate & { weightedRatingTotal: number; weightedRatingWeight: number }
  >();

  dedupedByCompetition.forEach((season, index) => {
    const seasonKey = season.season ?? `unknown-season-${index}`;
    const teamKey = season.team.id ?? season.team.name ?? `unknown-team-${index}`;
    const key = `${seasonKey}-${teamKey}`;

    const existing = aggregatedBySeasonTeam.get(key);

    if (!existing) {
      aggregatedBySeasonTeam.set(key, {
        ...season,
        weightedRatingTotal: 0,
        weightedRatingWeight: 0,
      });
    } else {
      existing.matches = sumNullable(existing.matches, season.matches);
      existing.goals = sumNullable(existing.goals, season.goals);
      existing.assists = sumNullable(existing.assists, season.assists);
    }

    const target = aggregatedBySeasonTeam.get(key);
    if (!target) {
      return;
    }

    if (season.rating) {
      const parsedRating = Number.parseFloat(season.rating);
      if (Number.isFinite(parsedRating)) {
        const appearances = toComparableNumber(season.matches, 0);
        const ratingWeight = appearances > 0 ? appearances : 1;
        target.weightedRatingTotal += parsedRating * ratingWeight;
        target.weightedRatingWeight += ratingWeight;
      }
    }
  });

  return Array.from(aggregatedBySeasonTeam.values())
    .map(item => {
      const weightedRatingTotal = item.weightedRatingTotal;
      const weightedRatingWeight = item.weightedRatingWeight;

      return {
        season: item.season,
        team: item.team,
        matches: item.matches,
        goals: item.goals,
        assists: item.assists,
        rating: weightedRatingWeight > 0
          ? (weightedRatingTotal / weightedRatingWeight).toFixed(2)
          : null,
      };
    })
    .filter(hasCareerSeasonMeaningfulStats)
    .sort(compareCareerSeasonsDesc);
}

export function aggregateCareerTeams(
  seasons: PlayerCareerSeasonAggregate[],
): PlayerCareerTeamAggregate[] {
  const teamMap = new Map<
    string,
    PlayerCareerTeamAggregate & { firstSeason: number; lastSeason: number }
  >();

  seasons.forEach(season => {
    const teamKey = season.team.id ?? season.team.name ?? '';
    if (!teamKey) {
      return;
    }

    if (!teamMap.has(teamKey)) {
      teamMap.set(teamKey, {
        team: season.team,
        period: null,
        matches: null,
        goals: null,
        assists: null,
        firstSeason: Number.POSITIVE_INFINITY,
        lastSeason: Number.NEGATIVE_INFINITY,
      });
    }

    const team = teamMap.get(teamKey);
    if (!team) {
      return;
    }

    team.matches = sumNullable(team.matches, season.matches);
    team.goals = sumNullable(team.goals, season.goals);
    team.assists = sumNullable(team.assists, season.assists);

    const year = season.season ? Number.parseInt(season.season, 10) : Number.NaN;
    if (!Number.isNaN(year)) {
      team.firstSeason = Math.min(team.firstSeason, year);
      team.lastSeason = Math.max(team.lastSeason, year);
    }
  });

  return Array.from(teamMap.values())
    .map(team => {
      const hasValidRange =
        Number.isFinite(team.firstSeason) && Number.isFinite(team.lastSeason);

      const period = hasValidRange
        ? (team.firstSeason === team.lastSeason
          ? `${team.firstSeason}`
          : `${team.firstSeason} - ${team.lastSeason}`)
        : null;

      return {
        team: team.team,
        period,
        matches: team.matches,
        goals: team.goals,
        assists: team.assists,
      };
    })
    .sort((first, second) => {
      const firstEnd = toSeasonYear(first.period?.split(' - ')[1] ?? first.period ?? null);
      const secondEnd = toSeasonYear(second.period?.split(' - ')[1] ?? second.period ?? null);
      if (secondEnd !== firstEnd) {
        return secondEnd - firstEnd;
      }

      const firstMatches = toComparableNumber(first.matches, Number.NEGATIVE_INFINITY);
      const secondMatches = toComparableNumber(second.matches, Number.NEGATIVE_INFINITY);
      return secondMatches - firstMatches;
    });
}

export function mapPlayerMatchPerformance(
  playerId: string,
  teamId: string,
  fixtureDto: PlayerFixtureDto,
  performanceDto: PlayerFixtureStatsDto | null,
): PlayerMatchPerformanceAggregate | null {
  const fixtureId = toId(fixtureDto.fixture?.id);
  if (!fixtureId || !fixtureDto.teams) {
    return null;
  }

  let playerStats: PlayerMatchPerformanceAggregate['playerStats'] = {
    minutes: null,
    rating: null,
    goals: null,
    assists: null,
    yellowCards: null,
    secondYellowCards: null,
    redCards: null,
    saves: null,
    penaltiesSaved: null,
    penaltiesMissed: null,
    isStarter: null,
  };

  const resolvePrimaryFixtureStat = (
    statistics: PlayerFixtureStat[] | undefined,
  ): PlayerFixtureStat | null => {
    if (!statistics || statistics.length === 0) {
      return null;
    }

    return [...statistics].sort((a, b) => {
      const aMinutes = normalizeNumber(a.games?.minutes) ?? 0;
      const bMinutes = normalizeNumber(b.games?.minutes) ?? 0;
      if (bMinutes !== aMinutes) {
        return bMinutes - aMinutes;
      }

      const aGoals = normalizeNumber(a.goals?.total) ?? 0;
      const bGoals = normalizeNumber(b.goals?.total) ?? 0;
      if (bGoals !== aGoals) {
        return bGoals - aGoals;
      }

      const aRating = Number.parseFloat(a.games?.rating ?? '');
      const bRating = Number.parseFloat(b.games?.rating ?? '');
      const safeARating = Number.isFinite(aRating) ? aRating : 0;
      const safeBRating = Number.isFinite(bRating) ? bRating : 0;
      return safeBRating - safeARating;
    })[0] ?? null;
  };

  if (performanceDto?.players) {
    const normalizedCandidates = extractPlayerStatisticsCandidates(performanceDto);
    const foundPlayer = normalizedCandidates.find(
      candidate => String(candidate.player?.id) === playerId,
    );

    if (foundPlayer && foundPlayer.statistics && foundPlayer.statistics.length > 0) {
      const stat = resolvePrimaryFixtureStat(foundPlayer.statistics);
      if (stat) {
        playerStats = {
          minutes: normalizeNumber(stat.games?.minutes),
          rating: normalizeRating(stat.games?.rating, 1),
          goals: normalizeNumber(stat.goals?.total),
          assists: normalizeNumber(stat.goals?.assists),
          yellowCards: normalizeNumber(stat.cards?.yellow),
          secondYellowCards: normalizeNumber(stat.cards?.yellowred),
          redCards: normalizeNumber(stat.cards?.red),
          saves: normalizeNumber(stat.goals?.saves),
          penaltiesSaved: normalizeNumber(stat.penalty?.saved),
          penaltiesMissed: normalizeNumber(stat.penalty?.missed),
          isStarter:
            typeof stat.games?.substitute === 'boolean'
              ? stat.games.substitute === false
              : null,
        };
      }
    }
  }

  return {
    fixtureId,
    date: normalizeString(fixtureDto.fixture?.date),
    playerTeamId: teamId,
    competition: {
      id: toId(fixtureDto.league?.id),
      name: normalizeString(fixtureDto.league?.name),
      logo: normalizeString(fixtureDto.league?.logo),
    },
    homeTeam: {
      id: toId(fixtureDto.teams.home?.id),
      name: normalizeString(fixtureDto.teams.home?.name),
      logo: normalizeString(fixtureDto.teams.home?.logo),
    },
    awayTeam: {
      id: toId(fixtureDto.teams.away?.id),
      name: normalizeString(fixtureDto.teams.away?.name),
      logo: normalizeString(fixtureDto.teams.away?.logo),
    },
    goalsHome: normalizeNumber(fixtureDto.goals?.home),
    goalsAway: normalizeNumber(fixtureDto.goals?.away),
    playerStats,
  };
}

export async function registerPlayersRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/players/:id', async request => {
    const params = parseOrThrow(playerIdParamsSchema, request.params);
    const query = parseOrThrow(playerDetailsQuerySchema, request.query);

    return withCache(`players:details:${request.url}`, 60_000, () =>
      apiFootballGet(
        `/players?id=${encodeURIComponent(params.id)}&season=${encodeURIComponent(String(query.season))}`,
      ),
    );
  });

  app.get('/v1/players/:id/seasons', async request => {
    const params = parseOrThrow(playerIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`players:seasons:${request.url}`, 120_000, () =>
      apiFootballGet(`/players/seasons?player=${encodeURIComponent(params.id)}`),
    );
  });

  app.get('/v1/players/:id/trophies', async request => {
    const params = parseOrThrow(playerIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`players:trophies:${request.url}`, 120_000, () =>
      apiFootballGet(`/trophies?player=${encodeURIComponent(params.id)}`),
    );
  });

  app.get('/v1/players/:id/career', async request => {
    const params = parseOrThrow(playerIdParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`players:career:${request.url}`, 120_000, async () => {
      const seasonsPayload = await apiFootballGet<ApiFootballListResponse<number>>(
        `/players/seasons?player=${encodeURIComponent(params.id)}`,
      );
      const seasons = buildCareerSeasonsToFetch(seasonsPayload.response ?? []);

      if (seasons.length === 0) {
        return {
          response: {
            seasons: [] as PlayerCareerSeasonAggregate[],
            teams: [] as PlayerCareerTeamAggregate[],
          },
        };
      }

      const detailsPayloads = await mapWithConcurrency(
        seasons,
        CAREER_DETAILS_MAX_CONCURRENCY,
        async season => {
          try {
            const payload = await withCache(
              `players:details:career:${params.id}:${season}`,
              60_000,
              () =>
                apiFootballGet<ApiFootballListResponse<PlayerDetailsResponseDto>>(
                  `/players?id=${encodeURIComponent(params.id)}&season=${encodeURIComponent(String(season))}`,
                ),
            );

            return payload.response?.[0] ?? null;
          } catch {
            return null;
          }
        },
      );

      const allSeasons = detailsPayloads.flatMap(details =>
        details ? mapCareerSeasons(details) : [],
      );
      const uniqueSeasons = dedupeCareerSeasons(allSeasons);

      return {
        response: {
          seasons: uniqueSeasons,
          teams: aggregateCareerTeams(uniqueSeasons),
        },
      };
    });
  });

  app.get('/v1/players/team/:teamId/fixtures', async request => {
    const params = parseOrThrow(teamFixturesParamsSchema, request.params);
    const query = parseOrThrow(teamFixturesQuerySchema, request.query);

    const searchParams = new URLSearchParams({
      team: params.teamId,
      season: String(query.season),
    });

    if (typeof query.last === 'number') {
      searchParams.set('last', String(query.last));
    }

    return withCache(`players:teamfixtures:${request.url}`, 45_000, () =>
      apiFootballGet(`/fixtures?${searchParams.toString()}`),
    );
  });

  app.get('/v1/players/fixtures/:fixtureId/team/:teamId/stats', async request => {
    const params = parseOrThrow(fixtureTeamStatsParamsSchema, request.params);
    parseOrThrow(z.object({}).strict(), request.query);

    return withCache(`players:fixturestats:${request.url}`, 45_000, () =>
      apiFootballGet(
        `/fixtures/players?fixture=${encodeURIComponent(params.fixtureId)}&team=${encodeURIComponent(params.teamId)}`,
      ),
    );
  });

  app.get('/v1/players/:id/matches', async request => {
    const params = parseOrThrow(playerIdParamsSchema, request.params);
    const query = parseOrThrow(playerMatchesQuerySchema, request.query);
    const lastCount = typeof query.last === 'number' ? query.last : 15;

    return withCache(`players:matches:${request.url}`, 45_000, async () => {
      const fixturesPayload = await apiFootballGet<ApiFootballListResponse<PlayerFixtureDto>>(
        `/fixtures?team=${encodeURIComponent(query.teamId)}&season=${encodeURIComponent(String(query.season))}&last=${encodeURIComponent(String(lastCount))}`,
      );
      const fixtures = fixturesPayload.response ?? [];

      const performances = await Promise.all(
        fixtures
          .filter(fixture => Boolean(fixture.fixture?.id))
          .map(async fixture => {
            const fixtureId = toId(fixture.fixture?.id);
            if (!fixtureId) {
              return null;
            }

            try {
              const fixtureStatsPayload = await withCache(
                `players:fixturestats:aggregate:${fixtureId}:${query.teamId}`,
                45_000,
                () =>
                  apiFootballGet<ApiFootballListResponse<PlayerFixtureStatsDto>>(
                    `/fixtures/players?fixture=${encodeURIComponent(fixtureId)}&team=${encodeURIComponent(query.teamId)}`,
                  ),
              );

              const fixtureStats = fixtureStatsPayload.response?.[0] ?? null;
              return mapPlayerMatchPerformance(params.id, query.teamId, fixture, fixtureStats);
            } catch {
              return mapPlayerMatchPerformance(params.id, query.teamId, fixture, null);
            }
          }),
      );

      return {
        response: performances.filter(
          (performance): performance is PlayerMatchPerformanceAggregate =>
            performance !== null,
        ),
      };
    });
  });
}
