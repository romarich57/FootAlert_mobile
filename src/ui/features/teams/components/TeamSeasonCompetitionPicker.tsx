import { useState, useMemo } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

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
  hideCompetitions?: boolean;
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
    chipContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    chipLogo: {
      width: 16,
      height: 16,
    },
    dropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      gap: 12,
      alignSelf: 'flex-start',
    },
    triggerText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      padding: 24,
    },
    modalContent: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    closeButton: {
      padding: 4,
    },
    seasonOption: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    seasonOptionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    seasonOptionText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    seasonOptionActive: {
      backgroundColor: 'rgba(21,248,106,0.08)',
    },
    seasonOptionTextActive: {
      color: colors.primary,
      fontWeight: '800',
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
  hideCompetitions,
}: TeamSeasonCompetitionPickerProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);

  const selectedCompetition = competitions.find(item => item.leagueId === selectedLeagueId) ?? null;
  const seasons = selectedCompetition?.seasons ?? [];

  return (
    <View style={styles.container}>
      {!hideCompetitions ? (
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
      ) : null}

      <View>
        <Text style={styles.rowLabel}>{seasonLabel}</Text>
        <Pressable onPress={() => setIsSeasonModalOpen(true)} style={styles.dropdownTrigger}>
          <View style={styles.chipContent}>
            {selectedCompetition?.leagueLogo ? (
              <Image
                source={{ uri: selectedCompetition.leagueLogo }}
                style={styles.chipLogo}
                resizeMode="contain"
              />
            ) : null}
            <Text style={styles.triggerText}>
              {selectedSeason ? toDisplaySeasonLabel(selectedSeason) : ''}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={22} color={colors.textMuted} />
        </Pressable>

        <Modal visible={isSeasonModalOpen} transparent animationType="fade" onRequestClose={() => setIsSeasonModalOpen(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setIsSeasonModalOpen(false)}>
            <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{seasonLabel}</Text>
                <Pressable onPress={() => setIsSeasonModalOpen(false)} style={styles.closeButton}>
                  <MaterialCommunityIcons name="close" size={24} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {seasons.map(season => {
                  const isActive = season === selectedSeason;

                  return (
                    <Pressable
                      key={season}
                      style={[styles.seasonOption, isActive ? styles.seasonOptionActive : null]}
                      onPress={() => {
                        onSelectSeason(season);
                        setIsSeasonModalOpen(false);
                      }}
                    >
                      <View style={styles.seasonOptionLeft}>
                        {selectedCompetition?.leagueLogo ? (
                          <Image
                            source={{ uri: selectedCompetition.leagueLogo }}
                            style={styles.chipLogo}
                            resizeMode="contain"
                          />
                        ) : null}
                        <Text style={[styles.seasonOptionText, isActive ? styles.seasonOptionTextActive : null]}>
                          {toDisplaySeasonLabel(season)}
                        </Text>
                      </View>
                      {isActive ? (
                        <MaterialCommunityIcons name="check" size={22} color={colors.primary} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </View>
  );
}
