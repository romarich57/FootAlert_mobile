import { useQuery } from '@tanstack/react-query';

import { fetchPlayerCareerAggregate } from '@data/endpoints/playersApi';
import type { PlayerCareerSeason, PlayerCareerTeam } from '@ui/features/players/types/players.types';

export const PLAYER_CAREER_AGGREGATE_QUERY_KEY = 'player_career_aggregate';

export function usePlayerCareer(playerId: string, enabled: boolean = true) {
  const aggregateCareerQuery = useQuery({
    queryKey: [PLAYER_CAREER_AGGREGATE_QUERY_KEY, playerId],
    queryFn: async ({ signal }) => fetchPlayerCareerAggregate(playerId, signal),
    enabled: enabled && !!playerId,
    staleTime: 60 * 60 * 1000,
  });

  return {
    careerSeasons: aggregateCareerQuery.data?.seasons ?? [],
    careerTeams: aggregateCareerQuery.data?.teams ?? [],
    isLoading: aggregateCareerQuery.isLoading,
    isError: aggregateCareerQuery.isError,
    refetch: () => {
      aggregateCareerQuery.refetch();
    },
  };
}
