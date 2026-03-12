import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchTeamDetails, fetchTeamLeagues } from '@data/endpoints/teamsApi';
import {
  mapTeamDetails,
  mapTeamLeaguesToCompetitionOptions,
  resolveDefaultTeamSelection,
} from '@data/mappers/teamsMapper';
import { useTeamFull } from '@ui/features/teams/hooks/useTeamFull';
import type { TeamCompetitionOption, TeamSelection } from '@ui/features/teams/types/teams.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

type UseTeamContextParams = {
  teamId: string;
};

export function useTeamContext({ teamId }: UseTeamContextParams) {
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris',
    [],
  );
  const teamFullQuery = useTeamFull({
    teamId,
    timezone,
    enabled: Boolean(teamId),
  });
  const canUseFullPayload = teamFullQuery.isFullEnabled && Boolean(teamFullQuery.data);

  const teamQuery = useQuery({
    queryKey: queryKeys.teams.details(teamId),
    enabled: Boolean(teamId) && !canUseFullPayload,
    ...featureQueryOptions.teams.details,
    queryFn: ({ signal }) => fetchTeamDetails(teamId, signal),
  });

  const leaguesQuery = useQuery({
    queryKey: queryKeys.teams.leagues(teamId),
    enabled: Boolean(teamId) && !canUseFullPayload,
    ...featureQueryOptions.teams.leagues,
    queryFn: ({ signal }) => fetchTeamLeagues(teamId, signal),
  });

  const team = useMemo(
    () =>
      mapTeamDetails(
        teamFullQuery.data?.details.response[0] ?? teamQuery.data ?? null,
        teamId,
      ),
    [teamFullQuery.data?.details.response, teamId, teamQuery.data],
  );

  const competitions = useMemo<TeamCompetitionOption[]>(
    () => mapTeamLeaguesToCompetitionOptions(teamFullQuery.data?.leagues.response ?? leaguesQuery.data ?? []),
    [leaguesQuery.data, teamFullQuery.data?.leagues.response],
  );

  const defaultSelection = useMemo<TeamSelection>(
    () => teamFullQuery.data?.selection ?? resolveDefaultTeamSelection(competitions),
    [competitions, teamFullQuery.data?.selection],
  );

  const refetch = useCallback(() => {
    if (canUseFullPayload) {
      teamFullQuery.refetch().catch(() => undefined);
      return;
    }

    teamQuery.refetch().catch(() => undefined);
    leaguesQuery.refetch().catch(() => undefined);
  }, [canUseFullPayload, leaguesQuery, teamFullQuery, teamQuery]);

  const lastUpdatedAt = canUseFullPayload
    ? teamFullQuery.dataUpdatedAt
    : Math.max(teamQuery.dataUpdatedAt, leaguesQuery.dataUpdatedAt);
  const hasCachedData = canUseFullPayload
    ? Boolean(teamFullQuery.data?.details.response[0]) || competitions.length > 0
    : Boolean(teamQuery.data) || competitions.length > 0;

  return {
    team,
    timezone,
    competitions,
    defaultSelection,
    isLoading: canUseFullPayload ? teamFullQuery.isLoading : teamQuery.isLoading || leaguesQuery.isLoading,
    isError: canUseFullPayload ? teamFullQuery.isError : teamQuery.isError || leaguesQuery.isError,
    lastUpdatedAt: lastUpdatedAt > 0 ? lastUpdatedAt : null,
    hasCachedData,
    refetch,
  };
}
