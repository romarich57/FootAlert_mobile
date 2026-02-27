import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { MatchDetailsTabStyles } from '@ui/features/matches/details/components/tabs/shared/matchDetailsTabStyles';
import {
  formatH2HDate,
  parseH2HFixtures,
} from '@ui/features/matches/details/components/tabs/shared/matchFaceOffHelpers';
import type { H2HFixture } from '@ui/features/matches/details/components/tabs/shared/matchFaceOffHelpers';

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
};

// --- Sous-composants ---

/**
 * Colonne du bandeau de résumé (victoires home, nuls, ou victoires away).
 */
function SummaryColumn({
  label,
  count,
  badgeColor,
  badgeBg,
}: {
  label: string;
  count: number;
  badgeColor: string;
  badgeBg: string;
}) {
  return (
    <View style={localStyles.summaryCol}>
      <View style={[localStyles.summaryBadge, { backgroundColor: badgeBg }]}>
        <Text style={[localStyles.summaryBadgeText, { color: badgeColor }]}>{count}</Text>
      </View>
      <Text style={[localStyles.summaryLabel]}>{label}</Text>
    </View>
  );
}

/**
 * Ligne représentant un match H2H dans la liste.
 */
function H2HMatchRow({
  fixture,
  styles,
  borderColor,
  textColor,
}: {
  fixture: H2HFixture;
  styles: MatchDetailsTabStyles;
  borderColor: string;
  textColor: string;
}) {
  const scoreText =
    fixture.homeGoals !== null && fixture.awayGoals !== null
      ? `${fixture.homeGoals} - ${fixture.awayGoals}`
      : '- - -';

  return (
    <View style={[localStyles.h2hRow, { borderBottomColor: borderColor }]}>
      <View style={styles.inlineRow}>
        <Text style={styles.newsText}>{formatH2HDate(fixture.date)}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {fixture.leagueName}
          </Text>
        </View>
      </View>
      <View style={localStyles.scoreRow}>
        <Text style={[localStyles.teamName, { color: textColor }]} numberOfLines={1}>
          {fixture.homeTeamName}
        </Text>
        {fixture.homeTeamLogo ? (
          <Image source={{ uri: fixture.homeTeamLogo }} style={styles.teamLogo} />
        ) : null}
        <Text style={localStyles.scoreText}>{scoreText}</Text>
        {fixture.awayTeamLogo ? (
          <Image source={{ uri: fixture.awayTeamLogo }} style={styles.teamLogo} />
        ) : null}
        <Text style={[localStyles.teamName, { color: textColor }]} numberOfLines={1}>
          {fixture.awayTeamName}
        </Text>
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
  hasDataError = false,
}: MatchFaceOffTabProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const [activeLeague, setActiveLeague] = useState<string>('all');

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

  // Largeurs de la barre comparative (proportionnelles au total)
  const homeBarPercent = summary.total > 0 ? Math.round((summary.homeWins / summary.total) * 100) : 33;
  const awayBarPercent = summary.total > 0 ? Math.round((summary.awayWins / summary.total) * 100) : 33;

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
            badgeBg={`${colors.primary}1F`}
          />
          <SummaryColumn
            label={t('matchDetails.faceOff.draws')}
            count={summary.draws}
            badgeColor={colors.textMuted}
            badgeBg={colors.surfaceElevated}
          />
          <SummaryColumn
            label={`${awayTeamName}\n${t('matchDetails.faceOff.awayWins')}`}
            count={summary.awayWins}
            badgeColor={colors.text}
            badgeBg={colors.background}
          />
        </View>

        {/* Barre comparative home vs away */}
        <View style={styles.statBarRail}>
          <View style={[styles.statBarHome, { width: `${homeBarPercent}%` }]} />
          <View style={[styles.statBarAway, { width: `${awayBarPercent}%` }]} />
        </View>
      </View>

      {/* Section 2 : filtre par compétition (visible seulement si plusieurs ligues) */}
      {leagues.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipRow, localStyles.chipScroll]}
        >
          <Pressable
            key='all'
            style={[styles.chip, activeLeague === 'all' ? styles.chipActive : null]}
            onPress={() => setActiveLeague('all')}
            accessibilityRole='button'
            accessibilityState={{ selected: activeLeague === 'all' }}
          >
            <Text style={[styles.chipText, activeLeague === 'all' ? styles.chipTextActive : null]}>
              {t('matchDetails.faceOff.allCompetitions')}
            </Text>
          </Pressable>
          {leagues.map(league => {
            const isActive = activeLeague === league.id;
            return (
              <Pressable
                key={league.id}
                style={[styles.chip, isActive ? styles.chipActive : null]}
                onPress={() => setActiveLeague(league.id)}
                accessibilityRole='button'
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[styles.chipText, isActive ? styles.chipTextActive : null]}>
                  {league.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {/* Section 3 : liste des matchs H2H */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('matchDetails.faceOff.matchesTitle')}</Text>
        {filteredFixtures.length === 0 ? (
          <Text style={styles.emptyText}>
            {hasDataError ? t('matchDetails.states.datasetErrors.faceOff') : t('matchDetails.faceOff.noData')}
          </Text>
        ) : (
          filteredFixtures.map(fixture => (
            <H2HMatchRow
              key={fixture.fixtureId}
              fixture={fixture}
              styles={styles}
              borderColor={colors.border}
              textColor={colors.text}
            />
          ))
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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBadgeText: {
    fontSize: 20,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.7,
  },
  chipScroll: {
    paddingHorizontal: 2,
    paddingBottom: 2,
  },
  h2hRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  teamName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '800',
    minWidth: 48,
    textAlign: 'center',
  },
});
