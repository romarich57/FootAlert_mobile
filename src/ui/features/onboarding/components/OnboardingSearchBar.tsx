import { memo, useMemo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginVertical: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    icon: {
      marginRight: 8,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      padding: 0,
    },
  });
}

export const OnboardingSearchBar = memo(function OnboardingSearchBar({
  value,
  onChangeText,
  placeholder,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name="magnify"
        size={20}
        color={colors.textMuted}
        style={styles.icon}
      />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
    </View>
  );
});
