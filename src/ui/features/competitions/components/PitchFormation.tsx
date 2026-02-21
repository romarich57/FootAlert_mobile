import { useMemo } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { TotwPlayer } from '../hooks/useCompetitionTotw';

type PitchFormationProps = {
    players: TotwPlayer[];
};

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            width: '100%',
            aspectRatio: 0.65, // Standard football pitch ratio
            backgroundColor: '#1E4620', // Classic dark green pitch
            borderRadius: 12,
            borderWidth: 2,
            borderColor: colors.surfaceElevated,
            overflow: 'hidden',
            position: 'relative',
        },
        pitchLines: {
            ...StyleSheet.absoluteFillObject,
        },
        centerCircle: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 80,
            height: 80,
            marginTop: -40,
            marginLeft: -40,
            borderRadius: 40,
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.4)',
        },
        centerLine: {
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 1.5,
            backgroundColor: 'rgba(255,255,255,0.4)',
        },
        penaltyAreaTop: {
            position: 'absolute',
            top: 0,
            left: '25%',
            right: '25%',
            height: '15%',
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.4)',
            borderTopWidth: 0,
        },
        penaltyAreaBottom: {
            position: 'absolute',
            bottom: 0,
            left: '25%',
            right: '25%',
            height: '15%',
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.4)',
            borderBottomWidth: 0,
        },
        goalAreaTop: {
            position: 'absolute',
            top: 0,
            left: '38%',
            right: '38%',
            height: '6%',
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.4)',
            borderTopWidth: 0,
        },
        goalAreaBottom: {
            position: 'absolute',
            bottom: 0,
            left: '38%',
            right: '38%',
            height: '6%',
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.4)',
            borderBottomWidth: 0,
        },
        playerDotNode: {
            position: 'absolute',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44, // 40 base + 4 padding
            // We center it around the gridX, gridY coordinates
            marginLeft: -22,
            marginTop: -30,
        },
        playerAvatarContainer: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.surface,
            borderWidth: 1.5,
            borderColor: colors.primary,
            overflow: 'hidden',
            marginBottom: 2,
        },
        playerAvatar: {
            width: '100%',
            height: '100%',
        },
        playerNameWrapper: {
            backgroundColor: 'rgba(0,0,0,0.6)',
            paddingHorizontal: 4,
            paddingVertical: 1,
            borderRadius: 4,
        },
        playerName: {
            color: '#fff',
            fontSize: 9,
            fontWeight: '600',
        },
        playerRatingBadge: {
            position: 'absolute',
            top: -6,
            right: 0,
            backgroundColor: colors.primary,
            paddingHorizontal: 4,
            paddingVertical: 1,
            borderRadius: 4,
            borderWidth: 1,
            borderColor: '#000',
        },
        playerRatingText: {
            color: '#000',
            fontSize: 9,
            fontWeight: '800',
        }
    });
}

function displayValue(value: string | null | undefined): string {
    return value && value.trim().length > 0 ? value : '?';
}

export function PitchFormation({ players }: PitchFormationProps) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.container}>
            {/* Pitch Markings */}
            <View style={styles.pitchLines}>
                <View style={styles.centerCircle} />
                <View style={styles.centerLine} />
                <View style={styles.penaltyAreaTop} />
                <View style={styles.penaltyAreaBottom} />
                <View style={styles.goalAreaTop} />
                <View style={styles.goalAreaBottom} />
            </View>

            {/* Players */}
            {players.map((player) => (
                <View
                    key={player.id}
                    style={[
                        styles.playerDotNode,
                        {
                            left: `${player.gridX * 100}%`,
                            top: `${player.gridY * 100}%`
                        }
                    ]}
                >
                    <View style={styles.playerAvatarContainer}>
                        <Image
                            source={{ uri: player.photo ?? undefined }}
                            style={styles.playerAvatar}
                        />
                    </View>
                    <View style={styles.playerRatingBadge}>
                        <Text style={styles.playerRatingText}>{player.rating}</Text>
                    </View>
                    <View style={styles.playerNameWrapper}>
                        <Text style={styles.playerName} numberOfLines={1}>
                            {displayValue(player.name).split(' ').pop()} {/* Show last name */}
                        </Text>
                    </View>
                </View>
            ))}
        </View>
    );
}
