import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

type FollowsHeaderProps = {
  title: string;
  isSearchVisible: boolean;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onPressSearchToggle: () => void;
  placeholder?: string;
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
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 4,
    },
    backButton: {
      padding: 12,
    },
    headerSearchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 18,
      paddingVertical: 8,
      paddingHorizontal: 8,
    },
  });
}

export function FollowsHeader({
  title,
  isSearchVisible,
  searchQuery,
  onSearchQueryChange,
  onPressSearchToggle,
  placeholder,
}: FollowsHeaderProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (isSearchVisible) {
    return (
      <View style={styles.searchContainer}>
        <Pressable
          accessibilityRole="button"
          onPress={onPressSearchToggle}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={26} color={colors.textMuted} />
        </Pressable>
        <TextInput
          autoFocus
          value={searchQuery}
          onChangeText={onSearchQueryChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={styles.headerSearchInput}
          autoCapitalize="none"
          autoCorrect={false}
          selectionColor={colors.primary}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onPressSearchToggle}
        style={styles.searchButton}
      >
        <MaterialCommunityIcons name="magnify" size={24} color={colors.text} />
      </Pressable>
    </View>
  );
}
