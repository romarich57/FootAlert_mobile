import { ActivityIndicator, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import type { TeamComparisonMetric } from '@ui/features/teams/types/teams.types';
import { toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import { AppImage } from '@ui/shared/media/AppImage';
import type { ThemeColors } from '@ui/shared/theme/theme';

import { formatDecimal, formatComparisonValue, teamComparisonLabel } from './teamStatsSelectors';
import type { TeamStatsTabStyles } from './TeamStatsTab.styles';

type TeamComparisonMetricsSectionProps = {
  metrics: TeamComparisonMetric[];
  styles: TeamStatsTabStyles;
  colors: ThemeColors;
  t: (key: string, options?: Record<string, unknown>) => string;
  isLoading?: boolean;
};

export function TeamComparisonMetricsSection({
  metrics,
  styles,
  colors,
  t,
  isLoading = false,
}: TeamComparisonMetricsSectionProps) {
  return (
    <>
      <Text style={styles.sectionTitle}>{t('teamDetails.stats.comparisons.title')}</Text>
      {metrics.length > 0 ? (
        metrics.map(metric => (
          <View key={metric.key} style={styles.comparisonCard}>
            <View style={styles.comparisonTopRow}>
              <Text style={styles.comparisonTitle}>{teamComparisonLabel(t, metric.key)}</Text>
              <Text style={styles.comparisonValue}>{formatComparisonValue(metric)}</Text>
            </View>

            <Text style={styles.comparisonRank}>
              {t('teamDetails.stats.comparisons.rank', {
                rank: metric.rank,
                total: metric.totalTeams,
              })}
            </Text>

            {metric.leaders.map((leader, index) => (
              <View
                key={`${metric.key}-${leader.teamId ?? leader.teamName ?? 'unknown'}`}
                style={styles.leaderRow}
              >
                <View style={styles.leaderLeft}>
                  <Text style={styles.leaderRank}>{index + 1}</Text>

                  <View style={styles.leaderLogoContainer}>
                    {leader.teamLogo ? (
                      <AppImage source={{ uri: leader.teamLogo }} style={styles.leaderLogo} resizeMode="contain" />
                    ) : (
                      <MaterialCommunityIcons name="shield-outline" size={11} color={colors.textMuted} />
                    )}
                  </View>

                  <Text style={styles.leaderName} numberOfLines={1}>
                    {toDisplayValue(leader.teamName)}
                  </Text>
                </View>

                <Text style={styles.leaderValue}>
                  {metric.key === 'possession'
                    ? `${formatDecimal(leader.value, 1)}%`
                    : formatDecimal(leader.value, 1)}
                </Text>
              </View>
            ))}
          </View>
        ))
      ) : isLoading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator size="small" color={colors.primary} style={styles.loadingIndicator} />
        </View>
      ) : null}
    </>
  );
}
