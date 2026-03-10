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

  const teamQuery = useQuery({
    queryKey: queryKeys.teams.details(teamId),
    enabled: Boolean(teamId) && !teamFullQuery.isFullEnabled,
    ...featureQueryOptions.teams.details,
    queryFn: ({ signal }) => fetchTeamDetails(teamId, signal),
  });

  const leaguesQuery = useQuery({
    queryKey: queryKeys.teams.leagues(teamId),
    enabled: Boolean(teamId) && !teamFullQuery.isFullEnabled,
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
    if (teamFullQuery.isFullEnabled) {
      teamFullQuery.refetch().catch(() => undefined);
      return;
    }

    teamQuery.refetch().catch(() => undefined);
    leaguesQuery.refetch().catch(() => undefined);
  }, [leaguesQuery, teamFullQuery, teamQuery]);

  const lastUpdatedAt = teamFullQuery.isFullEnabled
    ? teamFullQuery.dataUpdatedAt
    : Math.max(teamQuery.dataUpdatedAt, leaguesQuery.dataUpdatedAt);
  const hasCachedData = teamFullQuery.isFullEnabled
    ? Boolean(teamFullQuery.data?.details.response[0]) || competitions.length > 0
    : Boolean(teamQuery.data) || competitions.length > 0;

  return {
    team,
    timezone,
    competitions,
    defaultSelection,
    isLoading: teamFullQuery.isFullEnabled ? teamFullQuery.isLoading : teamQuery.isLoading || leaguesQuery.isLoading,
    isError: teamFullQuery.isFullEnabled ? teamFullQuery.isError : teamQuery.isError || leaguesQuery.isError,
    lastUpdatedAt: lastUpdatedAt > 0 ? lastUpdatedAt : null,
    hasCachedData,
    refetch,
  };
}
