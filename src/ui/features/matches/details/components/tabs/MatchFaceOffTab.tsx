import { useMemo } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { AppPressable } from '@ui/shared/components';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import type { MatchDetailsDatasetErrorReason } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabTypes';
import { useMatchFaceOffModel } from '@ui/features/matches/details/components/tabs/hooks/useMatchFaceOffModel';
import {
  createMatchFaceOffDynamicStyles,
  matchFaceOffLocalStyles,
} from '@ui/features/matches/details/components/tabs/MatchFaceOffTab.styles';
import { MatchFaceOffSummaryColumn } from '@ui/features/matches/details/components/tabs/components/faceOff/MatchFaceOffSummaryColumn';
import { MatchFaceOffMatchRow } from '@ui/features/matches/details/components/tabs/components/faceOff/MatchFaceOffMatchRow';

// --- Types ---

type MatchFaceOffTabProps = {
  styles: MatchDetailsTabStyles;
  headToHead: unknown[];
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo: string;
  awayTeamLogo: string;
  hasDataError?: boolean;
  dataErrorReason?: MatchDetailsDatasetErrorReason;
  onPressMatch?: (matchId: string) => void;
  onPressTeam?: (teamId: string) => void;
  onPressCompetition?: (competitionId: string) => void;
};

export function MatchFaceOffTab({
  styles,
  headToHead,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  homeTeamLogo: _homeTeamLogo,
  awayTeamLogo: _awayTeamLogo,
  hasDataError = false,
  dataErrorReason = 'none',
  onPressMatch,
  onPressTeam,
  onPressCompetition,
}: MatchFaceOffTabProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const dynamicStyles = useMemo(() => createMatchFaceOffDynamicStyles(colors), [colors]);
  const {
    locale,
    activeLeague,
    setActiveLeague,
    summary,
    leagues,
    visibleFixtures,
    filteredFixtures,
    canLoadMore,
    loadMore,
    homeBarWidthStyle,
    drawBarWidthStyle,
    awayBarWidthStyle,
    emptyStateKey,
  } = useMatchFaceOffModel({
    headToHead,
    homeTeamId,
    awayTeamId,
    language: i18n.language,
    hasDataError,
    dataErrorReason,
  });

  return (
    <View style={styles.content}>
      {/* Section 1 : bandeau résumé victoires / nuls / victoires */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.faceOff.title')}</Text>

        <View style={matchFaceOffLocalStyles.summaryRow}>
          <MatchFaceOffSummaryColumn
            label={`${homeTeamName}\n${t('matchDetails.faceOff.homeWins')}`}
            count={summary.homeWins}
            badgeColor={colors.primary}
            badgeBg={`${colors.primary}26`}
            labelColor={colors.text}
          />
          <MatchFaceOffSummaryColumn
            label={t('matchDetails.faceOff.draws')}
            count={summary.draws}
            badgeColor={colors.text}
            badgeBg={colors.border}
            labelColor={colors.textMuted}
          />
          <MatchFaceOffSummaryColumn
            label={`${awayTeamName}\n${t('matchDetails.faceOff.awayWins')}`}
            count={summary.awayWins}
            badgeColor={colors.text}
            badgeBg={`${colors.text}1A`}
            labelColor={colors.text}
          />
        </View>

        {/* Barre comparative home vs away */}
        <View style={styles.statBarRail}>
          {summary.homeWins > 0 ? (
            <View style={[styles.statBarHome, matchFaceOffLocalStyles.barHomeFlat, homeBarWidthStyle]} />
          ) : null}
          {summary.draws > 0 ? (
            <View style={[dynamicStyles.drawBar, drawBarWidthStyle]} />
          ) : null}
          {summary.awayWins > 0 ? (
            <View style={[styles.statBarAway, dynamicStyles.awayBar, matchFaceOffLocalStyles.barAwayFlat, awayBarWidthStyle]} />
          ) : null}
        </View>
      </View>

      {/* Section 2 : filtre par compétition (visible seulement si plusieurs ligues) */}
      {leagues.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipRow, matchFaceOffLocalStyles.chipScroll]}
          accessibilityRole='tablist'
        >
          <AppPressable
            key='all'
            style={[styles.chip, activeLeague === 'all' ? styles.chipActive : null]}
            onPress={() => setActiveLeague('all')}
            accessibilityRole='tab'
            accessibilityLabel={t('matchDetails.faceOff.allCompetitions')}
            accessibilityState={{ selected: activeLeague === 'all' }}
          >
            <Text style={[styles.chipText, activeLeague === 'all' ? styles.chipTextActive : null]}>
              {t('matchDetails.faceOff.allCompetitions')}
            </Text>
          </AppPressable>
          {leagues.map(league => {
            const isActive = activeLeague === league.id;
            return (
              <AppPressable
                key={league.id}
                style={[styles.chip, isActive ? styles.chipActive : null]}
                onPress={() => setActiveLeague(league.id)}
                accessibilityRole='tab'
                accessibilityLabel={league.name}
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[styles.chipText, isActive ? styles.chipTextActive : null]}>
                  {league.name}
                </Text>
              </AppPressable>
            );
          })}
        </ScrollView>
      ) : null}

      {/* Section 3 : liste des matchs H2H */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.faceOff.matchesTitle')}</Text>
        {filteredFixtures.length === 0 ? (
          <Text style={styles.emptyText}>{t(emptyStateKey)}</Text>
        ) : (
          <>
            <FlatList
              data={visibleFixtures}
              keyExtractor={fixture => fixture.fixtureId}
              renderItem={({ item: fixture }) => (
                <MatchFaceOffMatchRow
                  fixture={fixture}
                  styles={styles}
                  dynamicStyles={dynamicStyles}
                  locale={locale}
                  onPressMatch={onPressMatch}
                  onPressTeam={onPressTeam}
                  onPressCompetition={onPressCompetition}
                />
              )}
              scrollEnabled={false}
              removeClippedSubviews
              initialNumToRender={visibleFixtures.length}
              maxToRenderPerBatch={visibleFixtures.length}
              windowSize={5}
            />
            {canLoadMore ? (
              <View style={matchFaceOffLocalStyles.loadMoreWrap}>
                <AppPressable
                  style={[styles.chip, matchFaceOffLocalStyles.loadMoreBtn]}
                  onPress={loadMore}
                  accessibilityRole='button'
                  accessibilityLabel={t('matchDetails.faceOff.loadMore')}
                >
                  <Text style={styles.chipText}>{t('matchDetails.faceOff.loadMore')}</Text>
                </AppPressable>
              </View>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}
