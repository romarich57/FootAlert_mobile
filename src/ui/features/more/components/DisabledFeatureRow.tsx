import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SettingsRow } from '@ui/features/more/components/SettingsRow';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

type DisabledFeatureRowProps = {
  iconName: string;
  label: string;
  badgeLabel: string;
  isLast?: boolean;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    badge: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: colors.chipBackground,
      borderWidth: 1,
      borderColor: colors.chipBorder,
    },
    badgeText: {
      color: colors.chipBorder,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
  });
}

export function DisabledFeatureRow({
  iconName,
  label,
  badgeLabel,
  isLast = false,
}: DisabledFeatureRowProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SettingsRow
      iconName={iconName}
      label={label}
      rightElement={(
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
      )}
      disabled
      isLast={isLast}
      showChevron={false}
    />
  );
}
