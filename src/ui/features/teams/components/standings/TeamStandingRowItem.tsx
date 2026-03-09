import { memo } from 'react';
import { Image, Text, View } from 'react-native';

import { AppPressable } from '@ui/shared/components';
import { createTeamStandingsTabStyles } from '@ui/features/teams/components/TeamStandingsTab.styles';
import {
  FORM_COLORS,
  type DisplayMode,
  type SubFilter,
} from '@ui/features/teams/components/standings/teamStandingsFeed';
import type { TeamStandingRow, TeamStandingStats } from '@ui/features/teams/types/teams.types';
import { toDisplayNumber, toDisplayValue } from '@ui/features/teams/utils/teamDisplay';

type TeamStandingRowItemProps = {
  row: TeamStandingRow;
  mode: DisplayMode;
  subFilter: SubFilter;
  formLabels: Record<'W' | 'D' | 'L', string>;
  styles: ReturnType<typeof createTeamStandingsTabStyles>;
  onPressTeam?: (teamId: string) => void;
};

export const TeamStandingRowItem = memo(function TeamStandingRowItem({
  row,
  mode,
  subFilter,
  formLabels,
  styles,
  onPressTeam,
}: TeamStandingRowItemProps) {
  const stats: TeamStandingStats = row[subFilter] || row.all;
  const canPressTeam = Boolean(onPressTeam && row.teamId);
  const teamNode = (
    <>
      {row.teamLogo ? (
        <Image source={{ uri: row.teamLogo }} style={styles.standingTeamLogo} resizeMode="contain" />
      ) : null}
      <Text numberOfLines={1} style={styles.teamText}>
        {toDisplayValue(row.teamName)}
      </Text>
    </>
  );

  return (
    <View
      testID={row.teamId ? `team-standing-row-${row.teamId}` : undefined}
      style={[styles.row, row.isTargetTeam ? styles.rowTarget : null]}
    >
      <View style={styles.colRank}>
        <Text style={styles.cellText}>{toDisplayNumber(row.rank)}</Text>
      </View>
      {canPressTeam ? (
        <AppPressable
          style={[styles.colTeam, styles.teamInfoContainer]}
          onPress={() => onPressTeam?.(row.teamId!)}
          accessibilityRole="button"
          accessibilityLabel={toDisplayValue(row.teamName)}
        >
          {teamNode}
        </AppPressable>
      ) : (
        <View style={[styles.colTeam, styles.teamInfoContainer]}>
          {teamNode}
        </View>
      )}

      {mode === 'simple' && (
        <>
          <View style={styles.colStatMedium}><Text style={styles.cellText}>{toDisplayNumber(stats.played)}</Text></View>
          <View style={styles.colStatMedium}><Text style={styles.cellText}>{toDisplayNumber(row.goalDiff)}</Text></View>
          <View style={styles.colPoints}><Text style={styles.cellTextBold}>{toDisplayNumber(row.points)}</Text></View>
        </>
      )}

      {mode === 'detailed' && (
        <>
          <View style={styles.colStatSmall}><Text style={styles.cellText}>{toDisplayNumber(stats.played)}</Text></View>
          <View style={styles.colStatSmall}><Text style={styles.cellText}>{toDisplayNumber(stats.win)}</Text></View>
          <View style={styles.colStatSmall}><Text style={styles.cellText}>{toDisplayNumber(stats.draw)}</Text></View>
          <View style={styles.colStatSmall}><Text style={styles.cellText}>{toDisplayNumber(stats.lose)}</Text></View>
          <View style={styles.colStatLarge}>
            <Text style={styles.cellText}>{stats.goalsFor ?? 0}-{stats.goalsAgainst ?? 0}</Text>
          </View>
          <View style={styles.colStatMedium}><Text style={styles.cellText}>{toDisplayNumber(row.goalDiff)}</Text></View>
          <View style={styles.colPoints}><Text style={styles.cellTextBold}>{toDisplayNumber(row.points)}</Text></View>
        </>
      )}

      {mode === 'form' && (
        <View style={styles.colForm}>
          {row.form?.split('').map((char, formSlot) => (
            <View
              key={`${row.teamId ?? row.teamName ?? 'team'}-form-${char}-${formSlot}`}
              style={[styles.formBox, { backgroundColor: FORM_COLORS[char] || '#333' }]}
            >
              <Text style={styles.formBoxText}>{formLabels[char as 'W' | 'D' | 'L'] || char}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});
