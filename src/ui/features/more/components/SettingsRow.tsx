import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

type SettingsRowProps = {
  iconName: string;
  label: string;
  value?: string;
  isLast?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  rightElement?: ReactNode;
  accessibilityLabel?: string;
  showChevron?: boolean;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      minHeight: 60,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowDisabled: {
      opacity: 0.58,
    },
    iconWrap: {
      width: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    label: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      flexShrink: 1,
    },
    valueWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
      maxWidth: '62%',
    },
    value: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'right',
      flexShrink: 1,
    },
  });
}

export function SettingsRow({
  iconName,
  label,
  value,
  isLast = false,
  disabled = false,
  onPress,
  rightElement,
  accessibilityLabel,
  showChevron = Boolean(onPress) && !disabled,
}: SettingsRowProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const rowContent = (
    <>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={iconName} size={24} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueWrap}>
          {value ? <Text style={styles.value}>{value}</Text> : null}
          {rightElement}
          {showChevron ? (
            <MaterialCommunityIcons name="chevron-right" size={21} color={colors.textMuted} />
          ) : null}
        </View>
      </View>
    </>
  );

  const rowStyles = [styles.row, isLast ? styles.rowLast : undefined, disabled ? styles.rowDisabled : undefined];

  if (!onPress || disabled) {
    return <View style={rowStyles}>{rowContent}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={rowStyles}
      onPress={onPress}
    >
      {rowContent}
    </Pressable>
  );
}
