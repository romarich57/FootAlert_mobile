import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

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
            paddingVertical: 24,
            paddingBottom: 40,
        },
        headerRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
        },
        title: {
            color: colors.textMuted,
            fontSize: 14,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        filterText: {
            color: colors.primary,
            fontSize: 14,
            fontWeight: '600',
        },
        card: {
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
        },
        cardHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
        },
        competitionRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        compLogo: {
            width: 20,
            height: 20,
            borderRadius: 10,
        },
        compName: {
            color: colors.textMuted,
            fontSize: 12,
            fontWeight: '600',
            textTransform: 'uppercase',
        },
        dateText: {
            color: colors.textMuted,
            fontSize: 12,
        },
        scoreRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
        },
        teamName: {
            color: colors.text,
            fontSize: 18,
            fontWeight: '700',
            flex: 1,
        },
        teamNameRight: {
            textAlign: 'right',
        },
        scoreBox: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 12,
        },
        scoreText: {
            color: colors.text,
            fontSize: 20,
            fontWeight: '800',
        },
        scoreDivider: {
            color: colors.textMuted,
            fontSize: 18,
        },
        statsContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        badgesRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        badge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
        },
        badgeText: {
            color: colors.textMuted,
            fontSize: 13,
        },
        ratingBox: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: `${colors.primary}60`,
        },
        ratingHigh: {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
        },
        ratingLow: {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
        },
        ratingTextHigh: {
            color: colors.background,
            fontSize: 18,
            fontWeight: '800',
        },
        ratingTextLow: {
            color: colors.text,
            fontSize: 18,
            fontWeight: '800',
        },
        ratingLabel: {
            fontSize: 10,
            fontWeight: '700',
            textTransform: 'uppercase',
        },
    });
}

export function PlayerMatchesTab({ matches, onPressMatch }: PlayerMatchesTabProps) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const renderItem = useCallback(
        ({ item }: ListRenderItemInfo<PlayerMatchPerformance>) => {
            const { competition, homeTeam, awayTeam, goalsHome, goalsAway, date, playerStats } = item;

            const ratingVal = playerStats.rating ? Number.parseFloat(playerStats.rating) : NaN;
            const isHighRating = !isNaN(ratingVal) && ratingVal >= 7.0;

            const dateObj = new Date(date ?? '');
            const dateString = Number.isNaN(dateObj.getTime())
                ? '?'
                : dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

            // Build badges only from available API values
            const icons = [];
            if (typeof playerStats.goals === 'number' && playerStats.goals > 0) {
                icons.push({
                    icon: 'soccer',
                    text: `${playerStats.goals} But${playerStats.goals > 1 ? 's' : ''}`,
                    color: colors.primary,
                });
            }
            if (typeof playerStats.assists === 'number' && playerStats.assists > 0) {
                icons.push({
                    icon: 'shoe-cleat',
                    text: `${playerStats.assists} Passe${playerStats.assists > 1 ? 's' : ''}`,
                    color: colors.primary,
                });
            }
            if (typeof playerStats.yellowCards === 'number' && playerStats.yellowCards > 0) {
                icons.push({ icon: 'card', text: 'Carton Jaune', color: '#FFD700' });
            }
            if (typeof playerStats.redCards === 'number' && playerStats.redCards > 0) {
                icons.push({ icon: 'card', text: 'Carton Rouge', color: colors.danger });
            }
            icons.push({ icon: 'clock-outline', text: `${toDisplayValue(playerStats.minutes)}'`, color: colors.textMuted });

            return (
                <Pressable
                    style={styles.card}
                    onPress={() => onPressMatch && onPressMatch(item.fixtureId)}
                >
                    <View style={styles.cardHeader}>
                        <View style={styles.competitionRow}>
                            {competition.logo ? (
                                <Image source={{ uri: competition.logo ?? undefined }} style={styles.compLogo} />
                            ) : (
                                <MaterialCommunityIcons name="trophy-outline" size={16} color={colors.primary} />
                            )}
                            <Text style={styles.compName}>{toDisplayValue(competition.name)}</Text>
                        </View>
                        <Text style={styles.dateText}>{dateString}</Text>
                    </View>

                    <View style={styles.scoreRow}>
                        <Text style={styles.teamName} numberOfLines={1}>{toDisplayValue(homeTeam.name)}</Text>
                        <View style={styles.scoreBox}>
                            <Text style={styles.scoreText}>{toDisplayValue(goalsHome)}</Text>
                            <Text style={styles.scoreDivider}>-</Text>
                            <Text style={styles.scoreText}>{toDisplayValue(goalsAway)}</Text>
                        </View>
                        <Text style={[styles.teamName, styles.teamNameRight]} numberOfLines={1}>
                            {toDisplayValue(awayTeam.name)}
                        </Text>
                    </View>

                    <View style={styles.statsContainer}>
                        <View style={styles.badgesRow}>
                            {icons.map((itemBadge, idx) => (
                                <View key={idx} style={styles.badge}>
                                    <MaterialCommunityIcons name={itemBadge.icon} size={16} color={itemBadge.color} />
                                    <Text style={styles.badgeText}>{itemBadge.text}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={[styles.ratingBox, isHighRating ? styles.ratingHigh : styles.ratingLow]}>
                            <Text style={isHighRating ? styles.ratingTextHigh : styles.ratingTextLow}>
                                {toDisplayValue(playerStats.rating)}
                            </Text>
                            <Text style={[styles.ratingLabel, { color: isHighRating ? `${colors.background}99` : colors.textMuted }]}>NOTE</Text>
                        </View>
                    </View>
                </Pressable>
            );
        },
        [colors, onPressMatch, styles]
    );

    return (
        <View style={styles.container}>
            <FlashList
                data={matches}
                keyExtractor={(item) => item.fixtureId}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <View style={styles.headerRow}>
                        <Text style={styles.title}>Matchs Récents</Text>
                        <Text style={styles.filterText}>Filtres</Text>
                    </View>
                }
            />
        </View>
    );
}
