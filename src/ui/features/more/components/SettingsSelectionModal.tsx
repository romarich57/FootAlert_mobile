import { useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { SettingsSelectionOption } from '@ui/features/more/types/more.types';
import type { ThemeColors } from '@ui/shared/theme/theme';

type SettingsSelectionModalProps<TValue extends string> = {
  visible: boolean;
  title: string;
  options: SettingsSelectionOption<TValue>[];
  selectedValue: TValue;
  onSelect: (value: TValue) => void;
  onClose: () => void;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    content: {
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: '70%',
      paddingBottom: 20,
    },
    header: {
      minHeight: 58,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      justifyContent: 'center',
    },
    title: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '700',
    },
    option: {
      minHeight: 52,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    optionLabel: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '500',
    },
  });
}

export function SettingsSelectionModal<TValue extends string>({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: SettingsSelectionModalProps<TValue>) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
          </View>

          <ScrollView>
            {options.map(option => {
              const isSelected = option.value === selectedValue;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  style={styles.option}
                  onPress={() => onSelect(option.value)}
                >
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  {isSelected ? (
                    <MaterialCommunityIcons name="check" size={22} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
