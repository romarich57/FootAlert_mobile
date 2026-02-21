import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Polygon, Line } from 'react-native-svg';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';
import type { PlayerCharacteristics } from '@ui/features/players/types/players.types';

type RadarChartProps = {
    data: PlayerCharacteristics;
    size?: number;
};

// Map characteristics to axes (0 to 100 values expected)
const AXES = [
    { key: 'attack', label: 'ATTAQUE' },
    { key: 'dribbles', label: 'DRIBBLES' },
    { key: 'chances', label: 'OCCASIONS' },
    { key: 'defense', label: 'DÉFENSE' },
    { key: 'duels', label: 'DUELS' },
    { key: 'touches', label: 'TOUCHES' },
 ] as const;

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 20,
        },
        labelContainer: {
            position: 'absolute',
            alignItems: 'center',
            justifyContent: 'center',
        },
        label: {
            color: colors.textMuted,
            fontSize: 10,
            fontWeight: '700',
            textTransform: 'uppercase',
        },
    });
}

function normalizeData(data: PlayerCharacteristics, key: keyof PlayerCharacteristics): number {
    // Simple normalization logic for visual purposes. 
    // In a real app, this should compare against max values for the position.
    const rawValue = data[key];
    if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
        return 0;
    }
    // Mock max values per stat type for visual filling (assuming season-long stats)
    const maxValues: Record<keyof PlayerCharacteristics, number> = {
        attack: 30, // goals + shots on target
        dribbles: 100, // success dribbles
        chances: 50, // key passes
        defense: 80, // tackles + int
        duels: 150, // duels won
        touches: 2000, // touches/passes
    };
    const max = maxValues[key];
    return Math.min(Math.max(rawValue / max, 0), 1);
}

export function RadarChart({ data, size = 260 }: RadarChartProps) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const center = size / 2;
    const radius = (size / 2) * 0.7; // Leave room for text labels

    // Generate points for the background webbing
    const generateLevels = (levels: number) => {
        const polygons = [];
        for (let i = 1; i <= levels; i++) {
            const levelRadius = (radius / levels) * i;
            const points = AXES.map((_, index) => {
                const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2; // -90 deg to start top
                return `${center + levelRadius * Math.cos(angle)},${center + levelRadius * Math.sin(angle)
                    }`;
            }).join(' ');
            polygons.push(
                <Polygon
                    key={`level-${i}`}
                    points={points}
                    stroke={colors.border}
                    strokeWidth="1"
                    fill="transparent"
                />
            );
        }
        return polygons;
    };

    // Generate points for the data polygon
    const dataPoints = AXES.map((axis, index) => {
        const value = normalizeData(data, axis.key);
        const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
        return `${center + radius * value * Math.cos(angle)},${center + radius * value * Math.sin(angle)
            }`;
    }).join(' ');

    // Labels positioning
    const labels = AXES.map((axis, index) => {
        const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
        const labelRadius = radius + 25; // Push label out
        const x = center + labelRadius * Math.cos(angle);
        const y = center + labelRadius * Math.sin(angle);
        const labelLayout = { left: x - 40, top: y - 10, width: 80, height: 20 };

        return (
            <View
                key={`label-${axis.key}`}
                style={[
                    styles.labelContainer,
                    labelLayout, // Center around point
                ]}
            >
                <Text style={styles.label}>{axis.label}</Text>
            </View>
        );
    });

    // Center axes lines
    const axesLines = AXES.map((_, index) => {
        const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
        return (
            <Line
                key={`axis-${index}`}
                x1={center}
                y1={center}
                x2={center + radius * Math.cos(angle)}
                y2={center + radius * Math.sin(angle)}
                stroke={colors.border}
                strokeWidth="1"
            />
        );
    });

    const chartContainerStyle = { width: size, height: size };

    return (
        <View style={styles.container}>
            <View style={chartContainerStyle}>
                <Svg width={size} height={size}>
                    {generateLevels(5)}
                    {axesLines}
                    <Polygon
                        points={dataPoints}
                        stroke={colors.primary}
                        strokeWidth="3"
                        fill={`${colors.primary}40`} // 25% opacity
                        strokeLinejoin="round"
                    />
                </Svg>
                {labels}
            </View>
        </View>
    );
}
