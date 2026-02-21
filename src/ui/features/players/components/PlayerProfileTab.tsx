import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { PlayerCharacteristics, PlayerProfile, PlayerSeasonStats } from '@ui/features/players/types/players.types';
import { RadarChart } from './RadarChart';

type PlayerProfileTabProps = {
    profile: PlayerProfile;
    stats: PlayerSeasonStats;
    characteristics: PlayerCharacteristics;
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
            gap: 24,
        },
        row: {
            flexDirection: 'row',
            gap: 16,
        },
        infoBlock: {
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
        },
        infoLabel: {
            color: colors.textMuted,
            fontSize: 12,
            fontWeight: '600',
            textTransform: 'uppercase',
            marginBottom: 8,
        },
        infoValueRow: {
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 4,
        },
        infoValue: {
            color: colors.text,
            fontSize: 24,
            fontWeight: '700',
        },
        infoUnit: {
            color: colors.textMuted,
            fontSize: 14,
            fontWeight: '600',
        },
        largeBlock: {
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: colors.border,
        },
        largeBlockRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        largeBlockLabel: {
            color: colors.textMuted,
            fontSize: 12,
            fontWeight: '600',
        },
        largeBlockValue: {
            color: colors.text,
            fontSize: 18,
            fontWeight: '700',
        },
        largeValueGreen: {
            color: colors.primary,
            fontSize: 22,
            fontWeight: '800',
        },
        seasonTitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
        },
        seasonTitle: {
            color: colors.text,
            fontSize: 18,
            fontWeight: '700',
        },
        statsGrid: {
            flexDirection: 'row',
            gap: 20,
        },
        statCol: {
            flex: 1,
        },
        statLabel: {
            color: colors.textMuted,
            fontSize: 12,
            fontWeight: '600',
            textTransform: 'uppercase',
            marginBottom: 4,
        },
        statValue: {
            color: colors.text,
            fontSize: 24,
            fontWeight: '800',
        },
        sectionTitle: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '700',
            textTransform: 'uppercase',
            marginBottom: 16,
        },
    });
}

function InfoBlock({ label, value, unit, styles }: any) {
    return (
        <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>{label}</Text>
            <View style={styles.infoValueRow}>
                <Text style={styles.infoValue}>{value}</Text>
                {unit && <Text style={styles.infoUnit}>{unit}</Text>}
            </View>
        </View>
    );
}

export function PlayerProfileTab({ profile, stats, characteristics }: PlayerProfileTabProps) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentPadding}>

            {/* Physical Info */}
            <View style={styles.row}>
                <InfoBlock label="Taille" value={profile.height.replace(' cm', '')} unit="cm" styles={styles} />
                <InfoBlock label="Âge" value={profile.age} unit="ans" styles={styles} />
                <InfoBlock label="Pays" value={profile.nationality.substring(0, 3).toUpperCase()} styles={styles} />
            </View>

            {/* Extra Info */}
            <View style={styles.largeBlock}>
                <View style={styles.largeBlockRow}>
                    <View>
                        <View style={[styles.largeBlock, { backgroundColor: `${colors.primary}20`, padding: 8, paddingHorizontal: 12, borderWidth: 0, alignSelf: 'flex-start', marginBottom: 6 }]}>
                            <Text style={styles.largeValueGreen}>{profile.number ?? '?'}</Text>
                        </View>
                    </View>
                    <View>
                        <Text style={styles.largeBlockLabel}>Pied fort</Text>
                        <Text style={styles.largeBlockValue}>{profile.foot}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.largeBlockLabel}>Valeur marchande</Text>
                        <Text style={styles.largeValueGreen}>{profile.transferValue ?? '-'}</Text>
                    </View>
                </View>
            </View>

            {/* Season Stats Summary */}
            <View style={styles.largeBlock}>
                <View style={styles.seasonTitleRow}>
                    <View style={{ width: 32, height: 32, backgroundColor: colors.surfaceElevated, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                        {/* Placeholder for league logo */}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.seasonTitle}>{profile.league.name}</Text>
                        <Text style={styles.largeBlockLabel}>Saison {profile.league.season}/{profile.league.season + 1}</Text>
                    </View>
                    <View style={{ backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ color: colors.background, fontWeight: '800' }}>{stats.rating}</Text>
                    </View>
                </View>

                <View style={styles.statsGrid}>
                    <View style={styles.statCol}>
                        <Text style={styles.statLabel}>Matchs</Text>
                        <Text style={styles.statValue}>{stats.matches}</Text>
                    </View>
                    <View style={styles.statCol}>
                        <Text style={styles.statLabel}>Buts</Text>
                        <Text style={styles.statValue}>{stats.goals}</Text>
                    </View>
                    <View style={styles.statCol}>
                        <Text style={styles.statLabel}>Passes D.</Text>
                        <Text style={styles.statValue}>{stats.assists}</Text>
                    </View>
                </View>
            </View>

            {/* Characteristics / Radar Chart */}
            <View style={styles.largeBlock}>
                <Text style={styles.sectionTitle}>Caractéristiques</Text>
                <RadarChart data={characteristics} size={280} />
            </View>

        </ScrollView>
    );
}
