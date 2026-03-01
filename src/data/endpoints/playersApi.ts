import { createPlayersReadService } from '@app-core/services/playersService';
import type {
  PlayerApiCareerSeasonAggregateDto,
  PlayerApiCareerTeamAggregateDto,
  PlayerApiDetailsDto,
  PlayerApiFixtureDto,
  PlayerApiMatchPerformanceDto,
  PlayerApiMatchesAggregateResponse,
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

export async function fetchTeamFixtures(
  teamId: string,
  season: number,
  amount: number = 10,
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
  amount: number = 15,
  signal?: AbortSignal,
): Promise<PlayerMatchPerformance[]> {
  const aggregateResponse = await playersReadService.fetchPlayerMatchesAggregate<
    NonNullable<PlayerApiMatchesAggregateResponse['response']>[number]
  >(playerId, teamId, season, amount, signal);

  return aggregateResponse
    .map(mapPlayerMatchPerformanceAggregate)
    .filter((item): item is PlayerMatchPerformance => item !== null);
}
