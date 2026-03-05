import { bffGet } from '@data/endpoints/bffClient';

export type SearchGlobalApiTeam = {
  id: string;
  name: string;
  logo: string;
  country: string;
};

export type SearchGlobalApiCompetition = {
  id: string;
  name: string;
  logo: string;
  country: string;
  type: string;
};

export type SearchGlobalApiPlayer = {
  id: string;
  name: string;
  photo: string;
  position: string;
  teamName: string;
  teamLogo: string;
  leagueName: string;
};

export type SearchGlobalApiMatch = {
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

export type SearchGlobalApiResponse = {
  teams: SearchGlobalApiTeam[];
  competitions: SearchGlobalApiCompetition[];
  players: SearchGlobalApiPlayer[];
  matches: SearchGlobalApiMatch[];
};

export async function searchGlobal(
  query: string,
  timezone: string,
  season?: number,
  limit?: number,
  signal?: AbortSignal,
): Promise<SearchGlobalApiResponse> {
  return bffGet<SearchGlobalApiResponse>(
    '/search/global',
    {
      q: query,
      timezone,
      season,
      limit,
    },
    {
      signal,
    },
  );
}
