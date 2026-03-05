import { useMemo } from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { AppPressable } from '@ui/shared/components';
import {
    MIN_TOUCH_TARGET,
    type ThemeColors,
} from '@ui/shared/theme/theme';

export type CompetitionTabKey =
    | 'standings'
    | 'matches'
    | 'playerStats'
    | 'teamStats'
    | 'transfers'
    | 'totw';

type CompetitionTabsProps = {
    activeTab: CompetitionTabKey;
    tabs: CompetitionTabKey[];
    onTabChange: (tab: CompetitionTabKey) => void;
    labelOverrides?: Partial<Record<CompetitionTabKey, string>>;
};

const TAB_LABEL_KEYS: Record<CompetitionTabKey, string> = {
    standings: 'competitionDetails.tabs.standings',
    matches: 'competitionDetails.tabs.matches',
    playerStats: 'competitionDetails.tabs.playerStats',
    teamStats: 'competitionDetails.tabs.teamStats',
    transfers: 'competitionDetails.tabs.transfers',
    totw: 'competitionDetails.tabs.totw',
};

function createStyles(colors: ThemeColors) {
    return StyleSheet.create({
        container: {
            backgroundColor: colors.background,
            borderBottomWidth: 1,
            borderBottomColor: colors.surface,
        },
        contentContainer: {
            paddingHorizontal: 16,
            gap: 24,
        },
        tab: {
            paddingVertical: 12,
            paddingHorizontal: 4,
            position: 'relative',
            minHeight: MIN_TOUCH_TARGET,
            minWidth: MIN_TOUCH_TARGET,
            justifyContent: 'center',
            alignItems: 'center',
        },
        tabLabel: {
            fontSize: 15,
            fontWeight: '600',
            color: colors.textMuted,
        },
        tabLabelActive: {
            color: colors.primary,
        },
        indicator: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: colors.primary,
            borderTopLeftRadius: 3,
            borderTopRightRadius: 3,
        },
    });
}

export function CompetitionTabs({ activeTab, tabs, onTabChange, labelOverrides }: CompetitionTabsProps) {
    const { t } = useTranslation();
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View testID="competition-tabs-tablist" style={styles.container} accessibilityRole="tablist">
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
            >
                {tabs.map(tab => {
                    const isActive = activeTab === tab;
                    const labelKey = labelOverrides?.[tab] ?? TAB_LABEL_KEYS[tab];
                    const label = t(labelKey);
                    return (
                        <AppPressable
                            key={tab}
                            style={styles.tab}
                            onPress={() => onTabChange(tab)}
                            accessibilityRole="tab"
                            accessibilityLabel={label}
                            accessibilityState={{ selected: isActive }}
                        >
                            <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : null]}>
                                {label}
                            </Text>
                            {isActive ? <View style={styles.indicator} /> : null}
                        </AppPressable>
                    );
                })}
            </ScrollView>
        </View>
    );
}
