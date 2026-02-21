import { useMemo } from 'react';
import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

export type CompetitionTabKey =
    | 'standings'
    | 'matches'
    | 'playerStats'
    | 'teamStats'
    | 'transfers'
    | 'totw'
    | 'seasons';

type CompetitionTabsProps = {
    activeTab: CompetitionTabKey;
    onTabChange: (tab: CompetitionTabKey) => void;
};

const TABS: { key: CompetitionTabKey; labelKey: string }[] = [
    { key: 'standings', labelKey: 'competitionDetails.tabs.standings' },
    { key: 'matches', labelKey: 'competitionDetails.tabs.matches' },
    { key: 'playerStats', labelKey: 'competitionDetails.tabs.playerStats' },
    { key: 'teamStats', labelKey: 'competitionDetails.tabs.teamStats' },
    { key: 'transfers', labelKey: 'competitionDetails.tabs.transfers' },
    { key: 'totw', labelKey: 'competitionDetails.tabs.totw' },
    { key: 'seasons', labelKey: 'competitionDetails.tabs.seasons' },
];

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

export function CompetitionTabs({ activeTab, onTabChange }: CompetitionTabsProps) {
    const { t } = useTranslation();
    const { colors } = useAppTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
            >
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                        <Pressable
                            key={tab.key}
                            style={styles.tab}
                            onPress={() => onTabChange(tab.key)}
                        >
                            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                                {t(tab.labelKey)}
                            </Text>
                            {isActive && <View style={styles.indicator} />}
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
}
