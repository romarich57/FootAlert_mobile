import { useQuery } from '@tanstack/react-query';

import { fetchPlayerCareerAggregate } from '@data/endpoints/playersApi';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

export function usePlayerCareer(playerId: string, enabled: boolean = true) {
  const aggregateCareerQuery = useQuery({
    queryKey: queryKeys.players.careerAggregate(playerId),
    queryFn: async ({ signal }) => fetchPlayerCareerAggregate(playerId, signal),
    enabled: enabled && !!playerId,
    ...featureQueryOptions.players.career,
  });

  return {
    careerSeasons: aggregateCareerQuery.data?.seasons ?? [],
    careerTeams: aggregateCareerQuery.data?.teams ?? [],
    isLoading: aggregateCareerQuery.isLoading,
    isError: aggregateCareerQuery.isError,
    dataUpdatedAt: aggregateCareerQuery.dataUpdatedAt,
    refetch: () => {
      aggregateCareerQuery.refetch();
    },
  };
}
