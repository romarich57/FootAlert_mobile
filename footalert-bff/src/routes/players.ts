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
  players?: Array<{
    players?: Array<{
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
        };
        cards?: {
          yellow?: number | null;
          red?: number | null;
        };
      }>;
    }>;
  }>;
};

type PlayerCareerSeasonAggregate = {
  season: string | null;
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
    redCards: number | null;
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

export function mapCareerSeasons(detailsDto: PlayerDetailsResponseDto): PlayerCareerSeasonAggregate[] {
  if (!detailsDto.statistics) {
    return [];
  }

  return detailsDto.statistics
    .map(stat => ({
      season: stat.league?.season ? String(stat.league.season) : null,
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
    .sort((a, b) => {
      const aYear = a.season ? Number.parseInt(a.season, 10) : Number.NEGATIVE_INFINITY;
      const bYear = b.season ? Number.parseInt(b.season, 10) : Number.NEGATIVE_INFINITY;
      return bYear - aYear;
    });
}

export function dedupeCareerSeasons(
  seasons: PlayerCareerSeasonAggregate[],
): PlayerCareerSeasonAggregate[] {
  const deduped = new Map<
    string,
    PlayerCareerSeasonAggregate & { ratingSum: number; ratingCount: number }
  >();

  seasons.forEach((season, index) => {
    const seasonKey = season.season ?? `unknown-season-${index}`;
    const teamKey = season.team.id ?? season.team.name ?? `unknown-team-${index}`;
    const key = `${seasonKey}-${teamKey}`;

    const existing = deduped.get(key);

    if (!existing) {
      const initialRating = season.rating ? Number.parseFloat(season.rating) : null;
      deduped.set(key, {
        ...season,
        ratingSum: initialRating ?? 0,
        ratingCount: initialRating !== null ? 1 : 0,
      });
      return;
    }

    existing.matches = sumNullable(existing.matches, season.matches);
    existing.goals = sumNullable(existing.goals, season.goals);
    existing.assists = sumNullable(existing.assists, season.assists);

    if (season.rating) {
      existing.ratingSum += Number.parseFloat(season.rating);
      existing.ratingCount += 1;
    }
  });

  return Array.from(deduped.values())
    .map(item => {
      const { ratingSum, ratingCount, ...rest } = item;
      return {
        ...rest,
        rating: ratingCount > 0 ? (ratingSum / ratingCount).toFixed(2) : null,
      };
    })
    .sort((a, b) => {
      const aYear = a.season ? Number.parseInt(a.season, 10) : Number.NEGATIVE_INFINITY;
      const bYear = b.season ? Number.parseInt(b.season, 10) : Number.NEGATIVE_INFINITY;
      return bYear - aYear;
    });
}

export function aggregateCareerTeams(
  seasons: PlayerCareerSeasonAggregate[],
): PlayerCareerTeamAggregate[] {
  const teamMap = new Map<string, PlayerCareerTeamAggregate>();

  seasons.forEach(season => {
    const teamId = season.team.id ?? '';
    if (!teamId) {
      return;
    }

    if (!teamMap.has(teamId)) {
      teamMap.set(teamId, {
        team: season.team,
        period: null,
        matches: null,
        goals: null,
        assists: null,
      });
    }

    const team = teamMap.get(teamId);
    if (!team) {
      return;
    }

    team.matches = sumNullable(team.matches, season.matches);
    team.goals = sumNullable(team.goals, season.goals);
    team.assists = sumNullable(team.assists, season.assists);

    const year = season.season ? Number.parseInt(season.season, 10) : Number.NaN;
    if (!Number.isNaN(year)) {
      if (!team.period) {
        team.period = `${year}`;
      } else {
        const range = team.period.split(' - ').map(Number);
        const minYear = Math.min(...range, year);
        const maxYear = Math.max(...range, year);
        team.period = minYear === maxYear ? `${minYear}` : `${minYear} - ${maxYear}`;
      }
    }
  });

  return Array.from(teamMap.values());
}

export function mapPlayerMatchPerformance(
  playerId: string,
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
    redCards: null,
    isStarter: null,
  };

  if (performanceDto?.players) {
    for (const teamPlayers of performanceDto.players) {
      const foundPlayer = teamPlayers.players?.find(
        candidate => String(candidate.player?.id) === playerId,
      );

      if (!foundPlayer || !foundPlayer.statistics || foundPlayer.statistics.length === 0) {
        continue;
      }

      const stat = foundPlayer.statistics[0];
      playerStats = {
        minutes: normalizeNumber(stat.games?.minutes),
        rating: normalizeRating(stat.games?.rating, 1),
        goals: normalizeNumber(stat.goals?.total),
        assists: normalizeNumber(stat.goals?.assists),
        yellowCards: normalizeNumber(stat.cards?.yellow),
        redCards: normalizeNumber(stat.cards?.red),
        isStarter:
          typeof stat.games?.substitute === 'boolean'
            ? stat.games.substitute === false
            : null,
      };
      break;
    }
  }

  return {
    fixtureId,
    date: normalizeString(fixtureDto.fixture?.date),
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
      const seasons = (seasonsPayload.response ?? [])
        .filter(value => Number.isInteger(value))
        .sort((a, b) => b - a);

      if (seasons.length === 0) {
        return {
          response: {
            seasons: [] as PlayerCareerSeasonAggregate[],
            teams: [] as PlayerCareerTeamAggregate[],
          },
        };
      }

      const detailsPayloads = await Promise.all(
        seasons.map(async season => {
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
        }),
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
              return mapPlayerMatchPerformance(params.id, fixture, fixtureStats);
            } catch {
              return mapPlayerMatchPerformance(params.id, fixture, null);
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
