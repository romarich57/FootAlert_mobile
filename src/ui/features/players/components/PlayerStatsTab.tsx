import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { PlayerSeasonStats } from '@ui/features/players/types/players.types';
import { ShotMap } from './ShotMap';

type PlayerStatsTabProps = {
    stats: PlayerSeasonStats;
    leagueName: string;
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
    const styles = useMemo(() => createStyles(colors), [colors]);

    // Mock shots based on the design since API-Football doesn't provide granular x/y coordinates
    const mockShots = [
        { x: 30, y: 20, isGoal: true },
        { x: 45, y: 15, isGoal: true },
        { x: 65, y: 10, isGoal: true },
        { x: 25, y: 35, isGoal: false },
        { x: 48, y: 40, isGoal: false },
        { x: 75, y: 50, isGoal: false },
    ];

    const accuracyPercent = stats.shots > 0 ? Math.round((stats.shotsOnTarget / stats.shots) * 100) : 0;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentPadding}>

            <Pressable style={styles.dropdown}>
                <Text style={styles.dropdownText}>{leagueName} {seasonText}</Text>
                <MaterialCommunityIcons name="chevron-down" size={24} color={colors.textMuted} />
            </Pressable>

            <View style={styles.card}>
                <View style={styles.topRowGrid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Buts</Text>
                        <Text style={styles.statValue}>{stats.goals}</Text>
                    </View>
                    <View style={[styles.statBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border }]}>
                        <Text style={styles.statLabel}>Passes</Text>
                        <Text style={styles.statValue}>{stats.assists}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={[styles.statLabel, { color: colors.primary }]}>Note</Text>
                        <Text style={styles.statValueGreen}>{stats.rating}</Text>
                    </View>
                </View>

                <View style={styles.bottomRowGrid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statSubValue}>{stats.matches}</Text>
                        <Text style={styles.statSubLabel}>Matchs</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statSubValue}>{stats.starts}</Text>
                        <Text style={styles.statSubLabel}>Titularisations</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statSubValue}>{stats.minutes}</Text>
                        <Text style={styles.statSubLabel}>Min.</Text>
                    </View>
                </View>
            </View>

            <View style={styles.card}>
                <ShotMap shots={mockShots} accuracy={String(accuracyPercent)} />

                <View style={styles.shotStatsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statSubValue}>{stats.shots}</Text>
                        <Text style={styles.statSubLabel}>Tirs</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statSubValue}>{stats.goals}</Text>
                        <Text style={styles.statSubLabel}>Buts</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statSubValue}>{(stats.goals * 1.05).toFixed(1)}</Text>
                        <Text style={styles.statSubLabel}>xG</Text>
                    </View>
                </View>

                <Pressable style={styles.detailsLinkRow}>
                    <Text style={styles.detailsLinkText}>DÉTAILS DES TIRS</Text>
                    <MaterialCommunityIcons name="arrow-right" size={16} color={colors.primary} />
                </Pressable>
            </View>

        </ScrollView>
    );
}
