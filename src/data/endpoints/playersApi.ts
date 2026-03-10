import {
  createPlayersReadService,
  PLAYER_MATCHES_LIMIT,
} from '@app-core/services/playersService';
import type {
  PlayerApiCareerSeasonAggregateDto,
  PlayerApiCareerTeamAggregateDto,
  PlayerApiDetailsDto,
  PlayerApiFixtureDto,
  PlayerApiMatchPerformanceAggregateDto,
  PlayerApiOverviewResponse,
  PlayerApiMatchPerformanceDto,
  PlayerApiMatchesAggregateResponse,
  PlayerApiStatsCatalogResponse,
  PlayerApiTrophyDto,
  PlayerCareerSeason,
  PlayerCareerTeam,
  PlayerMatchPerformance,
} from '@domain/contracts/players.types';
import {
  mapPlayerCareerSeasonAggregate,
  mapPlayerCareerTeamAggregate,
  mapPlayerMatchPerformanceAggregate,
} from '@data/mappers/playersMapper';
import {
  mobileReadHttpAdapter,
  mobileReadTelemetryAdapter,
} from '@data/endpoints/sharedReadServiceAdapters';

const playersReadService = createPlayersReadService({
  http: mobileReadHttpAdapter,
  telemetry: mobileReadTelemetryAdapter,
});

export { PLAYER_MATCHES_LIMIT };

type PlayerApiFullResponse = {
  details: {
    response: PlayerApiDetailsDto[];
  };
  seasons: {
    response: number[];
  };
  trophies: {
    response: PlayerApiTrophyDto[];
  };
  career: {
    response: {
      seasons: PlayerApiCareerSeasonAggregateDto[];
      teams: PlayerApiCareerTeamAggregateDto[];
    };
  };
  overview: {
    response: PlayerApiOverviewResponse | null;
  };
  statsCatalog: {
    response: PlayerApiStatsCatalogResponse | null;
  };
  matches: {
    response: PlayerMatchPerformance[];
  };
};

export async function fetchPlayerDetails(
  playerId: string,
  season: number,
  signal?: AbortSignal,
): Promise<PlayerApiDetailsDto | null> {
  return playersReadService.fetchPlayerDetails<PlayerApiDetailsDto>(playerId, season, signal);
}

export async function fetchPlayerSeasons(
  playerId: string,
  signal?: AbortSignal,
): Promise<number[]> {
  return playersReadService.fetchPlayerSeasons(playerId, signal);
}

export async function fetchPlayerTrophies(
  playerId: string,
  signal?: AbortSignal,
): Promise<PlayerApiTrophyDto[]> {
  return playersReadService.fetchPlayerTrophies<PlayerApiTrophyDto>(playerId, signal);
}

export async function fetchPlayerCareerAggregate(
  playerId: string,
  signal?: AbortSignal,
): Promise<{ seasons: PlayerCareerSeason[]; teams: PlayerCareerTeam[] }> {
  const payload = await playersReadService.fetchPlayerCareerAggregate<
    PlayerApiCareerSeasonAggregateDto,
    PlayerApiCareerTeamAggregateDto
  >(playerId, signal);

  const seasons = payload.seasons
    .map(mapPlayerCareerSeasonAggregate)
    .sort((a, b) => {
      const aYear = a.season ? Number.parseInt(a.season, 10) : Number.NEGATIVE_INFINITY;
      const bYear = b.season ? Number.parseInt(b.season, 10) : Number.NEGATIVE_INFINITY;
      return bYear - aYear;
    });

  const teams = payload.teams.map(mapPlayerCareerTeamAggregate);

  return { seasons, teams };
}

export async function fetchPlayerOverview(
  playerId: string,
  season: number,
  signal?: AbortSignal,
): Promise<PlayerApiOverviewResponse | null> {
  return playersReadService.fetchPlayerOverview<PlayerApiOverviewResponse>(playerId, season, signal);
}

export async function fetchPlayerStatsCatalog(
  playerId: string,
  signal?: AbortSignal,
): Promise<PlayerApiStatsCatalogResponse | null> {
  return playersReadService.fetchPlayerStatsCatalog<PlayerApiStatsCatalogResponse>(playerId, signal);
}

export async function fetchPlayerFull(
  playerId: string,
  season: number,
  signal?: AbortSignal,
): Promise<PlayerApiFullResponse | null> {
  const payload = await playersReadService.fetchPlayerFull<{
    details?: {
      response?: PlayerApiDetailsDto[];
    };
    seasons?: {
      response?: number[];
    };
    trophies?: {
      response?: PlayerApiTrophyDto[];
    };
    career?: {
      response?: {
        seasons?: PlayerApiCareerSeasonAggregateDto[];
        teams?: PlayerApiCareerTeamAggregateDto[];
      };
    };
    overview?: {
      response?: PlayerApiOverviewResponse | null;
    };
    statsCatalog?: {
      response?: PlayerApiStatsCatalogResponse | null;
    };
    matches?: {
      response?: PlayerApiMatchPerformanceAggregateDto[];
    };
  }>(playerId, season, signal);

  if (!payload) {
    return null;
  }

  return {
    details: {
      response: Array.isArray(payload.details?.response) ? payload.details.response : [],
    },
    seasons: {
      response: Array.isArray(payload.seasons?.response) ? payload.seasons.response : [],
    },
    trophies: {
      response: Array.isArray(payload.trophies?.response) ? payload.trophies.response : [],
    },
    career: {
      response: {
        seasons: Array.isArray(payload.career?.response?.seasons)
          ? payload.career.response.seasons
          : [],
        teams: Array.isArray(payload.career?.response?.teams)
          ? payload.career.response.teams
          : [],
      },
    },
    overview: {
      response: payload.overview?.response ?? null,
    },
    statsCatalog: {
      response: payload.statsCatalog?.response ?? null,
    },
    matches: {
      response: (Array.isArray(payload.matches?.response) ? payload.matches.response : [])
        .map(mapPlayerMatchPerformanceAggregate)
        .filter((item): item is PlayerMatchPerformance => item !== null),
    },
  };
}

export async function fetchTeamFixtures(
  teamId: string,
  season: number,
  amount: number = PLAYER_MATCHES_LIMIT,
  signal?: AbortSignal,
): Promise<PlayerApiFixtureDto[]> {
  return playersReadService.fetchTeamFixtures<PlayerApiFixtureDto>(teamId, season, amount, signal);
}

export async function fetchFixturePlayerStats(
  fixtureId: string,
  teamId: string,
  signal?: AbortSignal,
): Promise<PlayerApiMatchPerformanceDto | null> {
  return playersReadService.fetchFixturePlayerStats<PlayerApiMatchPerformanceDto>(
    fixtureId,
    teamId,
    signal,
  );
}

export async function fetchPlayerMatchesAggregate(
  playerId: string,
  teamId: string,
  season: number,
  amount: number = PLAYER_MATCHES_LIMIT,
  signal?: AbortSignal,
): Promise<PlayerMatchPerformance[]> {
  const aggregateResponse = await playersReadService.fetchPlayerMatchesAggregate<
    NonNullable<PlayerApiMatchesAggregateResponse['response']>[number]
  >(playerId, teamId, season, amount, signal);

  return aggregateResponse
    .map(mapPlayerMatchPerformanceAggregate)
    .filter((item): item is PlayerMatchPerformance => item !== null);
}
