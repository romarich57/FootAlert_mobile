import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { CompetitionTotwData, CompetitionTotwRole } from '../types/competitions.types';
import { PitchFormation } from './PitchFormation';

type CompetitionTotwViewData = CompetitionTotwData & {
    state?: 'complete' | 'partial' | 'unavailable';
    placeholderSlots?: Array<{
        role: CompetitionTotwRole;
        gridX: number;
        gridY: number;
        label: string;
    }>;
};

type CompetitionTotwTabProps = {
    totw: CompetitionTotwData;
    onPressPlayer?: (playerId: string) => void;
};

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        scrollContent: {
            paddingHorizontal: 14,
            paddingTop: 14,
            paddingBottom: 36,
        },
        card: {
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            padding: 14,
            gap: 12,
        },
        headerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
        },
        title: {
            color: colors.text,
            fontSize: 24,
            fontWeight: '900',
            letterSpacing: -0.4,
            flexShrink: 1,
        },
        badgesRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
        },
        badge: {
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
            paddingHorizontal: 10,
            paddingVertical: 5,
        },
        badgePrimary: {
            borderColor: 'rgba(21,248,106,0.40)',
            backgroundColor: 'rgba(21,248,106,0.16)',
        },
        badgeText: {
            color: colors.text,
            fontSize: 12,
            fontWeight: '800',
        },
        unavailableWrap: {
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
            padding: 18,
        },
        unavailableText: {
            color: colors.textMuted,
            fontSize: 15,
            fontWeight: '600',
            lineHeight: 21,
        },
    });
}

function toOneDecimal(value: number): string {
    return Number.isFinite(value) ? value.toFixed(1) : '0.0';
}

export function CompetitionTotwTab({ totw, onPressPlayer }: CompetitionTotwTabProps) {
    const { t } = useTranslation();
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const viewTotw = totw as CompetitionTotwViewData;
    const state = viewTotw.state ?? 'complete';
    const placeholderSlots = viewTotw.placeholderSlots ?? [];

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <View style={styles.headerRow}>
                        <Text style={styles.title}>{t('competitionDetails.totw.title')}</Text>
                        {state !== 'unavailable' ? (
                            <View style={styles.badgesRow}>
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>
                                        {t('competitionDetails.totw.formationLabel', { value: totw.formation })}
                                    </Text>
                                </View>
                                <View style={[styles.badge, styles.badgePrimary]}>
                                    <Text style={styles.badgeText}>
                                        {t('competitionDetails.totw.averageRating', {
                                            value: toOneDecimal(totw.averageRating),
                                        })}
                                    </Text>
                                </View>
                                {state === 'partial' ? (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>
                                            {t('competitionDetails.totw.partialBadge')}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                        ) : null}
                    </View>

                    {state === 'unavailable' ? (
                        <View style={styles.unavailableWrap}>
                            <Text style={styles.unavailableText}>
                                {t('competitionDetails.totw.unavailable')}
                            </Text>
                        </View>
                    ) : (
                        <PitchFormation
                            players={totw.players}
                            placeholderSlots={placeholderSlots}
                            onPressPlayer={onPressPlayer}
                        />
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
