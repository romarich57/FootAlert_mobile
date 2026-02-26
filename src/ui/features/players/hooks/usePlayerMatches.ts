import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import {
  fetchFixturePlayerStats,
  fetchPlayerMatchesAggregate,
  fetchTeamFixtures,
} from '@data/endpoints/playersApi';
import { mapPlayerMatchPerformance } from '@data/mappers/playersMapper';
import type { PlayerMatchPerformance } from '@ui/features/players/types/players.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

function hasMeaningfulPlayerStats(
  stats: PlayerMatchPerformance['playerStats'],
): boolean {
  if (typeof stats.rating === 'string' && stats.rating.trim().length > 0) {
    return true;
  }

  return [
    stats.goals,
    stats.assists,
    stats.yellowCards,
    stats.secondYellowCards,
    stats.redCards,
    stats.saves,
    stats.penaltiesSaved,
    stats.penaltiesMissed,
  ].some(value => typeof value === 'number' && Number.isFinite(value));
}

export function usePlayerMatches(
  playerId: string,
  teamId: string,
  season: number,
  enabled: boolean = true,
) {
  const useAggregateEndpoint = appEnv.mobileEnableBffPlayerAggregates;

  const aggregateQuery = useQuery({
    queryKey: queryKeys.players.matchesAggregate(playerId, teamId, season),
    queryFn: async ({ signal }) =>
      fetchPlayerMatchesAggregate(playerId, teamId, season, 15, signal),
    enabled: enabled && useAggregateEndpoint && !!playerId && !!teamId && !!season,
    ...featureQueryOptions.players.matches,
  });

  const aggregateNeedsLegacyFallback = useMemo(() => {
    if (!useAggregateEndpoint) {
      return false;
    }

    if (aggregateQuery.isError) {
      return true;
    }

    if (!aggregateQuery.isSuccess) {
      return false;
    }

    const aggregateMatches = aggregateQuery.data ?? [];
    if (aggregateMatches.length === 0) {
      return true;
    }

    return !aggregateMatches.some(match => hasMeaningfulPlayerStats(match.playerStats));
  }, [
    aggregateQuery.data,
    aggregateQuery.isError,
    aggregateQuery.isSuccess,
    useAggregateEndpoint,
  ]);

  const legacyMatchesQuery = useQuery({
    queryKey: queryKeys.players.matchesLegacy(playerId, teamId, season),
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
    enabled:
      enabled &&
      !!playerId &&
      !!teamId &&
      !!season &&
      (!useAggregateEndpoint || aggregateNeedsLegacyFallback),
    ...featureQueryOptions.players.matches,
  });

  const matches = useMemo(() => {
    if (!useAggregateEndpoint) {
      return legacyMatchesQuery.data ?? [];
    }

    if (!aggregateNeedsLegacyFallback) {
      return aggregateQuery.data ?? [];
    }

    if (legacyMatchesQuery.data && legacyMatchesQuery.data.length > 0) {
      return legacyMatchesQuery.data;
    }

    if (legacyMatchesQuery.isFetching || legacyMatchesQuery.isLoading) {
      return [];
    }

    return aggregateQuery.data ?? [];
  }, [
    aggregateNeedsLegacyFallback,
    aggregateQuery.data,
    legacyMatchesQuery.isFetching,
    legacyMatchesQuery.isLoading,
    legacyMatchesQuery.data,
    useAggregateEndpoint,
  ]);

  const isLoading = useMemo(() => {
    if (!enabled) {
      return false;
    }

    if (matches.length > 0) {
      return false;
    }

    if (!useAggregateEndpoint) {
      return legacyMatchesQuery.isLoading;
    }

    if (!aggregateNeedsLegacyFallback) {
      return aggregateQuery.isLoading;
    }

    return aggregateQuery.isLoading || legacyMatchesQuery.isLoading;
  }, [
    aggregateNeedsLegacyFallback,
    aggregateQuery.isLoading,
    enabled,
    legacyMatchesQuery.isLoading,
    matches.length,
    useAggregateEndpoint,
  ]);

  const isError = useMemo(() => {
    if (matches.length > 0) {
      return false;
    }

    if (!useAggregateEndpoint) {
      return legacyMatchesQuery.isError;
    }

    if (!aggregateNeedsLegacyFallback) {
      return aggregateQuery.isError;
    }

    return aggregateQuery.isError && legacyMatchesQuery.isError;
  }, [
    aggregateNeedsLegacyFallback,
    aggregateQuery.isError,
    legacyMatchesQuery.isError,
    matches.length,
    useAggregateEndpoint,
  ]);

  const dataUpdatedAt = useMemo(() => {
    if (!useAggregateEndpoint) {
      return legacyMatchesQuery.dataUpdatedAt;
    }

    return Math.max(
      aggregateQuery.dataUpdatedAt,
      legacyMatchesQuery.dataUpdatedAt,
    );
  }, [
    aggregateQuery.dataUpdatedAt,
    legacyMatchesQuery.dataUpdatedAt,
    useAggregateEndpoint,
  ]);

  const refetch = useMemo(() => {
    if (!useAggregateEndpoint) {
      return legacyMatchesQuery.refetch;
    }

    if (aggregateNeedsLegacyFallback) {
      return legacyMatchesQuery.refetch;
    }

    return aggregateQuery.refetch;
  }, [
    aggregateNeedsLegacyFallback,
    aggregateQuery.refetch,
    legacyMatchesQuery.refetch,
    useAggregateEndpoint,
  ]);

  return {
    matches,
    isLoading,
    isError,
    dataUpdatedAt,
    refetch,
  };
}
