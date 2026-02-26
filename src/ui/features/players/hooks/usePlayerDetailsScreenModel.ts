import { useCallback, useEffect, useMemo, useState } from 'react';

import { groupPlayerTrophiesByClub } from '@data/mappers/playersMapper';
import { usePlayerCareer } from '@ui/features/players/hooks/usePlayerCareer';
import { usePlayerDetails } from '@ui/features/players/hooks/usePlayerDetails';
import { usePlayerMatches } from '@ui/features/players/hooks/usePlayerMatches';
import { usePlayerStatsCatalog } from '@ui/features/players/hooks/usePlayerStatsCatalog';
import { usePlayerStats } from '@ui/features/players/hooks/usePlayerStats';
import type { PlayerTabType } from '@ui/features/players/components/PlayerTabs';
import { firstAvailableTab, hasAnyPresentValue, type TabAvailability } from '@ui/shared/availability';
import type {
  PlayerProfileCompetitionStats,
  PlayerSeasonStatsDataset,
} from '@ui/features/players/types/players.types';

type UsePlayerDetailsScreenModelParams = {
  playerId: string;
  activeTab: PlayerTabType;
};

type PlayerStatsSelection = {
  season: number | null;
  leagueId: string | null;
};

function toRatingWeight(value: string | null): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function compareByMostPlayed(first: PlayerProfileCompetitionStats, second: PlayerProfileCompetitionStats): number {
  const firstMatches = first.matches ?? Number.NEGATIVE_INFINITY;
  const secondMatches = second.matches ?? Number.NEGATIVE_INFINITY;
  if (secondMatches !== firstMatches) {
    return secondMatches - firstMatches;
  }

  const firstRating = toRatingWeight(first.rating);
  const secondRating = toRatingWeight(second.rating);
  if (secondRating !== firstRating) {
    return secondRating - firstRating;
  }

  return (first.leagueName ?? '').localeCompare(second.leagueName ?? '');
}

export function selectProfileCompetitionStats(
  seasonStatsDataset: PlayerSeasonStatsDataset | null | undefined,
): PlayerProfileCompetitionStats | null {
  if (!seasonStatsDataset || seasonStatsDataset.byCompetition.length === 0) {
    return null;
  }

  const mappedStats = seasonStatsDataset.byCompetition.map<PlayerProfileCompetitionStats>(competition => ({
    leagueId: competition.leagueId,
    leagueName: competition.leagueName,
    leagueLogo: competition.leagueLogo,
    season: competition.season,
    matches: competition.stats.matches,
    goals: competition.stats.goals,
    assists: competition.stats.assists,
    rating: competition.stats.rating,
  }));

  const recentSeasons = mappedStats
    .map(item => item.season)
    .filter((season): season is number => typeof season === 'number' && Number.isFinite(season));
  const latestSeason = recentSeasons.length > 0 ? Math.max(...recentSeasons) : null;
  const seasonScoped =
    latestSeason !== null
      ? mappedStats.filter(item => item.season === latestSeason)
      : mappedStats;

  if (seasonScoped.length === 0) {
    return null;
  }

  return [...seasonScoped].sort(compareByMostPlayed)[0] ?? null;
}

export function usePlayerDetailsScreenModel({
  playerId,
  activeTab,
}: UsePlayerDetailsScreenModelParams) {
  const currentSeason = useMemo(() => {
    const currentDate = new Date();
    return currentDate.getUTCMonth() + 1 >= 7
      ? currentDate.getUTCFullYear()
      : currentDate.getUTCFullYear() - 1;
  }, []);
  const [selectedSeason, setSelectedSeason] = useState(currentSeason);
  const [statsSelection, setStatsSelection] = useState<PlayerStatsSelection>({
    season: currentSeason,
    leagueId: null,
  });

  const shouldLoadCareer = true;

  const {
    profile,
    characteristics,
    positions,
    seasonStats: basicSeasonStats,
    seasonStatsDataset,
    trophies,
    isLoading: isProfileLoading,
    isError: isProfileError,
    dataUpdatedAt: profileDataUpdatedAt,
  } = usePlayerDetails(playerId, selectedSeason);

  const teamId = profile?.team.id ?? '';

  const {
    matches,
    isLoading: isMatchesLoading,
    isError: isMatchesError,
    dataUpdatedAt: matchesDataUpdatedAt,
  } = usePlayerMatches(
    playerId,
    teamId,
    selectedSeason,
    Boolean(teamId),
  );

  const {
    competitions: statsCompetitions,
    defaultSelection: statsDefaultSelection,
    isLoading: isStatsCatalogLoading,
    isError: isStatsCatalogError,
    dataUpdatedAt: statsCatalogDataUpdatedAt,
  } = usePlayerStatsCatalog(playerId, true);

  const statsSeason =
    statsSelection.season ?? statsDefaultSelection.season ?? currentSeason;

  const {
    stats: statsDataset,
    isLoading: isStatsDatasetLoading,
    isError: isStatsDatasetError,
    dataUpdatedAt: statsDataUpdatedAt,
  } = usePlayerStats(
    playerId,
    statsSeason,
    true,
  );

  const {
    careerSeasons,
    careerTeams,
    isLoading: isCareerLoading,
    isError: isCareerError,
    dataUpdatedAt: careerDataUpdatedAt,
  } = usePlayerCareer(playerId, shouldLoadCareer);

  const lastUpdatedAt = useMemo(() => {
    const maxUpdatedAt = Math.max(
      profileDataUpdatedAt,
      matchesDataUpdatedAt,
      statsDataUpdatedAt,
      statsCatalogDataUpdatedAt,
      careerDataUpdatedAt,
    );
    return maxUpdatedAt > 0 ? maxUpdatedAt : null;
  }, [
    careerDataUpdatedAt,
    matchesDataUpdatedAt,
    profileDataUpdatedAt,
    statsCatalogDataUpdatedAt,
    statsDataUpdatedAt,
  ]);

  useEffect(() => {
    if (statsCompetitions.length === 0) {
      if (statsSelection.leagueId !== null) {
        setStatsSelection(current => ({
          season: current.season ?? statsDefaultSelection.season ?? currentSeason,
          leagueId: null,
        }));
      }
      return;
    }

    const effectiveSeason = statsSelection.season ?? statsDefaultSelection.season ?? currentSeason;
    const competitionsForSeason = statsCompetitions.filter(competition =>
      competition.seasons.includes(effectiveSeason),
    );

    if (competitionsForSeason.length === 0) {
      if (
        statsDefaultSelection.leagueId &&
        Number.isFinite(statsDefaultSelection.season)
      ) {
        if (
          statsSelection.leagueId !== statsDefaultSelection.leagueId ||
          statsSelection.season !== statsDefaultSelection.season
        ) {
          setStatsSelection(statsDefaultSelection);
        }
      }
      return;
    }

    const hasActiveLeague =
      typeof statsSelection.leagueId === 'string' &&
      competitionsForSeason.some(competition => competition.leagueId === statsSelection.leagueId);

    if (!hasActiveLeague || statsSelection.season !== effectiveSeason) {
      setStatsSelection({
        season: effectiveSeason,
        leagueId: competitionsForSeason[0].leagueId,
      });
    }
  }, [
    currentSeason,
    statsCompetitions,
    statsDefaultSelection,
    statsSelection.leagueId,
    statsSelection.season,
  ]);

  const statsBySelectedCompetition = useMemo(() => {
    if (!statsDataset || !statsSelection.leagueId) {
      return null;
    }

    return (
      statsDataset.byCompetition.find(
        item =>
          item.leagueId === statsSelection.leagueId &&
          item.season === statsSeason,
      ) ?? null
    );
  }, [statsDataset, statsSeason, statsSelection.leagueId]);

  const stats = useMemo(
    () => statsBySelectedCompetition?.stats ?? statsDataset?.overall ?? null,
    [statsBySelectedCompetition, statsDataset],
  );

  const profileCompetitionStats = useMemo(
    () => selectProfileCompetitionStats(seasonStatsDataset),
    [seasonStatsDataset],
  );

  const profileTrophiesByClub = useMemo(
    () => groupPlayerTrophiesByClub(trophies, careerSeasons),
    [careerSeasons, trophies],
  );

  const profilePositions = useMemo(() => {
    if (!positions || positions.all.length === 0) {
      return null;
    }

    return positions;
  }, [positions]);

  const hasCachedData = useMemo(
    () =>
      Boolean(profile) ||
      matches.length > 0 ||
      Boolean(stats) ||
      Boolean(profileCompetitionStats) ||
      statsCompetitions.length > 0 ||
      careerSeasons.length > 0 ||
      careerTeams.length > 0 ||
      trophies.length > 0,
    [
      careerSeasons.length,
      careerTeams.length,
      matches.length,
      profile,
      profileCompetitionStats,
      stats,
      statsCompetitions.length,
      trophies.length,
    ],
  );

  const availableSeasons = useMemo<number[]>(() => {
    const seasons = careerSeasons
      .map(item => (item.season ? Number.parseInt(item.season, 10) : Number.NaN))
      .filter((year): year is number => Number.isFinite(year));

    const unique = Array.from(new Set(seasons)).sort((a, b) => b - a);
    if (unique.length > 0) {
      return unique;
    }

    return [currentSeason];
  }, [careerSeasons, currentSeason]);

  useEffect(() => {
    if (availableSeasons.length === 0) {
      return;
    }

    if (!availableSeasons.includes(selectedSeason)) {
      setSelectedSeason(availableSeasons[0]);
    }
  }, [availableSeasons, selectedSeason]);

  const handleSetSeason = useCallback((season: number) => {
    if (!Number.isFinite(season)) {
      return;
    }

    setSelectedSeason(season);
  }, []);

  const handleSetStatsLeagueSeason = useCallback((leagueId: string, season: number) => {
    if (!leagueId || !Number.isFinite(season)) {
      return;
    }

    setStatsSelection({
      leagueId,
      season,
    });
  }, []);

  const tabAvailability = useMemo<Array<TabAvailability<PlayerTabType>>>(() => {
    const profileHasData =
      Boolean(profile) ||
      hasAnyPresentValue(characteristics as Record<string, unknown> | null) ||
      Boolean(profileCompetitionStats) ||
      Boolean(profilePositions) ||
      profileTrophiesByClub.length > 0;
    const matchesHasData = matches.length > 0;
    const statsHasData = hasAnyPresentValue(stats as Record<string, unknown> | null);
    const careerHasData = careerSeasons.length > 0 || careerTeams.length > 0;

    const resolveState = (
      hasData: boolean,
      isLoading: boolean,
      isError: boolean,
    ): 'available' | 'missing' | 'unknown' => {
      if (hasData) {
        return 'available';
      }

      if (isLoading) {
        return 'unknown';
      }

      if (isError) {
        return 'unknown';
      }

      return 'missing';
    };

    return [
      {
        key: 'profil',
        state: resolveState(profileHasData, isProfileLoading && !profileHasData, isProfileError && !profileHasData),
      },
      {
        key: 'matchs',
        state: resolveState(matchesHasData, isMatchesLoading && !matchesHasData, isMatchesError && !matchesHasData),
      },
      {
        key: 'stats',
        state: resolveState(
          statsHasData,
          (isStatsDatasetLoading || isStatsCatalogLoading) && !statsHasData,
          (isStatsDatasetError || isStatsCatalogError) && !statsHasData,
        ),
      },
      {
        key: 'carriere',
        state: resolveState(careerHasData, isCareerLoading && !careerHasData, isCareerError && !careerHasData),
      },
    ];
  }, [
    careerSeasons.length,
    careerTeams.length,
    characteristics,
    isCareerError,
    isCareerLoading,
    isMatchesError,
    isMatchesLoading,
    isProfileError,
    isProfileLoading,
    isStatsCatalogError,
    isStatsCatalogLoading,
    isStatsDatasetError,
    isStatsDatasetLoading,
    matches.length,
    profile,
    profileCompetitionStats,
    profilePositions,
    profileTrophiesByClub.length,
    stats,
  ]);

  const availableTabs = useMemo(
    () => tabAvailability.filter(tab => tab.state !== 'missing').map(tab => tab.key),
    [tabAvailability],
  );
  const nextActiveTab = useMemo(
    () => firstAvailableTab(tabAvailability, activeTab),
    [activeTab, tabAvailability],
  );
  const hasAnyAvailableTab = useMemo(
    () => tabAvailability.some(tab => tab.state === 'available'),
    [tabAvailability],
  );

  return {
    currentSeason,
    selectedSeason,
    availableSeasons,
    profile,
    characteristics,
    profileCompetitionStats,
    profilePositions,
    profileTrophiesByClub,
    basicSeasonStats,
    isProfileLoading,
    isProfileError,
    availableTabs,
    tabAvailability,
    nextActiveTab,
    hasAnyAvailableTab,
    matches,
    isMatchesLoading,
    stats,
    isStatsLoading: isStatsDatasetLoading || isStatsCatalogLoading,
    statsCompetitions,
    statsSelectedSeason: statsSeason,
    statsSelectedLeagueId: statsSelection.leagueId,
    statsLeagueName:
      statsBySelectedCompetition?.leagueName ??
      profile?.league.name ??
      null,
    setStatsLeagueSeason: handleSetStatsLeagueSeason,
    careerSeasons,
    careerTeams,
    isCareerLoading,
    hasCachedData,
    lastUpdatedAt,
    setSeason: handleSetSeason,
  };
}
