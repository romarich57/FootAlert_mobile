import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

export type PlayerTabType = 'profil' | 'matchs' | 'stats' | 'carriere';

type PlayerTabsProps = {
    selectedTab: PlayerTabType;
    onChangeTab: (tab: PlayerTabType) => void;
    profilLabel?: string;
    matchsLabel?: string;
    statsLabel?: string;
    carriereLabel?: string;
};

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            paddingHorizontal: 20,
        },
        tabButton: {
            flex: 1,
            paddingVertical: 14,
            alignItems: 'center',
            borderBottomWidth: 2,
            borderBottomColor: 'transparent',
        },
        tabButtonSelected: {
            borderBottomColor: colors.primary,
        },
        label: {
            color: colors.textMuted,
            fontSize: 15,
            fontWeight: '600',
        },
        labelSelected: {
            color: colors.primary,
        },
    });
}

function TabItem({
    label,
    selected,
    onPress,
    styles,
}: {
    label: string;
    selected: boolean;
    onPress: () => void;
    styles: ReturnType<typeof createStyles>;
}) {
    return (
        <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={onPress}
            style={[styles.tabButton, selected && styles.tabButtonSelected]}
        >
            <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
        </Pressable>
    );
}

export function PlayerTabs({
    selectedTab,
    onChangeTab,
    profilLabel = 'Profil',
    matchsLabel = 'Matchs',
    statsLabel = 'Stats',
    carriereLabel = 'Carrière',
}: PlayerTabsProps) {
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.container}>
            <TabItem
                label={profilLabel}
                selected={selectedTab === 'profil'}
                onPress={() => onChangeTab('profil')}
                styles={styles}
            />
            <TabItem
                label={matchsLabel}
                selected={selectedTab === 'matchs'}
                onPress={() => onChangeTab('matchs')}
                styles={styles}
            />
            <TabItem
                label={statsLabel}
                selected={selectedTab === 'stats'}
                onPress={() => onChangeTab('stats')}
                styles={styles}
            />
            <TabItem
                label={carriereLabel}
                selected={selectedTab === 'carriere'}
                onPress={() => onChangeTab('carriere')}
                styles={styles}
            />
        </View>
    );
}
