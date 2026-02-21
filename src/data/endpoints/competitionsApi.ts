import { bffGet } from '@data/endpoints/bffClient';
import type {
  CompetitionsApiLeagueDto,
  CompetitionsApiResponse,
  CompetitionsApiStandingDto,
  CompetitionsApiFixtureDto,
  CompetitionsApiPlayerStatDto,
  CompetitionsApiTransferDto,
} from '@ui/features/competitions/types/competitions.types';

export async function fetchAllLeagues(signal?: AbortSignal): Promise<CompetitionsApiLeagueDto[]> {
  const payload = await bffGet<CompetitionsApiResponse<CompetitionsApiLeagueDto>>(
    '/competitions',
    undefined,
    { signal },
  );

  return payload.response;
}

export async function searchLeaguesByName(
  query: string,
  signal?: AbortSignal,
): Promise<CompetitionsApiLeagueDto[]> {
  const payload = await bffGet<CompetitionsApiResponse<CompetitionsApiLeagueDto>>(
    '/competitions/search',
    { q: query },
    { signal },
  );

  return payload.response;
}

export async function fetchLeagueById(
  id: string,
  signal?: AbortSignal,
): Promise<CompetitionsApiLeagueDto | null> {
  const payload = await bffGet<CompetitionsApiResponse<CompetitionsApiLeagueDto>>(
    `/competitions/${encodeURIComponent(id)}`,
    undefined,
    { signal },
  );

  return payload.response[0] ?? null;
}

export async function fetchLeagueStandings(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiStandingDto | null> {
  const payload = await bffGet<CompetitionsApiResponse<CompetitionsApiStandingDto>>(
    `/competitions/${encodeURIComponent(String(leagueId))}/standings`,
    { season },
    { signal },
  );

  return payload.response[0] ?? null;
}

export async function fetchLeagueFixtures(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiFixtureDto[]> {
  const payload = await bffGet<CompetitionsApiResponse<CompetitionsApiFixtureDto>>(
    `/competitions/${encodeURIComponent(String(leagueId))}/matches`,
    { season },
    { signal },
  );

  return payload.response;
}

async function fetchLeaguePlayerStatsByType(
  leagueId: number,
  season: number,
  type: 'topscorers' | 'topassists' | 'topyellowcards' | 'topredcards',
  signal?: AbortSignal,
): Promise<CompetitionsApiPlayerStatDto[]> {
  const payload = await bffGet<CompetitionsApiResponse<CompetitionsApiPlayerStatDto>>(
    `/competitions/${encodeURIComponent(String(leagueId))}/player-stats`,
    { season, type },
    { signal },
  );

  return payload.response;
}

export async function fetchLeagueTopScorers(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiPlayerStatDto[]> {
  return fetchLeaguePlayerStatsByType(leagueId, season, 'topscorers', signal);
}

export async function fetchLeagueTopAssists(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiPlayerStatDto[]> {
  return fetchLeaguePlayerStatsByType(leagueId, season, 'topassists', signal);
}

export async function fetchLeagueTopYellowCards(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiPlayerStatDto[]> {
  return fetchLeaguePlayerStatsByType(leagueId, season, 'topyellowcards', signal);
}

export async function fetchLeagueTopRedCards(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiPlayerStatDto[]> {
  return fetchLeaguePlayerStatsByType(leagueId, season, 'topredcards', signal);
}

export async function fetchLeagueTransfers(
  leagueId: number,
  season?: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiTransferDto[]> {
  const payload = await bffGet<CompetitionsApiResponse<CompetitionsApiTransferDto>>(
    `/competitions/${encodeURIComponent(String(leagueId))}/transfers`,
    { season },
    { signal },
  );

  return payload.response;
}
