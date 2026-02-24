import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

export type TotwPlayer = {
  id: number;
  name: string;
  photo: string;
  position: string;
  gridX: number;
  gridY: number;
  rating: string;
};

export type TeamOfTheWeek = {
  round: string;
  players: TotwPlayer[];
};

export function useCompetitionTotw(
  leagueId: number | undefined,
  season: number | undefined,
  round: string | undefined,
) {
  return useQuery<TeamOfTheWeek | null, Error>({
    queryKey: queryKeys.competitions.totw(leagueId, season, round),
    queryFn: async () => {
      if (!leagueId || !season || !round) {
        return null;
      }

      return null;
    },
    enabled: !!leagueId && !!season && !!round,
    ...featureQueryOptions.competitions.totw,
  });
}
