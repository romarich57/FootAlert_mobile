import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchLeagueById } from '@data/endpoints/competitionsApi';
import { mapLeagueDtoToCompetition } from '@data/mappers/competitionsMapper';
import {
  loadFollowedLeagueIds,
  toggleFollowedLeague,
} from '@data/storage/followsStorage';
import type { Competition } from '@ui/features/competitions/types/competitions.types';
import { queryKeys } from '@ui/shared/query/queryKeys';

const MAX_FOLLOWED_LEAGUES = 50;

export function useFollowedCompetitions() {
  const queryClient = useQueryClient();

  const followedIdsQuery = useQuery({
    queryKey: queryKeys.competitions.followedIds(),
    queryFn: loadFollowedLeagueIds,
    staleTime: Infinity,
  });

  const followedIds = followedIdsQuery.data ?? [];

  const followedCompetitionsQuery = useQuery({
    queryKey: queryKeys.competitions.followedDetails(followedIds),
    queryFn: async ({ signal }) => {
      const results = await Promise.all(followedIds.map(id => fetchLeagueById(id, signal)));
      return results
        .map(dto => mapLeagueDtoToCompetition(dto))
        .filter(Boolean) as Competition[];
    },
    enabled: followedIds.length > 0,
    staleTime: 10 * 60_000,
  });

  const toggleMutation = useMutation({
    mutationFn: (leagueId: string) =>
      toggleFollowedLeague(leagueId, MAX_FOLLOWED_LEAGUES),
    onSuccess: async (result, leagueId) => {
      queryClient.setQueryData(queryKeys.competitions.followedIds(), result.ids);

      if (!result.ids.includes(leagueId)) {
        queryClient.setQueryData<Competition[]>(
          queryKeys.competitions.followedDetails(result.ids),
          (current = []) => current.filter(competition => competition.id !== leagueId),
        );
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: queryKeys.competitions.followedDetails(result.ids),
      });
    },
  });

  const toggleFollow = useCallback(
    async (leagueId: string) => {
      return toggleMutation.mutateAsync(leagueId);
    },
    [toggleMutation],
  );

  const refreshDelay = useCallback(async () => {
    await followedIdsQuery.refetch();
    await followedCompetitionsQuery.refetch();
  }, [followedCompetitionsQuery, followedIdsQuery]);

  return {
    followedIds,
    followedCompetitions: useMemo(
      () => followedCompetitionsQuery.data ?? [],
      [followedCompetitionsQuery.data],
    ),
    isLoading: followedIdsQuery.isLoading || followedCompetitionsQuery.isLoading,
    toggleFollow,
    refreshDelay,
  };
}
