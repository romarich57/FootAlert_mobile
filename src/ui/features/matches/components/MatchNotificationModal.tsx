import { useMemo, useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import type { MatchNotificationPrefs } from '@ui/features/matches/types/matches.types';
import type { ThemeColors } from '@ui/shared/theme/theme';

type MatchNotificationModalProps = {
  visible: boolean;
  initialPrefs: MatchNotificationPrefs;
  onClose: () => void;
  onSave: (prefs: MatchNotificationPrefs) => void;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      gap: 14,
    },
    title: {
      color: colors.text,
      fontSize: 21,
      fontWeight: '800',
      marginBottom: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    label: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 14,
    },
    actionButton: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    actionButtonPrimary: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    actionText: {
      color: colors.text,
      fontWeight: '700',
    },
    actionTextPrimary: {
      color: colors.primaryContrast,
    },
  });
}

export function MatchNotificationModal({
  visible,
  initialPrefs,
  onClose,
  onSave,
}: MatchNotificationModalProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [prefs, setPrefs] = useState<MatchNotificationPrefs>(initialPrefs);
  useEffect(() => {
    if (!visible) {
      return;
    }

    setPrefs(initialPrefs);
  }, [initialPrefs, visible]);

  const updatePref = (key: keyof MatchNotificationPrefs, value: boolean) => {
    setPrefs(current => ({ ...current, [key]: value }));
  };

  const handleSave = () => {
    onSave(prefs);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('notifications.match.title')}</Text>

          <View style={styles.row}>
            <Text style={styles.label}>{t('notifications.match.options.goal')}</Text>
            <Switch
              value={prefs.goal}
              onValueChange={value => updatePref('goal', value)}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t('notifications.match.options.redCard')}</Text>
            <Switch
              value={prefs.redCard}
              onValueChange={value => updatePref('redCard', value)}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t('notifications.match.options.start')}</Text>
            <Switch
              value={prefs.start}
              onValueChange={value => updatePref('start', value)}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t('notifications.match.options.end')}</Text>
            <Switch
              value={prefs.end}
              onValueChange={value => updatePref('end', value)}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.actionButton}>
              <Text style={styles.actionText}>{t('actions.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={[styles.actionButton, styles.actionButtonPrimary]}
            >
              <Text style={[styles.actionText, styles.actionTextPrimary]}>{t('actions.save')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
