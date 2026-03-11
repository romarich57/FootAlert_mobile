import React from 'react';

import { PlayerCareerTab } from '@ui/features/players/components/PlayerCareerTab';
import { PlayerMatchesTab } from '@ui/features/players/components/PlayerMatchesTab';
import { PlayerProfileTab } from '@ui/features/players/components/PlayerProfileTab';
import { PlayerStatsTab } from '@ui/features/players/components/PlayerStatsTab';
import type { PlayerTabType } from '@ui/features/players/components/PlayerTabs';
import { usePlayerDetailsScreenModel } from '@ui/features/players/hooks/usePlayerDetailsScreenModel';
import { TabContentSkeleton } from '@ui/shared/components';

type PlayerDetailsScreenModel = ReturnType<typeof usePlayerDetailsScreenModel>;

type PlayerDetailsTabContentProps = {
  activeTab: PlayerTabType;
  profile: NonNullable<PlayerDetailsScreenModel['profile']>;
  screenModel: PlayerDetailsScreenModel;
  onPressMatch: (fixtureId: string) => void;
  onPressTeam: (teamId: string) => void;
  onPressCompetition: (competitionId: string) => void;
};

export function PlayerDetailsTabContent({
  activeTab,
  profile,
  screenModel,
  onPressMatch,
  onPressTeam,
  onPressCompetition,
}: PlayerDetailsTabContentProps) {
  switch (activeTab) {
    case 'profil':
      return (
        <PlayerProfileTab
          profile={profile}
          competitionStats={screenModel.profileCompetitionStats}
          characteristics={screenModel.characteristics}
          positions={screenModel.profilePositions}
          trophiesByClub={screenModel.profileTrophiesByClub}
          onPressCompetition={onPressCompetition}
        />
      );
    case 'matchs':
      return screenModel.isMatchesLoading ? (
        <TabContentSkeleton />
      ) : (
        <PlayerMatchesTab
          matches={screenModel.matches}
          onPressMatch={onPressMatch}
          onPressCompetition={onPressCompetition}
          onPressTeam={onPressTeam}
        />
      );
    case 'stats':
      return screenModel.isStatsLoading || !screenModel.stats ? (
        <TabContentSkeleton />
      ) : (
        <PlayerStatsTab
          stats={screenModel.stats}
          leagueName={screenModel.statsLeagueName}
          competitions={screenModel.statsCompetitions}
          selectedSeason={screenModel.statsSelectedSeason}
          selectedLeagueId={screenModel.statsSelectedLeagueId}
          onSelectLeagueSeason={screenModel.setStatsLeagueSeason}
        />
      );
    case 'carriere':
      return screenModel.isCareerLoading ? (
        <TabContentSkeleton />
      ) : (
        <PlayerCareerTab
          seasons={screenModel.careerSeasons}
          teams={screenModel.careerTeams}
          nationality={profile.nationality ?? undefined}
          onPressTeam={onPressTeam}
        />
      );
    default:
      return null;
  }
}
