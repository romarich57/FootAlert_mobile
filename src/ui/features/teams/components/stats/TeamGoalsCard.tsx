import { Text, View } from 'react-native';

import type { TeamStatsData } from '@ui/features/teams/types/teams.types';
import { toDisplayNumber } from '@ui/features/teams/utils/teamDisplay';

import { formatDecimal, hasValue } from './teamStatsSelectors';
import type { TeamStatsTabStyles } from './TeamStatsTab.styles';

type TeamGoalsCardProps = {
  data: TeamStatsData | undefined;
  styles: TeamStatsTabStyles;
  t: (key: string) => string;
};

function GoalsBreakdownBars({
  goalBreakdown,
  styles,
}: {
  goalBreakdown: TeamStatsData['goalBreakdown'];
  styles: TeamStatsTabStyles;
}) {
  if (goalBreakdown.length === 0) {
    return null;
  }

  const maxValue = Math.max(1, ...goalBreakdown.map(item => item.value ?? 0));

  return (
    <View style={styles.barsWrap}>
      {goalBreakdown.map(item => {
        const value = item.value ?? 0;
        const widthPercent = Math.max(0, Math.min(100, (value / maxValue) * 100));

        return (
          <View key={item.key} style={styles.barRow}>
            <Text style={styles.barLabel}>{item.label}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${widthPercent}%` }]} />
            </View>
            <Text style={styles.barValue}>{toDisplayNumber(item.value)}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function TeamGoalsCard({ data, styles, t }: TeamGoalsCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <Text style={styles.cardTitle}>{t('teamDetails.stats.goalsCard')}</Text>
        {hasValue(data?.goalsFor) || hasValue(data?.goalsAgainst) ? (
          <Text style={styles.goalsValue}>
            {toDisplayNumber(data?.goalsFor)}-{toDisplayNumber(data?.goalsAgainst)}
          </Text>
        ) : null}
      </View>

      {hasValue(data?.goalsForPerMatch) ? (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('teamDetails.stats.goalsScoredPerMatch')}</Text>
          <Text style={styles.rowValue}>{formatDecimal(data?.goalsForPerMatch, 1)}</Text>
        </View>
      ) : null}

      {hasValue(data?.goalsAgainstPerMatch) ? (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('teamDetails.stats.goalsConcededPerMatch')}</Text>
          <Text style={styles.rowValue}>{formatDecimal(data?.goalsAgainstPerMatch, 1)}</Text>
        </View>
      ) : null}

      {hasValue(data?.cleanSheets) ? (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('teamDetails.stats.cleanSheets')}</Text>
          <Text style={styles.rowValue}>{toDisplayNumber(data?.cleanSheets)}</Text>
        </View>
      ) : null}

      {hasValue(data?.failedToScore) ? (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('teamDetails.stats.failedToScore')}</Text>
          <Text style={styles.rowValue}>{toDisplayNumber(data?.failedToScore)}</Text>
        </View>
      ) : null}

      <GoalsBreakdownBars goalBreakdown={data?.goalBreakdown ?? []} styles={styles} />
    </View>
  );
}
