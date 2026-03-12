import { useMemo } from 'react';

import { mapPlayerDetailsToSeasonStatsDataset } from '@data/mappers/playersMapper';

import { type PlayerFullPayload, usePlayerFullQuery } from './playerFullQuery';

function selectPlayerStatsFromFull(
  payload: PlayerFullPayload,
  season: number,
) {
  const overviewDataset = payload.overview.response?.seasonStatsDataset;
  if (overviewDataset) {
    return overviewDataset;
  }

  const details = payload.details.response[0] ?? null;
  return details ? mapPlayerDetailsToSeasonStatsDataset(details, season) : null;
}

export function usePlayerStats(
  playerId: string,
  season: number,
  enabled: boolean = true,
) {
  const fullPlayerQuery = usePlayerFullQuery(playerId, season, enabled && !!playerId && !!season);
  const stats = useMemo(
    () =>
      fullPlayerQuery.data
        ? selectPlayerStatsFromFull(fullPlayerQuery.data as PlayerFullPayload, season)
        : null,
    [fullPlayerQuery.data, season],
  );

  return {
    stats,
    isLoading: fullPlayerQuery.isLoading,
    isError: fullPlayerQuery.isError,
    dataUpdatedAt: fullPlayerQuery.dataUpdatedAt,
    refetch: fullPlayerQuery.refetch,
  };
}
