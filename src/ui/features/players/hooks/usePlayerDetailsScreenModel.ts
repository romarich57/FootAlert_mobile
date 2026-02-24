import { useCallback, useEffect, useMemo, useState } from 'react';

import { usePlayerCareer } from '@ui/features/players/hooks/usePlayerCareer';
import { usePlayerDetails } from '@ui/features/players/hooks/usePlayerDetails';
import { usePlayerMatches } from '@ui/features/players/hooks/usePlayerMatches';
import { usePlayerStats } from '@ui/features/players/hooks/usePlayerStats';
import type { PlayerTabType } from '@ui/features/players/components/PlayerTabs';

type UsePlayerDetailsScreenModelParams = {
  playerId: string;
  activeTab: PlayerTabType;
};

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

  const isMatchesTabActive = activeTab === 'matchs';
  const isStatsTabActive = activeTab === 'stats';
  const isCareerTabActive = activeTab === 'carriere';
  const shouldLoadCareer = isCareerTabActive || isStatsTabActive;

  const {
    profile,
    characteristics,
    seasonStats: basicSeasonStats,
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

  const { stats, isLoading: isStatsLoading, dataUpdatedAt: statsDataUpdatedAt } = usePlayerStats(
    playerId,
    selectedSeason,
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
      careerDataUpdatedAt,
    );
    return maxUpdatedAt > 0 ? maxUpdatedAt : null;
  }, [
    careerDataUpdatedAt,
    matchesDataUpdatedAt,
    profileDataUpdatedAt,
    statsDataUpdatedAt,
  ]);

  const hasCachedData = useMemo(
    () =>
      Boolean(profile) ||
      matches.length > 0 ||
      Boolean(stats) ||
      careerSeasons.length > 0 ||
      careerTeams.length > 0,
    [careerSeasons.length, careerTeams.length, matches.length, profile, stats],
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

  return {
    currentSeason,
    selectedSeason,
    availableSeasons,
    profile,
    characteristics,
    basicSeasonStats,
    isProfileLoading,
    isProfileError,
    matches,
    isMatchesLoading,
    stats,
    isStatsLoading,
    careerSeasons,
    careerTeams,
    isCareerLoading,
    hasCachedData,
    lastUpdatedAt,
    setSeason: handleSetSeason,
  };
}
