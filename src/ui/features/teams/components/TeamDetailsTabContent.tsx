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
import { TeamTrophiesTab } from '@ui/features/teams/components/TeamTrophiesTab';
import { TeamTransfersTab } from '@ui/features/teams/components/TeamTransfersTab';
import type {
  TeamDetailsTab,
  TeamIdentity,
  TeamMatchesData,
  TeamOverviewData,
  TeamSquadData,
  TeamStandingsData,
  TeamStatsData,
  TeamTrophiesData,
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
  hasLeagueSelection: boolean;
  labels: {
    noSelection: string;
  };
  onPressMatch: (matchId: string) => void;
  onPressTeam: (teamId: string) => void;
  onPressPlayer: (playerId: string) => void;
  overviewQuery: UseQueryResult<TeamOverviewData>;
  matchesQuery: UseQueryResult<TeamMatchesData>;
  standingsQuery: UseQueryResult<TeamStandingsData>;
  statsQuery: UseQueryResult<TeamStatsData>;
  transfersQuery: UseQueryResult<TeamTransfersData>;
  squadQuery: UseQueryResult<TeamSquadData>;
  trophiesQuery: UseQueryResult<TeamTrophiesData>;
};

export function TeamDetailsTabContent({
  activeTab,
  teamId,
  team,
  hasLeagueSelection,
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
  trophiesQuery,
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
    if (!hasLeagueSelection) {
      return renderEmptySelection;
    }

    return (
      <TeamOverviewTab
        team={team}
        data={overviewQuery.data}
        isLoading={overviewQuery.isLoading}
        isError={overviewQuery.isError}
        onRetry={() => overviewQuery.refetch().catch(() => undefined)}
        onPressMatch={onPressMatch}
        onPressTeam={onPressTeam}
      />
    );
  }

  if (activeTab === 'matches') {
    if (!hasLeagueSelection) {
      return renderEmptySelection;
    }

    return (
      <TeamMatchesTab
        teamId={teamId}
        data={matchesQuery.data}
        isLoading={matchesQuery.isLoading}
        isError={matchesQuery.isError}
        onRetry={() => matchesQuery.refetch().catch(() => undefined)}
        onPressMatch={onPressMatch}
        onPressTeam={onPressTeam}
      />
    );
  }

  if (activeTab === 'standings') {
    if (!hasLeagueSelection) {
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
    if (!hasLeagueSelection) {
      return renderEmptySelection;
    }

    return (
      <TeamStatsTab
        data={statsQuery.data}
        isLoading={statsQuery.isLoading}
        isError={statsQuery.isError}
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
        onRetry={() => squadQuery.refetch().catch(() => undefined)}
      />
    );
  }

  return (
    <TeamTrophiesTab
      data={trophiesQuery.data}
      isLoading={trophiesQuery.isLoading}
      isError={trophiesQuery.isError}
      hasFetched={trophiesQuery.isFetched}
      onRetry={() => trophiesQuery.refetch().catch(() => undefined)}
    />
  );
}
