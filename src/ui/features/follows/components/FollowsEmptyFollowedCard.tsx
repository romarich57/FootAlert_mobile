import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

type FollowsEmptyFollowedCardProps = {
  onPress: () => void;
  label: string;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      width: 200,
      height: 200,
      borderRadius: 16,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      paddingHorizontal: 16,
    },
    iconCircle: {
      width: 76,
      height: 76,
      borderRadius: 38,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.textMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      color: colors.textMuted,
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
    },
  });
}

export function FollowsEmptyFollowedCard({ onPress, label }: FollowsEmptyFollowedCardProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name="plus" size={38} color={colors.textMuted} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
