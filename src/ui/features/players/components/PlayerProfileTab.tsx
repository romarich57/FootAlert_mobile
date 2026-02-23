import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { PlayerCharacteristics, PlayerProfile, PlayerSeasonStats } from '@ui/features/players/types/players.types';
import { toDisplayValue, toHeightValue } from '@ui/features/players/utils/playerDisplay';
import { RadarChart } from './RadarChart';

type PlayerProfileTabProps = {
    profile: PlayerProfile;
    stats: PlayerSeasonStats | null;
    characteristics: PlayerCharacteristics | null;
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
        numberBadgeContainer: {
            backgroundColor: `${colors.primary}20`,
            padding: 8,
            paddingHorizontal: 12,
            borderWidth: 0,
            alignSelf: 'flex-start',
            marginBottom: 6,
        },
        transferValueContainer: {
            alignItems: 'flex-end',
        },
        seasonTitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
        },
        seasonLogoPlaceholder: {
            width: 32,
            height: 32,
            backgroundColor: colors.surfaceElevated,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
        },
        seasonMetaContainer: {
            flex: 1,
        },
        seasonRatingBadge: {
            backgroundColor: colors.primary,
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 12,
        },
        seasonRatingText: {
            color: colors.background,
            fontWeight: '800',
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

type PlayerProfileTabStyles = ReturnType<typeof createStyles>;

type InfoBlockProps = {
    label: string;
    value: string | number | null | undefined;
    unit?: string;
    styles: PlayerProfileTabStyles;
};

function InfoBlock({ label, value, unit, styles }: InfoBlockProps) {
    return (
        <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>{label}</Text>
            <View style={styles.infoValueRow}>
                <Text style={styles.infoValue}>{toDisplayValue(value)}</Text>
                {unit && <Text style={styles.infoUnit}>{unit}</Text>}
            </View>
        </View>
    );
}

export function PlayerProfileTab({ profile, stats, characteristics }: PlayerProfileTabProps) {
    const { colors } = useAppTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const seasonStart = profile.league.season;
    const seasonLabel = typeof seasonStart === 'number'
        ? t('playerDetails.profile.labels.season', {
            start: seasonStart,
            end: seasonStart + 1,
        })
        : '';

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentPadding}>

            {/* Physical Info */}
            <View style={styles.row}>
                <InfoBlock
                    label={t('playerDetails.profile.labels.height')}
                    value={toHeightValue(profile.height)}
                    unit={t('playerDetails.profile.units.centimeters')}
                    styles={styles}
                />
                <InfoBlock
                    label={t('playerDetails.profile.labels.age')}
                    value={profile.age}
                    unit={t('playerDetails.profile.units.years')}
                    styles={styles}
                />
                <InfoBlock
                    label={t('playerDetails.profile.labels.country')}
                    value={profile.nationality ? profile.nationality.substring(0, 3).toUpperCase() : null}
                    styles={styles}
                />
            </View>

            {/* Extra Info */}
            <View style={styles.largeBlock}>
                <View style={styles.largeBlockRow}>
                    <View>
                        <View style={styles.numberBadgeContainer}>
                            <Text style={styles.largeValueGreen}>{toDisplayValue(profile.number)}</Text>
                        </View>
                    </View>
                    <View>
                        <Text style={styles.largeBlockLabel}>{t('playerDetails.profile.labels.dominantFoot')}</Text>
                        <Text style={styles.largeBlockValue}>{toDisplayValue(profile.foot)}</Text>
                    </View>
                    <View style={styles.transferValueContainer}>
                        <Text style={styles.largeBlockLabel}>{t('playerDetails.profile.labels.marketValue')}</Text>
                        <Text style={styles.largeValueGreen}>{toDisplayValue(profile.transferValue)}</Text>
                    </View>
                </View>
            </View>

            {/* Season Stats Summary */}
            <View style={styles.largeBlock}>
                <View style={styles.seasonTitleRow}>
                    <View style={styles.seasonLogoPlaceholder}>
                        {/* Placeholder for league logo */}
                    </View>
                    <View style={styles.seasonMetaContainer}>
                        <Text style={styles.seasonTitle}>{toDisplayValue(profile.league.name)}</Text>
                        <Text style={styles.largeBlockLabel}>{seasonLabel}</Text>
                    </View>
                    <View style={styles.seasonRatingBadge}>
                        <Text style={styles.seasonRatingText}>{toDisplayValue(stats?.rating)}</Text>
                    </View>
                </View>

                <View style={styles.statsGrid}>
                    <View style={styles.statCol}>
                        <Text style={styles.statLabel}>{t('playerDetails.profile.labels.matches')}</Text>
                        <Text style={styles.statValue}>{toDisplayValue(stats?.matches)}</Text>
                    </View>
                    <View style={styles.statCol}>
                        <Text style={styles.statLabel}>{t('playerDetails.profile.labels.goals')}</Text>
                        <Text style={styles.statValue}>{toDisplayValue(stats?.goals)}</Text>
                    </View>
                    <View style={styles.statCol}>
                        <Text style={styles.statLabel}>{t('playerDetails.profile.labels.assists')}</Text>
                        <Text style={styles.statValue}>{toDisplayValue(stats?.assists)}</Text>
                    </View>
                </View>
            </View>

            {/* Characteristics / Radar Chart */}
            <View style={styles.largeBlock}>
                <Text style={styles.sectionTitle}>{t('playerDetails.profile.labels.characteristics')}</Text>
                <RadarChart
                    data={
                        characteristics ?? {
                            touches: null,
                            dribbles: null,
                            chances: null,
                            defense: null,
                            duels: null,
                            attack: null,
                        }
                    }
                    size={280}
                />
            </View>

        </ScrollView>
    );
}
