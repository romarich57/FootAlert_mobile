import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { QueryClient } from '@tanstack/react-query';

type UseRefreshTeamDetailsOnFocusParams = {
  teamId: string;
  queryClient: QueryClient;
};

export function useRefreshTeamDetailsOnFocus({
  teamId,
  queryClient,
}: UseRefreshTeamDetailsOnFocusParams) {
  useFocusEffect(
    useCallback(() => {
      if (!teamId) {
        return;
      }

      const filters = { stale: true } as const;
      queryClient.invalidateQueries({ queryKey: ['team_overview', teamId], ...filters });
      queryClient.invalidateQueries({ queryKey: ['team_overview_leaders', teamId], ...filters });
      queryClient.invalidateQueries({ queryKey: ['team_matches', teamId], ...filters });
      queryClient.invalidateQueries({ queryKey: ['team_stats', teamId], ...filters });
      queryClient.invalidateQueries({ queryKey: ['team_stats_core', teamId], ...filters });
      queryClient.invalidateQueries({ queryKey: ['team_stats_players', teamId], ...filters });
      queryClient.invalidateQueries({ queryKey: ['team_stats_advanced', teamId], ...filters });
      queryClient.invalidateQueries({ queryKey: ['team_standings', teamId], ...filters });
      queryClient.invalidateQueries({ queryKey: ['team_transfers', teamId], ...filters });
    }, [queryClient, teamId]),
  );
}
