import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { MatchStatusFilter } from '@ui/features/matches/types/matches.types';
import {
  DEFAULT_HIT_SLOP,
  MIN_TOUCH_TARGET,
  type ThemeColors,
} from '@ui/shared/theme/theme';

type StatusFiltersRowProps = {
  filter: MatchStatusFilter;
  onFilterChange: (nextFilter: MatchStatusFilter) => void;
  followedOnly: boolean;
  onToggleFollowedOnly: () => void;
};

const FILTER_ORDER: MatchStatusFilter[] = ['all', 'live', 'upcoming', 'finished'];

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      gap: 6,
    },
    chip: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: colors.surfaceElevated,
      minHeight: MIN_TOUCH_TARGET,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    chipActive: {
      backgroundColor: colors.primary,
    },
    text: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    textActive: {
      color: colors.primaryContrast,
    },
  });
}

export function StatusFiltersRow({
  filter,
  onFilterChange,
  followedOnly,
  onToggleFollowedOnly,
}: StatusFiltersRowProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {FILTER_ORDER.map(item => {
        const isActive = item === filter;
        const label = t(`matches.filters.${item}`);

        return (
          <Pressable
            key={item}
            onPress={() => onFilterChange(item)}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: isActive }}
            hitSlop={DEFAULT_HIT_SLOP}
            style={[styles.chip, isActive ? styles.chipActive : undefined]}
          >
            <Text style={[styles.text, isActive ? styles.textActive : undefined]}>{label}</Text>
          </Pressable>
        );
      })}
      <Pressable
        onPress={onToggleFollowedOnly}
        accessibilityRole="button"
        accessibilityLabel={t('matches.filters.followed')}
        accessibilityState={{ selected: followedOnly }}
        hitSlop={DEFAULT_HIT_SLOP}
        style={[styles.chip, followedOnly ? styles.chipActive : undefined]}
      >
        <Text style={[styles.text, followedOnly ? styles.textActive : undefined]}>
          {t('matches.filters.followed')}
        </Text>
      </Pressable>
    </View>
  );
}
