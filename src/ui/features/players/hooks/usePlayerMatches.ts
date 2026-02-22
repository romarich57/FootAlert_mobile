import { useQuery } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import {
  fetchFixturePlayerStats,
  fetchPlayerMatchesAggregate,
  fetchTeamFixtures,
} from '@data/endpoints/playersApi';
import { mapPlayerMatchPerformance } from '@data/mappers/playersMapper';
import type { PlayerMatchPerformance } from '@ui/features/players/types/players.types';

export const PLAYER_MATCHES_QUERY_KEY = 'player_matches';
export const PLAYER_MATCHES_AGGREGATE_QUERY_KEY = 'player_matches_aggregate';

export function usePlayerMatches(
  playerId: string,
  teamId: string,
  season: number,
  enabled: boolean = true,
) {
  const useAggregateEndpoint = appEnv.mobileEnableBffPlayerAggregates;

  const aggregateQuery = useQuery({
    queryKey: [PLAYER_MATCHES_AGGREGATE_QUERY_KEY, playerId, teamId, season],
    queryFn: async ({ signal }) =>
      fetchPlayerMatchesAggregate(playerId, teamId, season, 15, signal),
    enabled: enabled && useAggregateEndpoint && !!playerId && !!teamId && !!season,
    staleTime: 5 * 60 * 1000,
  });

  const legacyMatchesQuery = useQuery({
    queryKey: [PLAYER_MATCHES_QUERY_KEY, playerId, teamId, season, 'legacy'],
    queryFn: async ({ signal }) => {
      const fixtures = await fetchTeamFixtures(teamId, season, 15, signal);

      const performanceTasks = fixtures
        .filter(fixture => Boolean(fixture.fixture?.id))
        .map(async fixture => {
          if (!fixture.fixture?.id) {
            return null;
          }

          try {
            const statsDto = await fetchFixturePlayerStats(
              String(fixture.fixture.id),
              teamId,
              signal,
            );
            return mapPlayerMatchPerformance(playerId, fixture, statsDto);
          } catch {
            return null;
          }
        });

      const performances = await Promise.all(performanceTasks);
      return performances.filter(
        (item): item is PlayerMatchPerformance => item !== null,
      );
    },
    enabled: enabled && !useAggregateEndpoint && !!playerId && !!teamId && !!season,
    staleTime: 5 * 60 * 1000,
  });

  const activeQuery = useAggregateEndpoint ? aggregateQuery : legacyMatchesQuery;

  return {
    matches: activeQuery.data ?? [],
    isLoading: activeQuery.isLoading,
    isError: activeQuery.isError,
    refetch: activeQuery.refetch,
  };
}
