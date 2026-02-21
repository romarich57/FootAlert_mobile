import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { MatchStatusFilter } from '@ui/features/matches/types/matches.types';
import type { ThemeColors } from '@ui/shared/theme/theme';

type StatusFiltersRowProps = {
  filter: MatchStatusFilter;
  onFilterChange: (nextFilter: MatchStatusFilter) => void;
};

const FILTER_ORDER: MatchStatusFilter[] = ['all', 'live', 'upcoming', 'finished'];

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingVertical: 7,
      paddingHorizontal: 14,
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: 'rgba(20, 225, 92, 0.12)',
    },
    text: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    textActive: {
      color: colors.primary,
    },
  });
}

export function StatusFiltersRow({ filter, onFilterChange }: StatusFiltersRowProps) {
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
            style={[styles.chip, isActive ? styles.chipActive : undefined]}
          >
            <Text style={[styles.text, isActive ? styles.textActive : undefined]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
