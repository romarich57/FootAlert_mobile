import { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { AppPressable } from '@ui/shared/components';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import {
  formatH2HDate,
  parseH2HFixtures,
} from '@ui/features/matches/details/components/tabs/shared/matchFaceOffHelpers';
import type { H2HFixture } from '@ui/features/matches/details/components/tabs/shared/matchFaceOffHelpers';
import type { MatchDetailsDatasetErrorReason } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabTypes';
import { resolveAppLocaleTag } from '@ui/shared/i18n/locale';

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

const INITIAL_VISIBLE_FIXTURES = 10;
const LOAD_MORE_STEP = 10;

const toPercentWidth = (value: number): { width: `${number}%` } => ({
  width: `${value}%` as `${number}%`,
});

function createFaceOffDynamicStyles(colors: ThemeColors) {
  return StyleSheet.create({
    h2hRow: {
      borderColor: colors.border,
      backgroundColor: 'transparent',
    },
    scoreBadge: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.border,
    },
    scoreText: {
      color: colors.text,
    },
    teamNameWin: {
      color: colors.primary,
      fontWeight: '800',
    },
    teamNameLoss: {
      color: colors.textMuted,
      fontWeight: '600',
    },
    teamNameDraw: {
      color: colors.text,
      fontWeight: '700',
    },
    drawBar: {
      height: '100%',
      backgroundColor: colors.border,
    },
    awayBar: {
      backgroundColor: `${colors.text}B3`,
    },
  });
}

// --- Sous-composants ---

/**
 * Colonne du bandeau de résumé (victoires home, nuls, ou victoires away).
 */
function SummaryColumn({
  label,
  count,
  badgeColor,
  badgeBg,
  labelColor,
}: {
  label: string;
  count: number;
  badgeColor: string;
  badgeBg: string;
  labelColor: string;
}) {
  return (
    <View style={localStyles.summaryCol}>
      <View style={[localStyles.summaryBadge, { backgroundColor: badgeBg }]}>
        <Text style={[localStyles.summaryBadgeText, { color: badgeColor }]}>{count}</Text>
      </View>
      <Text style={[localStyles.summaryLabel, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

/**
 * Ligne représentant un match H2H dans la liste.
 */
function H2HMatchRow({
  fixture,
  styles,
  dynamicStyles,
  locale,
  onPressMatch,
  onPressTeam,
  onPressCompetition,
}: {
  fixture: H2HFixture;
  styles: MatchDetailsTabStyles;
  dynamicStyles: ReturnType<typeof createFaceOffDynamicStyles>;
  locale: string;
  onPressMatch?: (matchId: string) => void;
  onPressTeam?: (teamId: string) => void;
  onPressCompetition?: (competitionId: string) => void;
}) {
  const isHomeWinner = fixture.homeGoals !== null && fixture.awayGoals !== null && fixture.homeGoals > fixture.awayGoals;
  const isAwayWinner = fixture.homeGoals !== null && fixture.awayGoals !== null && fixture.awayGoals > fixture.homeGoals;
  const homeTeamResultStyle = isHomeWinner
    ? dynamicStyles.teamNameWin
    : isAwayWinner
      ? dynamicStyles.teamNameLoss
      : dynamicStyles.teamNameDraw;
  const awayTeamResultStyle = isAwayWinner
    ? dynamicStyles.teamNameWin
    : isHomeWinner
      ? dynamicStyles.teamNameLoss
      : dynamicStyles.teamNameDraw;

  const scoreText =
    fixture.homeGoals !== null && fixture.awayGoals !== null
      ? `${fixture.homeGoals} - ${fixture.awayGoals}`
      : '- - -';

  return (
    <View style={[localStyles.h2hRow, dynamicStyles.h2hRow]}>
      <View style={styles.inlineRow}>
        <Text style={styles.newsText}>{formatH2HDate(fixture.date, locale)}</Text>
        {onPressCompetition ? (
          <AppPressable
            style={styles.badge}
            onPress={() => onPressCompetition(fixture.leagueId)}
            accessibilityRole='button'
            accessibilityLabel={fixture.leagueName}
          >
            <Text style={styles.badgeText} numberOfLines={1}>
              {fixture.leagueName}
            </Text>
          </AppPressable>
        ) : (
          <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {fixture.leagueName}
            </Text>
          </View>
        )}
      </View>
      <View style={localStyles.scoreRow}>
        {onPressTeam ? (
          <AppPressable
            onPress={() => onPressTeam(fixture.homeTeamId)}
            accessibilityRole='button'
            accessibilityLabel={fixture.homeTeamName}
          >
            <Text
              style={[localStyles.teamName, homeTeamResultStyle]}
              numberOfLines={1}
            >
              {fixture.homeTeamName}
            </Text>
          </AppPressable>
        ) : (
          <Text
            style={[localStyles.teamName, homeTeamResultStyle]}
            numberOfLines={1}
          >
            {fixture.homeTeamName}
          </Text>
        )}
        {fixture.homeTeamLogo ? (
          onPressTeam ? (
            <AppPressable
              onPress={() => onPressTeam(fixture.homeTeamId)}
              accessibilityRole='button'
              accessibilityLabel={fixture.homeTeamName}
            >
              <Image source={{ uri: fixture.homeTeamLogo }} style={localStyles.teamLogo} />
            </AppPressable>
          ) : (
            <Image source={{ uri: fixture.homeTeamLogo }} style={localStyles.teamLogo} />
          )
        ) : null}
        {onPressMatch ? (
          <AppPressable
            style={[localStyles.scoreBadge, dynamicStyles.scoreBadge]}
            onPress={() => onPressMatch(fixture.fixtureId)}
            accessibilityRole='button'
            accessibilityLabel={scoreText}
          >
            <Text style={[localStyles.scoreText, dynamicStyles.scoreText]}>{scoreText}</Text>
          </AppPressable>
        ) : (
          <View style={[localStyles.scoreBadge, dynamicStyles.scoreBadge]}>
            <Text style={[localStyles.scoreText, dynamicStyles.scoreText]}>{scoreText}</Text>
          </View>
        )}
        {fixture.awayTeamLogo ? (
          onPressTeam ? (
            <AppPressable
              onPress={() => onPressTeam(fixture.awayTeamId)}
              accessibilityRole='button'
              accessibilityLabel={fixture.awayTeamName}
            >
              <Image source={{ uri: fixture.awayTeamLogo }} style={localStyles.teamLogo} />
            </AppPressable>
          ) : (
            <Image source={{ uri: fixture.awayTeamLogo }} style={localStyles.teamLogo} />
          )
        ) : null}
        {onPressTeam ? (
          <AppPressable
            onPress={() => onPressTeam(fixture.awayTeamId)}
            accessibilityRole='button'
            accessibilityLabel={fixture.awayTeamName}
          >
            <Text
              style={[localStyles.teamName, awayTeamResultStyle]}
              numberOfLines={1}
            >
              {fixture.awayTeamName}
            </Text>
          </AppPressable>
        ) : (
          <Text
            style={[localStyles.teamName, awayTeamResultStyle]}
            numberOfLines={1}
          >
            {fixture.awayTeamName}
          </Text>
        )}
      </View>
    </View>
  );
}

// --- Composant principal ---

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
  const dynamicStyles = useMemo(() => createFaceOffDynamicStyles(colors), [colors]);
  const locale = useMemo(() => resolveAppLocaleTag(i18n.language), [i18n.language]);

  const [activeLeague, setActiveLeague] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_VISIBLE_FIXTURES);

  // Parsing et calcul du summary (memoïsé car potentiellement coûteux)
  const { fixtures, summary } = useMemo(
    () => parseH2HFixtures(headToHead, homeTeamId ?? '', awayTeamId ?? ''),
    [headToHead, homeTeamId, awayTeamId],
  );

  // Compétitions distinctes pour le filtre horizontal
  const leagues = useMemo<Array<{ id: string; name: string }>>(() => {
    const seen = new Map<string, string>();
    for (const f of fixtures) {
      if (!seen.has(f.leagueId)) seen.set(f.leagueId, f.leagueName);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [fixtures]);

  useEffect(() => {
    if (activeLeague === 'all') {
      return;
    }

    const hasActiveLeague = leagues.some(league => league.id === activeLeague);
    if (!hasActiveLeague) {
      setActiveLeague('all');
    }
  }, [activeLeague, leagues]);

  // Matchs filtrés par compétition sélectionnée
  const filteredFixtures = useMemo(
    () => (activeLeague === 'all' ? fixtures : fixtures.filter(f => f.leagueId === activeLeague)),
    [fixtures, activeLeague],
  );
  const visibleFixtures = useMemo(
    () => filteredFixtures.slice(0, visibleCount),
    [filteredFixtures, visibleCount],
  );
  const canLoadMore = filteredFixtures.length > visibleCount;

  useEffect(() => {
    setVisibleCount(currentCount =>
      currentCount === INITIAL_VISIBLE_FIXTURES ? currentCount : INITIAL_VISIBLE_FIXTURES,
    );
  }, [activeLeague, fixtures]);

  // Largeurs de la barre comparative (proportionnelles au total)
  const total = summary.total > 0 ? summary.total : 1;
  const homeBarPercent = Math.round((summary.homeWins / total) * 100);
  const drawBarPercent = Math.round((summary.draws / total) * 100);
  const awayBarPercent = summary.total > 0 ? 100 - homeBarPercent - drawBarPercent : 0;
  const homeBarWidthStyle = useMemo(() => toPercentWidth(homeBarPercent), [homeBarPercent]);
  const drawBarWidthStyle = useMemo(() => toPercentWidth(drawBarPercent), [drawBarPercent]);
  const awayBarWidthStyle = useMemo(() => toPercentWidth(awayBarPercent), [awayBarPercent]);
  const emptyStateKey =
    hasDataError && dataErrorReason === 'endpoint_not_available'
      ? 'matchDetails.states.datasetErrorsUnsupported.faceOff'
      : hasDataError
        ? 'matchDetails.states.datasetErrors.faceOff'
        : 'matchDetails.faceOff.noData';

  return (
    <View style={styles.content}>
      {/* Section 1 : bandeau résumé victoires / nuls / victoires */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.faceOff.title')}</Text>

        <View style={localStyles.summaryRow}>
          <SummaryColumn
            label={`${homeTeamName}\n${t('matchDetails.faceOff.homeWins')}`}
            count={summary.homeWins}
            badgeColor={colors.primary}
            badgeBg={`${colors.primary}26`}
            labelColor={colors.text}
          />
          <SummaryColumn
            label={t('matchDetails.faceOff.draws')}
            count={summary.draws}
            badgeColor={colors.text}
            badgeBg={colors.border}
            labelColor={colors.textMuted}
          />
          <SummaryColumn
            label={`${awayTeamName}\n${t('matchDetails.faceOff.awayWins')}`}
            count={summary.awayWins}
            badgeColor={colors.text}
            badgeBg={`${colors.text}1A`}
            labelColor={colors.text}
          />
        </View>

        {/* Barre comparative home vs away */}
        <View style={styles.statBarRail}>
          {homeBarPercent > 0 ? (
            <View style={[styles.statBarHome, localStyles.barHomeFlat, homeBarWidthStyle]} />
          ) : null}
          {drawBarPercent > 0 ? (
            <View style={[dynamicStyles.drawBar, drawBarWidthStyle]} />
          ) : null}
          {awayBarPercent > 0 ? (
            <View style={[styles.statBarAway, dynamicStyles.awayBar, localStyles.barAwayFlat, awayBarWidthStyle]} />
          ) : null}
        </View>
      </View>

      {/* Section 2 : filtre par compétition (visible seulement si plusieurs ligues) */}
      {leagues.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipRow, localStyles.chipScroll]}
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
                <H2HMatchRow
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
              initialNumToRender={visibleCount}
              maxToRenderPerBatch={visibleCount}
              windowSize={5}
            />
            {canLoadMore ? (
              <View style={localStyles.loadMoreWrap}>
                <AppPressable
                  style={[styles.chip, localStyles.loadMoreBtn]}
                  onPress={() => setVisibleCount(count => count + LOAD_MORE_STEP)}
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

// --- Styles locaux (en complément des styles partagés via MatchDetailsTabStyles) ---

const localStyles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  summaryBadge: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryBadgeText: {
    fontSize: 18,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.8,
  },
  chipScroll: {
    paddingHorizontal: 2,
    paddingBottom: 2,
  },
  h2hRow: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  teamName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  teamLogo: {
    width: 24,
    height: 24,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '900',
    minWidth: 40,
    textAlign: 'center',
  },
  barHomeFlat: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  barAwayFlat: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  loadMoreWrap: {
    paddingTop: 10,
    alignItems: 'center',
  },
  loadMoreBtn: {
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
