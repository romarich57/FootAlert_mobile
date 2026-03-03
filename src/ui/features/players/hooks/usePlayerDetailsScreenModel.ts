import { useCallback, useEffect, useMemo, useState } from 'react';

import { groupPlayerTrophiesByClub } from '@data/mappers/playersMapper';
import { usePlayerCareer } from '@ui/features/players/hooks/usePlayerCareer';
import { usePlayerDetails } from '@ui/features/players/hooks/usePlayerDetails';
import { usePlayerMatches } from '@ui/features/players/hooks/usePlayerMatches';
import { usePlayerStatsCatalog } from '@ui/features/players/hooks/usePlayerStatsCatalog';
import { usePlayerStats } from '@ui/features/players/hooks/usePlayerStats';
import type { PlayerTabType } from '@ui/features/players/components/PlayerTabs';
import type {
  PlayerProfileCompetitionStats,
  PlayerSeasonStatsDataset,
} from '@ui/features/players/types/players.types';
import { useFollowsActions } from '@ui/features/follows/hooks/useFollowsActions';

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

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const { followedPlayerIds, togglePlayerFollow } = useFollowsActions();
  const isPlayerFollowed = playerId
    ? followedPlayerIds.includes(playerId)
    : false;

  const handleToggleFollow = useCallback(() => {
    if (playerId) {
      togglePlayerFollow(playerId);
    }
  }, [playerId, togglePlayerFollow]);

  const openNotificationModal = useCallback(() => {
    setIsNotificationModalOpen(true);
  }, []);

  const closeNotificationModal = useCallback(() => {
    setIsNotificationModalOpen(false);
  }, []);

  const isMatchesTabActive = activeTab === 'matchs';
  const isStatsTabActive = activeTab === 'stats';
  const isCareerTabActive = activeTab === 'carriere';
  const isProfileTabActive = activeTab === 'profil';
  const shouldLoadCareer = isCareerTabActive || isStatsTabActive || isProfileTabActive;

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
    dataUpdatedAt: matchesDataUpdatedAt,
  } = usePlayerMatches(
    playerId,
    teamId,
    selectedSeason,
    isMatchesTabActive && Boolean(teamId),
  );

  const {
    competitions: statsCompetitions,
    defaultSelection: statsDefaultSelection,
    isLoading: isStatsCatalogLoading,
    dataUpdatedAt: statsCatalogDataUpdatedAt,
  } = usePlayerStatsCatalog(playerId, isStatsTabActive);

  const statsSeason =
    statsSelection.season ?? statsDefaultSelection.season ?? currentSeason;

  const {
    stats: statsDataset,
    isLoading: isStatsDatasetLoading,
    dataUpdatedAt: statsDataUpdatedAt,
  } = usePlayerStats(
    playerId,
    statsSeason,
    isStatsTabActive,
  );

  const {
    careerSeasons,
    careerTeams,
    isLoading: isCareerLoading,
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
    isPlayerFollowed,
    isNotificationModalOpen,
    handleToggleFollow,
    openNotificationModal,
    closeNotificationModal,
  };
}
