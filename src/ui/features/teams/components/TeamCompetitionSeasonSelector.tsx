import { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { TeamCompetitionOption } from '@ui/features/teams/types/teams.types';
import { toDisplaySeasonLabel, toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import type { ThemeColors } from '@ui/shared/theme/theme';

type TeamCompetitionSeasonSelectorProps = {
  competitions: TeamCompetitionOption[];
  selectedLeagueId: string | null;
  selectedSeason: number | null;
  onSelect: (leagueId: string, season: number) => void;
  modalTitle: string;
  doneLabel: string;
};

type SeasonGroupItem = {
  season: number;
  competitions: TeamCompetitionOption[];
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      backgroundColor: colors.background,
    },
    trigger: {
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    triggerLeft: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    leagueLogo: {
      width: 24,
      height: 24,
    },
    triggerTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    triggerLeagueName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    triggerSeason: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
      marginTop: 1,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.68)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '86%',
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: colors.border,
    },
    modalHeader: {
      paddingHorizontal: 20,
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    modalTitle: {
      flex: 1,
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    closeButton: {
      minHeight: 40,
      minWidth: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    seasonGroup: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
      gap: 8,
    },
    seasonHeading: {
      color: colors.text,
      fontSize: 36,
      lineHeight: 40,
      fontWeight: '900',
    },
    competitionRow: {
      minHeight: 52,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    competitionRowActive: {
      borderColor: colors.primary,
      backgroundColor: 'rgba(21,248,106,0.12)',
    },
    competitionLeft: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    competitionName: {
      flex: 1,
      color: colors.text,
      fontSize: 17,
      fontWeight: '700',
    },
    competitionNameActive: {
      color: colors.primary,
    },
    modalFooter: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 20,
      paddingVertical: 12,
      alignItems: 'flex-end',
    },
    doneLabel: {
      color: colors.primary,
      fontSize: 18,
      fontWeight: '800',
    },
  });
}

function compareCompetitions(first: TeamCompetitionOption, second: TeamCompetitionOption): number {
  const firstLeagueType = first.type?.toLowerCase() === 'league' ? 0 : 1;
  const secondLeagueType = second.type?.toLowerCase() === 'league' ? 0 : 1;

  if (firstLeagueType !== secondLeagueType) {
    return firstLeagueType - secondLeagueType;
  }

  return (first.leagueName ?? '').localeCompare(second.leagueName ?? '');
}

function buildSeasonGroups(competitions: TeamCompetitionOption[]): SeasonGroupItem[] {
  const seasons = Array.from(new Set(competitions.flatMap(competition => competition.seasons))).sort(
    (first, second) => second - first,
  );

  return seasons
    .map(season => ({
      season,
      competitions: competitions
        .filter(competition => competition.seasons.includes(season))
        .sort(compareCompetitions),
    }))
    .filter(group => group.competitions.length > 0);
}

export function TeamCompetitionSeasonSelector({
  competitions,
  selectedLeagueId,
  selectedSeason,
  onSelect,
  modalTitle,
  doneLabel,
}: TeamCompetitionSeasonSelectorProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isOpen, setIsOpen] = useState(false);

  const seasonGroups = useMemo(() => buildSeasonGroups(competitions), [competitions]);
  const selectedCompetition =
    competitions.find(item => item.leagueId === selectedLeagueId) ?? competitions[0] ?? null;
  const displaySeason =
    selectedSeason ?? selectedCompetition?.currentSeason ?? selectedCompetition?.seasons[0] ?? null;

  if (!selectedCompetition) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsOpen(true)}
        style={styles.trigger}
        testID="team-competition-season-trigger"
      >
        <View style={styles.triggerLeft}>
          {selectedCompetition.leagueLogo ? (
            <Image source={{ uri: selectedCompetition.leagueLogo }} style={styles.leagueLogo} resizeMode="contain" />
          ) : null}
          <View style={styles.triggerTextWrap}>
            <Text numberOfLines={1} style={styles.triggerLeagueName}>
              {toDisplayValue(selectedCompetition.leagueName)}
            </Text>
            <Text style={styles.triggerSeason}>{toDisplaySeasonLabel(displaySeason)}</Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={22} color={colors.textMuted} />
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={event => event.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <Pressable onPress={() => setIsOpen(false)} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {seasonGroups.map(group => (
                <View key={group.season} style={styles.seasonGroup}>
                  <Text style={styles.seasonHeading}>{toDisplaySeasonLabel(group.season)}</Text>

                  {group.competitions.map(competition => {
                    const isActive =
                      competition.leagueId === selectedLeagueId && group.season === selectedSeason;

                    return (
                      <Pressable
                        key={`${competition.leagueId}-${group.season}`}
                        onPress={() => {
                          onSelect(competition.leagueId, group.season);
                          setIsOpen(false);
                        }}
                        style={[styles.competitionRow, isActive ? styles.competitionRowActive : null]}
                        testID={`team-competition-season-option-${competition.leagueId}-${group.season}`}
                      >
                        <View style={styles.competitionLeft}>
                          {competition.leagueLogo ? (
                            <Image
                              source={{ uri: competition.leagueLogo }}
                              style={styles.leagueLogo}
                              resizeMode="contain"
                            />
                          ) : null}
                          <Text
                            numberOfLines={1}
                            style={[styles.competitionName, isActive ? styles.competitionNameActive : null]}
                          >
                            {toDisplayValue(competition.leagueName)}
                          </Text>
                        </View>

                        {isActive ? (
                          <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable onPress={() => setIsOpen(false)}>
                <Text style={styles.doneLabel}>{doneLabel}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
