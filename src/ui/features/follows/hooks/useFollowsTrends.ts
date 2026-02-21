import { useQuery } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { fetchTrendingPlayers, fetchTrendingTeams } from '@data/endpoints/followsApi';
import {
  getCurrentSeasonYear,
  mapTrendingPlayersFromTopScorers,
  mapTrendingTeamsFromStandings,
} from '@data/mappers/followsMapper';
import {
  loadCachedPlayerTrends,
  loadCachedTeamTrends,
  saveCachedPlayerTrends,
  saveCachedTeamTrends,
} from '@data/storage/followsTrendsCacheStorage';
import { TOP_COMPETITION_IDS } from '@/shared/constants';
import {
  FALLBACK_PLAYER_TRENDS,
  FALLBACK_TEAM_TRENDS,
} from '@ui/features/follows/mocks/fallbackTrends';
import type {
  FollowEntityTab,
  TrendPlayerItem,
  TrendTeamItem,
} from '@ui/features/follows/types/follows.types';

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
    queryKey: ['follows', 'trends', tab, season, hidden],
    enabled: !hidden,
    staleTime: appEnv.followsTrendsTtlMs,
    queryFn: async (): Promise<TrendTeamItem[] | TrendPlayerItem[]> => {
      if (tab === 'teams') {
        const cached = await loadCachedTeamTrends(appEnv.followsTrendsTtlMs);
        if (cached) {
          return cached.slice(0, appEnv.followsTrendsTeamsLimit);
        }

        try {
          const payload = await fetchTrendingTeams(getTopLeagueIds(), season);
          const mapped = mapTrendingTeamsFromStandings(
            payload,
            appEnv.followsTrendsTeamsLimit,
          );

          if (mapped.length > 0) {
            await saveCachedTeamTrends(mapped);
            return mapped;
          }

          return FALLBACK_TEAM_TRENDS.slice(0, appEnv.followsTrendsTeamsLimit);
        } catch {
          return [];
        }
      }

      const cached = await loadCachedPlayerTrends(appEnv.followsTrendsTtlMs);
      if (cached) {
        return cached.slice(0, appEnv.followsTrendsPlayersLimit);
      }

      try {
        const payload = await fetchTrendingPlayers(getTopLeagueIds(), season);
        const mapped = mapTrendingPlayersFromTopScorers(
          payload,
          appEnv.followsTrendsPlayersLimit,
        );

        if (mapped.length > 0) {
          await saveCachedPlayerTrends(mapped);
          return mapped;
        }

        return FALLBACK_PLAYER_TRENDS.slice(0, appEnv.followsTrendsPlayersLimit);
      } catch {
        return [];
      }
    },
  });
}
