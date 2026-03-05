import { fetchTeamPlayers } from '@data/endpoints/teamsApi';
import type { TeamApiPlayerDto } from '@ui/features/teams/types/teams.types';

const DEFAULT_TEAM_PLAYERS_PAGE_LIMIT = 50;
const DEFAULT_TEAM_PLAYERS_MAX_REQUESTS = 10;
const DEFAULT_TEAM_PLAYERS_TARGET_ITEMS = 200;

type FetchAllTeamPlayersParams = {
  teamId: string;
  leagueId: string | number;
  season: number;
  signal?: AbortSignal;
  limit?: number;
  maxRequests?: number;
  targetItems?: number;
};

export async function fetchAllTeamPlayers({
  teamId,
  leagueId,
  season,
  signal,
  limit = DEFAULT_TEAM_PLAYERS_PAGE_LIMIT,
  maxRequests = DEFAULT_TEAM_PLAYERS_MAX_REQUESTS,
  targetItems = DEFAULT_TEAM_PLAYERS_TARGET_ITEMS,
}: FetchAllTeamPlayersParams): Promise<TeamApiPlayerDto[]> {
  const aggregated: TeamApiPlayerDto[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  for (let requestIndex = 0; requestIndex < maxRequests; requestIndex += 1) {
    const page = await fetchTeamPlayers(
      {
        teamId,
        leagueId: String(leagueId),
        season,
        limit,
        cursor,
      },
      signal,
    );

    if (Array.isArray(page.response) && page.response.length > 0) {
      aggregated.push(...page.response);
    }

    const nextCursor = page.pageInfo?.nextCursor ?? undefined;
    const hasMore = page.pageInfo?.hasMore ?? false;
    if (!hasMore || !nextCursor || seenCursors.has(nextCursor)) {
      break;
    }

    if (aggregated.length >= targetItems) {
      break;
    }

    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }

  return aggregated;
}
