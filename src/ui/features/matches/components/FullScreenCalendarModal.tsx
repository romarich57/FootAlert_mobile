import { useMemo } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { CalendarList } from 'react-native-calendars';
import type { DateData } from 'react-native-calendars';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { AppPressable } from '@ui/shared/components';
import type { ThemeColors } from '@ui/shared/theme/theme';

type FullScreenCalendarModalProps = {
  visible: boolean;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
};

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerAction: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceElevated,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    calendarContainer: {
      flex: 1,
      paddingTop: 12,
    },
  });
}

export function FullScreenCalendarModal({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
}: FullScreenCalendarModalProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const selectedDateString = useMemo(() => toDateString(selectedDate), [selectedDate]);

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <AppPressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('actions.back')}
            testID="matches-calendar-close-button"
            style={styles.headerAction}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
          </AppPressable>

          <Text style={styles.headerTitle}>{t('matches.actions.openCalendar')}</Text>

          <AppPressable
            onPress={() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              onSelectDate(today);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('matches.calendar.today')}
            testID="matches-calendar-today-button"
            style={styles.headerAction}
          >
            <MaterialCommunityIcons name="calendar-today" size={20} color={colors.primary} />
          </AppPressable>
        </View>

        <View style={styles.calendarContainer}>
          <CalendarList
            current={selectedDateString}
            pastScrollRange={24}
            futureScrollRange={24}
            scrollEnabled
            showScrollIndicator={false}
            onDayPress={(day: DateData) => {
              const [year, month, dayOfMonth] = day.dateString
                .split('-')
                .map((value: string) => Number(value));
              const nextDate = new Date(year, month - 1, dayOfMonth);
              nextDate.setHours(0, 0, 0, 0);
              onSelectDate(nextDate);
              onClose();
            }}
            markedDates={{
              [selectedDateString]: {
                selected: true,
                selectedColor: colors.primary,
              },
            }}
            theme={{
              backgroundColor: colors.background,
              calendarBackground: colors.background,
              textSectionTitleColor: colors.textMuted,
              dayTextColor: colors.text,
              monthTextColor: colors.text,
              textDisabledColor: colors.textMuted,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: colors.primaryContrast,
              todayTextColor: colors.primary,
              arrowColor: colors.text,
            }}
            firstDay={1}
            hideExtraDays={false}
            horizontal={false}
            enableSwipeMonths
            style={{ backgroundColor: colors.background }}
            monthFormat='MMMM yyyy'
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
