import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { PlayerMatchPerformance } from '@ui/features/players/types/players.types';
import { toDisplayValue } from '@ui/features/players/utils/playerDisplay';

type PlayerMatchesTabProps = {
    matches: PlayerMatchPerformance[];
    onPressMatch?: (fixtureId: string) => void;
};

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        listContent: {
            paddingHorizontal: 20,
            paddingVertical: 16,
            paddingBottom: 40,
        },
        matchRow: {
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        headerRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
        },
        dateText: {
            color: colors.textMuted,
            fontSize: 12,
            fontWeight: '500',
        },
        competitionRow: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceElevated,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
        },
        compName: {
            color: colors.textMuted,
            fontSize: 10,
            fontWeight: '700',
            textTransform: 'uppercase',
        },
        mainContentRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        opponentCol: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
            gap: 12,
        },
        teamLogo: {
            width: 32,
            height: 32,
            borderRadius: 16,
        },
        opponentInfo: {
            justifyContent: 'center',
        },
        teamName: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '600',
        },
        scoreText: {
            color: colors.textMuted,
            fontSize: 14,
            marginTop: 4,
            fontWeight: '500',
        },
        statsCol: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        iconsRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
        },
        minutesBox: {
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
            minWidth: 40,
            alignItems: 'center',
        },
        minutesText: {
            color: colors.text,
            fontSize: 12,
            fontWeight: '600',
        },
        ratingBox: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            minWidth: 44,
            backgroundColor: `${colors.primary}90`,
        },
        ratingHigh: {
            backgroundColor: '#3B82F6', // Blue for good ratings
        },
        ratingLow: {
            backgroundColor: '#F59E0B', // Orange for lower ratings
        },
        ratingNone: {
            backgroundColor: colors.surfaceElevated,
        },
        ratingText: {
            fontSize: 14,
            fontWeight: '700',
        },
        ratingTextTinted: {
            color: colors.background,
        },
        ratingTextMuted: {
            color: colors.textMuted,
        },
        yellowCard: {
            width: 12,
            height: 16,
            backgroundColor: '#FBBF24',
            borderRadius: 2,
        },
        redCard: {
            width: 12,
            height: 16,
            backgroundColor: '#EF4444',
            borderRadius: 2,
        },
        secondYellowCard: {
            width: 12,
            height: 16,
            flexDirection: 'row',
            borderRadius: 2,
            overflow: 'hidden',
        },
        secondYellowLeft: {
            flex: 1,
            backgroundColor: '#FBBF24',
        },
        secondYellowRight: {
            flex: 1,
            backgroundColor: '#EF4444',
        },
    });
}

export function PlayerMatchesTab({ matches, onPressMatch }: PlayerMatchesTabProps) {
    const { colors } = useAppTheme();
    const { i18n } = useTranslation();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const locale = i18n.language.startsWith('fr') ? 'fr-FR' : 'en-US';

    const renderItem = useCallback(
        ({ item }: ListRenderItemInfo<PlayerMatchPerformance>) => {
            const { competition, homeTeam, awayTeam, goalsHome, goalsAway, date, playerStats, playerTeamId } = item;

            // Determine opponent
            const isHome = playerTeamId === homeTeam.id;
            const opponentTeam = isHome ? awayTeam : homeTeam;

            // Format score as "homeGoals - awayGoals" always, to match UI consistency, 
            // or maybe "playerTeamGoals - opponentGoals"? Usually it is home - away in UI unless specified.
            // On mockup: "Tottenham 1 - 4" where Tottenham is opponent. Real life Tottenham 1-4 Arsenal. So it's home - away.
            const scoreDisplay = `${goalsHome ?? '-'} - ${goalsAway ?? '-'}`;

            const ratingVal = playerStats.rating ? Number.parseFloat(playerStats.rating) : NaN;
            let ratingStyle = styles.ratingNone;
            let ratingTextStyle = styles.ratingTextMuted;
            if (!isNaN(ratingVal)) {
                if (ratingVal >= 7.0) {
                    ratingStyle = styles.ratingHigh;
                } else {
                    ratingStyle = styles.ratingLow;
                }
                ratingTextStyle = styles.ratingTextTinted;
            }

            const dateObj = new Date(date ?? '');
            const dateString = Number.isNaN(dateObj.getTime())
                ? ''
                : dateObj.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });

            // Generate Match Icons
            const matchIcons: React.ReactNode[] = [];

            // Goals
            const goals = typeof playerStats.goals === 'number' ? playerStats.goals : 0;
            for (let i = 0; i < goals; i++) {
                matchIcons.push(<MaterialCommunityIcons key={`goal-${item.fixtureId}-${i}`} name="soccer" size={16} color={colors.text} />);
            }

            // Assists
            const assists = typeof playerStats.assists === 'number' ? playerStats.assists : 0;
            for (let i = 0; i < assists; i++) {
                matchIcons.push(<MaterialCommunityIcons key={`assist-${item.fixtureId}-${i}`} name="shoe-cleat" size={16} color={colors.text} />);
            }

            // Yellow Cards
            if (playerStats.yellowCards && playerStats.yellowCards > 0) {
                matchIcons.push(<View key={`yc-${item.fixtureId}`} style={styles.yellowCard} />);
            }
            // Second Yellow
            if (playerStats.secondYellowCards && playerStats.secondYellowCards > 0) {
                matchIcons.push(
                    <View key={`syc-${item.fixtureId}`} style={styles.secondYellowCard}>
                        <View style={styles.secondYellowLeft} />
                        <View style={styles.secondYellowRight} />
                    </View>
                );
            }
            // Red Cards
            if (playerStats.redCards && playerStats.redCards > 0) {
                matchIcons.push(<View key={`rc-${item.fixtureId}`} style={styles.redCard} />);
            }

            // Saves / Penalties Stopped
            const saves = typeof playerStats.saves === 'number' ? playerStats.saves : 0;
            const penSaved = typeof playerStats.penaltiesSaved === 'number' ? playerStats.penaltiesSaved : 0;
            const totalSaves = saves + penSaved;
            for (let i = 0; i < totalSaves; i++) {
                matchIcons.push(<MaterialCommunityIcons key={`save-${item.fixtureId}-${i}`} name="hand-back-right" size={16} color={colors.text} />);
            }

            // Penalties Missed
            const penMissed = typeof playerStats.penaltiesMissed === 'number' ? playerStats.penaltiesMissed : 0;
            for (let i = 0; i < penMissed; i++) {
                matchIcons.push(<MaterialCommunityIcons key={`pmiss-${item.fixtureId}-${i}`} name="close-box-outline" size={16} color="#EF4444" />);
            }

            return (
                <Pressable
                    style={styles.matchRow}
                    onPress={() => onPressMatch && onPressMatch(item.fixtureId)}
                >
                    <View style={styles.headerRow}>
                        <Text style={styles.dateText}>{dateString}</Text>
                        <View style={styles.competitionRow}>
                            <Text style={styles.compName}>{toDisplayValue(competition.name)}</Text>
                        </View>
                    </View>

                    <View style={styles.mainContentRow}>
                        <View style={styles.opponentCol}>
                            {opponentTeam.logo ? (
                                <Image source={{ uri: opponentTeam.logo }} style={styles.teamLogo} resizeMode="contain" />
                            ) : (
                                <View style={[styles.teamLogo, { backgroundColor: colors.surfaceElevated }]} />
                            )}
                            <View style={styles.opponentInfo}>
                                <Text style={styles.teamName} numberOfLines={1}>
                                    {toDisplayValue(opponentTeam.name)}
                                </Text>
                                <Text style={styles.scoreText}>{scoreDisplay}</Text>
                            </View>
                        </View>

                        <View style={styles.statsCol}>
                            {matchIcons.length > 0 && (
                                <View style={styles.iconsRow}>
                                    {matchIcons}
                                </View>
                            )}

                            {playerStats.minutes != null && (
                                <View style={styles.minutesBox}>
                                    <Text style={styles.minutesText}>{playerStats.minutes}'</Text>
                                </View>
                            )}

                            <View style={[styles.ratingBox, ratingStyle]}>
                                <Text style={[styles.ratingText, ratingTextStyle]}>
                                    {!isNaN(ratingVal) ? toDisplayValue(playerStats.rating) : '-'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </Pressable>
            );
        },
        [colors, locale, onPressMatch, styles]
    );

    return (
        <View style={styles.container}>
            <FlashList
                data={matches}
                keyExtractor={(item) => item.fixtureId}
                renderItem={renderItem}
                // @ts-ignore FlashList runtime supports estimatedItemSize.
                estimatedItemSize={118}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}
