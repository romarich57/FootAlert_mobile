import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Rect, Path, Circle } from 'react-native-svg';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

type Shot = {
    x: number; // 0 to 100 (horizontal percent)
    y: number; // 0 to 100 (vertical percent)
    isGoal?: boolean;
};

type ShotMapProps = {
    shots: Shot[]; // Expecting dummy shots for now as API-Football doesn't provide granular shot x/y coords
    accuracy: string;
};

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            paddingBottom: 20,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            marginBottom: 16,
        },
        title: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        badge: {
            backgroundColor: `${colors.primary}30`,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
        },
        badgeText: {
            color: colors.primary,
            fontSize: 14,
            fontWeight: '600',
        },
        pitchContainer: {
            alignItems: 'center',
            justifyContent: 'center',
        },
    });
}

export function ShotMap({ shots, accuracy }: ShotMapProps) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const pitchWidth = 320;
    const pitchHeight = 200; // Half pitch

    const accuracyLabel = accuracy === '?' ? '?' : `${accuracy}%`;
    const renderedShots = useMemo(() => {
        const occurrences = new Map<string, number>();
        return shots.map(shot => {
            const baseKey = `${shot.x}-${shot.y}-${shot.isGoal ? 'goal' : 'shot'}`;
            const occurrence = (occurrences.get(baseKey) ?? 0) + 1;
            occurrences.set(baseKey, occurrence);

            return {
                key: `shot-${baseKey}-${occurrence}`,
                shot,
            };
        });
    }, [shots]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>CARTE DES TIRS DE LA SAISON</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{accuracyLabel} précision</Text>
                </View>
            </View>

            <View style={styles.pitchContainer}>
                <Svg width={pitchWidth} height={pitchHeight} viewBox="0 0 100 60">
                    {/* Pitch background */}
                    <Rect x="0" y="0" width="100" height="60" fill="transparent" />

                    {/* Pitch lines */}
                    <Rect x="2" y="-10" width="96" height="70" stroke={colors.border} strokeWidth="0.5" fill="none" />
                    {/* Penalty box */}
                    <Rect x="18" y="0" width="64" height="20" stroke={colors.border} strokeWidth="0.5" fill="none" />
                    {/* 6 yard box */}
                    <Rect x="36" y="0" width="28" height="6" stroke={colors.border} strokeWidth="0.5" fill="none" />
                    {/* Penalty spot */}
                    <Circle cx="50" cy="14" r="0.5" fill={colors.border} />
                    {/* D circle arc (mocked) */}
                    <Path d="M 38 20 A 12 12 0 0 0 62 20" stroke={colors.border} strokeWidth="0.5" fill="none" />
                    {/* Center circle half */}
                    <Path d="M 35 60 A 15 15 0 0 1 65 60" stroke={colors.border} strokeWidth="0.5" fill="none" />

                    {/* Shots */}
                    {renderedShots.map(({ key, shot }) => (
                        <Circle
                            key={key}
                            cx={shot.x}
                            cy={shot.y}
                            r={shot.isGoal ? "2" : "1.5"}
                            fill={shot.isGoal ? colors.primary : colors.textMuted}
                            opacity={shot.isGoal ? 1 : 0.6}
                        />
                    ))}
                </Svg>
            </View>
        </View>
    );
}
