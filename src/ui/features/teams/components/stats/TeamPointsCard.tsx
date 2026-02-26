import { Text, View } from 'react-native';

import type { TeamStatsData, TeamStatsRecord } from '@ui/features/teams/types/teams.types';
import { toDisplayNumber } from '@ui/features/teams/utils/teamDisplay';

import { hasValue, hasVenueStats } from './teamStatsSelectors';
import type { TeamStatsTabStyles } from './TeamStatsTab.styles';

type TeamPointsCardProps = {
  data: TeamStatsData | undefined;
  styles: TeamStatsTabStyles;
  t: (key: string) => string;
};

function VenueStatsRow({
  label,
  stats,
  styles,
}: {
  label: string;
  stats: TeamStatsRecord;
  styles: TeamStatsTabStyles;
}) {
  return (
    <View style={styles.tableHeader}>
      <Text style={styles.venueLabel}>{label}</Text>
      <Text style={styles.tableValue}>{toDisplayNumber(stats.played)}</Text>
      <Text style={styles.tableValue}>{toDisplayNumber(stats.wins)}</Text>
      <Text style={styles.tableValue}>{toDisplayNumber(stats.draws)}</Text>
      <Text style={styles.tableValue}>{toDisplayNumber(stats.losses)}</Text>
      <Text style={[styles.tableValue, styles.scoreColumn]}>
        {toDisplayNumber(stats.goalsFor)}-{toDisplayNumber(stats.goalsAgainst)}
      </Text>
      <Text style={[styles.tableValue, styles.diffColumn]}>{toDisplayNumber(stats.goalDiff)}</Text>
      <Text style={styles.tableValue}>{toDisplayNumber(stats.points)}</Text>
    </View>
  );
}

export function TeamPointsCard({ data, styles, t }: TeamPointsCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <Text style={styles.cardTitle}>{t('teamDetails.stats.pointsCard')}</Text>
        {hasValue(data?.points) ? <Text style={styles.pointsValue}>{toDisplayNumber(data?.points)}</Text> : null}
      </View>

      {hasValue(data?.rank) ? (
        <Text style={styles.mutedValue}>
          {t('teamDetails.labels.rank')} {toDisplayNumber(data?.rank)}
        </Text>
      ) : null}

      {hasVenueStats(data?.pointsByVenue?.home ?? null) || hasVenueStats(data?.pointsByVenue?.away ?? null) ? (
        <>
          <View style={styles.divider} />

          <View style={styles.tableHeader}>
            <Text style={styles.venueLabel}>{t('teamDetails.stats.venue')}</Text>
            <Text style={styles.tableHeadLabel}>{t('teamDetails.standings.headers.played')}</Text>
            <Text style={styles.tableHeadLabel}>{t('teamDetails.standings.headers.win')}</Text>
            <Text style={styles.tableHeadLabel}>{t('teamDetails.standings.headers.draw')}</Text>
            <Text style={styles.tableHeadLabel}>{t('teamDetails.standings.headers.loss')}</Text>
            <Text style={[styles.tableHeadLabel, styles.scoreColumn]}>
              {t('teamDetails.standings.headers.goalsForAgainst')}
            </Text>
            <Text style={[styles.tableHeadLabel, styles.diffColumn]}>
              {t('teamDetails.standings.headers.goalDiff')}
            </Text>
            <Text style={styles.tableHeadLabel}>{t('teamDetails.standings.headers.points')}</Text>
          </View>

          {data?.pointsByVenue?.home ? (
            <VenueStatsRow label={t('teamDetails.stats.home')} stats={data.pointsByVenue.home} styles={styles} />
          ) : null}
          {data?.pointsByVenue?.away ? (
            <VenueStatsRow label={t('teamDetails.stats.away')} stats={data.pointsByVenue.away} styles={styles} />
          ) : null}
        </>
      ) : null}
    </View>
  );
}
