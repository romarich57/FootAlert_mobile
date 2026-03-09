import type { ReactNode } from 'react';

import { CompetitionMatchesTab } from '../components/CompetitionMatchesTab';
import { CompetitionPlayerStatsTab } from '../components/CompetitionPlayerStatsTab';
import { CompetitionStandingsTab } from '../components/CompetitionStandingsTab';
import { CompetitionTeamStatsTab } from '../components/CompetitionTeamStatsTab';
import { CompetitionTotwPanel } from '../components/CompetitionTotwPanel';
import { CompetitionTransfersTab } from '../components/CompetitionTransfersTab';
import type { CompetitionTabKey } from '../components/CompetitionTabs';

type CompetitionDetailsTabRegistryParams = {
  activeTab: CompetitionTabKey;
  competitionId: number;
  season: number;
  allowBracket: boolean;
  onPressTeam: (teamId: string) => void;
  onPressMatch: (matchId: string) => void;
  onPressPlayer: (playerId: string) => void;
};

export function renderCompetitionDetailsTab(
  params: CompetitionDetailsTabRegistryParams,
): ReactNode {
  switch (params.activeTab) {
    case 'standings':
      return (
        <CompetitionStandingsTab
          competitionId={params.competitionId}
          season={params.season}
          allowBracket={params.allowBracket}
          onPressTeam={params.onPressTeam}
        />
      );
    case 'matches':
      return (
        <CompetitionMatchesTab
          competitionId={params.competitionId}
          season={params.season}
          onPressMatch={params.onPressMatch}
          onPressTeam={params.onPressTeam}
        />
      );
    case 'playerStats':
      return (
        <CompetitionPlayerStatsTab
          competitionId={params.competitionId}
          season={params.season}
          onPressPlayer={params.onPressPlayer}
          onPressTeam={params.onPressTeam}
        />
      );
    case 'teamStats':
      return (
        <CompetitionTeamStatsTab
          competitionId={params.competitionId}
          season={params.season}
          onPressTeam={params.onPressTeam}
        />
      );
    case 'transfers':
      return (
        <CompetitionTransfersTab
          competitionId={params.competitionId}
          season={params.season}
          onPressPlayer={params.onPressPlayer}
          onPressTeam={params.onPressTeam}
        />
      );
    case 'totw':
      return (
        <CompetitionTotwPanel
          competitionId={params.competitionId}
          season={params.season}
          onPressPlayer={params.onPressPlayer}
        />
      );
    default:
      return null;
  }
}
