import { useQuery } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { fetchTeamFull } from '@data/endpoints/teamsApi';
import { useTeamLocalFirst } from '@ui/features/teams/hooks/useTeamLocalFirst';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import { queryKeys } from '@ui/shared/query/queryKeys';
import type { TeamFullResponsePayload } from '@domain/contracts/teamFull.types';

type UseTeamFullParams = {
  teamId: string;
  timezone: string;
  leagueId?: string | null;
  season?: number | null;
  enabled?: boolean;
};

export type TeamFullData = TeamFullResponsePayload['response'];

export function doesTeamFullSelectionMatch(
  payload: TeamFullData | null | undefined,
  leagueId: string | null,
  season: number | null,
): boolean {
  return (
    Boolean(payload) &&
    payload?.selection.leagueId === leagueId &&
    payload?.selection.season === season
  );
}

export function useTeamFull({
  teamId,
  timezone,
  leagueId = null,
  season = null,
  enabled = true,
}: UseTeamFullParams) {
  const useSqliteLocalFirst = appEnv.mobileEnableSqliteLocalFirst;
  const fullEnabled = enabled && appEnv.mobileEnableBffTeamFull && Boolean(teamId);
  const localFirstQuery = useTeamLocalFirst({
    teamId,
    timezone,
    leagueId,
    season,
    enabled: useSqliteLocalFirst && enabled,
  });

  const networkQuery = useQuery<TeamFullData>({
    queryKey: queryKeys.teams.full(teamId, timezone, leagueId, season),
    enabled: !useSqliteLocalFirst && fullEnabled,
    placeholderData: previousData => previousData,
    ...featureQueryOptions.teams.full,
    queryFn: async ({ signal }) => {
      const payload = await fetchTeamFull(
        {
          teamId,
          timezone,
          leagueId,
          season,
        },
        signal,
      );
      return payload.response;
    },
  });

  if (useSqliteLocalFirst) {
    return localFirstQuery;
  }

  return {
    ...networkQuery,
    isFullEnabled: fullEnabled,
  };
}
