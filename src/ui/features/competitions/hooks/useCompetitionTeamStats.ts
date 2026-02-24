import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import type { StandingRow } from '../types/competitions.types';
import { useCompetitionStandings } from './useCompetitionStandings';

export type TeamStatLeaderboard = {
  bestAttack: StandingRow[];
  bestDefense: StandingRow[];
};

export function useCompetitionTeamStats(
  leagueId: number | undefined,
  season: number | undefined,
) {
  const { data: standingsGroups, isLoading, error } = useCompetitionStandings(leagueId, season);

  const teamStats = useQuery<TeamStatLeaderboard, Error>({
    queryKey: queryKeys.competitions.teamStats(leagueId, season),
    queryFn: () => {
      if (!standingsGroups || standingsGroups.length === 0) {
        return { bestAttack: [], bestDefense: [] };
      }

      const allTeams = standingsGroups.flatMap(group => group.rows);

      const bestAttack = [...allTeams].sort((a, b) => b.goalsFor - a.goalsFor);
      const bestDefense = [...allTeams].sort((a, b) => a.goalsAgainst - b.goalsAgainst);

      return {
        bestAttack,
        bestDefense,
      };
    },
    enabled: !!standingsGroups && standingsGroups.length > 0,
    ...featureQueryOptions.competitions.teamStats,
  });

  return {
    ...teamStats,
    isLoading: isLoading || teamStats.isLoading,
    error: error || teamStats.error,
  };
}
