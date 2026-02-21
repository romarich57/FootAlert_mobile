import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { TeamCompetitionOption } from '@ui/features/teams/types/teams.types';
import { toDisplaySeasonLabel, toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import type { ThemeColors } from '@ui/shared/theme/theme';

type TeamSeasonCompetitionPickerProps = {
  competitions: TeamCompetitionOption[];
  selectedLeagueId: string | null;
  selectedSeason: number | null;
  onSelectLeague: (leagueId: string) => void;
  onSelectSeason: (season: number) => void;
  competitionLabel: string;
  seasonLabel: string;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 8,
      backgroundColor: colors.background,
    },
    rowLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    chipsRow: {
      flexDirection: 'row',
      gap: 8,
      paddingBottom: 4,
    },
    chip: {
      minHeight: 40,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.chipBorder,
      backgroundColor: colors.chipBackground,
      justifyContent: 'center',
      paddingHorizontal: 14,
    },
    chipActive: {
      backgroundColor: 'rgba(21,248,106,0.18)',
      borderColor: colors.primary,
    },
    chipText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    chipTextActive: {
      color: colors.primary,
    },
  });
}

export function TeamSeasonCompetitionPicker({
  competitions,
  selectedLeagueId,
  selectedSeason,
  onSelectLeague,
  onSelectSeason,
  competitionLabel,
  seasonLabel,
}: TeamSeasonCompetitionPickerProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const selectedCompetition = competitions.find(item => item.leagueId === selectedLeagueId) ?? null;

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.rowLabel}>{competitionLabel}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {competitions.map(competition => {
            const isActive = competition.leagueId === selectedLeagueId;

            return (
              <Pressable
                key={competition.leagueId}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => onSelectLeague(competition.leagueId)}
                style={[styles.chip, isActive ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, isActive ? styles.chipTextActive : null]}>
                  {toDisplayValue(competition.leagueName)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View>
        <Text style={styles.rowLabel}>{seasonLabel}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {(selectedCompetition?.seasons ?? []).map(season => {
            const isActive = season === selectedSeason;

            return (
              <Pressable
                key={`${selectedCompetition?.leagueId ?? 'league'}-${season}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => onSelectSeason(season)}
                style={[styles.chip, isActive ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, isActive ? styles.chipTextActive : null]}>
                  {toDisplaySeasonLabel(season)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}
