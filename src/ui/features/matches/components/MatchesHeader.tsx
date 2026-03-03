import { useMemo } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { AppPressable } from '@ui/shared/components';
import { MIN_TOUCH_TARGET, type ThemeColors } from '@ui/shared/theme/theme';

type MatchesHeaderProps = {
  onPressCalendar: () => void;
  onPressSearch: () => void;
};

function createStyles(colors: ThemeColors, isCompact: boolean) {
  const actionButtonSize = isCompact ? MIN_TOUCH_TARGET : 46;
  const logoWidth = isCompact ? 120 : 150;
  const actionsGap = isCompact ? 8 : 10;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
    },
    logoContainer: {
      flexShrink: 1,
      width: logoWidth,
    },
    logo: {
      width: '100%',
      height: isCompact ? 38 : 46,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: actionsGap,
    },
    actionButton: {
      width: actionButtonSize,
      height: actionButtonSize,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceElevated,
    },
    actionButtonPrimary: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
  });
}

export function MatchesHeader({
  onPressCalendar,
  onPressSearch,
}: MatchesHeaderProps) {
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const isCompact = width < 370;
  const styles = useMemo(() => createStyles(colors, isCompact), [colors, isCompact]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../../../../assets/Logo_footalert.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.actions}>
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={t('matches.actions.openCalendar')}
          onPress={onPressCalendar}
          testID="matches-header-calendar-button"
          style={[styles.actionButton, styles.actionButtonPrimary]}
        >
          <MaterialCommunityIcons name="calendar-month" size={20} color={colors.primary} />
        </AppPressable>
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={t('matches.actions.openSearch')}
          onPress={onPressSearch}
          testID="matches-header-search-button"
          style={styles.actionButton}
        >
          <MaterialCommunityIcons name="magnify" size={22} color={colors.text} />
        </AppPressable>
      </View>
    </View>
  );
}
