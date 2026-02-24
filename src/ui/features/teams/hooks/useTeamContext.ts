import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchTeamDetails, fetchTeamLeagues } from '@data/endpoints/teamsApi';
import {
  mapTeamDetails,
  mapTeamLeaguesToCompetitionOptions,
  resolveDefaultTeamSelection,
} from '@data/mappers/teamsMapper';
import type { TeamCompetitionOption, TeamSelection } from '@ui/features/teams/types/teams.types';
import { queryKeys } from '@ui/shared/query/queryKeys';

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
    staleTime: 60_000,
    queryFn: ({ signal }) => fetchTeamDetails(teamId, signal),
  });

  const leaguesQuery = useQuery({
    queryKey: queryKeys.teams.leagues(teamId),
    enabled: Boolean(teamId),
    staleTime: 10 * 60_000,
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

  const [selection, setSelection] = useState<TeamSelection>(defaultSelection);

  useEffect(() => {
    if (selection.leagueId === null && selection.season === null) {
      setSelection(defaultSelection);
      return;
    }

    const selectedCompetition = competitions.find(item => item.leagueId === selection.leagueId);

    if (!selectedCompetition) {
      setSelection(defaultSelection);
      return;
    }

    const seasonStillAvailable = selectedCompetition.seasons.includes(selection.season ?? -1);
    if (!seasonStillAvailable) {
      setSelection({
        leagueId: selectedCompetition.leagueId,
        season: selectedCompetition.currentSeason ?? selectedCompetition.seasons[0] ?? null,
      });
    }
  }, [competitions, defaultSelection, selection.leagueId, selection.season]);

  const seasonsForSelectedLeague = useMemo(() => {
    const selectedCompetition = competitions.find(item => item.leagueId === selection.leagueId);
    return selectedCompetition?.seasons ?? [];
  }, [competitions, selection.leagueId]);

  const setLeague = useCallback(
    (leagueId: string) => {
      const selectedCompetition = competitions.find(item => item.leagueId === leagueId);
      setSelection({
        leagueId,
        season: selectedCompetition?.currentSeason ?? selectedCompetition?.seasons[0] ?? null,
      });
    },
    [competitions],
  );

  const setSeason = useCallback((season: number) => {
    setSelection(current => ({
      ...current,
      season,
    }));
  }, []);

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
    selectedLeagueId: selection.leagueId,
    selectedSeason: selection.season,
    seasonsForSelectedLeague,
    setLeague,
    setSeason,
    isLoading: teamQuery.isLoading || leaguesQuery.isLoading,
    isError: teamQuery.isError || leaguesQuery.isError,
    lastUpdatedAt: lastUpdatedAt > 0 ? lastUpdatedAt : null,
    hasCachedData,
    refetch,
  };
}
