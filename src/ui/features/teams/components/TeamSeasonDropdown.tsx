import { memo, useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { toDisplaySeasonLabel } from '@ui/features/teams/utils/teamDisplay';
import type { ThemeColors } from '@ui/shared/theme/theme';

type TeamSeasonDropdownProps = {
    seasons: number[];
    selectedSeason: number | null;
    onSelectSeason: (season: number) => void;
    label?: string;
};

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 8,
            alignItems: 'flex-start',
            backgroundColor: colors.background,
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

export const TeamSeasonDropdown = memo(function TeamSeasonDropdown({
    seasons,
    selectedSeason,
    onSelectSeason,
    label,
}: TeamSeasonDropdownProps) {
    const { colors } = useAppTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [isOpen, setIsOpen] = useState(false);

    const handleOpen = useCallback(() => setIsOpen(true), []);
    const handleClose = useCallback(() => setIsOpen(false), []);

    const handleSelect = useCallback(
        (season: number) => {
            onSelectSeason(season);
            setIsOpen(false);
        },
        [onSelectSeason],
    );

    const displayLabel = selectedSeason
        ? toDisplaySeasonLabel(selectedSeason)
        : label ?? t('teamDetails.filters.season');

    if (seasons.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <Pressable onPress={handleOpen} style={styles.dropdownTrigger}>
                <Text style={styles.triggerText}>{displayLabel}</Text>
                <MaterialCommunityIcons name="chevron-down" size={22} color={colors.textMuted} />
            </Pressable>

            <Modal visible={isOpen} transparent animationType="fade" onRequestClose={handleClose}>
                <Pressable style={styles.modalOverlay} onPress={handleClose}>
                    <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{label ?? t('teamDetails.filters.season')}</Text>
                            <Pressable onPress={handleClose} style={styles.closeButton}>
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
                                        onPress={() => handleSelect(season)}
                                    >
                                        <Text style={[styles.seasonOptionText, isActive ? styles.seasonOptionTextActive : null]}>
                                            {toDisplaySeasonLabel(season)}
                                        </Text>
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
    );
});
