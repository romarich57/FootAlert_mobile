import { useMemo } from 'react';
import { View, Text, ScrollView, Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { KnockoutRound, BracketMatch, BracketTeam } from '@domain/contracts/competitions.types';

// --- Types ---

type KnockoutBracketViewProps = {
  rounds: KnockoutRound[];
  sectionTitle?: string;
};

type TeamRowProps = {
  team: BracketTeam;
  score: number | null;
  penalty: number | null;
  isWinner: boolean;
  tbd: string;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
};

// --- Helpers ---

/**
 * Transforme le nom d'un round en clé i18n normalisée.
 * Exemple : "Semi-Finals" → "semi_final"
 */
function getRoundI18nKey(roundName: string): string {
  const lower = roundName.toLowerCase().trim();
  if (lower.includes('final') && !lower.includes('semi') && !lower.includes('quarter')) {
    return 'final';
  }
  if (lower.includes('semi')) return 'semi_final';
  if (lower.includes('quarter')) return 'quarter_final';
  if (lower.includes('16') || lower.includes('last 16')) return 'round_of_16';
  if (lower.includes('32')) return 'round_of_32';
  return 'other';
}

function formatScore(score: number | null): string {
  return score !== null ? String(score) : '-';
}

// --- Sous-composant ligne équipe ---

function TeamRow({ team, score, penalty, isWinner, tbd, styles, colors }: TeamRowProps) {
  const nameStyle = isWinner
    ? [styles.teamName, { color: colors.primary, fontWeight: '700' as const }]
    : styles.teamName;

  const displayName = team.name || tbd;

  return (
    <View
      style={styles.teamRow}
      accessibilityLabel={`${displayName} ${score !== null ? score : ''}`}
    >
      {team.logo ? (
        <Image
          source={{ uri: team.logo }}
          style={styles.teamLogo}
          resizeMode="contain"
          accessibilityLabel={displayName}
        />
      ) : (
        <View style={styles.teamLogoPlaceholder} />
      )}
      <Text style={nameStyle} numberOfLines={1}>
        {displayName}
      </Text>
      <View style={styles.scoreContainer}>
        <Text style={isWinner ? [styles.scoreText, { color: colors.primary }] : styles.scoreText}>
          {formatScore(score)}
        </Text>
        {penalty !== null && (
          <Text style={styles.penaltyText}>{`(${penalty})`}</Text>
        )}
      </View>
    </View>
  );
}

// --- Sous-composant carte match ---

function BracketMatchCard({
  match,
  tbd,
  styles,
  colors,
}: {
  match: BracketMatch;
  tbd: string;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  const homeIsWinner = match.winnerId !== null && match.winnerId === match.homeTeam.id;
  const awayIsWinner = match.winnerId !== null && match.winnerId === match.awayTeam.id;

  return (
    <View
      style={styles.matchCard}
      accessibilityRole="none"
    >
      <TeamRow
        team={match.homeTeam}
        score={match.homeScore}
        penalty={match.penaltyHome}
        isWinner={homeIsWinner}
        tbd={tbd}
        styles={styles}
        colors={colors}
      />
      <View style={styles.matchDivider} />
      <TeamRow
        team={match.awayTeam}
        score={match.awayScore}
        penalty={match.penaltyAway}
        isWinner={awayIsWinner}
        tbd={tbd}
        styles={styles}
        colors={colors}
      />
    </View>
  );
}

// --- Composant principal ---

export function KnockoutBracketView({ rounds, sectionTitle }: KnockoutBracketViewProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const styles = useMemo(() => createStyles(colors), [colors]);
  const tbd = t('competitionDetails.bracket.tbd');
  const sortedRounds = useMemo(() => [...rounds].sort((a, b) => a.order - b.order), [rounds]);

  return (
    <View>
      {sectionTitle != null && (
        <Text style={styles.sectionTitle}>{sectionTitle}</Text>
      )}
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      accessibilityLabel={t('competitionDetails.bracket.title')}
    >
      {sortedRounds.map((round, roundIndex) => {
        const i18nKey = getRoundI18nKey(round.name);
        const roundTitle = t(`competitionDetails.bracket.rounds.${i18nKey}`, {
          defaultValue: round.name,
        });

        return (
          <View
            key={`round-${round.order}-${round.name}`}
            style={styles.roundColumn}
          >
            {/* En-tête du round */}
            <View style={styles.roundHeader}>
              <Text style={styles.roundHeaderText} numberOfLines={1}>
                {roundTitle}
              </Text>
            </View>

            {/* Cartes de matchs */}
            <View style={styles.matchesContainer}>
              {round.matches.map(match => (
                <BracketMatchCard
                  key={`match-${match.matchId}`}
                  match={match}
                  tbd={tbd}
                  styles={styles}
                  colors={colors}
                />
              ))}
            </View>

            {/* Connecteur vertical entre rounds (sauf dernier) */}
            {roundIndex < sortedRounds.length - 1 && (
              <View style={styles.roundConnector} />
            )}
          </View>
        );
      })}
    </ScrollView>
    </View>
  );
}

// --- Styles ---

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    sectionTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      textTransform: 'uppercase',
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginTop: 16,
      backgroundColor: colors.surfaceElevated,
    },
    scrollContent: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    roundColumn: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    roundHeader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 8,
      height: 28,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surfaceElevated,
      borderRadius: 6,
      paddingHorizontal: 6,
    },
    roundHeaderText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    matchesContainer: {
      marginTop: 36,
      gap: 8,
      width: 148,
    },
    matchCard: {
      width: 140,
      height: 72,
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.surfaceElevated,
      overflow: 'hidden',
    },
    teamRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      gap: 6,
    },
    teamLogo: {
      width: 20,
      height: 20,
      flexShrink: 0,
    },
    teamLogoPlaceholder: {
      width: 20,
      height: 20,
      flexShrink: 0,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 10,
    },
    teamName: {
      flex: 1,
      color: colors.text,
      fontSize: 12,
      fontWeight: '500',
    },
    scoreContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      minWidth: 20,
      justifyContent: 'flex-end',
    },
    scoreText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'right',
    },
    penaltyText: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '500',
    },
    matchDivider: {
      height: 1,
      backgroundColor: colors.surfaceElevated,
      marginHorizontal: 8,
    },
    roundConnector: {
      width: 8,
      alignSelf: 'stretch',
      marginTop: 36,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: colors.surfaceElevated,
      borderBottomColor: colors.surfaceElevated,
    },
  });
}
