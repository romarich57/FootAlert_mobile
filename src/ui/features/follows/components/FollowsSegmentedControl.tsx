import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { FollowEntityTab } from '@ui/features/follows/types/follows.types';
import type { ThemeColors } from '@ui/shared/theme/theme';

type FollowsSegmentedControlProps = {
  selectedTab: FollowEntityTab;
  onChangeTab: (tab: FollowEntityTab) => void;
  teamsLabel: string;
  playersLabel: string;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 2,
    },
    row: {
      flexDirection: 'row',
      gap: 32,
    },
    tabButton: {
      paddingBottom: 11,
      minHeight: 44,
      justifyContent: 'flex-end',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabButtonSelected: {
      borderBottomColor: colors.primary,
    },
    label: {
      color: colors.textMuted,
      fontSize: 22,
      fontWeight: '700',
    },
    labelSelected: {
      color: colors.primary,
    },
  });
}

function SegmentButton({
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
      style={[styles.tabButton, selected ? styles.tabButtonSelected : null]}
    >
      <Text style={[styles.label, selected ? styles.labelSelected : null]}>{label}</Text>
    </Pressable>
  );
}

export function FollowsSegmentedControl({
  selectedTab,
  onChangeTab,
  teamsLabel,
  playersLabel,
}: FollowsSegmentedControlProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View accessibilityRole="tablist" style={styles.row}>
        <SegmentButton
          label={teamsLabel}
          selected={selectedTab === 'teams'}
          onPress={() => onChangeTab('teams')}
          styles={styles}
        />
        <SegmentButton
          label={playersLabel}
          selected={selectedTab === 'players'}
          onPress={() => onChangeTab('players')}
          styles={styles}
        />
      </View>
    </View>
  );
}
