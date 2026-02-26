import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

type DateChipsRowProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
};

type DateChip = {
  id: string;
  date: Date;
  dayLabel: string;
  dayNumber: string;
  monthLabel: string;
  isToday: boolean;
};

function buildDateChips(selectedDate: Date, language: string): DateChip[] {
  const chips: DateChip[] = [];
  const baseDate = new Date(selectedDate);
  baseDate.setHours(0, 0, 0, 0);

  for (let offset = -2; offset <= 4; offset += 1) {
    const chipDate = new Date(baseDate);
    chipDate.setDate(baseDate.getDate() + offset);
    const isToday = offset === 0;

    const dayLabel = isToday
      ? language === 'fr'
        ? 'AUJ'
        : 'TOD'
      : chipDate
        .toLocaleDateString(language, { weekday: 'short' })
        .replace('.', '')
        .slice(0, 3)
        .toUpperCase();

    chips.push({
      id: chipDate.toISOString(),
      date: chipDate,
      dayLabel,
      dayNumber: String(chipDate.getDate()).padStart(2, '0'),
      monthLabel: chipDate
        .toLocaleDateString(language, { month: 'short' })
        .replace('.', '')
        .slice(0, 3)
        .toUpperCase(),
      isToday,
    });
  }

  return chips;
}

function areSameDay(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      marginHorizontal: -20,
    },
    contentContainer: {
      gap: 10,
      paddingHorizontal: 20,
      paddingVertical: 2,
      paddingRight: 26,
    },
    chip: {
      minWidth: 64,
      height: 76,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.chipBorder,
      backgroundColor: colors.chipBackground,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      paddingVertical: 8,
      gap: 0,
    },
    chipToday: {
      borderColor: 'rgba(20, 225, 92, 0.45)',
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: 'rgba(20, 225, 92, 0.15)',
      shadowColor: colors.primary,
      shadowOpacity: 0.45,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 0 },
      elevation: 8,
    },
    dayLabel: {
      fontSize: 10,
      color: colors.textMuted,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    dayNumber: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 22,
      lineHeight: 26,
    },
    monthLabel: {
      color: colors.textMuted,
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 0.4,
    },
    dayLabelActive: {
      color: colors.primary,
    },
    dayNumberActive: {
      color: colors.text,
    },
    monthLabelActive: {
      color: colors.primary,
    },
  });
}

export function DateChipsRow({ selectedDate, onSelectDate }: DateChipsRowProps) {
  const { i18n } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const chips = useMemo(
    () => buildDateChips(selectedDate, i18n.language.startsWith('fr') ? 'fr' : 'en'),
    [i18n.language, selectedDate],
  );

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.row}
        contentContainerStyle={styles.contentContainer}
      >
        {chips.map(chip => {
          const isSelected = areSameDay(selectedDate, chip.date);

          return (
            <Pressable
              key={chip.id}
              onPress={() => onSelectDate(chip.date)}
              hitSlop={6}
              style={[
                styles.chip,
                chip.isToday ? styles.chipToday : undefined,
                isSelected ? styles.chipActive : undefined,
              ]}
            >
              <Text style={[styles.dayLabel, isSelected ? styles.dayLabelActive : undefined]}>
                {chip.dayLabel}
              </Text>
              <Text style={[styles.dayNumber, isSelected ? styles.dayNumberActive : undefined]}>
                {chip.dayNumber}
              </Text>
              <Text style={[styles.monthLabel, isSelected ? styles.monthLabelActive : undefined]}>
                {chip.monthLabel}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
