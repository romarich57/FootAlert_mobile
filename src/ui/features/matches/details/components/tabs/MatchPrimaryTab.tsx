import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { MatchLifecycleState } from '@ui/features/matches/types/matches.types';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import type { EventRow, StatRow } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabTypes';

type MatchPrimaryTabProps = {
  styles: MatchDetailsTabStyles;
  lifecycleState: MatchLifecycleState;
  homeTeamName: string;
  awayTeamName: string;
  winPercent: {
    home: string;
    draw: string;
    away: string;
  };
  venueName: string;
  venueCity: string;
  competitionName: string;
  insightText: string;
  isLiveRefreshing: boolean;
  statRows: StatRow[];
  eventRows: EventRow[];
  matchScore: string;
};

function ProbabilityCard({
  title,
  value,
  percent,
  styles,
}: {
  title: string;
  value: string;
  percent: number;
  styles: MatchDetailsTabStyles;
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

export function MatchPrimaryTab({
  styles,
  lifecycleState,
  homeTeamName,
  awayTeamName,
  winPercent,
  venueName,
  venueCity,
  competitionName,
  insightText,
  isLiveRefreshing,
  statRows,
  eventRows,
  matchScore,
}: MatchPrimaryTabProps) {
  const { t } = useTranslation();

  const homePct = Number.parseFloat(winPercent.home.replace('%', '')) || 0;
  const drawPct = Number.parseFloat(winPercent.draw.replace('%', '')) || 0;
  const awayPct = Number.parseFloat(winPercent.away.replace('%', '')) || 0;

  return (
    <View style={styles.content}>
      {lifecycleState === 'pre_match' ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('matchDetails.primary.probabilityTitle')}</Text>
            <ProbabilityCard title={homeTeamName} value={winPercent.home} percent={homePct} styles={styles} />
            <ProbabilityCard
              title={t('matchDetails.primary.draw')}
              value={winPercent.draw}
              percent={drawPct}
              styles={styles}
            />
            <ProbabilityCard title={awayTeamName} value={winPercent.away} percent={awayPct} styles={styles} />
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
          </View>

          <View style={styles.newsCard}>
            <Text style={styles.newsTitle}>{t('matchDetails.primary.newsTitle')}</Text>
            <Text style={styles.newsText}>{t('matchDetails.primary.newsFallback')}</Text>
          </View>
        </>
      ) : null}

      {lifecycleState === 'live' ? (
        <>
          <View style={styles.card}>
            <View style={styles.inlineRow}>
              <View style={styles.livePulse} />
              <Text style={styles.cardTitle}>{t('matchDetails.primary.liveSummaryTitle')}</Text>
            </View>
            <Text style={styles.cardSubtitle}>{t('matchDetails.primary.liveAutoUpdate')}</Text>
            {isLiveRefreshing ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{t('matchDetails.live.updating')}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('matchDetails.tabs.stats')}</Text>
            {statRows.length === 0 ? (
              <Text style={styles.emptyText}>{t('matchDetails.values.unavailable')}</Text>
            ) : null}
            {statRows.slice(0, 6).map(row => (
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
            <Text style={styles.cardTitle}>{t('matchDetails.primary.keyMomentsTitle')}</Text>
            {eventRows.length === 0 ? (
              <Text style={styles.emptyText}>{t('matchDetails.values.unavailable')}</Text>
            ) : null}
            {eventRows.slice(0, 6).map(event => (
              <View key={event.id} style={[styles.eventRow, event.isNew ? styles.eventRowNew : null]}>
                <Text style={styles.eventMinute}>{event.minute}</Text>
                <Text style={styles.eventLabel}>{event.label}</Text>
                {event.detail ? <Text style={styles.eventDetail}>{event.detail}</Text> : null}
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('matchDetails.primary.conditionsTitle')}</Text>
            <Text style={styles.newsText}>
              {venueName} · {venueCity}
            </Text>
            <Text style={styles.newsText}>{t('matchDetails.values.weatherPlaceholder')}</Text>
          </View>
        </>
      ) : null}

      {lifecycleState === 'finished' ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('matchDetails.primary.finalSummaryTitle')}</Text>
            <Text style={styles.metricValue}>
              {homeTeamName} {matchScore} {awayTeamName}
            </Text>
            <Text style={styles.newsText}>{t('matchDetails.primary.playerOfMatchFallback')}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('matchDetails.tabs.stats')}</Text>
            {statRows.slice(0, 8).map(row => (
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
            <Text style={styles.cardTitle}>{t('matchDetails.primary.keyMomentsTitle')}</Text>
            {eventRows.map(event => (
              <View key={event.id} style={styles.eventRow}>
                <Text style={styles.eventMinute}>{event.minute}</Text>
                <Text style={styles.eventLabel}>{event.label}</Text>
                {event.detail ? <Text style={styles.eventDetail}>{event.detail}</Text> : null}
              </View>
            ))}
          </View>

          <View style={styles.newsCard}>
            <Text style={styles.newsTitle}>{t('matchDetails.primary.newsTitle')}</Text>
            <Text style={styles.newsText}>{t('matchDetails.primary.postNewsFallback')}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}
