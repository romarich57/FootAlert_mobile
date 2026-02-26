import { useQuery } from '@tanstack/react-query';

import {
  fetchLeagueTopAssists,
  fetchLeagueTopRedCards,
  fetchLeagueTopScorers,
  fetchLeagueTopYellowCards,
} from '@data/endpoints/competitionsApi';
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

      const [topScorers, topAssists, topYellowCards, topRedCards] = await Promise.all([
        fetchLeagueTopScorers(leagueId, season, signal),
        fetchLeagueTopAssists(leagueId, season, signal),
        fetchLeagueTopYellowCards(leagueId, season, signal),
        fetchLeagueTopRedCards(leagueId, season, signal),
      ]);

      const allPlayers = [
        ...mapPlayerStatsDtoToPlayerStats(topScorers, season),
        ...mapPlayerStatsDtoToPlayerStats(topAssists, season),
        ...mapPlayerStatsDtoToPlayerStats(topYellowCards, season),
        ...mapPlayerStatsDtoToPlayerStats(topRedCards, season),
      ];

      return mapCompetitionPlayerStatsToTotw(allPlayers, season);
    },
    enabled: !!leagueId && !!season,
    ...featureQueryOptions.competitions.totw,
  });
}
