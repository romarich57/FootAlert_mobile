import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { appEnv } from '@data/config/env';
import {
  loadFollowedPlayerIds,
  loadFollowedTeamIds,
  loadHideTrends,
  saveHideTrends,
  toggleFollowedPlayer,
  toggleFollowedTeam,
} from '@data/storage/followsStorage';
import type { FollowEntityTab } from '@ui/features/follows/types/follows.types';

type ToggleFollowError = 'limit_reached' | null;

export type FollowsActionsState = {
  followedTeamIds: string[];
  followedPlayerIds: string[];
  hideTrendsTeams: boolean;
  hideTrendsPlayers: boolean;
  isLoading: boolean;
  lastToggleError: ToggleFollowError;
};

export function useFollowsActions() {
  const [state, setState] = useState<FollowsActionsState>({
    followedTeamIds: [],
    followedPlayerIds: [],
    hideTrendsTeams: false,
    hideTrendsPlayers: false,
    isLoading: true,
    lastToggleError: null,
  });

  const loadState = useCallback(async () => {
    const [teamIds, playerIds, hideTeams, hidePlayers] = await Promise.all([
      loadFollowedTeamIds(),
      loadFollowedPlayerIds(),
      loadHideTrends('teams'),
      loadHideTrends('players'),
    ]);

    setState(current => ({
      ...current,
      followedTeamIds: teamIds,
      followedPlayerIds: playerIds,
      hideTrendsTeams: hideTeams,
      hideTrendsPlayers: hidePlayers,
      isLoading: false,
    }));
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      loadState().catch(() => {
        if (mounted) {
          setState(current => ({
            ...current,
            isLoading: false,
          }));
        }
      });

      return () => {
        mounted = false;
      };
    }, [loadState]),
  );

  const toggleTeamFollow = useCallback(async (teamId: string) => {
    const result = await toggleFollowedTeam(teamId, appEnv.followsMaxFollowedTeams);

    setState(current => ({
      ...current,
      followedTeamIds: result.ids,
      lastToggleError: result.reason ?? null,
    }));

    return result;
  }, []);

  const togglePlayerFollow = useCallback(async (playerId: string) => {
    const result = await toggleFollowedPlayer(playerId, appEnv.followsMaxFollowedPlayers);

    setState(current => ({
      ...current,
      followedPlayerIds: result.ids,
      lastToggleError: result.reason ?? null,
    }));

    return result;
  }, []);

  const updateHideTrends = useCallback(async (tab: FollowEntityTab, value: boolean) => {
    await saveHideTrends(tab, value);

    setState(current => ({
      ...current,
      hideTrendsTeams: tab === 'teams' ? value : current.hideTrendsTeams,
      hideTrendsPlayers: tab === 'players' ? value : current.hideTrendsPlayers,
    }));
  }, []);

  const clearToggleError = useCallback(() => {
    setState(current => ({
      ...current,
      lastToggleError: null,
    }));
  }, []);

  return {
    ...state,
    toggleTeamFollow,
    togglePlayerFollow,
    updateHideTrends,
    clearToggleError,
  };
}
