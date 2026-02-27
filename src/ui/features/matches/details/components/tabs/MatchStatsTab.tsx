import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import type { StatRow } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabTypes';

type MatchStatsTabProps = {
  styles: MatchDetailsTabStyles;
  statRows: StatRow[];
};

export function MatchStatsTab({ styles, statRows }: MatchStatsTabProps) {
  const { t } = useTranslation();
  const [statsPeriodFilter, setStatsPeriodFilter] = useState<'all' | 'first' | 'second'>('all');

  const visibleStats = useMemo(
    () =>
      statsPeriodFilter === 'all'
        ? statRows
        : statRows.filter(row => {
          const normalized = row.label.toLowerCase();
          if (statsPeriodFilter === 'first') {
            return !normalized.includes('2nd');
          }
          return !normalized.includes('1st');
        }),
    [statRows, statsPeriodFilter],
  );

  return (
    <View style={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.tabs.stats')}</Text>
        <View style={styles.chipRow}>
          {(['all', 'first', 'second'] as const).map(period => {
            const isActive = period === statsPeriodFilter;
            const label =
              period === 'all'
                ? t('matchDetails.stats.period.all')
                : period === 'first'
                  ? t('matchDetails.stats.period.firstHalf')
                  : t('matchDetails.stats.period.secondHalf');

            return (
              <Pressable
                key={period}
                style={[styles.chip, isActive ? styles.chipActive : null]}
                onPress={() => setStatsPeriodFilter(period)}
              >
                <Text style={[styles.chipText, isActive ? styles.chipTextActive : null]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {visibleStats.length === 0 ? (
          <Text style={styles.emptyText}>{t('matchDetails.values.unavailable')}</Text>
        ) : null}
        {visibleStats.map(row => (
          <View key={row.key} style={styles.statRow}>
            <View style={styles.statHeaderRow}>
              <Text style={styles.statValue}>{row.homeValue}</Text>
              <Text style={styles.statLabel}>{row.label}</Text>
              <Text style={styles.statValue}>{row.awayValue}</Text>
            </View>
            <View style={styles.statBarRail}>
              <View style={[styles.statBarHome, { width: `${row.homePercent}%` }]} />
              <View style={[styles.statBarAway, { width: `${row.awayPercent}%` }]} />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.stats.shotMapTitle')}</Text>
        <Text style={styles.newsText}>{t('matchDetails.stats.shotMapPlaceholder')}</Text>
      </View>
    </View>
  );
}
