import { useQuery } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { fetchTrendingPlayers, fetchTrendingTeams } from '@data/endpoints/followsApi';
import {
  getCurrentSeasonYear,
  mapTrendingPlayersFromTopScorers,
  mapTrendingTeamsFromStandings,
} from '@data/mappers/followsMapper';
import { TOP_COMPETITION_IDS } from '@/shared/constants';
import type {
  FollowEntityTab,
  TrendPlayerItem,
  TrendTeamItem,
} from '@ui/features/follows/types/follows.types';
import { queryKeys } from '@ui/shared/query/queryKeys';

type UseFollowsTrendsParams = {
  tab: FollowEntityTab;
  hidden: boolean;
};

function getTopLeagueIds(): string[] {
  return TOP_COMPETITION_IDS.slice(0, appEnv.followsTrendsLeagueCount);
}

export function useFollowsTrends({ tab, hidden }: UseFollowsTrendsParams) {
  const season = getCurrentSeasonYear();

  return useQuery({
    queryKey: queryKeys.follows.trends(tab, season, hidden),
    enabled: !hidden,
    staleTime: appEnv.followsTrendsTtlMs,
    queryFn: async ({ signal }): Promise<TrendTeamItem[] | TrendPlayerItem[]> => {
      if (tab === 'teams') {
        try {
          const payload = await fetchTrendingTeams(getTopLeagueIds(), season, signal);
          return mapTrendingTeamsFromStandings(payload, appEnv.followsTrendsTeamsLimit);
        } catch {
          return [];
        }
      }

      try {
        const payload = await fetchTrendingPlayers(getTopLeagueIds(), season, signal);
        return mapTrendingPlayersFromTopScorers(payload, appEnv.followsTrendsPlayersLimit);
      } catch {
        return [];
      }
    },
  });
}
