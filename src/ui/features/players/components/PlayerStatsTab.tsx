import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { PlayerSeasonStats } from '@ui/features/players/types/players.types';
import { toDisplayValue } from '@ui/features/players/utils/playerDisplay';
import { ShotMap } from './ShotMap';

type PlayerStatsTabProps = {
    stats: PlayerSeasonStats;
    leagueName: string | null;
    seasonText: string;
};

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        contentPadding: {
            paddingHorizontal: 20,
            paddingVertical: 24,
            gap: 20,
        },
        dropdown: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: colors.surface,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: colors.border,
        },
        dropdownText: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '600',
        },
        card: {
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: colors.border,
        },
        topRowGrid: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            paddingBottom: 20,
            marginBottom: 20,
        },
        bottomRowGrid: {
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        statBox: {
            flex: 1,
            alignItems: 'center',
        },
        statBoxWithSeparators: {
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: colors.border,
        },
        statLabel: {
            color: colors.textMuted,
            fontSize: 12,
            fontWeight: '700',
            textTransform: 'uppercase',
            marginBottom: 8,
            letterSpacing: 0.5,
        },
        statValue: {
            color: colors.text,
            fontSize: 28,
            fontWeight: '800',
        },
        statValueGreen: {
            color: colors.primary,
            fontSize: 28,
            fontWeight: '800',
        },
        highlightStatLabel: {
            color: colors.primary,
        },
        statSubLabel: {
            color: colors.textMuted,
            fontSize: 11,
            fontWeight: '700',
            textTransform: 'uppercase',
            marginTop: 4,
        },
        statSubValue: {
            color: colors.text,
            fontSize: 20,
            fontWeight: '800',
        },
        shotStatsRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 20,
            paddingTop: 20,
            borderTopWidth: 1,
            borderTopColor: colors.border,
        },
        detailsLinkRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 24,
            gap: 8,
        },
        detailsLinkText: {
            color: colors.primary,
            fontSize: 14,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 1,
        }
    });
}

export function PlayerStatsTab({ stats, leagueName, seasonText }: PlayerStatsTabProps) {
    const { colors } = useAppTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const accuracyPercent =
        typeof stats.shots === 'number' &&
        typeof stats.shotsOnTarget === 'number' &&
        stats.shots > 0
            ? String(Math.round((stats.shotsOnTarget / stats.shots) * 100))
            : '';

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentPadding}>

            <Pressable style={styles.dropdown}>
                <Text style={styles.dropdownText}>{toDisplayValue(leagueName)} {seasonText}</Text>
                <MaterialCommunityIcons name="chevron-down" size={24} color={colors.textMuted} />
            </Pressable>

            <View style={styles.card}>
                <View style={styles.topRowGrid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>{t('playerDetails.stats.labels.goals')}</Text>
                        <Text style={styles.statValue}>{toDisplayValue(stats.goals)}</Text>
                    </View>
                    <View style={[styles.statBox, styles.statBoxWithSeparators]}>
                        <Text style={styles.statLabel}>{t('playerDetails.stats.labels.assists')}</Text>
                        <Text style={styles.statValue}>{toDisplayValue(stats.assists)}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={[styles.statLabel, styles.highlightStatLabel]}>{t('playerDetails.stats.labels.rating')}</Text>
                        <Text style={styles.statValueGreen}>{toDisplayValue(stats.rating)}</Text>
                    </View>
                </View>

                <View style={styles.bottomRowGrid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statSubValue}>{toDisplayValue(stats.matches)}</Text>
                        <Text style={styles.statSubLabel}>{t('playerDetails.stats.labels.matches')}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statSubValue}>{toDisplayValue(stats.starts)}</Text>
                        <Text style={styles.statSubLabel}>{t('playerDetails.stats.labels.starts')}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statSubValue}>{toDisplayValue(stats.minutes)}</Text>
                        <Text style={styles.statSubLabel}>{t('playerDetails.stats.labels.minutes')}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.card}>
                <ShotMap shots={[]} accuracy={accuracyPercent} />

                <View style={styles.shotStatsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statSubValue}>{toDisplayValue(stats.shots)}</Text>
                        <Text style={styles.statSubLabel}>{t('playerDetails.stats.labels.shots')}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statSubValue}>{toDisplayValue(stats.goals)}</Text>
                        <Text style={styles.statSubLabel}>{t('playerDetails.stats.labels.goals')}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statSubValue} />
                        <Text style={styles.statSubLabel}>{t('playerDetails.stats.labels.xg')}</Text>
                    </View>
                </View>

                <Pressable style={styles.detailsLinkRow}>
                    <Text style={styles.detailsLinkText}>{t('playerDetails.stats.labels.shotDetails')}</Text>
                    <MaterialCommunityIcons name="arrow-right" size={16} color={colors.primary} />
                </Pressable>
            </View>

        </ScrollView>
    );
}
