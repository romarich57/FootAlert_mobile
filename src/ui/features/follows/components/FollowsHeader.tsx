import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

type FollowsHeaderProps = {
  title: string;
  onPressSearch: () => void;
  searchA11yLabel: string;
  isEditMode?: boolean;
  onPressEdit?: () => void;
  editLabel?: string;
  saveLabel?: string;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    title: {
      color: colors.text,
      fontSize: 32,
      fontWeight: '800',
      letterSpacing: -1.0,
      flex: 1,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    editButton: {
      paddingVertical: 8,
      paddingHorizontal: 8,
    },
    editText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    searchButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.chipBorder,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
  });
}

export function FollowsHeader({
  title,
  onPressSearch,
  searchA11yLabel,
  isEditMode = false,
  onPressEdit,
  editLabel,
  saveLabel,
}: FollowsHeaderProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const currentEditLabel = isEditMode ? (saveLabel ?? editLabel ?? '') : (editLabel ?? saveLabel ?? '');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.actions}>
        {onPressEdit && (
          <Pressable onPress={onPressEdit} style={styles.editButton}>
            <Text style={styles.editText}>{currentEditLabel}</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={searchA11yLabel}
          onPress={onPressSearch}
          style={styles.searchButton}
        >
          <MaterialCommunityIcons name="magnify" size={24} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}
