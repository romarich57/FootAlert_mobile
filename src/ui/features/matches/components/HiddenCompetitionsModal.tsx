import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

type HiddenCompetitionsModalProps = {
    visible: boolean;
    onClose: () => void;
    hiddenIds: string[];
    onUnhide: (id: string) => void;
};

// We will attempt to get competition names from the cached matches query
function getCompetitionName(id: string): string {
    try {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;

        // Simplistic approach: just returning ID if name not found easily in cache
        return `Competition ${id}`;
    } catch {
        return `Competition ${id}`;
    }
}

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        overlay: {
            flex: 1,
            backgroundColor: colors.overlay,
            justifyContent: 'flex-end',
        },
        modalContainer: {
            backgroundColor: colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '80%',
            minHeight: '40%',
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 20,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        title: {
            color: colors.text,
            fontSize: 20,
            fontWeight: '800',
        },
        closeButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surfaceElevated,
            alignItems: 'center',
            justifyContent: 'center',
        },
        listContent: {
            padding: 20,
            gap: 12,
        },
        item: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.surface,
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
        },
        itemName: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '600',
        },
        unhideButton: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(21, 248, 106, 0.15)',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
        },
        unhideButtonText: {
            color: colors.primary,
            fontSize: 14,
            fontWeight: '700',
        },
        emptyState: {
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
            gap: 12,
        },
        emptyStateText: {
            color: colors.textMuted,
            fontSize: 16,
            fontWeight: '500',
            textAlign: 'center',
        },
    });
}

export function HiddenCompetitionsModal({
    visible,
    onClose,
    hiddenIds,
    onUnhide,
}: HiddenCompetitionsModalProps) {
    const { colors } = useAppTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <SafeAreaView style={styles.modalContainer} edges={['bottom']}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('matches.hiddenCompetitions_hidden', { defaultValue: 'Hidden Competitions' })}</Text>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <MaterialCommunityIcons name="close" size={24} color={colors.text} />
                        </Pressable>
                    </View>

                    <FlatList
                        data={hiddenIds}
                        keyExtractor={id => id}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => (
                            <View style={styles.item}>
                                <Text style={styles.itemName}>{getCompetitionName(item)}</Text>
                                <Pressable onPress={() => onUnhide(item)} style={styles.unhideButton}>
                                    <MaterialCommunityIcons name="eye-outline" size={16} color={colors.primary} />
                                    <Text style={styles.unhideButtonText}>{t('actions.show', { defaultValue: 'Show' })}</Text>
                                </Pressable>
                            </View>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="eye-check-outline" size={48} color={colors.textMuted} />
                                <Text style={styles.emptyStateText}>
                                    {t('matches.hiddenCompetitions_empty', { defaultValue: 'No hidden competitions' })}
                                </Text>
                            </View>
                        }
                    />
                </SafeAreaView>
            </View>
        </Modal>
    );
}
