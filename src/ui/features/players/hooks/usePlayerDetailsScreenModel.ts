import { useMemo } from 'react';

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

  const isMatchesTabActive = activeTab === 'matchs';
  const isStatsTabActive = activeTab === 'stats';
  const isCareerTabActive = activeTab === 'carriere';

  const {
    profile,
    characteristics,
    seasonStats: basicSeasonStats,
    isLoading: isProfileLoading,
    isError: isProfileError,
  } = usePlayerDetails(playerId, currentSeason);

  const teamId = profile?.team.id ?? '';

  const {
    matches,
    isLoading: isMatchesLoading,
  } = usePlayerMatches(
    playerId,
    teamId,
    currentSeason,
    isMatchesTabActive && Boolean(teamId),
  );

  const { stats, isLoading: isStatsLoading } = usePlayerStats(
    playerId,
    currentSeason,
    isStatsTabActive,
  );

  const {
    careerSeasons,
    careerTeams,
    isLoading: isCareerLoading,
  } = usePlayerCareer(playerId, isCareerTabActive);

  return {
    currentSeason,
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
  };
}
