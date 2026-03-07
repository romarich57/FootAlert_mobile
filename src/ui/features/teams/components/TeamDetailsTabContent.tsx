import { StyleSheet, Text, View } from 'react-native';
import { useMemo } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';

import {
  TeamMatchesTab,
} from '@ui/features/teams/components/TeamMatchesTab';
import { TeamOverviewTab } from '@ui/features/teams/components/TeamOverviewTab';
import { TeamSquadTab } from '@ui/features/teams/components/TeamSquadTab';
import { TeamStandingsTab } from '@ui/features/teams/components/TeamStandingsTab';
import { TeamStatsTab } from '@ui/features/teams/components/TeamStatsTab';
import { TeamTransfersTab } from '@ui/features/teams/components/TeamTransfersTab';
import type { TeamOverviewQueryResult } from '@ui/features/teams/hooks/useTeamOverview';
import type { TeamStatsQueryResult } from '@ui/features/teams/hooks/useTeamStats';
import type {
  TeamDetailsTab,
  TeamCompetitionOption,
  TeamIdentity,
  TeamMatchesData,
  TeamSquadData,
  TeamStandingsData,
  TeamTransfersData,
} from '@ui/features/teams/types/teams.types';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    stateWrap: {
      padding: 16,
    },
    stateCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 8,
    },
    stateText: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: '600',
    },
  });
}

type TeamDetailsTabContentProps = {
  activeTab: TeamDetailsTab;
  teamId: string;
  team: TeamIdentity;
  hasContentSelection: boolean;
  hasStandingsSelection: boolean;
  competitions: TeamCompetitionOption[];
  selectedSeason: number | null;
  labels: {
    noSelection: string;
  };
  onPressMatch: (matchId: string) => void;
  onPressTeam: (teamId: string) => void;
  onPressPlayer: (playerId: string) => void;
  overviewQuery: TeamOverviewQueryResult;
  matchesQuery: UseQueryResult<TeamMatchesData>;
  standingsQuery: UseQueryResult<TeamStandingsData>;
  statsQuery: TeamStatsQueryResult;
  transfersQuery: UseQueryResult<TeamTransfersData>;
  squadQuery: UseQueryResult<TeamSquadData>;
};

export function TeamDetailsTabContent({
  activeTab,
  teamId,
  team,
  hasContentSelection,
  hasStandingsSelection,
  competitions,
  selectedSeason,
  labels,
  onPressMatch,
  onPressTeam,
  onPressPlayer,
  overviewQuery,
  matchesQuery,
  standingsQuery,
  statsQuery,
  transfersQuery,
  squadQuery,
}: TeamDetailsTabContentProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const renderEmptySelection = (
    <View style={styles.stateWrap}>
      <View style={styles.stateCard}>
        <Text style={styles.stateText}>{labels.noSelection}</Text>
      </View>
    </View>
  );

  if (activeTab === 'overview') {
    if (!hasContentSelection) {
      return renderEmptySelection;
    }

    return (
      <TeamOverviewTab
        team={team}
        competitions={competitions}
        selectedSeason={selectedSeason}
        data={overviewQuery.data}
        isLoading={overviewQuery.isLoading}
        isFetching={overviewQuery.isFetching}
        isLeadersLoading={overviewQuery.isLeadersLoading}
        isError={overviewQuery.isError}
        hasFetched={overviewQuery.isFetched}
        hasFetchedAfterMount={overviewQuery.isFetchedAfterMount}
        onRetry={() => overviewQuery.refetch().catch(() => undefined)}
        onPressMatch={onPressMatch}
        onPressTeam={onPressTeam}
      />
    );
  }

  if (activeTab === 'matches') {
    if (!hasContentSelection) {
      return renderEmptySelection;
    }

    return (
      <TeamMatchesTab
        teamId={teamId}
        data={matchesQuery.data}
        isLoading={matchesQuery.isLoading}
        isError={matchesQuery.isError}
        hasFetched={matchesQuery.isFetched}
        onRetry={() => matchesQuery.refetch().catch(() => undefined)}
        onPressMatch={onPressMatch}
        onPressTeam={onPressTeam}
      />
    );
  }

  if (activeTab === 'standings') {
    if (!hasStandingsSelection) {
      return renderEmptySelection;
    }

    return (
      <TeamStandingsTab
        data={standingsQuery.data}
        isLoading={standingsQuery.isLoading}
        isError={standingsQuery.isError}
        hasFetched={standingsQuery.isFetched}
        onRetry={() => standingsQuery.refetch().catch(() => undefined)}
      />
    );
  }

  if (activeTab === 'stats') {
    if (!hasContentSelection) {
      return renderEmptySelection;
    }

    return (
      <TeamStatsTab
        data={statsQuery.data}
        isLoading={statsQuery.isLoading}
        isError={statsQuery.isError}
        hasFetched={statsQuery.isFetched}
        isPlayersLoading={statsQuery.isPlayersLoading}
        isAdvancedLoading={statsQuery.isAdvancedLoading}
        onRetry={() => statsQuery.refetch().catch(() => undefined)}
        onPressPlayer={onPressPlayer}
      />
    );
  }

  if (activeTab === 'transfers') {
    return (
      <TeamTransfersTab
        data={transfersQuery.data}
        isLoading={transfersQuery.isLoading}
        isError={transfersQuery.isError}
        hasFetched={transfersQuery.isFetched}
        onRetry={() => transfersQuery.refetch().catch(() => undefined)}
      />
    );
  }

  if (activeTab === 'squad') {
    return (
      <TeamSquadTab
        data={squadQuery.data}
        isLoading={squadQuery.isLoading}
        isError={squadQuery.isError}
        hasFetched={squadQuery.isFetched}
        onRetry={() => squadQuery.refetch().catch(() => undefined)}
      />
    );
  }

  return null;
}
