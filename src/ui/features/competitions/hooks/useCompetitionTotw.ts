import { useQuery } from '@tanstack/react-query';

import { fetchCompetitionTotw } from '@data/endpoints/competitionsApi';
import {
  mapCompetitionPlayerStatsToTotw,
  mapPlayerStatsDtoToPlayerStats,
} from '@data/mappers/competitionsMapper';
import type { CompetitionTotwData } from '@ui/features/competitions/types/competitions.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

export function useCompetitionTotw(
  leagueId: number | undefined,
  season: number | undefined,
) {
  return useQuery<CompetitionTotwData | null, Error>({
    queryKey: queryKeys.competitions.totw(leagueId, season),
    queryFn: async ({ signal }) => {
      if (!leagueId || !season) {
        return null;
      }

      // Un seul appel BFF agrégé remplace les 4 appels séparés précédents
      const totw = await fetchCompetitionTotw(leagueId, season, signal);

      const allPlayers = [
        ...mapPlayerStatsDtoToPlayerStats(totw.topScorers, season),
        ...mapPlayerStatsDtoToPlayerStats(totw.topAssists, season),
        ...mapPlayerStatsDtoToPlayerStats(totw.topYellowCards, season),
        ...mapPlayerStatsDtoToPlayerStats(totw.topRedCards, season),
      ];

      return mapCompetitionPlayerStatsToTotw(allPlayers, season);
    },
    enabled: !!leagueId && !!season,
    ...featureQueryOptions.competitions.totw,
  });
}
