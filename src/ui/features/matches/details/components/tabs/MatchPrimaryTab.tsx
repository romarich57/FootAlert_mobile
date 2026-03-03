import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { AppPressable } from '@ui/shared/components';
import {
  MatchCompetitionMetaCard,
  MatchRecentResultsCard,
  MatchStandingsCard,
  MatchUpcomingMatchesCard,
  MatchVenueWeatherCard,
} from '@ui/features/matches/details/components/tabs/shared/matchContextCards';
import {
  CompactTimelineEventRow,
  getTimelineEventDisplayName,
} from '@ui/features/matches/details/components/tabs/shared/matchTimelineShared';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import type {
  EventRow,
  FinalScorerRow,
  MatchDetailsDatasetErrorReason,
  StatRow,
} from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabTypes';
import type {
  MatchLifecycleState,
  MatchPostMatchTabViewModel,
} from '@ui/features/matches/types/matches.types';
import { resolveAppLocaleTag } from '@ui/shared/i18n/locale';

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
  finalScorers: FinalScorerRow[];
  postMatchTab?: MatchPostMatchTabViewModel;
  matchScore: string;
  statsError?: boolean;
  statsErrorReason?: MatchDetailsDatasetErrorReason;
  eventsError?: boolean;
  eventsErrorReason?: MatchDetailsDatasetErrorReason;
  predictionsError?: boolean;
  predictionsErrorReason?: MatchDetailsDatasetErrorReason;
  onPressMatch?: (matchId: string) => void;
  onPressTeam?: (teamId: string) => void;
  onPressPlayer?: (playerId: string) => void;
  onPressCompetition?: (competitionId: string) => void;
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
  finalScorers,
  postMatchTab,
  matchScore,
  statsError = false,
  statsErrorReason = 'none',
  eventsError = false,
  eventsErrorReason = 'none',
  predictionsError = false,
  predictionsErrorReason = 'none',
  onPressMatch,
  onPressTeam,
  onPressPlayer,
  onPressCompetition,
}: MatchPrimaryTabProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const locale = resolveAppLocaleTag(i18n.language);

  const homePct = Number.parseFloat(winPercent.home.replace('%', '')) || 0;
  const drawPct = Number.parseFloat(winPercent.draw.replace('%', '')) || 0;
  const awayPct = Number.parseFloat(winPercent.away.replace('%', '')) || 0;
  const statsErrorKey =
    statsErrorReason === 'endpoint_not_available'
      ? 'matchDetails.states.datasetErrorsUnsupported.statistics'
      : 'matchDetails.states.datasetErrors.statistics';
  const eventsErrorKey =
    eventsErrorReason === 'endpoint_not_available'
      ? 'matchDetails.states.datasetErrorsUnsupported.events'
      : 'matchDetails.states.datasetErrors.events';
  const predictionsErrorKey =
    predictionsErrorReason === 'endpoint_not_available'
      ? 'matchDetails.states.datasetErrorsUnsupported.predictions'
      : 'matchDetails.states.datasetErrors.predictions';
  const homeScorers = finalScorers.filter(row => row.team === 'home');
  const awayScorers = finalScorers.filter(row => row.team === 'away');
  const keyMomentsRows = eventRows.slice(0, 6);
  const postMatchSections = (postMatchTab?.sectionsOrdered ?? []).filter(section => section.isAvailable);

  return (
    <View style={styles.content} testID="match-primary-tab">
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
            {predictionsError ? (
              <Text style={styles.newsText}>{t(predictionsErrorKey)}</Text>
            ) : null}
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
              <Text style={styles.emptyText}>
                {statsError ? t(statsErrorKey) : t('matchDetails.values.unavailable')}
              </Text>
            ) : null}
            {statRows.slice(0, 6).map(row => (
              <View key={row.key} style={styles.statRow}>
                <View style={styles.statHeaderRow}>
                  <Text style={styles.statValue}>{row.homeValue}</Text>
                  <Text style={styles.statLabel}>{t(row.labelKey)}</Text>
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
              <Text style={styles.emptyText}>
                {eventsError ? t(eventsErrorKey) : t('matchDetails.values.unavailable')}
              </Text>
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
          <View style={styles.card} testID="match-summary-final">
            <Text style={styles.cardTitle}>{t('matchDetails.primary.finalSummaryTitle')}</Text>
            <Text style={styles.metricValue}>
              {homeTeamName} {matchScore} {awayTeamName}
            </Text>
            {homeScorers.length > 0 || awayScorers.length > 0 ? (
              <View style={styles.postMatchScorersWrap} testID="match-summary-scorers">
                <View style={styles.postMatchScorerColumn}>
                  <Text style={styles.postMatchScorerHeader}>{homeTeamName}</Text>
                  {homeScorers.map(scorer => {
                    const detailLabel = getTimelineEventDisplayName(
                      scorer.eventType,
                      scorer.eventDetail,
                      t,
                    );
                    const assistLabel = scorer.assistName
                      ? t('matchDetails.postMatch.scorers.assistBy', { player: scorer.assistName })
                      : null;
                    const metaLabel = assistLabel ? `${detailLabel} · ${assistLabel}` : detailLabel;

                    return (
                      <View key={scorer.id} style={styles.postMatchScorerRow}>
                        <Text style={styles.postMatchScorerMinute}>{scorer.minute}</Text>
                        <View style={styles.postMatchScorerContent}>
                          {scorer.playerId && onPressPlayer ? (
                            <AppPressable
                              onPress={() => onPressPlayer(scorer.playerId ?? '')}
                              accessibilityRole='button'
                              accessibilityLabel={scorer.playerName}
                            >
                              <Text style={styles.postMatchScorerName} numberOfLines={1}>
                                {scorer.playerName}
                              </Text>
                            </AppPressable>
                          ) : (
                            <Text style={styles.postMatchScorerName} numberOfLines={1}>
                              {scorer.playerName}
                            </Text>
                          )}
                          <Text style={styles.postMatchScorerMeta} numberOfLines={1}>
                            {metaLabel}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.postMatchScorerColumn}>
                  <Text style={[styles.postMatchScorerHeader, styles.postMatchScorerHeaderRight]}>
                    {awayTeamName}
                  </Text>
                  {awayScorers.map(scorer => {
                    const detailLabel = getTimelineEventDisplayName(
                      scorer.eventType,
                      scorer.eventDetail,
                      t,
                    );
                    const assistLabel = scorer.assistName
                      ? t('matchDetails.postMatch.scorers.assistBy', { player: scorer.assistName })
                      : null;
                    const metaLabel = assistLabel ? `${detailLabel} · ${assistLabel}` : detailLabel;

                    return (
                      <View key={scorer.id} style={[styles.postMatchScorerRow, styles.postMatchScorerRowRight]}>
                        <View style={[styles.postMatchScorerContent, styles.postMatchScorerContentRight]}>
                          {scorer.playerId && onPressPlayer ? (
                            <AppPressable
                              onPress={() => onPressPlayer(scorer.playerId ?? '')}
                              accessibilityRole='button'
                              accessibilityLabel={scorer.playerName}
                            >
                              <Text style={styles.postMatchScorerName} numberOfLines={1}>
                                {scorer.playerName}
                              </Text>
                            </AppPressable>
                          ) : (
                            <Text style={styles.postMatchScorerName} numberOfLines={1}>
                              {scorer.playerName}
                            </Text>
                          )}
                          <Text style={[styles.postMatchScorerMeta, styles.postMatchScorerMetaRight]} numberOfLines={1}>
                            {metaLabel}
                          </Text>
                        </View>
                        <Text style={styles.postMatchScorerMinute}>{scorer.minute}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </View>

          {statRows.length > 0 || statsError ? (
            <View style={styles.card} testID="match-summary-stats">
              <Text style={styles.cardTitle}>{t('matchDetails.tabs.stats')}</Text>
              {statRows.length === 0 ? (
                <Text style={styles.emptyText}>
                  {statsError ? t(statsErrorKey) : t('matchDetails.values.unavailable')}
                </Text>
              ) : null}
              {statRows.slice(0, 8).map(row => (
                <View key={row.key} style={styles.statRow}>
                  <View style={styles.statHeaderRow}>
                    <Text style={styles.statValue}>{row.homeValue}</Text>
                    <Text style={styles.statLabel}>{t(row.labelKey)}</Text>
                    <Text style={styles.statValue}>{row.awayValue}</Text>
                  </View>
                  <View style={styles.statBarRail}>
                    <View style={[styles.statBarHome, { width: `${row.homePercent}%` }]} />
                    <View style={[styles.statBarAway, { width: `${row.awayPercent}%` }]} />
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {keyMomentsRows.length > 0 || eventsError ? (
            <View style={styles.card} testID="match-summary-key-moments">
              <Text style={styles.cardTitle}>{t('matchDetails.primary.keyMomentsTitle')}</Text>
              {keyMomentsRows.length === 0 ? (
                <Text style={styles.emptyText}>
                  {eventsError ? t(eventsErrorKey) : t('matchDetails.values.unavailable')}
                </Text>
              ) : null}
              {keyMomentsRows.map(event => (
                <CompactTimelineEventRow
                  key={`compact-${event.id}`}
                  styles={styles}
                  event={event}
                  t={t}
                  onPressPlayer={onPressPlayer}
                  onPressAssist={onPressPlayer}
                />
              ))}
            </View>
          ) : null}

          {postMatchSections.map(section => {
            if (!section.payload) {
              return null;
            }

            if (section.id === 'venueWeather') {
              return (
                <View key={section.id} testID="match-summary-section-venueWeather">
                  <MatchVenueWeatherCard
                    styles={styles}
                    colors={colors}
                    t={t}
                    locale={locale}
                    payload={section.payload}
                  />
                </View>
              );
            }

            if (section.id === 'competitionMeta') {
              return (
                <View key={section.id} testID="match-summary-section-competitionMeta">
                  <MatchCompetitionMetaCard
                    styles={styles}
                    colors={colors}
                    t={t}
                    payload={section.payload}
                    onPressCompetition={onPressCompetition}
                  />
                </View>
              );
            }

            if (section.id === 'standings') {
              return (
                <View key={section.id} testID="match-summary-section-standings">
                  <MatchStandingsCard
                    styles={styles}
                    t={t}
                    payload={section.payload}
                    onPressTeam={onPressTeam}
                  />
                </View>
              );
            }

            if (section.id === 'recentResults') {
              return (
                <View key={section.id} testID="match-summary-section-recentResults">
                  <MatchRecentResultsCard
                    styles={styles}
                    t={t}
                    payload={section.payload}
                    onPressMatch={onPressMatch}
                    onPressTeam={onPressTeam}
                  />
                </View>
              );
            }

            return (
              <View key={section.id} testID="match-summary-section-upcomingMatches">
                <MatchUpcomingMatchesCard
                  styles={styles}
                  t={t}
                  payload={section.payload}
                  onPressMatch={onPressMatch}
                  onPressTeam={onPressTeam}
                />
              </View>
            );
          })}
        </>
      ) : null}
    </View>
  );
}
