import { Text, View } from 'react-native';
import type { TFunction } from 'i18next';

import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';

type MatchPrimaryPreMatchSectionProps = {
  styles: MatchDetailsTabStyles;
  t: TFunction;
  homeTeamName: string;
  awayTeamName: string;
  homePct: number;
  drawPct: number;
  awayPct: number;
  homeValue: string;
  drawValue: string;
  awayValue: string;
  venueName: string;
  venueCity: string;
  competitionName: string;
  insightText: string;
  predictionsError: boolean;
  predictionsErrorKey: string;
};

function ProbabilityCard({
  styles,
  title,
  value,
  percent,
}: {
  styles: MatchDetailsTabStyles;
  title: string;
  value: string;
  percent: number;
}) {
  return (
    <View style={styles.probBarWrap}>
      <View style={styles.row}>
        <Text style={styles.metricLabel}>{title}</Text>
        <Text style={styles.metricValue}>{value}</Text>
      </View>
      <View style={styles.probBarRail}>
        <View style={[styles.probBarFill, { width: `${Math.max(0, Math.min(100, percent))}%` }]} />
      </View>
    </View>
  );
}

export function MatchPrimaryPreMatchSection({
  styles,
  t,
  homeTeamName,
  awayTeamName,
  homePct,
  drawPct,
  awayPct,
  homeValue,
  drawValue,
  awayValue,
  venueName,
  venueCity,
  competitionName,
  insightText,
  predictionsError,
  predictionsErrorKey,
}: MatchPrimaryPreMatchSectionProps) {
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.primary.probabilityTitle')}</Text>
        <ProbabilityCard styles={styles} title={homeTeamName} value={homeValue} percent={homePct} />
        <ProbabilityCard styles={styles} title={t('matchDetails.primary.draw')} value={drawValue} percent={drawPct} />
        <ProbabilityCard styles={styles} title={awayTeamName} value={awayValue} percent={awayPct} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.primary.conditionsTitle')}</Text>
        <View style={styles.row}>
          <View style={styles.splitCol}>
            <Text style={styles.metricLabel}>{t('matchDetails.labels.venue')}</Text>
            <Text style={styles.metricValue}>{venueName}</Text>
          </View>
          <View style={styles.splitCol}>
            <Text style={styles.metricLabel}>{t('matchDetails.labels.city')}</Text>
            <Text style={styles.metricValue}>{venueCity}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.splitCol}>
            <Text style={styles.metricLabel}>{t('matchDetails.labels.capacity')}</Text>
            <Text style={styles.metricValue}>{t('matchDetails.values.unavailable')}</Text>
          </View>
          <View style={styles.splitCol}>
            <Text style={styles.metricLabel}>{t('matchDetails.labels.surface')}</Text>
            <Text style={styles.metricValue}>{t('matchDetails.values.unavailable')}</Text>
          </View>
        </View>
        <View style={styles.newsCard}>
          <Text style={styles.newsTitle}>{t('matchDetails.labels.weather')}</Text>
          <Text style={styles.newsText}>{t('matchDetails.values.weatherPlaceholder')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.primary.competitionStatsTitle')}</Text>
        <Text style={styles.cardSubtitle}>{competitionName}</Text>
        <View style={styles.row}>
          <View style={styles.splitCol}>
            <Text style={styles.metricLabel}>{homeTeamName}</Text>
            <Text style={styles.metricValue}>{t('matchDetails.values.rankUnknown')}</Text>
          </View>
          <View style={styles.splitCol}>
            <Text style={styles.metricLabel}>{awayTeamName}</Text>
            <Text style={styles.metricValue}>{t('matchDetails.values.rankUnknown')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.primary.insightTitle')}</Text>
        <Text style={styles.newsText}>{insightText}</Text>
        {predictionsError ? <Text style={styles.newsText}>{t(predictionsErrorKey)}</Text> : null}
      </View>

      <View style={styles.newsCard}>
        <Text style={styles.newsTitle}>{t('matchDetails.primary.newsTitle')}</Text>
        <Text style={styles.newsText}>{t('matchDetails.primary.newsFallback')}</Text>
      </View>
    </>
  );
}
