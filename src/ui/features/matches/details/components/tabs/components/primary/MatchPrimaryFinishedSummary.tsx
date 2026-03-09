import { Text, View } from 'react-native';
import type { TFunction } from 'i18next';

import { AppPressable } from '@ui/shared/components';
import type { ThemeColors } from '@ui/shared/theme/theme';
import {
  CompactTimelineEventRow,
  getTimelineEventDisplayName,
} from '@ui/features/matches/details/components/tabs/shared/matchTimelineShared';
import type {
  EventRow,
  FinalScorerRow,
  StatRow,
} from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabTypes';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import type { MatchPrimaryPostMatchSection } from '@ui/features/matches/details/components/tabs/components/primary/MatchPrimaryTab.types';
import { MatchPrimaryPostMatchSections } from '@ui/features/matches/details/components/tabs/components/primary/MatchPrimaryPostMatchSections';

type MatchPrimaryFinishedSummaryProps = {
  styles: MatchDetailsTabStyles;
  colors: ThemeColors;
  t: TFunction;
  locale: string;
  homeTeamName: string;
  awayTeamName: string;
  matchScore: string;
  homeScorers: FinalScorerRow[];
  awayScorers: FinalScorerRow[];
  statRows: StatRow[];
  keyMomentsRows: EventRow[];
  postMatchSections: MatchPrimaryPostMatchSection[];
  statsError: boolean;
  statsErrorKey: string;
  eventsError: boolean;
  eventsErrorKey: string;
  onPressMatch?: (matchId: string) => void;
  onPressTeam?: (teamId: string) => void;
  onPressPlayer?: (playerId: string) => void;
  onPressCompetition?: (competitionId: string) => void;
};

function ScorerColumn({
  styles,
  t,
  teamName,
  scorers,
  alignRight = false,
  onPressPlayer,
}: {
  styles: MatchDetailsTabStyles;
  t: TFunction;
  teamName: string;
  scorers: FinalScorerRow[];
  alignRight?: boolean;
  onPressPlayer?: (playerId: string) => void;
}) {
  return (
    <View style={styles.postMatchScorerColumn}>
      <Text style={alignRight ? [styles.postMatchScorerHeader, styles.postMatchScorerHeaderRight] : styles.postMatchScorerHeader}>
        {teamName}
      </Text>
      {scorers.map(scorer => {
        const detailLabel = getTimelineEventDisplayName(scorer.eventType, scorer.eventDetail, t);
        const assistLabel = scorer.assistName
          ? t('matchDetails.postMatch.scorers.assistBy', { player: scorer.assistName })
          : null;
        const metaLabel = assistLabel ? `${detailLabel} · ${assistLabel}` : detailLabel;
        const content = (
          <>
            {!alignRight ? <Text style={styles.postMatchScorerMinute}>{scorer.minute}</Text> : null}
            <View style={alignRight ? [styles.postMatchScorerContent, styles.postMatchScorerContentRight] : styles.postMatchScorerContent}>
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
              <Text style={alignRight ? [styles.postMatchScorerMeta, styles.postMatchScorerMetaRight] : styles.postMatchScorerMeta} numberOfLines={1}>
                {metaLabel}
              </Text>
            </View>
            {alignRight ? <Text style={styles.postMatchScorerMinute}>{scorer.minute}</Text> : null}
          </>
        );

        return (
          <View
            key={scorer.id}
            style={alignRight ? [styles.postMatchScorerRow, styles.postMatchScorerRowRight] : styles.postMatchScorerRow}
          >
            {content}
          </View>
        );
      })}
    </View>
  );
}

export function MatchPrimaryFinishedSummary({
  styles,
  colors,
  t,
  locale,
  homeTeamName,
  awayTeamName,
  matchScore,
  homeScorers,
  awayScorers,
  statRows,
  keyMomentsRows,
  postMatchSections,
  statsError,
  statsErrorKey,
  eventsError,
  eventsErrorKey,
  onPressMatch,
  onPressTeam,
  onPressPlayer,
  onPressCompetition,
}: MatchPrimaryFinishedSummaryProps) {
  return (
    <>
      <View style={styles.card} testID="match-summary-final">
        <Text style={styles.cardTitle}>{t('matchDetails.primary.finalSummaryTitle')}</Text>
        <Text style={styles.metricValue}>
          {homeTeamName} {matchScore} {awayTeamName}
        </Text>
        {homeScorers.length > 0 || awayScorers.length > 0 ? (
          <View style={styles.postMatchScorersWrap} testID="match-summary-scorers">
            <ScorerColumn
              styles={styles}
              t={t}
              teamName={homeTeamName}
              scorers={homeScorers}
              onPressPlayer={onPressPlayer}
            />
            <ScorerColumn
              styles={styles}
              t={t}
              teamName={awayTeamName}
              scorers={awayScorers}
              alignRight
              onPressPlayer={onPressPlayer}
            />
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

      <MatchPrimaryPostMatchSections
        styles={styles}
        colors={colors}
        t={t}
        locale={locale}
        sections={postMatchSections}
        onPressMatch={onPressMatch}
        onPressTeam={onPressTeam}
        onPressCompetition={onPressCompetition}
      />
    </>
  );
}
