import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

export type HorizontalBarChartItem = {
    id: string;
    label: string;
    subLabel?: string;
    value: number;
    maxValue: number;
    photoUrl?: string;
    rank: number;
};

type HorizontalBarChartProps = {
    data: HorizontalBarChartItem[];
    title?: string;
    valueSuffix?: string;
    valueFormatter?: (value: number, item: HorizontalBarChartItem) => string;
};

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            paddingVertical: 14,
        },
        title: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '800',
            marginBottom: 14,
            paddingHorizontal: 14,
        },
        itemRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 14,
            paddingHorizontal: 14,
        },
        rankText: {
            color: colors.textMuted,
            fontSize: 13,
            fontWeight: '800',
            width: 24,
        },
        photoContainer: {
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: colors.surfaceElevated,
            marginRight: 10,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
        },
        photo: {
            width: '75%',
            height: '75%',
        },
        photoFallback: {
            color: colors.textMuted,
            fontSize: 11,
            fontWeight: '800',
        },
        chartInfoContent: {
            flex: 1,
            justifyContent: 'center',
        },
        labelRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 6,
            gap: 8,
        },
        labelText: {
            color: colors.text,
            fontSize: 13,
            fontWeight: '700',
            flex: 1,
        },
        subLabelText: {
            color: colors.textMuted,
            fontSize: 11,
            marginLeft: 6,
        },
        valueText: {
            color: colors.primary,
            fontSize: 13,
            fontWeight: '900',
            marginLeft: 8,
        },
        barBackground: {
            height: 7,
            backgroundColor: colors.surfaceElevated,
            borderRadius: 999,
            overflow: 'hidden',
            flexDirection: 'row',
        },
        barFill: {
            height: '100%',
            backgroundColor: colors.primary,
            borderRadius: 999,
        },
    });
}

function formatDefaultValue(value: number): string {
    if (Number.isInteger(value)) {
        return `${value}`;
    }

    return value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function toInitials(value: string): string {
    const tokens = value.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
        return '?';
    }

    if (tokens.length === 1) {
        return tokens[0].slice(0, 2).toUpperCase();
    }

    return `${tokens[0][0] ?? ''}${tokens[1][0] ?? ''}`.toUpperCase();
}

export function HorizontalBarChart({
    data,
    title,
    valueSuffix,
    valueFormatter,
}: HorizontalBarChartProps) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [failedImageIds, setFailedImageIds] = useState<Record<string, boolean>>({});

    if (!data || data.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            {title ? <Text style={styles.title}>{title}</Text> : null}

            {data.map((item) => {
                const fillPercentage = item.maxValue > 0
                    ? (Math.abs(item.value) / Math.abs(item.maxValue)) * 100
                    : 0;
                const safeWidth = Math.min(Math.max(fillPercentage, 0), 100);

                const renderedValue = valueFormatter
                    ? valueFormatter(item.value, item)
                    : `${formatDefaultValue(item.value)}${valueSuffix ?? ''}`;

                const showImage = Boolean(item.photoUrl) && !failedImageIds[item.id];

                return (
                    <View key={item.id} style={styles.itemRow}>
                        <Text style={styles.rankText}>{item.rank}</Text>

                        <View style={styles.photoContainer}>
                            {showImage ? (
                                <Image
                                    source={{ uri: item.photoUrl }}
                                    style={styles.photo}
                                    resizeMode="contain"
                                    onError={() => {
                                        setFailedImageIds(previous => ({ ...previous, [item.id]: true }));
                                    }}
                                />
                            ) : (
                                <Text style={styles.photoFallback}>{toInitials(item.label)}</Text>
                            )}
                        </View>

                        <View style={styles.chartInfoContent}>
                            <View style={styles.labelRow}>
                                <Text style={styles.labelText} numberOfLines={1}>
                                    {item.label}
                                    {item.subLabel ? <Text style={styles.subLabelText}> • {item.subLabel}</Text> : null}
                                </Text>
                                <Text style={styles.valueText}>{renderedValue}</Text>
                            </View>

                            <View style={styles.barBackground}>
                                <View style={[styles.barFill, { width: `${safeWidth}%` }]} />
                            </View>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}
