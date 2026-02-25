import { useQuery } from '@tanstack/react-query';

import { fetchPlayerDetails, fetchPlayerSeasons } from '@data/endpoints/playersApi';
import { mapPlayerDetailsToSeasonStatsDataset } from '@data/mappers/playersMapper';
import type { TeamCompetitionOption } from '@ui/features/teams/types/teams.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

type PlayerStatsSelection = {
  leagueId: string | null;
  season: number | null;
};

type PlayerStatsCatalog = {
  competitions: TeamCompetitionOption[];
  defaultSelection: PlayerStatsSelection;
};

const EMPTY_SELECTION: PlayerStatsSelection = {
  leagueId: null,
  season: null,
};

function resolveDefaultStatsSelection(
  competitions: TeamCompetitionOption[],
): PlayerStatsSelection {
  const availableSeasons = Array.from(
    new Set(competitions.flatMap(competition => competition.seasons)),
  ).sort((first, second) => second - first);

  const mostRecentSeason = availableSeasons[0] ?? null;
  if (mostRecentSeason === null) {
    return {
      leagueId: null,
      season: null,
    };
  }

  const competitionForSeason = competitions
    .filter(item => item.seasons.includes(mostRecentSeason))
    .sort((first, second) => (first.leagueName ?? '').localeCompare(second.leagueName ?? ''))[0];

  return {
    leagueId: competitionForSeason?.leagueId ?? null,
    season: mostRecentSeason,
  };
}

function buildCatalog(competitions: TeamCompetitionOption[]): PlayerStatsCatalog {
  const normalized = competitions
    .map(competition => ({
      ...competition,
      seasons: [...competition.seasons].sort((first, second) => second - first),
      currentSeason:
        competition.currentSeason ??
        [...competition.seasons].sort((first, second) => second - first)[0] ??
        null,
    }))
    .filter(item => item.seasons.length > 0)
    .sort((first, second) => (first.leagueName ?? '').localeCompare(second.leagueName ?? ''));

  return {
    competitions: normalized,
    defaultSelection: resolveDefaultStatsSelection(normalized),
  };
}

export function usePlayerStatsCatalog(playerId: string, enabled: boolean = true) {
  const catalogQuery = useQuery({
    queryKey: queryKeys.players.statsCatalog(playerId),
    enabled: enabled && !!playerId,
    queryFn: async ({ signal }): Promise<PlayerStatsCatalog> => {
      const seasons = await fetchPlayerSeasons(playerId, signal);
      const uniqueSeasons = Array.from(
        new Set(seasons.filter(value => Number.isFinite(value))),
      ).sort((first, second) => second - first);

      if (uniqueSeasons.length === 0) {
        return {
          competitions: [],
          defaultSelection: {
            leagueId: null,
            season: null,
          },
        };
      }

      const seasonDetails = await Promise.all(
        uniqueSeasons.map(async season => {
          try {
            const details = await fetchPlayerDetails(playerId, season, signal);
            return { season, details };
          } catch {
            return { season, details: null };
          }
        }),
      );

      const competitionsMap = new Map<string, TeamCompetitionOption>();

      seasonDetails.forEach(({ season, details }) => {
        if (!details) {
          return;
        }

        const dataset = mapPlayerDetailsToSeasonStatsDataset(details, season);
        dataset.byCompetition.forEach(item => {
          if (!item.leagueId || item.season === null) {
            return;
          }

          const existing = competitionsMap.get(item.leagueId);
          if (existing) {
            if (!existing.seasons.includes(item.season)) {
              existing.seasons.push(item.season);
            }
            if (
              existing.currentSeason === null ||
              item.season > existing.currentSeason
            ) {
              existing.currentSeason = item.season;
            }
            if (!existing.leagueName && item.leagueName) {
              existing.leagueName = item.leagueName;
            }
            if (!existing.leagueLogo && item.leagueLogo) {
              existing.leagueLogo = item.leagueLogo;
            }
            return;
          }

          competitionsMap.set(item.leagueId, {
            leagueId: item.leagueId,
            leagueName: item.leagueName,
            leagueLogo: item.leagueLogo,
            type: null,
            country: null,
            seasons: [item.season],
            currentSeason: item.season,
          });
        });
      });

      return buildCatalog(Array.from(competitionsMap.values()));
    },
    ...featureQueryOptions.players.stats,
  });

  return {
    competitions: catalogQuery.data?.competitions ?? [],
    defaultSelection: catalogQuery.data?.defaultSelection ?? EMPTY_SELECTION,
    isLoading: catalogQuery.isLoading,
    isError: catalogQuery.isError,
    dataUpdatedAt: catalogQuery.dataUpdatedAt,
    refetch: catalogQuery.refetch,
  };
}
