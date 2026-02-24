import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Image } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { PlayerSeasonStats } from '@ui/features/players/types/players.types';
import { toDisplayValue, toSeasonLabel } from '@ui/features/players/utils/playerDisplay';
import { ShotMap } from './ShotMap';
import { StatBar } from './StatBar';

type PlayerStatsTabProps = {
    stats: PlayerSeasonStats;
    leagueName: string | null;
    leagueLogo: string | null;
    seasonText: string;
    seasons: number[];
    selectedSeason: number;
    onSelectSeason: (season: number) => void;
};

type StatMode = 'total' | 'per90';

type StatRowConfig = {
    label: string;
    value: number | null;
    max: number;
    color: string;
};

function per90(value: number | null, minutes: number | null): number | null {
    if (value === null || minutes === null || minutes <= 0) {
        return null;
    }
    return Number((value / minutes * 90).toFixed(2));
}

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
            paddingBottom: 60,
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
        dropdownMetaRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            flex: 1,
            paddingRight: 12,
        },
        dropdownLeagueLogoWrap: {
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceElevated,
            overflow: 'hidden',
        },
        dropdownLeagueLogo: {
            width: 20,
            height: 20,
        },
        dropdownText: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '600',
            flexShrink: 1,
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            justifyContent: 'center',
            padding: 24,
        },
        modalContent: {
            maxHeight: '70%',
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
        },
        modalHeader: {
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        modalHeaderText: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '700',
        },
        modalRow: {
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        modalRowActive: {
            backgroundColor: 'rgba(21,248,106,0.12)',
        },
        modalRowText: {
            color: colors.text,
            fontSize: 15,
            fontWeight: '600',
        },
        modalRowTextActive: {
            color: colors.primary,
            fontWeight: '700',
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
        // Performances section
        perfHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 4,
        },
        perfTitle: {
            color: colors.text,
            fontSize: 18,
            fontWeight: '700',
        },
        perfSubtitle: {
            color: colors.textMuted,
            fontSize: 13,
        },
        toggleRow: {
            flexDirection: 'row',
            backgroundColor: colors.surfaceElevated,
            borderRadius: 24,
            padding: 3,
            marginTop: 16,
            marginBottom: 8,
        },
        toggleButton: {
            flex: 1,
            paddingVertical: 10,
            alignItems: 'center',
            borderRadius: 22,
        },
        toggleButtonActive: {
            backgroundColor: colors.surface,
        },
        toggleText: {
            color: colors.textMuted,
            fontSize: 14,
            fontWeight: '600',
        },
        toggleTextActive: {
            color: colors.primary,
        },
        sectionTitle: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '700',
            marginTop: 20,
            marginBottom: 4,
            paddingBottom: 8,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        // Shot map area
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
        },
    });
}

// Color constants
const BAR_GREEN = '#22C55E';
const BAR_ORANGE = '#F59E0B';
const BAR_RED = '#EF4444';
const BAR_BLUE = '#3B82F6';

export function PlayerStatsTab({
    stats,
    leagueName,
    leagueLogo,
    seasonText,
    seasons,
    selectedSeason,
    onSelectSeason,
}: PlayerStatsTabProps) {
    const { colors } = useAppTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [mode, setMode] = useState<StatMode>('total');
    const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);

    const resolvedSeasonText = useMemo(() => {
        return toSeasonLabel(selectedSeason) || seasonText;
    }, [seasonText, selectedSeason]);

    const accuracyPercent =
        typeof stats.shots === 'number' &&
            typeof stats.shotsOnTarget === 'number' &&
            stats.shots > 0
            ? String(Math.round((stats.shotsOnTarget / stats.shots) * 100))
            : '';

    // Helper to get stat value based on mode
    const v = (value: number | null): number | null => {
        if (mode === 'per90') {
            return per90(value, stats.minutes);
        }
        return value;
    };

    // Compute max values per category to normalize bars
    const maxOfArr = (...vals: (number | null)[]): number => {
        const nums = vals.filter((n): n is number => n !== null && n > 0);
        return nums.length > 0 ? Math.max(...nums) : 1;
    };

    // --- Category definitions ---
    const tirRows: StatRowConfig[] = [
        { label: 'Buts', value: v(stats.goals), max: maxOfArr(v(stats.goals), v(stats.shots), v(stats.shotsOnTarget)), color: BAR_GREEN },
        { label: 'Buts sur penalty', value: v(stats.penaltyGoals), max: maxOfArr(v(stats.goals), v(stats.penaltyGoals)), color: BAR_GREEN },
        { label: 'Tirs', value: v(stats.shots), max: maxOfArr(v(stats.shots)), color: BAR_BLUE },
        { label: 'Tirs cadrés', value: v(stats.shotsOnTarget), max: maxOfArr(v(stats.shots)), color: BAR_GREEN },
    ];

    const passeRows: StatRowConfig[] = [
        { label: 'Passes décisives', value: v(stats.assists), max: maxOfArr(v(stats.assists), v(stats.keyPasses)), color: BAR_GREEN },
        { label: 'Passes clés', value: v(stats.keyPasses), max: maxOfArr(v(stats.keyPasses), v(stats.assists)), color: BAR_GREEN },
        { label: 'Passes totales', value: v(stats.passes), max: maxOfArr(v(stats.passes)), color: BAR_BLUE },
        { label: 'Précision passes (%)', value: stats.passesAccuracy, max: 100, color: BAR_GREEN },
    ];

    const dribbleRows: StatRowConfig[] = [
        { label: 'Dribbles tentés', value: v(stats.dribblesAttempts), max: maxOfArr(v(stats.dribblesAttempts)), color: BAR_BLUE },
        { label: 'Dribbles réussis', value: v(stats.dribblesSuccess), max: maxOfArr(v(stats.dribblesAttempts)), color: BAR_GREEN },
    ];

    const defenseRows: StatRowConfig[] = [
        { label: 'Tacles', value: v(stats.tackles), max: maxOfArr(v(stats.tackles), v(stats.interceptions), v(stats.blocks)), color: BAR_GREEN },
        { label: 'Interceptions', value: v(stats.interceptions), max: maxOfArr(v(stats.tackles), v(stats.interceptions)), color: BAR_GREEN },
        { label: 'Tirs bloqués', value: v(stats.blocks), max: maxOfArr(v(stats.tackles), v(stats.blocks)), color: BAR_ORANGE },
        { label: 'Duels gagnés', value: v(stats.duelsWon), max: maxOfArr(v(stats.duelsTotal)), color: BAR_GREEN },
        { label: 'Duels totaux', value: v(stats.duelsTotal), max: maxOfArr(v(stats.duelsTotal)), color: BAR_BLUE },
    ];

    const disciplineRows: StatRowConfig[] = [
        { label: 'Fautes commises', value: v(stats.foulsCommitted), max: maxOfArr(v(stats.foulsCommitted), v(stats.foulsDrawn)), color: BAR_ORANGE },
        { label: 'Fautes subies', value: v(stats.foulsDrawn), max: maxOfArr(v(stats.foulsCommitted), v(stats.foulsDrawn)), color: BAR_GREEN },
        { label: 'Dribbles subis', value: v(stats.dribblesBeaten), max: maxOfArr(v(stats.dribblesBeaten)), color: BAR_RED },
        { label: 'Cartons jaunes', value: v(stats.yellowCards), max: maxOfArr(v(stats.yellowCards), v(stats.redCards), 10), color: BAR_ORANGE },
        { label: 'Cartons rouges', value: v(stats.redCards), max: maxOfArr(v(stats.yellowCards), v(stats.redCards), 3), color: BAR_RED },
    ];

    // Goalkeeper section: only show if saves or goalsConceded are non-null
    const hasGoalkeeperStats = stats.saves !== null || stats.goalsConceded !== null;
    const gardienRows: StatRowConfig[] = hasGoalkeeperStats ? [
        { label: 'Arrêts', value: v(stats.saves), max: maxOfArr(v(stats.saves), v(stats.goalsConceded)), color: BAR_GREEN },
        { label: 'Buts encaissés', value: v(stats.goalsConceded), max: maxOfArr(v(stats.saves), v(stats.goalsConceded)), color: BAR_RED },
    ] : [];

    const penaltyRows: StatRowConfig[] = [
        { label: 'Pénaltys obtenus', value: v(stats.penaltiesWon), max: maxOfArr(v(stats.penaltiesWon), v(stats.penaltiesMissed), v(stats.penaltiesCommitted)), color: BAR_GREEN },
        { label: 'Pénaltys manqués', value: v(stats.penaltiesMissed), max: maxOfArr(v(stats.penaltiesWon), v(stats.penaltiesMissed)), color: BAR_RED },
        { label: 'Pénaltys commis', value: v(stats.penaltiesCommitted), max: maxOfArr(v(stats.penaltiesCommitted)), color: BAR_ORANGE },
    ];

    const renderSection = (title: string, rows: StatRowConfig[]) => {
        // If all values in section are null, skip
        const hasData = rows.some(r => r.value !== null);
        if (!hasData) { return null; }

        return (
            <>
                <Text style={styles.sectionTitle}>{title}</Text>
                {rows.map((row, idx) => (
                    <StatBar
                        key={`${title}-${idx}`}
                        label={row.label}
                        value={row.value}
                        maxValue={row.max}
                        barColor={row.color}
                    />
                ))}
            </>
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentPadding}>
            <Pressable
                testID="player-stats-season-dropdown"
                style={styles.dropdown}
                onPress={() => setIsSeasonModalOpen(true)}
            >
                <View style={styles.dropdownMetaRow}>
                    {leagueLogo ? (
                        <View style={styles.dropdownLeagueLogoWrap}>
                            <Image
                                testID="player-stats-league-logo"
                                source={{ uri: leagueLogo }}
                                style={styles.dropdownLeagueLogo}
                                resizeMode="contain"
                            />
                        </View>
                    ) : null}
                    <Text style={styles.dropdownText}>
                        {toDisplayValue(leagueName)} {resolvedSeasonText}
                    </Text>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={24} color={colors.textMuted} />
            </Pressable>

            <Modal
                visible={isSeasonModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsSeasonModalOpen(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setIsSeasonModalOpen(false)}>
                    <Pressable style={styles.modalContent} onPress={event => event.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalHeaderText}>{t('teamDetails.filters.season')}</Text>
                        </View>
                        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                            {seasons.map(season => {
                                const isActive = season === selectedSeason;
                                return (
                                    <Pressable
                                        key={`season-${season}`}
                                        testID={`player-stats-season-option-${season}`}
                                        style={[styles.modalRow, isActive ? styles.modalRowActive : null]}
                                        onPress={() => {
                                            onSelectSeason(season);
                                            setIsSeasonModalOpen(false);
                                        }}
                                    >
                                        <Text style={[styles.modalRowText, isActive ? styles.modalRowTextActive : null]}>
                                            {toSeasonLabel(season)}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Summary Card */}
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

            {/* Shot Map */}
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

            {/* Performances de la saison */}
            <View style={styles.card}>
                <View style={styles.perfHeader}>
                    <View>
                        <Text style={styles.perfTitle}>Performances de la saison</Text>
                        <Text style={styles.perfSubtitle}>Statistiques détaillées</Text>
                    </View>
                </View>

                {/* Toggle Total / Par 90 min */}
                <View style={styles.toggleRow}>
                    <Pressable
                        style={[styles.toggleButton, mode === 'total' && styles.toggleButtonActive]}
                        onPress={() => setMode('total')}
                    >
                        <Text style={[styles.toggleText, mode === 'total' && styles.toggleTextActive]}>
                            Total
                        </Text>
                    </Pressable>
                    <Pressable
                        style={[styles.toggleButton, mode === 'per90' && styles.toggleButtonActive]}
                        onPress={() => setMode('per90')}
                    >
                        <Text style={[styles.toggleText, mode === 'per90' && styles.toggleTextActive]}>
                            Par 90 min
                        </Text>
                    </Pressable>
                </View>

                {renderSection('Tir', tirRows)}
                {renderSection('Passe', passeRows)}
                {renderSection('Dribbles', dribbleRows)}
                {renderSection('Défense', defenseRows)}
                {renderSection('Discipline', disciplineRows)}
                {gardienRows.length > 0 && renderSection('Gardien', gardienRows)}
                {renderSection('Penalty', penaltyRows)}
            </View>

        </ScrollView>
    );
}
