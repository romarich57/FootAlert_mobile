import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { ThemeColors } from '@ui/shared/theme/theme';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#222222',
      backgroundColor: '#0D0D0D',
      paddingHorizontal: 20,
      paddingVertical: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    },
    body: {
      flex: 1,
      gap: 6,
    },
    sponsoredLabel: {
      color: colors.primary,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 2,
      fontWeight: '800',
    },
    text: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '700',
    },
    button: {
      borderRadius: 12,
      backgroundColor: colors.primary,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    buttonText: {
      color: '#000000',
      fontWeight: '900',
      fontSize: 12,
      textTransform: 'uppercase',
    },
  });
}

export function PartnerBannerCard() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.sponsoredLabel}>{t('matches.partner.label')}</Text>
        <Text style={styles.text}>{t('matches.partner.message')}</Text>
      </View>
      <Pressable style={styles.button}>
        <Text style={styles.buttonText}>{t('matches.partner.cta')}</Text>
      </Pressable>
    </View>
  );
}
