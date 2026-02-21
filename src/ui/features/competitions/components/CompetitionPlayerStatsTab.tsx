import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import { useCompetitionPlayerStats, PlayerStatType } from '../hooks/useCompetitionPlayerStats';
import { HeroPlayerStatCard } from './HeroPlayerStatCard';
import { HorizontalBarChart, type HorizontalBarChartItem } from './HorizontalBarChart';
import type { CompetitionPlayerStat } from '../types/competitions.types';

type CompetitionPlayerStatsTabProps = {
    competitionId: number;
    season: number;
};

const STAT_TYPES: { key: PlayerStatType; label: string }[] = [
    { key: 'goals', label: 'Buteurs' },
    { key: 'assists', label: 'Passeurs' },
    { key: 'yellowCards', label: 'Cartons Jaunes' },
    { key: 'redCards', label: 'Cartons Rouges' },
];

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        centerContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        emptyText: {
            color: colors.textMuted,
            fontSize: 16,
            marginTop: 40,
            textAlign: 'center',
        },
        selectorContainer: {
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.surface,
        },
        selectorScroll: {
            gap: 12,
        },
        selectorPill: {
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.surfaceElevated,
        },
        selectorPillActive: {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
        },
        selectorText: {
            color: colors.textMuted,
            fontSize: 14,
            fontWeight: '600',
        },
        selectorTextActive: {
            color: '#000',
        },
        contentScroll: {
            paddingHorizontal: 16,
            paddingVertical: 24,
            paddingBottom: 40,
        },
        heroContainer: {
            marginBottom: 32,
        },
    });
}

function getStatValue(stat: CompetitionPlayerStat, type: PlayerStatType): number {
    switch (type) {
        case 'goals': return stat.goals ?? 0;
        case 'assists': return stat.assists ?? 0;
        case 'yellowCards': return stat.yellowCards ?? 0;
        case 'redCards': return stat.redCards ?? 0;
        default: return 0;
    }
}

function getStatLabel(type: PlayerStatType): string {
    switch (type) {
        case 'goals': return 'Buts';
        case 'assists': return 'Passes déc.';
        case 'yellowCards': return 'Cartons';
        case 'redCards': return 'Cartons';
        default: return 'Stat';
    }
}

export function CompetitionPlayerStatsTab({ competitionId, season }: CompetitionPlayerStatsTabProps) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [activeStatType, setActiveStatType] = useState<PlayerStatType>('goals');

    const { data: statsData, isLoading, error } = useCompetitionPlayerStats(competitionId, season, activeStatType);

    const leader = statsData && statsData.length > 0 ? statsData[0] : null;
    const runnersUp = statsData ? statsData.slice(1, 10) : [];

    const maxValue = leader ? getStatValue(leader, activeStatType) : 1;

    const chartData: HorizontalBarChartItem[] = runnersUp.map((stat, index) => ({
        id: stat.playerId.toString() + stat.teamId.toString(),
        label: stat.playerName,
        subLabel: stat.teamName,
        value: getStatValue(stat, activeStatType),
        maxValue: maxValue,
        photoUrl: stat.playerPhoto,
        rank: index + 2, // starts at 2 because leader is 1
    }));

    return (
        <View style={styles.container}>
            <View style={styles.selectorContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
                    {STAT_TYPES.map(type => {
                        const isActive = activeStatType === type.key;
                        return (
                            <Pressable
                                key={type.key}
                                style={[styles.selectorPill, isActive && styles.selectorPillActive]}
                                onPress={() => setActiveStatType(type.key)}
                            >
                                <Text style={[styles.selectorText, isActive && styles.selectorTextActive]}>
                                    {type.label}
                                </Text>
                            </Pressable>
                        )
                    })}
                </ScrollView>
            </View>

            {isLoading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : error || !leader ? (
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>Statistiques non disponibles pour cette saison (?).</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.contentScroll} showsVerticalScrollIndicator={false}>
                    <View style={styles.heroContainer}>
                        <HeroPlayerStatCard
                            playerStat={leader}
                            statValue={getStatValue(leader, activeStatType)}
                            statLabel={getStatLabel(activeStatType)}
                            rank={1}
                        />
                    </View>

                    <HorizontalBarChart
                        title={`Classement - ${STAT_TYPES.find(t => t.key === activeStatType)?.label}`}
                        data={chartData}
                    />
                </ScrollView>
            )}
        </View>
    );
}
