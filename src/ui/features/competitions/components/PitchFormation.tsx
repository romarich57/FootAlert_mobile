import { useMemo } from 'react';
import { View, StyleSheet, Text, Image, type ViewStyle } from 'react-native';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { AppPressable } from '@ui/shared/components';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { CompetitionTotwPlayer } from '../types/competitions.types';

type PitchFormationProps = {
    players: CompetitionTotwPlayer[];
    onPressPlayer?: (playerId: string) => void;
};

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            width: '100%',
            aspectRatio: 0.63,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: '#193726',
            overflow: 'hidden',
            position: 'relative',
        },
        pitchOverlay: {
            ...StyleSheet.absoluteFillObject,
        },
        stripe: {
            position: 'absolute',
            left: 0,
            right: 0,
            height: '10%',
            backgroundColor: 'rgba(255,255,255,0.03)',
        },
        centerLine: {
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            height: 1.5,
            backgroundColor: 'rgba(255,255,255,0.18)',
        },
        centerCircle: {
            position: 'absolute',
            width: 96,
            height: 96,
            borderRadius: 48,
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.18)',
            top: '50%',
            left: '50%',
            marginTop: -48,
            marginLeft: -48,
        },
        penaltyTop: {
            position: 'absolute',
            top: 0,
            left: '26%',
            right: '26%',
            height: '18%',
            borderWidth: 1.5,
            borderTopWidth: 0,
            borderColor: 'rgba(255,255,255,0.18)',
        },
        penaltyBottom: {
            position: 'absolute',
            bottom: 0,
            left: '26%',
            right: '26%',
            height: '18%',
            borderWidth: 1.5,
            borderBottomWidth: 0,
            borderColor: 'rgba(255,255,255,0.18)',
        },
        playerNode: {
            position: 'absolute',
            width: 86,
            alignItems: 'center',
            gap: 3,
        },
        avatarWrap: {
            width: 46,
            height: 46,
            borderRadius: 23,
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.26)',
            backgroundColor: 'rgba(12,19,16,0.9)',
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatar: {
            width: '100%',
            height: '100%',
        },
        avatarFallback: {
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: '900',
        },
        ratingBadge: {
            position: 'absolute',
            top: -6,
            right: -6,
            borderRadius: 10,
            minWidth: 35,
            paddingHorizontal: 6,
            paddingVertical: 1,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#0f1611',
        },
        ratingText: {
            color: '#07120C',
            fontSize: 11,
            fontWeight: '900',
        },
        nameChip: {
            maxWidth: 82,
            borderRadius: 8,
            paddingHorizontal: 6,
            paddingVertical: 2,
            backgroundColor: 'rgba(10,13,12,0.58)',
        },
        nameText: {
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: '700',
            textAlign: 'center',
        },
    });
}

function resolveRatingBackground(rating: number): string {
    if (rating >= 8.5) {
        return '#24E087';
    }
    if (rating >= 7.5) {
        return '#6BEAAB';
    }
    return '#D2D6D4';
}

function shortPlayerName(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }
    const parts = trimmed.split(/\s+/);
    return parts[parts.length - 1] ?? trimmed;
}

function toInitials(value: string): string {
    const tokens = value.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
        return '?';
    }
    const first = tokens[0]?.[0] ?? '';
    const second = tokens[1]?.[0] ?? '';
    const initials = `${first}${second}`.trim().toUpperCase();
    return initials || tokens[0].slice(0, 2).toUpperCase();
}

export function PitchFormation({ players, onPressPlayer }: PitchFormationProps) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.container}>
            <View style={styles.pitchOverlay}>
                {[0, 20, 40, 60, 80].map(top => (
                    <View key={`stripe-${top}`} style={[styles.stripe, { top: `${top}%` }]} />
                ))}
                <View style={styles.centerLine} />
                <View style={styles.centerCircle} />
                <View style={styles.penaltyTop} />
                <View style={styles.penaltyBottom} />
            </View>

            {players.map(player => {
                const nodeStyle = [
                    styles.playerNode,
                    {
                        left: `${player.gridX}%`,
                        top: `${player.gridY}%`,
                        transform: [{ translateX: -43 }, { translateY: -34 }],
                    } as ViewStyle,
                ];

                const content = (
                    <>
                        <View style={styles.avatarWrap}>
                            {player.playerPhoto ? (
                                <Image source={{ uri: player.playerPhoto }} style={styles.avatar} />
                            ) : (
                                <Text style={styles.avatarFallback}>{toInitials(player.playerName)}</Text>
                            )}
                        </View>

                        <View
                            testID="competition-totw-rating-badge"
                            style={[styles.ratingBadge, { backgroundColor: resolveRatingBackground(player.rating) }]}
                        >
                            <Text style={styles.ratingText}>{player.rating.toFixed(1)}</Text>
                        </View>

                        <View style={styles.nameChip}>
                            <Text numberOfLines={1} style={styles.nameText}>
                                {shortPlayerName(player.playerName)}
                            </Text>
                        </View>
                    </>
                );

                if (onPressPlayer) {
                    return (
                        <AppPressable
                            key={player.playerId}
                            testID="competition-totw-player-node"
                            style={nodeStyle}
                            onPress={() => onPressPlayer(String(player.playerId))}
                            accessibilityRole="button"
                            accessibilityLabel={player.playerName}
                        >
                            {content}
                        </AppPressable>
                    );
                }

                return (
                    <View key={player.playerId} testID="competition-totw-player-node" style={nodeStyle}>
                        {content}
                    </View>
                );
            })}
        </View>
    );
}
