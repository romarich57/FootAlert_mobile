import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

type MatchesHeaderProps = {
  onPressCalendar: () => void;
  onPressSearch: () => void;
  onPressNotifications: () => void;
};

function createStyles(colors: ThemeColors, isCompact: boolean) {
  const actionButtonSize = isCompact ? 40 : 44;
  const logoWidth = isCompact ? 126 : 164;
  const actionsGap = isCompact ? 8 : 12;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    logoContainer: {
      flexShrink: 1,
      marginRight: 8,
      width: logoWidth,
    },
    logo: {
      width: '100%',
      height: isCompact ? 44 : 54,
      borderRadius: 8,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: actionsGap,
      flexShrink: 0,
    },
    actionButton: {
      width: actionButtonSize,
      height: actionButtonSize,
      borderRadius: actionButtonSize / 2,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: colors.chipBorder,
      backgroundColor: colors.surface,
    },
    actionButtonPrimary: {
      borderColor: colors.primary,
      backgroundColor: 'rgba(21,248,106,0.1)',
    },
  });
}

export function MatchesHeader({
  onPressCalendar,
  onPressSearch,
  onPressNotifications,
}: MatchesHeaderProps) {
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const isCompact = width < 370;
  const styles = useMemo(() => createStyles(colors, isCompact), [colors, isCompact]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../../../../assets/Logo_footalert.jpg')}
          style={styles.logo}
          resizeMode="cover"
        />
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={onPressCalendar}
          testID="matches-header-calendar-button"
          style={[styles.actionButton, styles.actionButtonPrimary]}
        >
          <MaterialCommunityIcons name="calendar-month" size={22} color={colors.primary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onPressSearch}
          testID="matches-header-search-button"
          style={styles.actionButton}
        >
          <MaterialCommunityIcons name="magnify" size={24} color={colors.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onPressNotifications}
          testID="matches-header-notifications-button"
          style={styles.actionButton}
        >
          <MaterialCommunityIcons name="bell" size={23} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}
