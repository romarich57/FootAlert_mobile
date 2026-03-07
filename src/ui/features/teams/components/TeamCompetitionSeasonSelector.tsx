import { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { TeamCompetitionOption } from '@ui/features/teams/types/teams.types';
import { toDisplaySeasonLabel, toDisplayValue } from '@ui/features/teams/utils/teamDisplay';
import {
  DEFAULT_HIT_SLOP,
  MIN_TOUCH_TARGET,
  type ThemeColors,
} from '@ui/shared/theme/theme';

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
      minHeight: MIN_TOUCH_TARGET,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    triggerLeft: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    leagueLogo: {
      width: 20,
      height: 20,
    },
    triggerTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    triggerLeagueName: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '500',
    },
    triggerSeason: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '400',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.56)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      maxHeight: '84%',
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: colors.border,
    },
    modalHeader: {
      paddingHorizontal: 18,
      paddingVertical: 12,
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
      fontSize: 15,
      fontWeight: '600',
    },
    closeButton: {
      minHeight: MIN_TOUCH_TARGET,
      minWidth: MIN_TOUCH_TARGET,
      alignItems: 'center',
      justifyContent: 'center',
    },
    seasonGroup: {
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 6,
      gap: 6,
    },
    seasonHeading: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    competitionRow: {
      minHeight: MIN_TOUCH_TARGET,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
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
      gap: 8,
    },
    competitionName: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      fontWeight: '500',
    },
    competitionNameActive: {
      color: colors.primary,
    },
    modalFooter: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 18,
      paddingVertical: 10,
      alignItems: 'flex-end',
    },
    doneLabel: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    doneButton: {
      minHeight: MIN_TOUCH_TARGET,
      justifyContent: 'center',
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

function scheduleAfterModalClose(task: () => void) {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    globalThis.requestAnimationFrame(() => {
      task();
    });
    return;
  }

  setTimeout(task, 0);
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
  const handleClose = () => {
    setIsOpen(false);
  };

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
        hitSlop={DEFAULT_HIT_SLOP}
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
        <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={handleClose}>
        <Pressable style={styles.modalOverlay} onPress={handleClose}>
          <Pressable style={styles.modalSheet} onPress={event => event.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <Pressable
                onPress={handleClose}
                style={styles.closeButton}
                hitSlop={DEFAULT_HIT_SLOP}
              >
                <MaterialCommunityIcons name="close" size={20} color={colors.text} />
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
                          handleClose();
                          scheduleAfterModalClose(() => {
                            onSelect(competition.leagueId, group.season);
                          });
                        }}
                        hitSlop={DEFAULT_HIT_SLOP}
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
                          <MaterialCommunityIcons name="check" size={16} color={colors.primary} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                onPress={handleClose}
                style={styles.doneButton}
                hitSlop={DEFAULT_HIT_SLOP}
              >
                <Text style={styles.doneLabel}>{doneLabel}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
