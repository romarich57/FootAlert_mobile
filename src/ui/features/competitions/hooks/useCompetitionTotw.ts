import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  mapCompetitionPlayerStatsToTotw,
  mapPlayerStatsDtoToPlayerStats,
} from '@data/mappers/competitionsMapper';
import type { CompetitionTotwData } from '@ui/features/competitions/types/competitions.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

import { loadCompetitionFullPayload } from './competitionFullQuery';

export function useCompetitionTotw(
  leagueId: number | undefined,
  season: number | undefined,
) {
  const queryClient = useQueryClient();

  return useQuery<CompetitionTotwData | null, Error>({
    queryKey: queryKeys.competitions.totw(leagueId, season),
    queryFn: async ({ signal }) => {
      if (!leagueId || !season) {
        return null;
      }

      const payload = await loadCompetitionFullPayload(queryClient, leagueId, season);
      const allPlayers = [
        ...mapPlayerStatsDtoToPlayerStats(payload?.playerStats.topScorers ?? [], season),
        ...mapPlayerStatsDtoToPlayerStats(payload?.playerStats.topAssists ?? [], season),
        ...mapPlayerStatsDtoToPlayerStats(payload?.playerStats.topYellowCards ?? [], season),
        ...mapPlayerStatsDtoToPlayerStats(payload?.playerStats.topRedCards ?? [], season),
      ];

      return mapCompetitionPlayerStatsToTotw(allPlayers, season);
    },
    enabled: !!leagueId && !!season,
    ...featureQueryOptions.competitions.totw,
  });
}
