import { useMemo } from 'react';

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
    return {
      profile: null,
      characteristics: null,
      positions: null,
      seasonStats: null,
      seasonStatsDataset: null,
      profileCompetitionStats: null,
      profileTrophiesByClub: [],
      trophies,
    };
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
  const fullPlayerQuery = usePlayerFullQuery(
    playerId,
    season,
    !!playerId && !!season,
  );
  const fullOverviewData = useMemo(
    () =>
      fullPlayerQuery.data
        ? selectPlayerOverviewFromFull(fullPlayerQuery.data as PlayerFullPayload, season)
        : undefined,
    [fullPlayerQuery.data, season],
  );
  const query = {
    ...fullPlayerQuery,
    data: fullOverviewData as
      | {
          profile: ReturnType<typeof mapPlayerDetailsToProfile> | null;
          characteristics: ReturnType<typeof mapPlayerDetailsToCharacteristics> | null;
          positions: ReturnType<typeof mapPlayerDetailsToPositions> | null;
          seasonStats: ReturnType<typeof mapPlayerDetailsToSeasonStatsDataset>['overall'] | null;
          seasonStatsDataset: ReturnType<typeof mapPlayerDetailsToSeasonStatsDataset> | null;
          profileCompetitionStats: ReturnType<typeof selectPlayerOverviewFromFull>['profileCompetitionStats'];
          profileTrophiesByClub: ReturnType<typeof selectPlayerOverviewFromFull>['profileTrophiesByClub'];
          trophies: PlayerTrophyEntry[];
        }
      | undefined,
  };

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
