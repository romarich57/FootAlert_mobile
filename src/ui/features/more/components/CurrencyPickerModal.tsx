import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { CurrencyCatalogItem } from '@data/config/currencyCatalog';
import type { ThemeColors } from '@ui/shared/theme/theme';

type CurrencyPickerModalProps = {
  visible: boolean;
  title: string;
  searchPlaceholder: string;
  currencies: CurrencyCatalogItem[];
  selectedCode: string;
  onSelect: (currencyCode: string) => void;
  onClose: () => void;
};

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

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
      maxHeight: '78%',
      paddingBottom: 20,
    },
    header: {
      minHeight: 58,
      paddingHorizontal: 20,
      justifyContent: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '700',
    },
    searchWrap: {
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 8,
      minHeight: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      paddingVertical: 0,
    },
    option: {
      minHeight: 52,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 8,
    },
    optionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    codeBadge: {
      minWidth: 48,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.chipBorder,
      backgroundColor: colors.chipBackground,
      paddingVertical: 3,
      paddingHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    codeBadgeText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    optionName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '500',
      flexShrink: 1,
    },
    symbol: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
      minWidth: 22,
      textAlign: 'right',
    },
  });
}

export function CurrencyPickerModal({
  visible,
  title,
  searchPlaceholder,
  currencies,
  selectedCode,
  onSelect,
  onClose,
}: CurrencyPickerModalProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [query, setQuery] = useState('');

  const normalizedQuery = normalizeSearchValue(query);
  const filteredCurrencies = useMemo(() => {
    if (!normalizedQuery) {
      return currencies;
    }

    return currencies.filter(currency => {
      const code = normalizeSearchValue(currency.code);
      const name = normalizeSearchValue(currency.name);
      const symbol = normalizeSearchValue(currency.symbol);
      return (
        code.includes(normalizedQuery) ||
        name.includes(normalizedQuery) ||
        symbol.includes(normalizedQuery)
      );
    });
  }, [currencies, normalizedQuery]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
          </View>

          <View style={styles.searchWrap}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
              placeholder={searchPlaceholder}
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              autoCapitalize="characters"
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            {filteredCurrencies.map(currency => {
              const isSelected = currency.code === selectedCode;
              return (
                <Pressable
                  key={currency.code}
                  accessibilityRole="button"
                  style={styles.option}
                  onPress={() => onSelect(currency.code)}
                >
                  <View style={styles.optionLeft}>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeBadgeText}>{currency.code}</Text>
                    </View>
                    <Text style={styles.optionName} numberOfLines={1}>
                      {currency.name}
                    </Text>
                  </View>
                  <Text style={styles.symbol}>{currency.symbol}</Text>
                  {isSelected ? (
                    <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}
