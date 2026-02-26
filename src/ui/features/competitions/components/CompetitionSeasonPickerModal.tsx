import { memo, useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

type CompetitionSeasonPickerModalProps = {
    isVisible: boolean;
    seasons: number[];
    selectedSeason: number;
    onClose: () => void;
    onSelectSeason: (season: number) => void;
};

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        overlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.58)',
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingVertical: 30,
        },
        panel: {
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
            maxHeight: '80%',
            overflow: 'hidden',
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        title: {
            color: colors.text,
            fontSize: 17,
            fontWeight: '800',
        },
        closeButton: {
            padding: 4,
        },
        option: {
            minHeight: 52,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        optionActive: {
            backgroundColor: 'rgba(21,248,106,0.10)',
        },
        optionText: {
            color: colors.text,
            fontSize: 15,
            fontWeight: '700',
        },
        optionTextActive: {
            color: colors.primary,
        },
        currentHint: {
            color: colors.textMuted,
            fontSize: 12,
            fontWeight: '600',
            marginLeft: 8,
        },
        optionLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            flexShrink: 1,
        },
    });
}

function toSeasonLabel(year: number): string {
    return `${year}/${year + 1}`;
}

export const CompetitionSeasonPickerModal = memo(function CompetitionSeasonPickerModal({
    isVisible,
    seasons,
    selectedSeason,
    onClose,
    onSelectSeason,
}: CompetitionSeasonPickerModalProps) {
    const { t } = useTranslation();
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const currentSeason = seasons[0] ?? selectedSeason;

    return (
        <Modal
            visible={isVisible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.panel} onPress={event => event.stopPropagation()}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('competitionDetails.seasons.history')}</Text>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <MaterialCommunityIcons name="close" size={22} color={colors.text} />
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {seasons.map(season => {
                            const isSelected = season === selectedSeason;
                            const isCurrent = season === currentSeason;

                            return (
                                <Pressable
                                    key={season}
                                    testID={`competition-season-option-${season}`}
                                    style={[styles.option, isSelected ? styles.optionActive : null]}
                                    onPress={() => onSelectSeason(season)}
                                >
                                    <View style={styles.optionLeft}>
                                        <Text style={[styles.optionText, isSelected ? styles.optionTextActive : null]}>
                                            {toSeasonLabel(season)}
                                        </Text>
                                        {isCurrent ? (
                                            <Text style={styles.currentHint}>{t('competitionDetails.seasons.current')}</Text>
                                        ) : null}
                                    </View>
                                    {isSelected ? (
                                        <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                                    ) : null}
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
});
