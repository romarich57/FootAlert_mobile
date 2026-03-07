import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchTeamDetails, fetchTeamLeagues } from '@data/endpoints/teamsApi';
import {
  mapTeamDetails,
  mapTeamLeaguesToCompetitionOptions,
  resolveDefaultTeamSelection,
} from '@data/mappers/teamsMapper';
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

  const teamQuery = useQuery({
    queryKey: queryKeys.teams.details(teamId),
    enabled: Boolean(teamId),
    ...featureQueryOptions.teams.details,
    queryFn: ({ signal }) => fetchTeamDetails(teamId, signal),
  });

  const leaguesQuery = useQuery({
    queryKey: queryKeys.teams.leagues(teamId),
    enabled: Boolean(teamId),
    ...featureQueryOptions.teams.leagues,
    queryFn: ({ signal }) => fetchTeamLeagues(teamId, signal),
  });

  const team = useMemo(() => mapTeamDetails(teamQuery.data ?? null, teamId), [teamId, teamQuery.data]);

  const competitions = useMemo<TeamCompetitionOption[]>(
    () => mapTeamLeaguesToCompetitionOptions(leaguesQuery.data ?? []),
    [leaguesQuery.data],
  );

  const defaultSelection = useMemo<TeamSelection>(
    () => resolveDefaultTeamSelection(competitions),
    [competitions],
  );

  const refetch = useCallback(() => {
    teamQuery.refetch().catch(() => undefined);
    leaguesQuery.refetch().catch(() => undefined);
  }, [leaguesQuery, teamQuery]);

  const lastUpdatedAt = Math.max(teamQuery.dataUpdatedAt, leaguesQuery.dataUpdatedAt);
  const hasCachedData = Boolean(teamQuery.data) || competitions.length > 0;

  return {
    team,
    timezone,
    competitions,
    defaultSelection,
    isLoading: teamQuery.isLoading || leaguesQuery.isLoading,
    isError: teamQuery.isError || leaguesQuery.isError,
    lastUpdatedAt: lastUpdatedAt > 0 ? lastUpdatedAt : null,
    hasCachedData,
    refetch,
  };
}
