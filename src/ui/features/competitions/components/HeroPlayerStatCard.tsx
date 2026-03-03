import { useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { AppPressable } from '@ui/shared/components';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { CompetitionPlayerStat } from '../types/competitions.types';

type HeroPlayerStatCardProps = {
    playerStat: CompetitionPlayerStat;
    statValue: string | number;
    statLabel: string;
    rank?: number;
    onPressPlayer?: (playerId: string) => void;
    onPressTeam?: (teamId: string) => void;
};

function displayValue(value: string | number | null | undefined): string | number {
    return value !== null && value !== undefined && value !== '' ? value : '';
}

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.primary, // Highlight border
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 4,
            position: 'relative',
        },
        rankBadge: {
            position: 'absolute',
            top: -10,
            left: 16,
            backgroundColor: colors.primary,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
            zIndex: 1,
        },
        rankText: {
            color: '#000', // Hardcoded black for neon background
            fontWeight: '900',
            fontSize: 14,
        },
        photoContainer: {
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.background,
            overflow: 'hidden',
            marginRight: 16,
            borderWidth: 2,
            borderColor: colors.surfaceElevated,
        },
        photo: {
            width: '100%',
            height: '100%',
        },
        detailsContainer: {
            flex: 1,
            justifyContent: 'center',
        },
        name: {
            color: colors.text,
            fontSize: 20,
            fontWeight: '800',
            marginBottom: 4,
        },
        teamRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 8,
        },
        teamLogo: {
            width: 16,
            height: 16,
            marginRight: 6,
        },
        teamName: {
            color: colors.textMuted,
            fontSize: 14,
            fontWeight: '500',
        },
        statContainer: {
            alignItems: 'flex-end',
            justifyContent: 'center',
            paddingLeft: 12,
            borderLeftWidth: 1,
            borderLeftColor: colors.surfaceElevated,
        },
        statValue: {
            color: colors.primary,
            fontSize: 32,
            fontWeight: '900',
            lineHeight: 36,
        },
        statLabel: {
            color: colors.textMuted,
            fontSize: 12,
            fontWeight: '600',
            textTransform: 'uppercase',
        }
    });
}

export function HeroPlayerStatCard({
    playerStat,
    statValue,
    statLabel,
    rank = 1,
    onPressPlayer,
    onPressTeam,
}: HeroPlayerStatCardProps) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.container}>
            {rank && (
                <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{rank}</Text>
                </View>
            )}

            <View style={styles.photoContainer}>
                {onPressPlayer ? (
                    <AppPressable
                        onPress={() => onPressPlayer(String(playerStat.playerId))}
                        accessibilityRole="button"
                        accessibilityLabel={String(displayValue(playerStat.playerName))}
                    >
                        <Image
                            source={{ uri: playerStat.playerPhoto ?? undefined }}
                            style={styles.photo}
                            resizeMode="cover"
                        />
                    </AppPressable>
                ) : (
                    <Image
                        source={{ uri: playerStat.playerPhoto ?? undefined }}
                        style={styles.photo}
                        resizeMode="cover"
                    />
                )}
            </View>

            <View style={styles.detailsContainer}>
                {onPressPlayer ? (
                    <AppPressable
                        onPress={() => onPressPlayer(String(playerStat.playerId))}
                        accessibilityRole="button"
                        accessibilityLabel={String(displayValue(playerStat.playerName))}
                    >
                        <Text style={styles.name} numberOfLines={1}>{displayValue(playerStat.playerName)}</Text>
                    </AppPressable>
                ) : (
                    <Text style={styles.name} numberOfLines={1}>{displayValue(playerStat.playerName)}</Text>
                )}
                <View style={styles.teamRow}>
                    {playerStat.teamLogo && (
                        <Image
                            source={{ uri: playerStat.teamLogo }}
                            style={styles.teamLogo}
                            resizeMode="contain"
                        />
                    )}
                    {onPressTeam ? (
                        <AppPressable
                            onPress={() => onPressTeam(String(playerStat.teamId))}
                            accessibilityRole="button"
                            accessibilityLabel={String(displayValue(playerStat.teamName))}
                        >
                            <Text style={styles.teamName} numberOfLines={1}>{displayValue(playerStat.teamName)}</Text>
                        </AppPressable>
                    ) : (
                        <Text style={styles.teamName} numberOfLines={1}>{displayValue(playerStat.teamName)}</Text>
                    )}
                </View>
            </View>

            <View style={styles.statContainer}>
                <Text style={styles.statValue}>{displayValue(statValue)}</Text>
                <Text style={styles.statLabel}>{statLabel}</Text>
            </View>
        </View>
    );
}
