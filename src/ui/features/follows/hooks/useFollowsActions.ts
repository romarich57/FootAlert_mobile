import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { postFollowEvent } from '@data/endpoints/followsApi';
import {
  loadFollowedLeagueIds,
  loadFollowedPlayerIds,
  loadFollowedTeamIds,
  loadHideTrends,
  saveHideTrends,
  toggleFollowedLeague,
  toggleFollowedPlayer,
  toggleFollowedTeam,
} from '@data/storage/followsStorage';
import { incrementPositiveEventCount } from '@data/storage/reviewPromptStorage';
import type {
  FollowEntityTab,
  FollowEventPayload,
  FollowEventSource,
  FollowPlayerSnapshot,
  FollowTeamSnapshot,
} from '@ui/features/follows/types/follows.types';
import { queryKeys } from '@ui/shared/query/queryKeys';

type ToggleFollowError = 'limit_reached' | null;
type ToggleTeamFollowOptions = {
  source?: FollowEventSource;
  snapshot?: FollowTeamSnapshot;
};
type TogglePlayerFollowOptions = {
  source?: FollowEventSource;
  snapshot?: FollowPlayerSnapshot;
};
type ToggleTeamMutationInput = {
  teamId: string;
} & ToggleTeamFollowOptions;
type TogglePlayerMutationInput = {
  playerId: string;
} & TogglePlayerFollowOptions;

function computeNextIds(ids: string[], id: string, maxAllowed: number): string[] {
  if (ids.includes(id)) {
    return ids.filter(value => value !== id);
  }

  if (ids.length >= maxAllowed) {
    return ids;
  }

  return [id, ...ids.filter(value => value !== id)];
}

function trackFollowEvent(payload: FollowEventPayload): void {
  void postFollowEvent(payload).catch(() => undefined);
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

  const followedLeagueIdsQuery = useQuery({
    queryKey: queryKeys.follows.followedLeagueIds(),
    queryFn: loadFollowedLeagueIds,
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
    mutationFn: ({ teamId }: ToggleTeamMutationInput) =>
      toggleFollowedTeam(teamId, appEnv.followsMaxFollowedTeams),
    onMutate: async ({ teamId }) => {
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
    onError: (_error, _teamInput, context) => {
      queryClient.setQueryData(queryKeys.follows.followedTeamIds(), context?.previousIds ?? []);
    },
    onSuccess: (result, teamInput, context) => {
      queryClient.setQueryData(queryKeys.follows.followedTeamIds(), result.ids);
      setLastToggleError(result.reason ?? null);
      const wasAlreadyFollowed = context?.previousIds?.includes(teamInput.teamId) ?? false;
      const isNowFollowed = result.ids.includes(teamInput.teamId);
      const action =
        result.changed
          ? (isNowFollowed ? 'follow' : 'unfollow')
          : null;

      if (action) {
        trackFollowEvent({
          entityKind: 'team',
          entityId: teamInput.teamId,
          action,
          source: teamInput.source ?? 'team_details',
          entitySnapshot: teamInput.snapshot,
        });
      }

      if (result.changed && !wasAlreadyFollowed && isNowFollowed) {
        incrementPositiveEventCount().catch(() => undefined);
      }
    },
  });

  const togglePlayerMutation = useMutation({
    mutationFn: ({ playerId }: TogglePlayerMutationInput) =>
      toggleFollowedPlayer(playerId, appEnv.followsMaxFollowedPlayers),
    onMutate: async ({ playerId }) => {
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
    onError: (_error, _playerInput, context) => {
      queryClient.setQueryData(queryKeys.follows.followedPlayerIds(), context?.previousIds ?? []);
    },
    onSuccess: (result, playerInput, context) => {
      queryClient.setQueryData(queryKeys.follows.followedPlayerIds(), result.ids);
      setLastToggleError(result.reason ?? null);
      const wasAlreadyFollowed = context?.previousIds?.includes(playerInput.playerId) ?? false;
      const isNowFollowed = result.ids.includes(playerInput.playerId);
      const action =
        result.changed
          ? (isNowFollowed ? 'follow' : 'unfollow')
          : null;

      if (action) {
        trackFollowEvent({
          entityKind: 'player',
          entityId: playerInput.playerId,
          action,
          source: playerInput.source ?? 'player_details',
          entitySnapshot: playerInput.snapshot,
        });
      }

      if (result.changed && !wasAlreadyFollowed && isNowFollowed) {
        incrementPositiveEventCount().catch(() => undefined);
      }
    },
  });

  const toggleLeagueMutation = useMutation({
    mutationFn: (leagueId: string) =>
      toggleFollowedLeague(leagueId, appEnv.followsMaxFollowedLeagues),
    onMutate: async leagueId => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.follows.followedLeagueIds(),
      });

      const previousIds =
        queryClient.getQueryData<string[]>(queryKeys.follows.followedLeagueIds()) ?? [];

      queryClient.setQueryData(
        queryKeys.follows.followedLeagueIds(),
        computeNextIds(previousIds, leagueId, appEnv.followsMaxFollowedLeagues),
      );

      return { previousIds };
    },
    onError: (_error, _leagueId, context) => {
      queryClient.setQueryData(queryKeys.follows.followedLeagueIds(), context?.previousIds ?? []);
    },
    onSuccess: (result, leagueId, context) => {
      queryClient.setQueryData(queryKeys.follows.followedLeagueIds(), result.ids);
      setLastToggleError(result.reason ?? null);
      const wasAlreadyFollowed = context?.previousIds?.includes(leagueId) ?? false;
      const isNowFollowed = result.ids.includes(leagueId);
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
    async (teamId: string, options?: ToggleTeamFollowOptions) => {
      return toggleTeamMutation.mutateAsync({
        teamId,
        ...options,
      });
    },
    [toggleTeamMutation],
  );

  const togglePlayerFollow = useCallback(
    async (playerId: string, options?: TogglePlayerFollowOptions) => {
      return togglePlayerMutation.mutateAsync({
        playerId,
        ...options,
      });
    },
    [togglePlayerMutation],
  );

  const toggleLeagueFollow = useCallback(
    async (leagueId: string) => {
      return toggleLeagueMutation.mutateAsync(leagueId);
    },
    [toggleLeagueMutation],
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
    followedLeagueIds: followedLeagueIdsQuery.data ?? [],
    hideTrendsTeams: hideTrendsTeamsQuery.data ?? false,
    hideTrendsPlayers: hideTrendsPlayersQuery.data ?? false,
    isLoading:
      followedTeamIdsQuery.isLoading ||
      followedPlayerIdsQuery.isLoading ||
      followedLeagueIdsQuery.isLoading ||
      hideTrendsTeamsQuery.isLoading ||
      hideTrendsPlayersQuery.isLoading,
    lastToggleError,
    toggleTeamFollow,
    togglePlayerFollow,
    toggleLeagueFollow,
    updateHideTrends,
    clearToggleError,
  };
}
