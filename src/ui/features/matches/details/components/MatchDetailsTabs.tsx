import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { MatchDetailTabDefinition, MatchDetailsTabKey } from '@ui/features/matches/types/matches.types';
import { MIN_TOUCH_TARGET, type ThemeColors } from '@ui/shared/theme/theme';

type MatchDetailsTabsProps = {
  tabs: MatchDetailTabDefinition[];
  activeTab: MatchDetailsTabKey;
  onChangeTab: (tab: MatchDetailsTabKey) => void;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 10,
      gap: 8,
      alignItems: 'center',
    },
    tabButton: {
      minHeight: MIN_TOUCH_TARGET,
      paddingHorizontal: 8,
      paddingVertical: 10,
      justifyContent: 'center',
      alignItems: 'center',
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    tabButtonActive: {
      borderBottomColor: colors.primary,
    },
    tabLabel: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '700',
    },
    tabLabelActive: {
      color: colors.primary,
    },
  });
}

export function MatchDetailsTabs({ tabs, activeTab, onChangeTab }: MatchDetailsTabsProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {tabs.map(tab => {
          const isActive = tab.key === activeTab;

          return (
            <Pressable
              key={tab.key}
              testID={`match-details-tab-${tab.key}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
              onPress={() => onChangeTab(tab.key)}
              style={[styles.tabButton, isActive ? styles.tabButtonActive : null]}
            >
              <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : null]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
