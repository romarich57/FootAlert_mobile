import { useMemo } from 'react';

import {
  mapPlayerCareerSeasonAggregate,
  mapPlayerCareerTeamAggregate,
} from '@data/mappers/playersMapper';

import { type PlayerFullPayload, usePlayerFullQuery } from './playerFullQuery';

function selectPlayerCareerFromFull(payload: PlayerFullPayload) {
  const seasons = payload.career.response.seasons
    .map(mapPlayerCareerSeasonAggregate)
    .sort((first, second) => {
      const firstYear = first.season ? Number.parseInt(first.season, 10) : Number.NEGATIVE_INFINITY;
      const secondYear = second.season ? Number.parseInt(second.season, 10) : Number.NEGATIVE_INFINITY;
      return secondYear - firstYear;
    });
  const teams = payload.career.response.teams.map(mapPlayerCareerTeamAggregate);

  return { seasons, teams };
}

function getCurrentSeason(): number {
  const currentDate = new Date();
  return currentDate.getUTCMonth() + 1 >= 7
    ? currentDate.getUTCFullYear()
    : currentDate.getUTCFullYear() - 1;
}

export function usePlayerCareer(playerId: string, enabled: boolean = true) {
  const currentSeason = useMemo(() => getCurrentSeason(), []);
  const fullPlayerQuery = usePlayerFullQuery(playerId, currentSeason, enabled && !!playerId);
  const careerData = useMemo(
    () =>
      fullPlayerQuery.data
        ? selectPlayerCareerFromFull(fullPlayerQuery.data as PlayerFullPayload)
        : undefined,
    [fullPlayerQuery.data],
  );

  const aggregateCareerQuery = {
    ...fullPlayerQuery,
    data: careerData,
  };

  return {
    careerSeasons: aggregateCareerQuery.data?.seasons ?? [],
    careerTeams: aggregateCareerQuery.data?.teams ?? [],
    isLoading: aggregateCareerQuery.isLoading,
    isError: aggregateCareerQuery.isError,
    dataUpdatedAt: aggregateCareerQuery.dataUpdatedAt,
    refetch: () => {
      aggregateCareerQuery.refetch();
    },
  };
}
