import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import {
  loadFollowedPlayerIds,
  loadFollowedTeamIds,
  loadHideTrends,
  saveHideTrends,
  toggleFollowedPlayer,
  toggleFollowedTeam,
} from '@data/storage/followsStorage';
import { incrementPositiveEventCount } from '@data/storage/reviewPromptStorage';
import type { FollowEntityTab } from '@ui/features/follows/types/follows.types';
import { queryKeys } from '@ui/shared/query/queryKeys';

type ToggleFollowError = 'limit_reached' | null;

function computeNextIds(ids: string[], id: string, maxAllowed: number): string[] {
  if (ids.includes(id)) {
    return ids.filter(value => value !== id);
  }

  if (ids.length >= maxAllowed) {
    return ids;
  }

  return [id, ...ids.filter(value => value !== id)];
}

export function useFollowsActions() {
  const queryClient = useQueryClient();
  const [lastToggleError, setLastToggleError] = useState<ToggleFollowError>(null);

  const followedTeamIdsQuery = useQuery({
    queryKey: queryKeys.follows.followedTeamIds(),
    queryFn: loadFollowedTeamIds,
    staleTime: Infinity,
  });

  const followedPlayerIdsQuery = useQuery({
    queryKey: queryKeys.follows.followedPlayerIds(),
    queryFn: loadFollowedPlayerIds,
    staleTime: Infinity,
  });

  const hideTrendsTeamsQuery = useQuery({
    queryKey: queryKeys.follows.hideTrends('teams'),
    queryFn: () => loadHideTrends('teams'),
    staleTime: Infinity,
  });

  const hideTrendsPlayersQuery = useQuery({
    queryKey: queryKeys.follows.hideTrends('players'),
    queryFn: () => loadHideTrends('players'),
    staleTime: Infinity,
  });

  const toggleTeamMutation = useMutation({
    mutationFn: (teamId: string) =>
      toggleFollowedTeam(teamId, appEnv.followsMaxFollowedTeams),
    onMutate: async teamId => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.follows.followedTeamIds(),
      });

      const previousIds =
        queryClient.getQueryData<string[]>(queryKeys.follows.followedTeamIds()) ?? [];

      queryClient.setQueryData(
        queryKeys.follows.followedTeamIds(),
        computeNextIds(previousIds, teamId, appEnv.followsMaxFollowedTeams),
      );

      return { previousIds };
    },
    onError: (_error, _teamId, context) => {
      queryClient.setQueryData(queryKeys.follows.followedTeamIds(), context?.previousIds ?? []);
    },
    onSuccess: (result, teamId, context) => {
      queryClient.setQueryData(queryKeys.follows.followedTeamIds(), result.ids);
      setLastToggleError(result.reason ?? null);
      const wasAlreadyFollowed = context?.previousIds?.includes(teamId) ?? false;
      const isNowFollowed = result.ids.includes(teamId);
      if (result.changed && !wasAlreadyFollowed && isNowFollowed) {
        incrementPositiveEventCount().catch(() => undefined);
      }
    },
  });

  const togglePlayerMutation = useMutation({
    mutationFn: (playerId: string) =>
      toggleFollowedPlayer(playerId, appEnv.followsMaxFollowedPlayers),
    onMutate: async playerId => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.follows.followedPlayerIds(),
      });

      const previousIds =
        queryClient.getQueryData<string[]>(queryKeys.follows.followedPlayerIds()) ?? [];

      queryClient.setQueryData(
        queryKeys.follows.followedPlayerIds(),
        computeNextIds(previousIds, playerId, appEnv.followsMaxFollowedPlayers),
      );

      return { previousIds };
    },
    onError: (_error, _playerId, context) => {
      queryClient.setQueryData(queryKeys.follows.followedPlayerIds(), context?.previousIds ?? []);
    },
    onSuccess: (result, playerId, context) => {
      queryClient.setQueryData(queryKeys.follows.followedPlayerIds(), result.ids);
      setLastToggleError(result.reason ?? null);
      const wasAlreadyFollowed = context?.previousIds?.includes(playerId) ?? false;
      const isNowFollowed = result.ids.includes(playerId);
      if (result.changed && !wasAlreadyFollowed && isNowFollowed) {
        incrementPositiveEventCount().catch(() => undefined);
      }
    },
  });

  const hideTrendsMutation = useMutation({
    mutationFn: ({ tab, value }: { tab: FollowEntityTab; value: boolean }) =>
      saveHideTrends(tab, value),
    onMutate: async ({ tab, value }) => {
      const queryKey = queryKeys.follows.hideTrends(tab);
      await queryClient.cancelQueries({ queryKey });

      const previousValue = queryClient.getQueryData<boolean>(queryKey) ?? false;
      queryClient.setQueryData(queryKey, value);

      return { tab, previousValue };
    },
    onError: (_error, _payload, context) => {
      if (!context) {
        return;
      }

      queryClient.setQueryData(
        queryKeys.follows.hideTrends(context.tab),
        context.previousValue,
      );
    },
    onSuccess: (_result, payload) => {
      queryClient.setQueryData(queryKeys.follows.hideTrends(payload.tab), payload.value);
    },
  });

  const toggleTeamFollow = useCallback(
    async (teamId: string) => {
      return toggleTeamMutation.mutateAsync(teamId);
    },
    [toggleTeamMutation],
  );

  const togglePlayerFollow = useCallback(
    async (playerId: string) => {
      return togglePlayerMutation.mutateAsync(playerId);
    },
    [togglePlayerMutation],
  );

  const updateHideTrends = useCallback(
    async (tab: FollowEntityTab, value: boolean) => {
      await hideTrendsMutation.mutateAsync({ tab, value });
    },
    [hideTrendsMutation],
  );

  const clearToggleError = useCallback(() => {
    setLastToggleError(null);
  }, []);

  return {
    followedTeamIds: followedTeamIdsQuery.data ?? [],
    followedPlayerIds: followedPlayerIdsQuery.data ?? [],
    hideTrendsTeams: hideTrendsTeamsQuery.data ?? false,
    hideTrendsPlayers: hideTrendsPlayersQuery.data ?? false,
    isLoading:
      followedTeamIdsQuery.isLoading ||
      followedPlayerIdsQuery.isLoading ||
      hideTrendsTeamsQuery.isLoading ||
      hideTrendsPlayersQuery.isLoading,
    lastToggleError,
    toggleTeamFollow,
    togglePlayerFollow,
    updateHideTrends,
    clearToggleError,
  };
}
