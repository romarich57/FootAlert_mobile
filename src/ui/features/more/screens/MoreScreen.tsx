import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import {
  CurrencyPickerModal,
  SettingsSelectionModal,
} from '@ui/features/more/components';
import { useAppTheme } from '@ui/app/providers/ThemeProvider';
import { useMoreSettings } from '@ui/features/more/hooks/useMoreSettings';
import type {
  LanguageOption,
  MeasurementOption,
  MoreSettingsModalKey,
  ThemeOption,
} from '@ui/features/more/types/more.types';
import { createMoreScreenStyles } from '@ui/features/more/screens/MoreScreen.styles';
import {
  InformationSectionCard,
  PermissionWarningCard,
  PreferencesSectionCard,
} from '@ui/features/more/screens/MoreScreenSections';

type MoreFeedItem =
  | { type: 'preferences'; key: 'preferences' }
  | { type: 'warning'; key: 'warning' }
  | { type: 'information'; key: 'information' };

export function MoreScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createMoreScreenStyles(colors), [colors]);
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
    isErasingData,
    isUpdatingConsent,
    mobileConsentStatus,
    permissionDenied,
    hasPrivacyPolicyUrl,
    hasTermsOfUseUrl,
    hasSupportUrl,
    hasFollowUsUrl,
    hasRateAppUrl,
    setPermissionDenied,
    handleThemeChange,
    handleLanguageChange,
    handleCurrencyChange,
    handleMeasurementChange,
    handleNotificationsChange,
    openPrivacyPolicy,
    openTermsOfUse,
    openSupport,
    openFollowUs,
    openRateApp,
    openPrivacyPreferences,
    erasePersonalData,
    openSystemNotificationSettings,
  } = useMoreSettings({
    loadCurrencyCatalog: openedModal === 'currency',
  });

  const localizedThemeOptions = useMemo(
    () => themeOptions.map(option => ({ ...option, label: t(`more.values.theme.${option.value}`) })),
    [t, themeOptions],
  );

  const localizedLanguageOptions = useMemo(
    () => languageOptions.map(option => ({ ...option, label: t(`more.values.language.${option.value}`) })),
    [languageOptions, t],
  );

  const localizedMeasurementOptions = useMemo(
    () => measurementOptions.map(option => ({ ...option, label: t(`more.values.measurement.${option.value}`) })),
    [measurementOptions, t],
  );

  const themeValue = t(`more.values.theme.${preferences.theme}`);
  const languageValue = t(`more.values.language.${preferences.language}`);
  const measurementValue = t(`more.values.measurement.${preferences.measurementSystem}`);
  const notificationsValue = t(
    preferences.notificationsEnabled ? 'more.values.notifications.on' : 'more.values.notifications.off',
  );
  const privacyConsentValue = t(`more.values.consent.${mobileConsentStatus}`);
  const eraseDataValue = isErasingData ? t('more.values.delete.inProgress') : undefined;
  const currencyValue = currentCurrency
    ? `${currentCurrency.code} · ${currentCurrency.symbol}`
    : preferences.currencyCode;

  const feedItems = useMemo<MoreFeedItem[]>(
    () => [
      { type: 'preferences', key: 'preferences' },
      ...(permissionDenied ? [{ type: 'warning', key: 'warning' } as const] : []),
      { type: 'information', key: 'information' },
    ],
    [permissionDenied],
  );

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
    (code: string) => {
      handleCurrencyChange(code).catch(() => undefined);
      setOpenedModal(null);
    },
    [handleCurrencyChange],
  );

  const renderItem = useCallback<ListRenderItem<MoreFeedItem>>(
    ({ item }) => {
      if (item.type === 'preferences') {
        return (
          <PreferencesSectionCard
            preferences={preferences}
            themeValue={themeValue}
            languageValue={languageValue}
            currencyValue={currencyValue}
            measurementValue={measurementValue}
            notificationsValue={notificationsValue}
            isUpdatingNotifications={isUpdatingNotifications}
            primaryColor={colors.primary}
            borderColor={colors.border}
            mutedColor={colors.textMuted}
            primaryContrast={colors.primaryContrast}
            onOpenTheme={() => setOpenedModal('theme')}
            onOpenLanguage={() => setOpenedModal('language')}
            onOpenCurrency={() => setOpenedModal('currency')}
            onOpenMeasurement={() => setOpenedModal('measurement')}
            onToggleNotifications={value => {
              handleNotificationsChange(value).catch(() => undefined);
            }}
          />
        );
      }

      if (item.type === 'warning') {
        return (
          <PermissionWarningCard
            styles={styles}
            onOpenSettings={() => {
              setPermissionDenied(false);
              openSystemNotificationSettings().catch(() => undefined);
            }}
          />
        );
      }

      return (
        <InformationSectionCard
          appVersion={appVersion}
          hasPrivacyPolicyUrl={hasPrivacyPolicyUrl}
          hasTermsOfUseUrl={hasTermsOfUseUrl}
          hasSupportUrl={hasSupportUrl}
          hasFollowUsUrl={hasFollowUsUrl}
          hasRateAppUrl={hasRateAppUrl}
          privacyConsentValue={privacyConsentValue}
          eraseDataValue={eraseDataValue}
          isErasingData={isErasingData}
          isUpdatingConsent={isUpdatingConsent}
          onOpenFollowUs={() => {
            openFollowUs().catch(() => undefined);
          }}
          onOpenSupport={() => {
            openSupport().catch(() => undefined);
          }}
          onOpenPrivacyPolicy={() => {
            openPrivacyPolicy().catch(() => undefined);
          }}
          onOpenTermsOfUse={() => {
            openTermsOfUse().catch(() => undefined);
          }}
          onOpenPrivacyPreferences={() => {
            openPrivacyPreferences().catch(() => undefined);
          }}
          onDeleteMyData={() => {
            Alert.alert(
              t('more.deleteData.confirmTitle'),
              t('more.deleteData.confirmMessage'),
              [
                {
                  text: t('actions.cancel'),
                  style: 'cancel',
                },
                {
                  text: t('more.deleteData.confirmAction'),
                  style: 'destructive',
                  onPress: () => {
                    erasePersonalData()
                      .then(isSuccess => {
                        Alert.alert(
                          isSuccess ? t('more.deleteData.successTitle') : t('more.deleteData.errorTitle'),
                          isSuccess ? t('more.deleteData.successMessage') : t('more.deleteData.errorMessage'),
                        );
                      })
                      .catch(() => {
                        Alert.alert(t('more.deleteData.errorTitle'), t('more.deleteData.errorMessage'));
                      });
                  },
                },
              ],
              { cancelable: true },
            );
          }}
          onOpenRateApp={() => {
            openRateApp().catch(() => undefined);
          }}
        />
      );
    },
    [
      appVersion,
      colors.border,
      colors.primary,
      colors.primaryContrast,
      colors.textMuted,
      currencyValue,
      handleNotificationsChange,
      hasFollowUsUrl,
      hasPrivacyPolicyUrl,
      hasRateAppUrl,
      hasTermsOfUseUrl,
      hasSupportUrl,
      isErasingData,
      isUpdatingConsent,
      isUpdatingNotifications,
      languageValue,
      measurementValue,
      notificationsValue,
      openPrivacyPreferences,
      openFollowUs,
      openPrivacyPolicy,
      openRateApp,
      openTermsOfUse,
      openSupport,
      openSystemNotificationSettings,
      preferences,
      privacyConsentValue,
      eraseDataValue,
      erasePersonalData,
      setPermissionDenied,
      styles,
      t,
      themeValue,
    ],
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
      <FlashList
        data={feedItems}
        keyExtractor={item => item.key}
        renderItem={renderItem}
        estimatedItemSize={360}
        ListHeaderComponent={<View style={styles.listHeaderSpacer} />}
        contentContainerStyle={styles.listContent}
      />

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
