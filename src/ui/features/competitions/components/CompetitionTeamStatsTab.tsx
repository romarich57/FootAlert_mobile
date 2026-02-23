import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import { useCompetitionTeamStats } from '../hooks/useCompetitionTeamStats';
import { HorizontalBarChart, type HorizontalBarChartItem } from './HorizontalBarChart';

type CompetitionTeamStatsTabProps = {
    competitionId: number;
    season: number;
};

type StatMode = 'attack' | 'defense';

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
            flexDirection: 'row',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.surface,
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
    });
}

export function CompetitionTeamStatsTab({ competitionId, season }: CompetitionTeamStatsTabProps) {
    const { colors } = useAppTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [statMode, setStatMode] = useState<StatMode>('attack');
    const { data: teamStats, isLoading, error } = useCompetitionTeamStats(competitionId, season);

    const listData = statMode === 'attack' ? teamStats?.bestAttack : teamStats?.bestDefense;
    const maxChartValue = listData && listData.length > 0
        ? Math.max(...listData.map(team => statMode === 'attack' ? team.goalsFor : team.goalsAgainst))
        : 1;

    const chartData: HorizontalBarChartItem[] = (listData || []).slice(0, 10).map((team, index) => ({
        id: team.teamId.toString(),
        label: team.teamName,
        value: statMode === 'attack' ? team.goalsFor : team.goalsAgainst,
        maxValue: maxChartValue,
        photoUrl: team.teamLogo,
        rank: index + 1,
    }));

    return (
        <View style={styles.container}>
            <View style={styles.selectorContainer}>
                <Pressable
                    style={[styles.selectorPill, statMode === 'attack' && styles.selectorPillActive]}
                    onPress={() => setStatMode('attack')}
                >
                    <Text style={[styles.selectorText, statMode === 'attack' && styles.selectorTextActive]}>
                        {t('competitionDetails.teamStats.bestAttack')}
                    </Text>
                </Pressable>
                <Pressable
                    style={[styles.selectorPill, statMode === 'defense' && styles.selectorPillActive]}
                    onPress={() => setStatMode('defense')}
                >
                    <Text style={[styles.selectorText, statMode === 'defense' && styles.selectorTextActive]}>
                        {t('competitionDetails.teamStats.bestDefense')}
                    </Text>
                </Pressable>
            </View>

            {isLoading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : error || !listData || listData.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>{t('competitionDetails.teamStats.unavailable')}</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.contentScroll} showsVerticalScrollIndicator={false}>
                    <HorizontalBarChart
                        title={
                            statMode === 'attack'
                                ? t('competitionDetails.teamStats.goalsScoredRanking')
                                : t('competitionDetails.teamStats.goalsConcededRanking')
                        }
                        data={chartData}
                    />
                </ScrollView>
            )}
        </View>
    );
}
