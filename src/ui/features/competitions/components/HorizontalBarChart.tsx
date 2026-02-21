import { useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

export type HorizontalBarChartItem = {
    id: string;
    label: string;
    subLabel?: string;
    value: number;
    maxValue: number;
    photoUrl?: string; // Player photo or team logo
    rank: number;
};

type HorizontalBarChartProps = {
    data: HorizontalBarChartItem[];
    title?: string;
};

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            backgroundColor: colors.background,
            paddingVertical: 16,
        },
        title: {
            color: colors.text,
            fontSize: 18,
            fontWeight: '700',
            marginBottom: 16,
            paddingHorizontal: 16,
        },
        itemRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16,
            paddingHorizontal: 16,
        },
        rankText: {
            color: colors.textMuted,
            fontSize: 14,
            fontWeight: 'bold',
            width: 24,
        },
        photoContainer: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surface,
            marginRight: 12,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.surfaceElevated,
        },
        photo: {
            width: '100%',
            height: '100%',
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
        },
        labelText: {
            color: colors.text,
            fontSize: 14,
            fontWeight: '600',
            flex: 1,
        },
        subLabelText: {
            color: colors.textMuted,
            fontSize: 12,
            marginLeft: 8,
        },
        valueText: {
            color: colors.primary,
            fontSize: 14,
            fontWeight: '800',
            marginLeft: 8,
        },
        barBackground: {
            height: 6,
            backgroundColor: colors.surfaceElevated,
            borderRadius: 3,
            overflow: 'hidden',
            flexDirection: 'row',
        },
        barFill: {
            height: '100%',
            backgroundColor: colors.primary,
            borderRadius: 3,
        }
    });
}

function displayValue(value: string | number | null | undefined): string | number {
    return value !== null && value !== undefined && value !== '' ? value : '?';
}

export function HorizontalBarChart({ data, title }: HorizontalBarChartProps) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    if (!data || data.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            {title && <Text style={styles.title}>{title}</Text>}

            {data.map((item) => {
                // safeguard to prevent NaN or Infinity width
                const fillPercentage = item.maxValue > 0 ? (item.value / item.maxValue) * 100 : 0;
                const safeWidth = Math.min(Math.max(fillPercentage, 0), 100);

                return (
                    <View key={item.id} style={styles.itemRow}>
                        <Text style={styles.rankText}>{item.rank}</Text>

                        <View style={styles.photoContainer}>
                            <Image
                                source={{ uri: item.photoUrl ?? undefined }}
                                style={styles.photo}
                                resizeMode="cover"
                            />
                        </View>

                        <View style={styles.chartInfoContent}>
                            <View style={styles.labelRow}>
                                <Text style={styles.labelText} numberOfLines={1}>
                                    {displayValue(item.label)}
                                    {item.subLabel && <Text style={styles.subLabelText}> • {item.subLabel}</Text>}
                                </Text>
                                <Text style={styles.valueText}>{displayValue(item.value)}</Text>
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
