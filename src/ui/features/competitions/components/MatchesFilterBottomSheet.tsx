import React, { useMemo, useState, useEffect } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

export type MatchesSortOption = 'date_asc' | 'date_desc' | 'round_asc' | 'round_desc';

export type MatchesFilterState = {
    sortBy: MatchesSortOption;
    teamId: number | null;
};

type TeamOption = {
    id: number;
    name: string;
};

type MatchesFilterBottomSheetProps = {
    visible: boolean;
    initialState: MatchesFilterState;
    teams: TeamOption[];
    onApply: (state: MatchesFilterState) => void;
    onClose: () => void;
};

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        overlay: {
            flex: 1,
            backgroundColor: colors.overlay,
            justifyContent: 'flex-end',
        },
        content: {
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.surfaceElevated,
            maxHeight: '80%',
            paddingBottom: 24,
            paddingTop: 16,
        },
        header: {
            paddingHorizontal: 20,
            paddingBottom: 16,
        },
        title: {
            color: colors.text,
            fontSize: 18,
            fontWeight: '700',
        },
        sectionTitle: {
            color: colors.text,
            fontSize: 14,
            fontWeight: '700',
            marginTop: 20,
            marginBottom: 8,
            paddingHorizontal: 20,
        },
        optionRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            paddingHorizontal: 20,
        },
        radioOuter: {
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: colors.textMuted,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
        },
        radioOuterSelected: {
            borderColor: colors.primary,
        },
        radioInner: {
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: colors.primary,
        },
        optionText: {
            color: colors.text,
            fontSize: 15,
        },
        footerRow: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            paddingHorizontal: 24,
            marginTop: 16,
        },
        doneText: {
            color: colors.primary,
            fontSize: 16,
            fontWeight: '600',
        },
    });
}

export function MatchesFilterBottomSheet({
    visible,
    initialState,
    teams,
    onApply,
    onClose,
}: MatchesFilterBottomSheetProps) {
    const { colors } = useAppTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [state, setState] = useState<MatchesFilterState>(initialState);

    // Reset internal state when opened if initial state changes externally
    useEffect(() => {
        if (visible) {
            setState(initialState);
        }
    }, [visible, initialState]);

    const handleApply = () => {
        onApply(state);
        onClose();
    };

    const RadioOption = ({
        label,
        selected,
        onPress,
    }: {
        label: string;
        selected: boolean;
        onPress: () => void;
    }) => (
        <Pressable style={styles.optionRow} onPress={onPress}>
            <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                {selected && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.optionText}>{label}</Text>
        </Pressable>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('competitionDetails.matches.filtersTitle')}</Text>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.sectionTitle}>{t('competitionDetails.matches.sortBy')}</Text>
                        <RadioOption
                            label={t('competitionDetails.matches.sortDateAsc')}
                            selected={state.sortBy === 'date_asc'}
                            onPress={() => setState({ ...state, sortBy: 'date_asc' })}
                        />
                        <RadioOption
                            label={t('competitionDetails.matches.sortDateDesc')}
                            selected={state.sortBy === 'date_desc'}
                            onPress={() => setState({ ...state, sortBy: 'date_desc' })}
                        />
                        <RadioOption
                            label={t('competitionDetails.matches.sortRoundAsc')}
                            selected={state.sortBy === 'round_asc'}
                            onPress={() => setState({ ...state, sortBy: 'round_asc' })}
                        />
                        <RadioOption
                            label={t('competitionDetails.matches.sortRoundDesc')}
                            selected={state.sortBy === 'round_desc'}
                            onPress={() => setState({ ...state, sortBy: 'round_desc' })}
                        />

                        <Text style={styles.sectionTitle}>{t('competitionDetails.matches.filterTeam')}</Text>
                        <RadioOption
                            label={t('competitionDetails.matches.allTeams')}
                            selected={state.teamId === null}
                            onPress={() => setState({ ...state, teamId: null })}
                        />
                        {teams.map(team => (
                            <RadioOption
                                key={team.id}
                                label={team.name}
                                selected={state.teamId === team.id}
                                onPress={() => setState({ ...state, teamId: team.id })}
                            />
                        ))}
                    </ScrollView>

                    <View style={styles.footerRow}>
                        <Pressable onPress={handleApply}>
                            <Text style={styles.doneText}>{t('common.done')}</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
