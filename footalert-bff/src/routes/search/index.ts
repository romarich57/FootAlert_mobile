import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { withCache } from '../../lib/cache.js';
import { mapWithConcurrency } from '../../lib/concurrency/mapWithConcurrency.js';
import { seasonSchema, timezoneSchema } from '../../lib/schemas.js';
import { parseOrThrow } from '../../lib/validation.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;
const MAX_TEAM_FIXTURE_LOOKUPS = 8;
const MAX_TEAM_FIXTURE_CONCURRENCY = 3;
const TEAM_FIXTURE_NEXT_COUNT = 3;

const searchGlobalQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(100),
    timezone: timezoneSchema,
    season: seasonSchema.optional(),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional(),
  })
  .strict();

type TeamSearchApiResponse = {
  response?: Array<{
    team?: {
      id?: number;
      name?: string;
      logo?: string;
      country?: string;
    };
  }>;
};

type PlayerProfilesApiResponse = {
  response?: Array<{
    player?: {
      id?: number;
      name?: string;
      photo?: string;
      position?: string;
    };
    statistics?: Array<{
      team?: {
        name?: string;
        logo?: string;
      };
      league?: {
        name?: string;
      };
      games?: {
        position?: string;
      };
    }>;
  }>;
};

type LeaguesSearchApiResponse = {
  response?: Array<{
    league?: {
      id?: number;
      name?: string;
      logo?: string;
      type?: string;
    };
    country?: {
      name?: string;
    };
  }>;
};

type TeamFixturesApiResponse = {
  response?: Array<{
    fixture?: {
      id?: number;
      date?: string;
      status?: {
        short?: string;
        long?: string;
      };
    };
    league?: {
      id?: number;
      name?: string;
      country?: string;
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
  }>;
};

type SearchTeamResult = {
  id: string;
  name: string;
  logo: string;
  country: string;
};

type SearchPlayerResult = {
  id: string;
  name: string;
  photo: string;
  position: string;
  teamName: string;
  teamLogo: string;
  leagueName: string;
};

type SearchCompetitionResult = {
  id: string;
  name: string;
  logo: string;
  country: string;
  type: string;
};

type SearchMatchResult = {
  fixtureId: string;
  startDate: string;
  statusShort: string;
  statusLong: string;
  competitionId: string;
  competitionName: string;
  competitionCountry: string;
  competitionLogo: string;
  homeTeamId: string;
  homeTeamName: string;
  homeTeamLogo: string;
  awayTeamId: string;
  awayTeamName: string;
  awayTeamLogo: string;
  homeGoals: number | null;
  awayGoals: number | null;
};

function toSafeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function mapTeamSearchResults(payload: TeamSearchApiResponse, limit: number): SearchTeamResult[] {
  const results: SearchTeamResult[] = [];

  for (const item of payload.response ?? []) {
    const teamId = toSafeNumber(item.team?.id);
    const teamName = item.team?.name?.trim() ?? '';
    if (!teamId || teamName.length === 0) {
      continue;
    }

    results.push({
      id: String(teamId),
      name: teamName,
      logo: item.team?.logo ?? '',
      country: item.team?.country ?? '',
    });

    if (results.length >= limit) {
      break;
    }
  }

  return results;
}

function mapPlayerSearchResults(
  payload: PlayerProfilesApiResponse,
  limit: number,
): SearchPlayerResult[] {
  const deduped = new Map<string, SearchPlayerResult>();

  for (const item of payload.response ?? []) {
    const playerId = toSafeNumber(item.player?.id);
    const playerName = item.player?.name?.trim() ?? '';
    if (!playerId || playerName.length === 0) {
      continue;
    }

    const firstStats = item.statistics?.[0];
    const playerPosition = firstStats?.games?.position ?? item.player?.position ?? '';
    deduped.set(String(playerId), {
      id: String(playerId),
      name: playerName,
      photo: item.player?.photo ?? '',
      position: playerPosition,
      teamName: firstStats?.team?.name ?? '',
      teamLogo: firstStats?.team?.logo ?? '',
      leagueName: firstStats?.league?.name ?? '',
    });

    if (deduped.size >= limit) {
      break;
    }
  }

  return Array.from(deduped.values());
}

function mapCompetitionSearchResults(
  payload: LeaguesSearchApiResponse,
  limit: number,
): SearchCompetitionResult[] {
  const deduped = new Map<string, SearchCompetitionResult>();

  for (const item of payload.response ?? []) {
    const competitionId = toSafeNumber(item.league?.id);
    const competitionName = item.league?.name?.trim() ?? '';
    if (!competitionId || competitionName.length === 0) {
      continue;
    }

    deduped.set(String(competitionId), {
      id: String(competitionId),
      name: competitionName,
      logo: item.league?.logo ?? '',
      country: item.country?.name ?? '',
      type: item.league?.type ?? '',
    });

    if (deduped.size >= limit) {
      break;
    }
  }

  return Array.from(deduped.values());
}

function mapMatchSearchResults(fixtures: TeamFixturesApiResponse['response'], limit: number): SearchMatchResult[] {
  const deduped = new Map<string, SearchMatchResult>();

  for (const item of fixtures ?? []) {
    const fixtureId = toSafeNumber(item.fixture?.id);
    if (!fixtureId || deduped.has(String(fixtureId))) {
      continue;
    }

    deduped.set(String(fixtureId), {
      fixtureId: String(fixtureId),
      startDate: item.fixture?.date ?? '',
      statusShort: item.fixture?.status?.short ?? '',
      statusLong: item.fixture?.status?.long ?? '',
      competitionId: String(item.league?.id ?? ''),
      competitionName: item.league?.name ?? '',
      competitionCountry: item.league?.country ?? '',
      competitionLogo: item.league?.logo ?? '',
      homeTeamId: String(item.teams?.home?.id ?? ''),
      homeTeamName: item.teams?.home?.name ?? '',
      homeTeamLogo: item.teams?.home?.logo ?? '',
      awayTeamId: String(item.teams?.away?.id ?? ''),
      awayTeamName: item.teams?.away?.name ?? '',
      awayTeamLogo: item.teams?.away?.logo ?? '',
      homeGoals: typeof item.goals?.home === 'number' ? item.goals.home : null,
      awayGoals: typeof item.goals?.away === 'number' ? item.goals.away : null,
    });
  }

  return Array.from(deduped.values())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, limit);
}

export async function registerSearchRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/search/global', async request => {
    const query = parseOrThrow(searchGlobalQuerySchema, request.query);
    const limit = query.limit ?? DEFAULT_LIMIT;

    return withCache(`search:global:${request.url}`, 30_000, async () => {
      const [teamsPayload, playersPayload, competitionsPayload] = await Promise.all([
        apiFootballGet<TeamSearchApiResponse>(
          `/teams?search=${encodeURIComponent(query.q)}`,
        ).catch(() => ({ response: [] })),
        apiFootballGet<PlayerProfilesApiResponse>(
          `/players/profiles?search=${encodeURIComponent(query.q)}`,
        ).catch(() => ({ response: [] })),
        apiFootballGet<LeaguesSearchApiResponse>(
          `/leagues?search=${encodeURIComponent(query.q)}`,
        ).catch(() => ({ response: [] })),
      ]);

      const teams = mapTeamSearchResults(teamsPayload, limit);
      const players = mapPlayerSearchResults(playersPayload, limit);
      const competitions = mapCompetitionSearchResults(competitionsPayload, limit);

      const teamIds = teams
        .map(team => team.id)
        .slice(0, Math.min(limit, MAX_TEAM_FIXTURE_LOOKUPS));

      const fixturePayloads = await mapWithConcurrency(
        teamIds,
        MAX_TEAM_FIXTURE_CONCURRENCY,
        async teamId => {
          const searchParams = new URLSearchParams({
            team: teamId,
            timezone: query.timezone,
            next: String(TEAM_FIXTURE_NEXT_COUNT),
          });

          if (typeof query.season === 'number') {
            searchParams.set('season', String(query.season));
          }

          return apiFootballGet<TeamFixturesApiResponse>(
            `/fixtures?${searchParams.toString()}`,
          ).catch(() => ({ response: [] }));
        },
      );

      const matches = mapMatchSearchResults(
        fixturePayloads.flatMap(payload => payload.response ?? []),
        limit,
      );

      return {
        teams,
        players,
        competitions,
        matches,
      };
    });
  });
}
