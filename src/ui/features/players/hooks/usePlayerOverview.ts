import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import {
  fetchPlayerDetails,
  fetchPlayerOverview,
  fetchPlayerTrophies,
} from '@data/endpoints/playersApi';
import {
  mapPlayerDetailsToCharacteristics,
  mapPlayerDetailsToPositions,
  mapPlayerDetailsToProfile,
  mapPlayerDetailsToSeasonStatsDataset,
  mapPlayerTrophies,
} from '@data/mappers/playersMapper';
import {
  usePlayerFullQuery,
  type PlayerFullPayload,
} from '@ui/features/players/hooks/playerFullQuery';
import type { PlayerTrophyEntry } from '@ui/features/players/types/players.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

function selectPlayerOverviewFromFull(
  payload: PlayerFullPayload,
  season: number,
) {
  const overview = payload.overview.response;
  const trophies = mapPlayerTrophies(payload.trophies.response);

  if (overview?.profile) {
    return {
      profile: overview.profile,
      characteristics: overview.characteristics,
      positions: overview.positions,
      seasonStats: overview.seasonStats ?? overview.seasonStatsDataset?.overall ?? null,
      seasonStatsDataset: overview.seasonStatsDataset,
      profileCompetitionStats: overview.profileCompetitionStats,
      profileTrophiesByClub: overview.trophiesByClub ?? [],
      trophies,
    };
  }

  const dto = payload.details.response[0] ?? null;
  if (!dto) {
    throw new Error('Player not found');
  }

  const seasonStatsDataset = mapPlayerDetailsToSeasonStatsDataset(dto, season);

  return {
    profile: mapPlayerDetailsToProfile(dto, season),
    characteristics: mapPlayerDetailsToCharacteristics(dto, season),
    positions: mapPlayerDetailsToPositions(dto, season),
    seasonStats: seasonStatsDataset.overall,
    seasonStatsDataset,
    profileCompetitionStats: null,
    profileTrophiesByClub: [],
    trophies,
  };
}

export function usePlayerOverview(playerId: string, season: number) {
  const useFullPayload = appEnv.mobileEnableBffPlayerFull;
  const useAggregateOverview =
    !useFullPayload && appEnv.mobileEnablePlayerOverviewAggregate;

  const fullPlayerQuery = usePlayerFullQuery(
    playerId,
    season,
    useFullPayload && !!playerId && !!season,
  );
  const fullOverviewData = useMemo(
    () =>
      fullPlayerQuery.data
        ? selectPlayerOverviewFromFull(fullPlayerQuery.data as PlayerFullPayload, season)
        : undefined,
    [fullPlayerQuery.data, season],
  );

  const legacyOverviewQuery = useQuery({
    queryKey: useAggregateOverview
      ? queryKeys.players.overview(playerId, season)
      : queryKeys.players.details(playerId, season),
    queryFn: async ({ signal }) => {
      if (useAggregateOverview) {
        const overview = await fetchPlayerOverview(playerId, season, signal);
        if (!overview?.profile) {
          throw new Error('Player not found');
        }

        return {
          profile: overview.profile,
          characteristics: overview.characteristics,
          positions: overview.positions,
          seasonStats: overview.seasonStats ?? overview.seasonStatsDataset?.overall ?? null,
          seasonStatsDataset: overview.seasonStatsDataset,
          profileCompetitionStats: overview.profileCompetitionStats,
          profileTrophiesByClub: overview.trophiesByClub ?? [],
          trophies: [] as PlayerTrophyEntry[],
        };
      }

      const [dto, trophiesDtos] = await Promise.all([
        fetchPlayerDetails(playerId, season, signal),
        fetchPlayerTrophies(playerId, signal),
      ]);

      if (!dto) {
        throw new Error('Player not found');
      }

      const seasonStatsDataset = mapPlayerDetailsToSeasonStatsDataset(dto, season);

      return {
        profile: mapPlayerDetailsToProfile(dto, season),
        characteristics: mapPlayerDetailsToCharacteristics(dto, season),
        positions: mapPlayerDetailsToPositions(dto, season),
        seasonStats: seasonStatsDataset.overall,
        seasonStatsDataset,
        profileCompetitionStats: null,
        profileTrophiesByClub: [],
        trophies: mapPlayerTrophies(trophiesDtos),
      };
    },
    enabled: !useFullPayload && !!playerId && !!season,
    staleTime: featureQueryOptions.players.overview.staleTime,
    gcTime: featureQueryOptions.players.overview.gcTime,
    retry: featureQueryOptions.players.overview.retry,
  });

  const query = useFullPayload
    ? {
        ...fullPlayerQuery,
        data: fullOverviewData,
      }
    : legacyOverviewQuery;

  return {
    profile: query.data?.profile ?? null,
    characteristics: query.data?.characteristics ?? null,
    positions: query.data?.positions ?? null,
    seasonStats: query.data?.seasonStats ?? null,
    seasonStatsDataset: query.data?.seasonStatsDataset ?? null,
    profileCompetitionStats: query.data?.profileCompetitionStats ?? null,
    profileTrophiesByClub: query.data?.profileTrophiesByClub ?? [],
    trophies: query.data?.trophies ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    dataUpdatedAt: query.dataUpdatedAt,
    refetch: () => {
      query.refetch();
    },
  };
}
