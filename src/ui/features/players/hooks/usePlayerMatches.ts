import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import {
  fetchFixturePlayerStats,
  fetchPlayerMatchesAggregate,
  PLAYER_MATCHES_LIMIT,
  fetchTeamFixtures,
} from '@data/endpoints/playersApi';
import { mapPlayerMatchPerformance } from '@data/mappers/playersMapper';
import {
  usePlayerFullQuery,
  type PlayerFullPayload,
} from '@ui/features/players/hooks/playerFullQuery';
import type { PlayerMatchPerformance } from '@ui/features/players/types/players.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

function selectPlayerMatchesFromFull(
  payload: PlayerFullPayload,
): PlayerMatchPerformance[] {
  return payload.matches.response ?? [];
}

export function usePlayerMatches(
  playerId: string,
  teamId: string,
  season: number,
  enabled: boolean = true,
) {
  const useFullPayload = appEnv.mobileEnableBffPlayerFull;
  const useAggregateEndpoint =
    !useFullPayload && appEnv.mobileEnableBffPlayerAggregates;

  const fullPlayerQuery = usePlayerFullQuery(
    playerId,
    season,
    enabled && useFullPayload && !!playerId && !!season,
  );
  const fullMatches = useMemo(
    () =>
      fullPlayerQuery.data
        ? selectPlayerMatchesFromFull(fullPlayerQuery.data as PlayerFullPayload)
        : undefined,
    [fullPlayerQuery.data],
  );

  const aggregateQuery = useQuery({
    queryKey: queryKeys.players.matchesAggregate(playerId, teamId, season),
    queryFn: async ({ signal }) =>
      fetchPlayerMatchesAggregate(
        playerId,
        teamId,
        season,
        PLAYER_MATCHES_LIMIT,
        signal,
      ),
    enabled: enabled && useAggregateEndpoint && !!playerId && !!teamId && !!season,
    ...featureQueryOptions.players.matches,
  });

  const legacyMatchesQuery = useQuery({
    queryKey: queryKeys.players.matchesLegacy(playerId, teamId, season),
    queryFn: async ({ signal }) => {
      const fixtures = await fetchTeamFixtures(
        teamId,
        season,
        PLAYER_MATCHES_LIMIT,
        signal,
      );

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
    enabled:
      enabled &&
      !useFullPayload &&
      !useAggregateEndpoint &&
      !!playerId &&
      !!teamId &&
      !!season,
    ...featureQueryOptions.players.matches,
  });

  const activeQuery = useFullPayload
    ? {
        ...fullPlayerQuery,
        data: fullMatches,
      }
    : useAggregateEndpoint
      ? aggregateQuery
      : legacyMatchesQuery;

  return {
    matches: activeQuery.data ?? [],
    isLoading: activeQuery.isLoading,
    isError: activeQuery.isError,
    dataUpdatedAt: activeQuery.dataUpdatedAt,
    refetch: activeQuery.refetch,
  };
}
