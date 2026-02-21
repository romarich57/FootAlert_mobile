import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import {
  CurrencyPickerModal,
  DisabledFeatureRow,
  SettingsRow,
  SettingsSection,
  SettingsSelectionModal,
} from '@ui/features/more/components';
import { useMoreSettings } from '@ui/features/more/hooks/useMoreSettings';
import type {
  LanguageOption,
  MeasurementOption,
  MoreSettingsModalKey,
  ThemeOption,
} from '@ui/features/more/types/more.types';
import type { ThemeColors } from '@ui/shared/theme/theme';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      gap: 22,
      paddingTop: 8,
      paddingBottom: 26,
    },
    title: {
      color: colors.text,
      fontSize: 44,
      fontWeight: '800',
      letterSpacing: -1,
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: 10,
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    loadingText: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '500',
    },
    warningCard: {
      marginHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.warning,
      backgroundColor: 'rgba(245,158,11,0.12)',
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 8,
    },
    warningText: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 18,
    },
    warningActionText: {
      color: colors.warning,
      fontSize: 13,
      fontWeight: '700',
    },
  });
}

export function MoreScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [openedModal, setOpenedModal] = useState<MoreSettingsModalKey>(null);
  const {
    preferences,
    isHydrated,
    appVersion,
    currencyCatalog,
    currentCurrency,
    themeOptions,
    languageOptions,
    measurementOptions,
    isUpdatingNotifications,
    permissionDenied,
    setPermissionDenied,
    handleThemeChange,
    handleLanguageChange,
    handleCurrencyChange,
    handleMeasurementChange,
    handleNotificationsChange,
    openSystemNotificationSettings,
  } = useMoreSettings();

  const localizedThemeOptions = useMemo(
    () =>
      themeOptions.map(option => ({
        ...option,
        label: t(`more.values.theme.${option.value}`),
      })),
    [t, themeOptions],
  );

  const localizedLanguageOptions = useMemo(
    () =>
      languageOptions.map(option => ({
        ...option,
        label: t(`more.values.language.${option.value}`),
      })),
    [languageOptions, t],
  );

  const localizedMeasurementOptions = useMemo(
    () =>
      measurementOptions.map(option => ({
        ...option,
        label: t(`more.values.measurement.${option.value}`),
      })),
    [measurementOptions, t],
  );

  const themeValue = t(`more.values.theme.${preferences.theme}`);
  const languageValue = t(`more.values.language.${preferences.language}`);
  const measurementValue = t(`more.values.measurement.${preferences.measurementSystem}`);
  const notificationsValue = t(
    preferences.notificationsEnabled ? 'more.values.notifications.on' : 'more.values.notifications.off',
  );
  const currencyValue = currentCurrency
    ? `${currentCurrency.code} · ${currentCurrency.symbol}`
    : preferences.currencyCode;

  const handleSelectTheme = useCallback(
    (value: ThemeOption['value']) => {
      handleThemeChange(value).catch(() => undefined);
      setOpenedModal(null);
    },
    [handleThemeChange],
  );

  const handleSelectLanguage = useCallback(
    (value: LanguageOption['value']) => {
      handleLanguageChange(value).catch(() => undefined);
      setOpenedModal(null);
    },
    [handleLanguageChange],
  );

  const handleSelectMeasurement = useCallback(
    (value: MeasurementOption['value']) => {
      handleMeasurementChange(value).catch(() => undefined);
      setOpenedModal(null);
    },
    [handleMeasurementChange],
  );

  const handleSelectCurrency = useCallback(
    (currencyCode: string) => {
      handleCurrencyChange(currencyCode).catch(() => undefined);
      setOpenedModal(null);
    },
    [handleCurrencyChange],
  );

  if (!isHydrated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('more.states.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>{t('more.title')}</Text>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <SettingsSection title={t('more.sections.preferences')}>
          <SettingsRow
            iconName="theme-light-dark"
            label={t('more.rows.theme')}
            value={themeValue}
            onPress={() => setOpenedModal('theme')}
            accessibilityLabel={t('more.rows.theme')}
          />
          <SettingsRow
            iconName="translate"
            label={t('more.rows.language')}
            value={languageValue}
            onPress={() => setOpenedModal('language')}
            accessibilityLabel={t('more.rows.language')}
          />
          <SettingsRow
            iconName="cash-multiple"
            label={t('more.rows.currency')}
            value={currencyValue}
            onPress={() => setOpenedModal('currency')}
            accessibilityLabel={t('more.rows.currency')}
          />
          <SettingsRow
            iconName="ruler"
            label={t('more.rows.measurement')}
            value={measurementValue}
            onPress={() => setOpenedModal('measurement')}
            accessibilityLabel={t('more.rows.measurement')}
          />
          <SettingsRow
            iconName="bell-ring-outline"
            label={t('more.rows.notifications')}
            value={notificationsValue}
            isLast
            accessibilityLabel={t('more.rows.notifications')}
            rightElement={(
              <Switch
                accessibilityRole="switch"
                accessibilityLabel={t('more.rows.notifications')}
                value={preferences.notificationsEnabled}
                onValueChange={value => {
                  handleNotificationsChange(value).catch(() => undefined);
                }}
                disabled={isUpdatingNotifications}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={preferences.notificationsEnabled ? colors.primaryContrast : colors.textMuted}
              />
            )}
            showChevron={false}
          />
        </SettingsSection>

        {permissionDenied ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>{t('more.notifications.permissionDenied')}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('more.notifications.openSettings')}
              onPress={() => {
                setPermissionDenied(false);
                openSystemNotificationSettings().catch(() => undefined);
              }}
            >
              <Text style={styles.warningActionText}>{t('more.notifications.openSettings')}</Text>
            </Pressable>
          </View>
        ) : null}

        <SettingsSection title={t('more.sections.information')}>
          <DisabledFeatureRow
            iconName="account-group-outline"
            label={t('more.rows.followUs')}
            badgeLabel={t('more.badges.comingSoon')}
          />
          <DisabledFeatureRow
            iconName="lifebuoy"
            label={t('more.rows.tipsSupport')}
            badgeLabel={t('more.badges.comingSoon')}
          />
          <DisabledFeatureRow
            iconName="shield-lock-outline"
            label={t('more.rows.privacyPolicy')}
            badgeLabel={t('more.badges.comingSoon')}
          />
          <SettingsRow
            iconName="information-outline"
            label={t('more.rows.appVersion')}
            value={appVersion}
            isLast
            showChevron={false}
          />
        </SettingsSection>
      </ScrollView>

      <SettingsSelectionModal
        visible={openedModal === 'theme'}
        title={t('more.modals.selectTheme')}
        options={localizedThemeOptions}
        selectedValue={preferences.theme}
        onSelect={handleSelectTheme}
        onClose={() => setOpenedModal(null)}
      />
      <SettingsSelectionModal
        visible={openedModal === 'language'}
        title={t('more.modals.selectLanguage')}
        options={localizedLanguageOptions}
        selectedValue={preferences.language}
        onSelect={handleSelectLanguage}
        onClose={() => setOpenedModal(null)}
      />
      <SettingsSelectionModal
        visible={openedModal === 'measurement'}
        title={t('more.modals.selectMeasurement')}
        options={localizedMeasurementOptions}
        selectedValue={preferences.measurementSystem}
        onSelect={handleSelectMeasurement}
        onClose={() => setOpenedModal(null)}
      />
      <CurrencyPickerModal
        visible={openedModal === 'currency'}
        title={t('more.modals.selectCurrency')}
        searchPlaceholder={t('more.currency.searchPlaceholder')}
        currencies={currencyCatalog}
        selectedCode={preferences.currencyCode}
        onSelect={handleSelectCurrency}
        onClose={() => setOpenedModal(null)}
      />
    </SafeAreaView>
  );
}
