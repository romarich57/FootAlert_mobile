import { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    ActivityIndicator,
} from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import {
    DEFAULT_HIT_SLOP,
    MIN_TOUCH_TARGET,
    type ThemeColors,
} from '@ui/shared/theme/theme';
import {
    type CompetitionTeamAdvancedMetricKey,
    type CompetitionTeamHomeAwayMetricKey,
    type CompetitionTeamStatsLeaderboard,
    type CompetitionTeamStatsMetricKey,
} from '../types/competitions.types';
import { useCompetitionTeamStats } from '../hooks/useCompetitionTeamStats';
import { HorizontalBarChart, type HorizontalBarChartItem } from './HorizontalBarChart';

type CompetitionTeamStatsTabProps = {
    competitionId: number;
    season: number;
};

type MetricFormat = 'integer' | 'decimal' | 'percent';

type MetricMeta = {
    labelKey: string;
    format: MetricFormat;
};

const SUMMARY_DEFAULT_METRIC: CompetitionTeamStatsMetricKey = 'pointsPerMatch';
const HOME_AWAY_DEFAULT_METRIC: CompetitionTeamHomeAwayMetricKey = 'homePPG';
const ADVANCED_DEFAULT_METRIC: CompetitionTeamAdvancedMetricKey = 'cleanSheets';

const SUMMARY_METRICS: Record<CompetitionTeamStatsMetricKey, MetricMeta> = {
    pointsPerMatch: { labelKey: 'competitionDetails.teamStats.metrics.pointsPerMatch', format: 'decimal' },
    winRate: { labelKey: 'competitionDetails.teamStats.metrics.winRate', format: 'percent' },
    goalsScoredPerMatch: {
        labelKey: 'competitionDetails.teamStats.metrics.goalsScoredPerMatch',
        format: 'decimal',
    },
    goalsConcededPerMatch: {
        labelKey: 'competitionDetails.teamStats.metrics.goalsConcededPerMatch',
        format: 'decimal',
    },
    goalDiffPerMatch: {
        labelKey: 'competitionDetails.teamStats.metrics.goalDiffPerMatch',
        format: 'decimal',
    },
    formIndex: { labelKey: 'competitionDetails.teamStats.metrics.formIndex', format: 'integer' },
    formPointsPerMatch: {
        labelKey: 'competitionDetails.teamStats.metrics.formPointsPerMatch',
        format: 'decimal',
    },
};

const HOME_AWAY_METRICS: Record<CompetitionTeamHomeAwayMetricKey, MetricMeta> = {
    homePPG: { labelKey: 'competitionDetails.teamStats.metrics.homePPG', format: 'decimal' },
    awayPPG: { labelKey: 'competitionDetails.teamStats.metrics.awayPPG', format: 'decimal' },
    homeGoalsFor: { labelKey: 'competitionDetails.teamStats.metrics.homeGoalsFor', format: 'integer' },
    awayGoalsFor: { labelKey: 'competitionDetails.teamStats.metrics.awayGoalsFor', format: 'integer' },
    homeGoalsAgainst: {
        labelKey: 'competitionDetails.teamStats.metrics.homeGoalsAgainst',
        format: 'integer',
    },
    awayGoalsAgainst: {
        labelKey: 'competitionDetails.teamStats.metrics.awayGoalsAgainst',
        format: 'integer',
    },
    deltaHomeAwayPPG: {
        labelKey: 'competitionDetails.teamStats.metrics.deltaHomeAwayPPG',
        format: 'decimal',
    },
    deltaHomeAwayGoalsFor: {
        labelKey: 'competitionDetails.teamStats.metrics.deltaHomeAwayGoalsFor',
        format: 'integer',
    },
    deltaHomeAwayGoalsAgainst: {
        labelKey: 'competitionDetails.teamStats.metrics.deltaHomeAwayGoalsAgainst',
        format: 'integer',
    },
};

const ADVANCED_METRICS: Record<CompetitionTeamAdvancedMetricKey, MetricMeta> = {
    cleanSheets: { labelKey: 'competitionDetails.teamStats.metrics.cleanSheets', format: 'integer' },
    failedToScore: { labelKey: 'competitionDetails.teamStats.metrics.failedToScore', format: 'integer' },
    xGPerMatch: { labelKey: 'competitionDetails.teamStats.metrics.xGPerMatch', format: 'decimal' },
    possession: { labelKey: 'competitionDetails.teamStats.metrics.possession', format: 'percent' },
    shotsPerMatch: { labelKey: 'competitionDetails.teamStats.metrics.shotsPerMatch', format: 'decimal' },
    shotsOnTargetPerMatch: {
        labelKey: 'competitionDetails.teamStats.metrics.shotsOnTargetPerMatch',
        format: 'decimal',
    },
};

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
            paddingHorizontal: 24,
        },
        emptyText: {
            color: colors.textMuted,
            fontSize: 15,
            textAlign: 'center',
        },
        scrollContent: {
            paddingHorizontal: 14,
            paddingVertical: 14,
            paddingBottom: 30,
            gap: 12,
        },
        sectionCard: {
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            padding: 12,
            gap: 10,
        },
        sectionHeaderRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
        },
        sectionTitle: {
            color: colors.text,
            fontSize: 18,
            fontWeight: '800',
            flex: 1,
        },
        sectionSubtitle: {
            color: colors.textMuted,
            fontSize: 13,
            lineHeight: 18,
        },
        badge: {
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
            paddingHorizontal: 10,
            paddingVertical: 4,
        },
        badgeText: {
            color: colors.text,
            fontSize: 11,
            fontWeight: '800',
        },
        chipsWrap: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        chip: {
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
            paddingHorizontal: 11,
            paddingVertical: 6,
            minHeight: MIN_TOUCH_TARGET,
            minWidth: MIN_TOUCH_TARGET,
            alignItems: 'center',
            justifyContent: 'center',
        },
        chipActive: {
            borderColor: colors.primary,
            backgroundColor: 'rgba(21, 248, 106, 0.14)',
        },
        chipText: {
            color: colors.textMuted,
            fontSize: 12,
            fontWeight: '700',
        },
        chipTextActive: {
            color: colors.text,
        },
        advancedCta: {
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.primary,
            backgroundColor: 'rgba(21, 248, 106, 0.14)',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 11,
            paddingHorizontal: 14,
            minHeight: MIN_TOUCH_TARGET,
        },
        advancedCtaText: {
            color: colors.text,
            fontSize: 13,
            fontWeight: '800',
        },
        stateCard: {
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
            minHeight: 74,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 12,
            gap: 8,
        },
        stateText: {
            color: colors.textMuted,
            fontSize: 13,
            textAlign: 'center',
        },
        partialText: {
            color: colors.warning,
            fontSize: 12,
            fontWeight: '700',
        },
        progressText: {
            color: colors.textMuted,
            fontSize: 12,
            fontWeight: '600',
            textAlign: 'center',
        },
    });
}

function formatMetricValue(value: number, format: MetricFormat): string {
    if (format === 'integer') {
        return Number.isInteger(value) ? `${value}` : `${Math.round(value)}`;
    }

    if (format === 'percent') {
        return `${value.toFixed(1)}%`;
    }

    return value.toFixed(2);
}

function toChartData(leaderboard: CompetitionTeamStatsLeaderboard<string>): HorizontalBarChartItem[] {
    if (leaderboard.items.length === 0) {
        return [];
    }

    const maxValue = Math.max(...leaderboard.items.map(item => Math.abs(item.value)), 1);

    return leaderboard.items.map((item, index) => ({
        id: String(item.teamId),
        label: item.teamName,
        value: item.value,
        maxValue,
        photoUrl: item.teamLogo,
        rank: index + 1,
    }));
}

export function CompetitionTeamStatsTab({ competitionId, season }: CompetitionTeamStatsTabProps) {
    const { colors } = useAppTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [selectedSummaryMetric, setSelectedSummaryMetric] = useState<CompetitionTeamStatsMetricKey>(
        SUMMARY_DEFAULT_METRIC,
    );
    const [selectedHomeAwayMetric, setSelectedHomeAwayMetric] = useState<CompetitionTeamHomeAwayMetricKey>(
        HOME_AWAY_DEFAULT_METRIC,
    );
    const [selectedAdvancedMetric, setSelectedAdvancedMetric] = useState<CompetitionTeamAdvancedMetricKey>(
        ADVANCED_DEFAULT_METRIC,
    );
    const [advancedEnabled, setAdvancedEnabled] = useState(false);
    const netInfo = useNetInfo();

    const networkLiteMode = useMemo(() => {
        if (netInfo.isInternetReachable === false || netInfo.isConnected === false) {
            return true;
        }

        const details = netInfo.details as
            | { isConnectionExpensive?: boolean; cellularGeneration?: string | null }
            | null;
        const isExpensiveConnection = details?.isConnectionExpensive === true;
        const isLowGenerationCellular =
            netInfo.type === 'cellular' && ['2g', '3g'].includes((details?.cellularGeneration ?? '').toLowerCase());

        return isExpensiveConnection || isLowGenerationCellular;
    }, [netInfo.details, netInfo.isConnected, netInfo.isInternetReachable, netInfo.type]);

    const {
        summary,
        homeAway,
        advanced,
        isBaseLoading,
        isAdvancedLoading,
        advancedProgress,
        baseError,
        hasAdvancedData,
    } = useCompetitionTeamStats({
        leagueId: competitionId,
        season,
        advancedEnabled,
        networkLiteMode,
    });

    const selectedSummaryLeaderboard = summary.leaderboards[selectedSummaryMetric];
    const selectedHomeAwayLeaderboard = homeAway.leaderboards[selectedHomeAwayMetric];
    const selectedAdvancedLeaderboard = advanced.leaderboards[selectedAdvancedMetric];

    const summaryChartData = useMemo(
        () => toChartData(selectedSummaryLeaderboard),
        [selectedSummaryLeaderboard],
    );
    const homeAwayChartData = useMemo(
        () => toChartData(selectedHomeAwayLeaderboard),
        [selectedHomeAwayLeaderboard],
    );
    const advancedChartData = useMemo(
        () => toChartData(selectedAdvancedLeaderboard),
        [selectedAdvancedLeaderboard],
    );

    if (isBaseLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (baseError) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>{t('competitionDetails.teamStats.unavailable')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.sectionCard} testID="competition-team-stats-section-summary">
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>{t('competitionDetails.teamStats.sections.summary.title')}</Text>
                    </View>
                    <Text style={styles.sectionSubtitle}>
                        {t('competitionDetails.teamStats.sections.summary.subtitle')}
                    </Text>

                    <View style={styles.chipsWrap}>
                        {summary.metrics.map(metric => {
                            const isActive = metric === selectedSummaryMetric;
                            return (
                                <Pressable
                                    key={metric}
                                    testID={`competition-team-stats-chip-summary-${metric}`}
                                    style={[styles.chip, isActive ? styles.chipActive : null]}
                                    onPress={() => setSelectedSummaryMetric(metric)}
                                    hitSlop={DEFAULT_HIT_SLOP}
                                >
                                    <Text style={[styles.chipText, isActive ? styles.chipTextActive : null]}>
                                        {t(SUMMARY_METRICS[metric].labelKey)}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {summaryChartData.length > 0 ? (
                        <HorizontalBarChart
                            title={t(SUMMARY_METRICS[selectedSummaryMetric].labelKey)}
                            data={summaryChartData}
                            valueFormatter={value => formatMetricValue(value, SUMMARY_METRICS[selectedSummaryMetric].format)}
                        />
                    ) : (
                        <View style={styles.stateCard}>
                            <Text style={styles.stateText}>{t('competitionDetails.teamStats.unavailable')}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.sectionCard} testID="competition-team-stats-section-home-away">
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>{t('competitionDetails.teamStats.sections.homeAway.title')}</Text>
                    </View>
                    <Text style={styles.sectionSubtitle}>
                        {t('competitionDetails.teamStats.sections.homeAway.subtitle')}
                    </Text>

                    <View style={styles.chipsWrap}>
                        {homeAway.metrics.map(metric => {
                            const isActive = metric === selectedHomeAwayMetric;
                            return (
                                <Pressable
                                    key={metric}
                                    testID={`competition-team-stats-chip-home-away-${metric}`}
                                    style={[styles.chip, isActive ? styles.chipActive : null]}
                                    onPress={() => setSelectedHomeAwayMetric(metric)}
                                    hitSlop={DEFAULT_HIT_SLOP}
                                >
                                    <Text style={[styles.chipText, isActive ? styles.chipTextActive : null]}>
                                        {t(HOME_AWAY_METRICS[metric].labelKey)}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {homeAwayChartData.length > 0 ? (
                        <HorizontalBarChart
                            title={t(HOME_AWAY_METRICS[selectedHomeAwayMetric].labelKey)}
                            data={homeAwayChartData}
                            valueFormatter={value => formatMetricValue(value, HOME_AWAY_METRICS[selectedHomeAwayMetric].format)}
                        />
                    ) : (
                        <View style={styles.stateCard}>
                            <Text style={styles.stateText}>{t('competitionDetails.teamStats.unavailable')}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.sectionCard} testID="competition-team-stats-section-advanced">
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>{t('competitionDetails.teamStats.sections.advanced.title')}</Text>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{t('competitionDetails.teamStats.top10Analyzed')}</Text>
                        </View>
                    </View>
                    <Text style={styles.sectionSubtitle}>
                        {t('competitionDetails.teamStats.sections.advanced.subtitle')}
                    </Text>

                    {!advancedEnabled ? (
                        <Pressable
                            testID="competition-team-stats-advanced-load"
                            style={styles.advancedCta}
                            onPress={() => setAdvancedEnabled(true)}
                            hitSlop={DEFAULT_HIT_SLOP}
                        >
                            <Text style={styles.advancedCtaText}>
                                {t('competitionDetails.teamStats.advanced.load')}
                            </Text>
                            {networkLiteMode ? (
                                <Text style={styles.progressText}>
                                    {t('competitionDetails.teamStats.advanced.networkLite')}
                                </Text>
                            ) : null}
                        </Pressable>
                    ) : (
                        <>
                            <View style={styles.chipsWrap}>
                                {advanced.metrics.map(metric => {
                                    const isActive = metric === selectedAdvancedMetric;
                                    return (
                                        <Pressable
                                            key={metric}
                                            testID={`competition-team-stats-chip-advanced-${metric}`}
                                            style={[styles.chip, isActive ? styles.chipActive : null]}
                                            onPress={() => setSelectedAdvancedMetric(metric)}
                                            hitSlop={DEFAULT_HIT_SLOP}
                                        >
                                            <Text style={[styles.chipText, isActive ? styles.chipTextActive : null]}>
                                                {t(ADVANCED_METRICS[metric].labelKey)}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            {isAdvancedLoading ? (
                                <View style={styles.stateCard} testID="competition-team-stats-advanced-loading">
                                    <ActivityIndicator size="small" color={colors.primary} />
                                    <Text style={styles.stateText}>
                                        {t('competitionDetails.teamStats.advanced.loading')}
                                    </Text>
                                    <Text style={styles.progressText}>
                                        {t('competitionDetails.teamStats.advanced.progress', { progress: advancedProgress })}
                                    </Text>
                                </View>
                            ) : hasAdvancedData && advancedChartData.length > 0 ? (
                                <>
                                    {advanced.unavailableMetrics.length > 0 ? (
                                        <Text style={styles.partialText}>
                                            {t('competitionDetails.teamStats.advanced.partial')}
                                        </Text>
                                    ) : null}
                                    <HorizontalBarChart
                                        title={t(ADVANCED_METRICS[selectedAdvancedMetric].labelKey)}
                                        data={advancedChartData}
                                        valueFormatter={value =>
                                            formatMetricValue(value, ADVANCED_METRICS[selectedAdvancedMetric].format)
                                        }
                                    />
                                </>
                            ) : (
                                <View style={styles.stateCard} testID="competition-team-stats-advanced-unavailable">
                                    <Text style={styles.stateText}>
                                        {t('competitionDetails.teamStats.advanced.unavailable')}
                                    </Text>
                                </View>
                            )}
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
