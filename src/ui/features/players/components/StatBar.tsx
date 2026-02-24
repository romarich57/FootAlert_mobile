import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';

type StatBarProps = {
    label: string;
    value: number | null;
    maxValue: number;
    barColor?: string;
    suffix?: string;
};

export function StatBar({ label, value, maxValue, barColor, suffix }: StatBarProps) {
    const { colors } = useAppTheme();
    const displayValue = value !== null ? `${value}${suffix ?? ''}` : '-';
    const ratio = value !== null && maxValue > 0 ? Math.min(value / maxValue, 1) : 0;
    const resolvedColor = barColor ?? colors.primary;

    return (
        <View style={styles.container}>
            <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
                    {label}
                </Text>
                <Text style={[styles.value, { color: colors.text }]}>{displayValue}</Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: colors.surfaceElevated }]}>
                <View
                    style={[
                        styles.barFill,
                        {
                            backgroundColor: resolvedColor,
                            width: `${Math.round(ratio * 100)}%`,
                        },
                    ]}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 10,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    value: {
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 12,
        minWidth: 36,
        textAlign: 'right',
    },
    barTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 3,
    },
});
