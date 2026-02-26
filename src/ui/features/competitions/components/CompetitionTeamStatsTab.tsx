import { useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
} from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import {
  DEFAULT_HIT_SLOP,
} from '@ui/shared/theme/theme';
import {
    type CompetitionTeamAdvancedMetricKey,
    type CompetitionTeamHomeAwayMetricKey,
    type CompetitionTeamStatsMetricKey,
} from '../types/competitions.types';
import { useCompetitionTeamStats } from '../hooks/useCompetitionTeamStats';
import { HorizontalBarChart } from './HorizontalBarChart';
import { createCompetitionTeamStatsTabStyles } from './CompetitionTeamStatsTab.styles';
import {
  ADVANCED_DEFAULT_METRIC,
  ADVANCED_METRICS,
  formatMetricValue,
  HOME_AWAY_DEFAULT_METRIC,
  HOME_AWAY_METRICS,
  SUMMARY_DEFAULT_METRIC,
  SUMMARY_METRICS,
  toChartData,
} from './CompetitionTeamStats.metrics';

type CompetitionTeamStatsTabProps = {
    competitionId: number;
    season: number;
};

export function CompetitionTeamStatsTab({ competitionId, season }: CompetitionTeamStatsTabProps) {
    const { colors } = useAppTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createCompetitionTeamStatsTabStyles(colors), [colors]);

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
