import { useQuery } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import {
  fetchPlayerCareerAggregate,
  fetchPlayerDetails,
  fetchPlayerSeasons,
} from '@data/endpoints/playersApi';
import { mapPlayerCareerSeasons } from '@data/mappers/playersMapper';
import type { PlayerCareerSeason, PlayerCareerTeam } from '@ui/features/players/types/players.types';

export const PLAYER_CAREER_SEASONS_QUERY_KEY = 'player_career_seasons';
export const PLAYER_CAREER_QUERY_KEY = 'player_career';
export const PLAYER_CAREER_AGGREGATE_QUERY_KEY = 'player_career_aggregate';

function sumNullable(a: number | null, b: number | null): number | null {
  if (a === null && b === null) {
    return null;
  }

  return (a ?? 0) + (b ?? 0);
}

function aggregateLegacyCareer(
  allSeasons: PlayerCareerSeason[],
): { seasons: PlayerCareerSeason[]; teams: PlayerCareerTeam[] } {
  const uniqueSeasons = Array.from(
    new Map(
      allSeasons.map((item, index) => {
        const seasonKey = item.season ?? `unknown-season-${index}`;
        const teamKey = item.team.id ?? item.team.name ?? `unknown-team-${index}`;
        return [`${seasonKey}-${teamKey}`, item] as const;
      }),
    ).values(),
  );

  uniqueSeasons.sort((a, b) => {
    const aYear = a.season ? Number.parseInt(a.season, 10) : Number.NEGATIVE_INFINITY;
    const bYear = b.season ? Number.parseInt(b.season, 10) : Number.NEGATIVE_INFINITY;
    return bYear - aYear;
  });

  const teamMap = new Map<string, PlayerCareerTeam>();
  uniqueSeasons.forEach(season => {
    const teamId = season.team.id ?? '';
    if (!teamId) {
      return;
    }

    if (!teamMap.has(teamId)) {
      teamMap.set(teamId, {
        team: season.team,
        period: null,
        matches: null,
        goals: null,
        assists: null,
      });
    }

    const team = teamMap.get(teamId);
    if (!team) {
      return;
    }

    team.matches = sumNullable(team.matches, season.matches);
    team.goals = sumNullable(team.goals, season.goals);
    team.assists = sumNullable(team.assists, season.assists);

    const year = season.season ? Number.parseInt(season.season, 10) : Number.NaN;
    if (!Number.isNaN(year)) {
      if (!team.period) {
        team.period = `${year}`;
      } else {
        const range = team.period.split(' - ').map(Number);
        const min = Math.min(...range, year);
        const max = Math.max(...range, year);
        team.period = min === max ? `${min}` : `${min} - ${max}`;
      }
    }
  });

  return {
    seasons: uniqueSeasons,
    teams: Array.from(teamMap.values()),
  };
}

export function usePlayerCareer(playerId: string, enabled: boolean = true) {
  const useAggregateEndpoint = appEnv.mobileEnableBffPlayerAggregates;

  const seasonsListQuery = useQuery({
    queryKey: [PLAYER_CAREER_SEASONS_QUERY_KEY, playerId, 'legacy'],
    queryFn: async ({ signal }) => fetchPlayerSeasons(playerId, signal),
    enabled: enabled && !useAggregateEndpoint && !!playerId,
    staleTime: 60 * 60 * 1000,
  });

  const legacyCareerQuery = useQuery({
    queryKey: [PLAYER_CAREER_QUERY_KEY, playerId, seasonsListQuery.data, 'legacy'],
    queryFn: async ({ signal }) => {
      const seasons = seasonsListQuery.data ?? [];
      const detailsBySeason = await Promise.all(
        seasons.map(season => fetchPlayerDetails(playerId, season, signal)),
      );

      const allSeasons = detailsBySeason.flatMap(details =>
        details ? mapPlayerCareerSeasons(details) : [],
      );

      return aggregateLegacyCareer(allSeasons);
    },
    enabled:
      enabled &&
      !useAggregateEndpoint &&
      !!playerId &&
      seasonsListQuery.isSuccess,
    staleTime: 60 * 60 * 1000,
  });

  const aggregateCareerQuery = useQuery({
    queryKey: [PLAYER_CAREER_AGGREGATE_QUERY_KEY, playerId],
    queryFn: async ({ signal }) => fetchPlayerCareerAggregate(playerId, signal),
    enabled: enabled && useAggregateEndpoint && !!playerId,
    staleTime: 60 * 60 * 1000,
  });

  const activeCareerQuery = useAggregateEndpoint ? aggregateCareerQuery : legacyCareerQuery;

  return {
    careerSeasons: activeCareerQuery.data?.seasons ?? [],
    careerTeams: activeCareerQuery.data?.teams ?? [],
    isLoading: useAggregateEndpoint
      ? aggregateCareerQuery.isLoading
      : seasonsListQuery.isLoading || legacyCareerQuery.isLoading,
    isError: useAggregateEndpoint
      ? aggregateCareerQuery.isError
      : seasonsListQuery.isError || legacyCareerQuery.isError,
    refetch: () => {
      if (useAggregateEndpoint) {
        aggregateCareerQuery.refetch();
        return;
      }

      seasonsListQuery.refetch();
      legacyCareerQuery.refetch();
    },
  };
}
