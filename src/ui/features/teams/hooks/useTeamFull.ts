import { useQuery } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { fetchTeamFull } from '@data/endpoints/teamsApi';
import {
  getHydrationSection,
  isHydrationPending,
  resolveProgressiveHydrationRefetchInterval,
} from '@domain/contracts/fullPayloadHydration.types';
import { useTeamLocalFirst } from '@ui/features/teams/hooks/useTeamLocalFirst';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import { queryKeys } from '@ui/shared/query/queryKeys';
import type {
  TeamFullData,
  TeamFullResponsePayload,
} from '@domain/contracts/teamFull.types';

type UseTeamFullParams = {
  teamId: string;
  timezone: string;
  leagueId?: string | null;
  season?: number | null;
  enabled?: boolean;
};

function flattenTeamFullPayload(payload: TeamFullResponsePayload): TeamFullData {
  return {
    ...payload.response,
    _meta: payload._meta,
    _hydration: payload._hydration,
  };
}

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
    refetchInterval: query =>
      resolveProgressiveHydrationRefetchInterval(
        query.state.data?._hydration,
        query.state.dataUpdatedAt,
      ),
    refetchIntervalInBackground: false,
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
      return flattenTeamFullPayload(payload);
    },
  });

  if (useSqliteLocalFirst) {
    return localFirstQuery;
  }

  return {
    ...networkQuery,
    isFullEnabled: fullEnabled,
    hydration: networkQuery.data?._hydration ?? null,
    hydrationStatus: networkQuery.data?._hydration?.status ?? null,
    hydrationSections: networkQuery.data?._hydration?.sections ?? {},
    isHydrationPending: isHydrationPending(networkQuery.data?._hydration),
    getSectionHydration: (sectionKey: string) =>
      getHydrationSection(networkQuery.data?._hydration, sectionKey),
  };
}
