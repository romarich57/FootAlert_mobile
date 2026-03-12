import { useMemo } from 'react';

import { mapPlayerDetailsToSeasonStatsDataset } from '@data/mappers/playersMapper';
import type {
  PlayerApiDetailsDto,
  PlayerStatsCatalogCompetition,
} from '@domain/contracts/players.types';
import {
  usePlayerFullQuery,
  type PlayerFullPayload,
} from '@ui/features/players/hooks/playerFullQuery';
import type { TeamCompetitionOption } from '@ui/features/teams/types/teams.types';

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

function toTeamCompetitionOption(
  competition: PlayerStatsCatalogCompetition,
): TeamCompetitionOption | null {
  const leagueId =
    typeof competition.leagueId === 'string' && competition.leagueId.length > 0
      ? competition.leagueId
      : null;
  if (!leagueId) {
    return null;
  }

  return {
    leagueId,
    leagueName: competition.leagueName ?? null,
    leagueLogo: competition.leagueLogo ?? null,
    type: competition.type ?? null,
    country: competition.country ?? null,
    seasons: [...competition.seasons],
    currentSeason: competition.currentSeason ?? null,
  };
}

function buildCatalogFromSeasonDetails(
  seasonDetails: Array<{ season: number; details: PlayerApiDetailsDto | null }>,
): PlayerStatsCatalog {
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
}

function selectPlayerStatsCatalogFromFull(
  payload: PlayerFullPayload,
  season: number,
): PlayerStatsCatalog {
  const catalog = payload.statsCatalog.response;
  if (catalog) {
    return {
      competitions: (catalog.competitions ?? [])
        .map(toTeamCompetitionOption)
        .filter((competition): competition is TeamCompetitionOption => competition !== null),
      defaultSelection: catalog.defaultSelection ?? EMPTY_SELECTION,
    };
  }

  const details = payload.details.response[0] ?? null;
  if (!details) {
    return {
      competitions: [],
      defaultSelection: EMPTY_SELECTION,
    };
  }

  return buildCatalogFromSeasonDetails([{ season, details }]);
}

export function usePlayerStatsCatalog(
  playerId: string,
  enabled: boolean = true,
  season?: number,
) {
  const fullSeason =
    typeof season === 'number' && Number.isFinite(season) ? season : null;

  const fullPlayerQuery = usePlayerFullQuery(
    playerId,
    fullSeason ?? 0,
    enabled && !!playerId && fullSeason !== null,
  );
  const fullCatalogData = useMemo(
    () =>
      fullPlayerQuery.data
        ? selectPlayerStatsCatalogFromFull(
            fullPlayerQuery.data as PlayerFullPayload,
            fullSeason ?? 0,
          )
        : undefined,
    [fullPlayerQuery.data, fullSeason],
  );
  const catalogQuery = {
    ...fullPlayerQuery,
    data: fullCatalogData as PlayerStatsCatalog | undefined,
  };

  return {
    competitions: catalogQuery.data?.competitions ?? [],
    defaultSelection: catalogQuery.data?.defaultSelection ?? EMPTY_SELECTION,
    isLoading: catalogQuery.isLoading,
    isError: catalogQuery.isError,
    dataUpdatedAt: catalogQuery.dataUpdatedAt,
    refetch: catalogQuery.refetch,
  };
}
