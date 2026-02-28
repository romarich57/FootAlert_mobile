import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import type {
  MatchDetailsDatasetErrorReason,
  MatchStatsSectionKey,
  StatRowsByPeriod,
  StatsPeriodFilter,
} from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabTypes';

type MatchStatsTabProps = {
  styles: MatchDetailsTabStyles;
  statRowsByPeriod: StatRowsByPeriod;
  statsAvailablePeriods: StatsPeriodFilter[];
  hasDataError?: boolean;
  dataErrorReason?: MatchDetailsDatasetErrorReason;
};

const SECTION_ORDER: readonly MatchStatsSectionKey[] = [
  'shots',
  'possessionPasses',
  'discipline',
  'other',
  'advanced',
];

function getPeriodLabel(period: StatsPeriodFilter, t: (key: string) => string): string {
  if (period === 'first') {
    return t('matchDetails.stats.period.firstHalf');
  }
  if (period === 'second') {
    return t('matchDetails.stats.period.secondHalf');
  }
  return t('matchDetails.stats.period.all');
}

function getSectionLabel(section: MatchStatsSectionKey, t: (key: string) => string): string {
  switch (section) {
    case 'shots':
      return t('matchDetails.stats.sections.shots');
    case 'possessionPasses':
      return t('matchDetails.stats.sections.possessionPasses');
    case 'discipline':
      return t('matchDetails.stats.sections.discipline');
    case 'other':
      return t('matchDetails.stats.sections.other');
    case 'advanced':
      return t('matchDetails.stats.sections.advanced');
    default:
      return '';
  }
}

export function MatchStatsTab({
  styles,
  statRowsByPeriod,
  statsAvailablePeriods,
  hasDataError = false,
  dataErrorReason = 'none',
}: MatchStatsTabProps) {
  const { t } = useTranslation();
  const defaultPeriod: StatsPeriodFilter =
    statsAvailablePeriods.includes('all')
      ? 'all'
      : (statsAvailablePeriods[0] ?? 'all');
  const [statsPeriodFilter, setStatsPeriodFilter] = useState<StatsPeriodFilter>(defaultPeriod);

  useEffect(() => {
    if (statsAvailablePeriods.includes(statsPeriodFilter)) {
      return;
    }
    setStatsPeriodFilter(defaultPeriod);
  }, [defaultPeriod, statsAvailablePeriods, statsPeriodFilter]);

  const visibleStats = useMemo(
    () => statRowsByPeriod[statsPeriodFilter] ?? [],
    [statRowsByPeriod, statsPeriodFilter],
  );

  const groupedStats = useMemo(
    () =>
      SECTION_ORDER
        .map(section => ({
          section,
          rows: visibleStats.filter(row => row.section === section),
        }))
        .filter(group => group.rows.length > 0),
    [visibleStats],
  );
  const emptyStateKey =
    hasDataError && dataErrorReason === 'endpoint_not_available'
      ? 'matchDetails.states.datasetErrorsUnsupported.statistics'
      : hasDataError
        ? 'matchDetails.states.datasetErrors.statistics'
        : 'matchDetails.values.unavailable';

  return (
    <View style={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.tabs.stats')}</Text>
        <View style={styles.chipRow}>
          {statsAvailablePeriods.map(period => {
            const isActive = period === statsPeriodFilter;
            const label = getPeriodLabel(period, t);

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
          <Text style={styles.emptyText}>{t(emptyStateKey)}</Text>
        ) : null}

        {groupedStats.map(group => (
          <View key={group.section} style={styles.splitCol}>
            <Text style={styles.cardSubtitle}>{getSectionLabel(group.section, t)}</Text>
            {group.rows.map(row => (
              <View key={row.key} style={styles.statRow}>
                <View style={styles.statHeaderRow}>
                  <Text style={styles.statValue}>{row.homeValue}</Text>
                  <Text style={styles.statLabel}>{t(row.labelKey, { defaultValue: row.label })}</Text>
                  <Text style={styles.statValue}>{row.awayValue}</Text>
                </View>
                <View style={styles.statBarRail}>
                  <View style={[styles.statBarHome, { width: `${row.homePercent}%` }]} />
                  <View style={[styles.statBarAway, { width: `${row.awayPercent}%` }]} />
                </View>
              </View>
            ))}
          </View>
        ))}

      </View>
    </View>
  );
}
