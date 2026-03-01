import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { TeamDetailsTab } from '@ui/features/teams/types/teams.types';
import { AppPressable } from '@ui/shared/components';
import type { ThemeColors } from '@ui/shared/theme/theme';

type TeamTabsProps = {
  activeTab: TeamDetailsTab;
  onChangeTab: (tab: TeamDetailsTab) => void;
  tabs: Array<{
    key: TeamDetailsTab;
    label: string;
  }>;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    contentContainer: {
      paddingHorizontal: 12,
      alignItems: 'center',
      gap: 4,
    },
    tabButton: {
      paddingVertical: 12,
      paddingHorizontal: 10,
      minHeight: 44,
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    tabButtonActive: {
      borderBottomColor: colors.primary,
    },
    tabLabel: {
      color: colors.textMuted,
      fontSize: 16,
      fontWeight: '700',
    },
    tabLabelActive: {
      color: colors.primary,
    },
  });
}

export function TeamTabs({ activeTab, onChangeTab, tabs }: TeamTabsProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View testID="team-tabs-tablist" style={styles.container} accessibilityRole="tablist">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {tabs.map(tab => {
          const isActive = tab.key === activeTab;

          return (
            <AppPressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
              onPress={() => onChangeTab(tab.key)}
              style={[styles.tabButton, isActive ? styles.tabButtonActive : null]}
            >
              <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : null]}>
                {tab.label}
              </Text>
            </AppPressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
