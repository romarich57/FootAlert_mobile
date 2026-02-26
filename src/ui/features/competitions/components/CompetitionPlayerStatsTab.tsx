import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import {
    DEFAULT_HIT_SLOP,
    MIN_TOUCH_TARGET,
    type ThemeColors,
} from '@ui/shared/theme/theme';
import { useCompetitionPlayerStats, PlayerStatType } from '../hooks/useCompetitionPlayerStats';
import { HeroPlayerStatCard } from './HeroPlayerStatCard';
import { HorizontalBarChart, type HorizontalBarChartItem } from './HorizontalBarChart';
import type { CompetitionPlayerStat } from '../types/competitions.types';

type CompetitionPlayerStatsTabProps = {
    competitionId: number;
    season: number;
};

const STAT_TYPE_KEYS: PlayerStatType[] = ['goals', 'assists', 'yellowCards', 'redCards'];

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
            minHeight: MIN_TOUCH_TARGET,
            minWidth: MIN_TOUCH_TARGET,
            justifyContent: 'center',
            alignItems: 'center',
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

function getStatLabel(type: PlayerStatType, translate: (key: string) => string): string {
    switch (type) {
        case 'goals': return translate('competitionDetails.playerStats.statLabels.goals');
        case 'assists': return translate('competitionDetails.playerStats.statLabels.assists');
        case 'yellowCards': return translate('competitionDetails.playerStats.statLabels.yellowCards');
        case 'redCards': return translate('competitionDetails.playerStats.statLabels.redCards');
        default: return translate('competitionDetails.tabs.playerStats');
    }
}

export function CompetitionPlayerStatsTab({ competitionId, season }: CompetitionPlayerStatsTabProps) {
    const { colors } = useAppTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [activeStatType, setActiveStatType] = useState<PlayerStatType>('goals');
    const statTypes = useMemo(
        () =>
            STAT_TYPE_KEYS.map(key => ({
                key,
                label: t(`competitionDetails.playerStats.statTypes.${key}`),
            })),
        [t],
    );

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
                    {statTypes.map(type => {
                        const isActive = activeStatType === type.key;
                        return (
                            <Pressable
                                key={type.key}
                                style={[styles.selectorPill, isActive && styles.selectorPillActive]}
                                onPress={() => setActiveStatType(type.key)}
                                hitSlop={DEFAULT_HIT_SLOP}
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
                    <Text style={styles.emptyText}>{t('competitionDetails.playerStats.unavailable')}</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.contentScroll} showsVerticalScrollIndicator={false}>
                    <View style={styles.heroContainer}>
                        <HeroPlayerStatCard
                            playerStat={leader}
                            statValue={getStatValue(leader, activeStatType)}
                            statLabel={getStatLabel(activeStatType, t)}
                            rank={1}
                        />
                    </View>

                    <HorizontalBarChart
                        title={t('competitionDetails.playerStats.rankingTitle', {
                            label: statTypes.find(type => type.key === activeStatType)?.label ?? '',
                        })}
                        data={chartData}
                    />
                </ScrollView>
            )}
        </View>
    );
}
