import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { AppPressable } from '@ui/shared/components';
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
        <AppPressable
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={onPress}
            style={[styles.tabButton, selected && styles.tabButtonSelected]}
        >
            <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
        </AppPressable>
    );
}

export function PlayerTabs({
  selectedTab,
  onChangeTab,
  profilLabel,
  matchsLabel,
  statsLabel,
  carriereLabel,
}: PlayerTabsProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const resolvedProfilLabel = profilLabel ?? t('playerDetails.tabs.profile');
  const resolvedMatchsLabel = matchsLabel ?? t('playerDetails.tabs.matches');
  const resolvedStatsLabel = statsLabel ?? t('playerDetails.tabs.stats');
  const resolvedCarriereLabel = carriereLabel ?? t('playerDetails.tabs.career');

    return (
        <View style={styles.container} accessibilityRole="tablist">
            <TabItem
                label={resolvedProfilLabel}
                selected={selectedTab === 'profil'}
                onPress={() => onChangeTab('profil')}
                styles={styles}
            />
            <TabItem
                label={resolvedMatchsLabel}
                selected={selectedTab === 'matchs'}
                onPress={() => onChangeTab('matchs')}
                styles={styles}
            />
            <TabItem
                label={resolvedStatsLabel}
                selected={selectedTab === 'stats'}
                onPress={() => onChangeTab('stats')}
                styles={styles}
            />
            <TabItem
                label={resolvedCarriereLabel}
                selected={selectedTab === 'carriere'}
                onPress={() => onChangeTab('carriere')}
                styles={styles}
            />
        </View>
    );
}
