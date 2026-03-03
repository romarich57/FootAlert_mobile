import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import { useTranslation } from 'react-i18next';

import { appEnv } from '@data/config/env';
import { getAppVersionLabel } from '@data/config/appMeta';
import {
  openMobileConsentPreferences,
  syncMobileConsentStatus,
  type MobileConsentStatus,
} from '@data/privacy/mobileConsent';
import {
  getCurrencySymbol,
  getCurrencyCatalog,
  resolveSafeCurrencyCode,
} from '@data/config/currencyCatalog';
import {
  getNotificationsPermissionStatus,
  isNotificationsPermissionGranted,
  openNotificationsSettings,
  requestNotificationsPermission,
} from '@data/permissions/notificationsPermission';
import { openStoreReviewPage } from '@data/reviews/inAppReview';
import { eraseMobilePrivacyData } from '@data/security/mobileSessionAuth';
import { incrementPositiveEventCount } from '@data/storage/reviewPromptStorage';
import { useAppPreferences } from '@ui/app/providers/AppPreferencesProvider';
import type {
  LanguageOption,
  MeasurementOption,
  ThemeOption,
} from '@ui/features/more/types/more.types';

type UseMoreSettingsOptions = {
  loadCurrencyCatalog?: boolean;
};

export function useMoreSettings(options: UseMoreSettingsOptions = {}) {
  const { t } = useTranslation();
  const shouldLoadCurrencyCatalog = options.loadCurrencyCatalog === true;
  const {
    preferences,
    isHydrated,
    setCurrencyCode,
    setLanguagePreference,
    setMeasurementSystem,
    setNotificationsEnabled,
    setThemePreference,
  } = useAppPreferences();

  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isErasingData, setIsErasingData] = useState(false);
  const [isUpdatingConsent, setIsUpdatingConsent] = useState(false);
  const [mobileConsentStatus, setMobileConsentStatus] = useState<MobileConsentStatus>('unknown');
  const normalizedCurrencyCode = useMemo(
    () => resolveSafeCurrencyCode(preferences.currencyCode),
    [preferences.currencyCode],
  );

  const appVersion = useMemo(() => getAppVersionLabel(), []);

  const currencyCatalog = useMemo(
    () => (shouldLoadCurrencyCatalog ? getCurrencyCatalog(preferences.language) : []),
    [preferences.language, shouldLoadCurrencyCatalog],
  );

  const currentCurrency = useMemo(
    () => ({
      code: normalizedCurrencyCode,
      name: normalizedCurrencyCode,
      symbol: getCurrencySymbol(normalizedCurrencyCode, preferences.language),
      fractionDigits: 2,
    }),
    [normalizedCurrencyCode, preferences.language],
  );

  const themeOptions = useMemo<ThemeOption[]>(
    () => [
      { value: 'system', label: t('more.values.theme.system') },
      { value: 'light', label: t('more.values.theme.light') },
      { value: 'dark', label: t('more.values.theme.dark') },
    ],
    [t],
  );

  const languageOptions = useMemo<LanguageOption[]>(
    () => [
      { value: 'fr', label: t('more.values.language.fr') },
      { value: 'en', label: t('more.values.language.en') },
    ],
    [t],
  );

  const measurementOptions = useMemo<MeasurementOption[]>(
    () => [
      { value: 'metric', label: t('more.values.measurement.metric') },
      { value: 'imperial', label: t('more.values.measurement.imperial') },
    ],
    [t],
  );

  const handleThemeChange = useCallback(
    async (value: ThemeOption['value']) => {
      await setThemePreference(value);
    },
    [setThemePreference],
  );

  const handleLanguageChange = useCallback(
    async (value: LanguageOption['value']) => {
      await setLanguagePreference(value);
    },
    [setLanguagePreference],
  );

  const handleCurrencyChange = useCallback(
    async (value: string) => {
      await setCurrencyCode(resolveSafeCurrencyCode(value));
    },
    [setCurrencyCode],
  );

  const handleMeasurementChange = useCallback(
    async (value: MeasurementOption['value']) => {
      await setMeasurementSystem(value);
    },
    [setMeasurementSystem],
  );

  const handleNotificationsChange = useCallback(
    async (enabled: boolean) => {
      setIsUpdatingNotifications(true);
      setPermissionDenied(false);

      try {
        if (!enabled) {
          await setNotificationsEnabled(false);
          return;
        }

        const requestStatus = await requestNotificationsPermission();
        if (isNotificationsPermissionGranted(requestStatus)) {
          await setNotificationsEnabled(true);
          incrementPositiveEventCount().catch(() => undefined);
          return;
        }

        await setNotificationsEnabled(false);
        setPermissionDenied(true);
      } finally {
        setIsUpdatingNotifications(false);
      }
    },
    [setNotificationsEnabled],
  );

  const refreshNotificationsFromSystem = useCallback(async () => {
    const currentStatus = await getNotificationsPermissionStatus();
    await setNotificationsEnabled(isNotificationsPermissionGranted(currentStatus));
  }, [setNotificationsEnabled]);

  const openSystemNotificationSettings = useCallback(async () => {
    await openNotificationsSettings();
    await refreshNotificationsFromSystem();
  }, [refreshNotificationsFromSystem]);

  const openExternalUrl = useCallback(async (url?: string) => {
    if (!url) {
      return false;
    }

    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      return false;
    }

    await Linking.openURL(url);
    return true;
  }, []);

  const openPrivacyPolicy = useCallback(async () => {
    return openExternalUrl(appEnv.privacyPolicyUrl);
  }, [openExternalUrl]);

  const openTermsOfUse = useCallback(async () => {
    return openExternalUrl(appEnv.termsOfUseUrl);
  }, [openExternalUrl]);

  const openSupport = useCallback(async () => {
    return openExternalUrl(appEnv.supportUrl);
  }, [openExternalUrl]);

  const openFollowUs = useCallback(async () => {
    return openExternalUrl(appEnv.followUsUrl);
  }, [openExternalUrl]);

  const openRateApp = useCallback(async () => {
    return openStoreReviewPage({
      appStoreUrl: appEnv.appStoreUrl,
      playStoreUrl: appEnv.playStoreUrl,
    });
  }, []);

  const openPrivacyPreferences = useCallback(async () => {
    setIsUpdatingConsent(true);
    try {
      const snapshot = await openMobileConsentPreferences();
      setMobileConsentStatus(snapshot.status);
      return snapshot.status;
    } finally {
      setIsUpdatingConsent(false);
    }
  }, []);

  const erasePersonalData = useCallback(async () => {
    if (isErasingData) {
      return false;
    }

    setIsErasingData(true);
    try {
      await eraseMobilePrivacyData();
      return true;
    } finally {
      setIsErasingData(false);
    }
  }, [isErasingData]);

  useEffect(() => {
    syncMobileConsentStatus()
      .then(snapshot => {
        setMobileConsentStatus(snapshot.status);
      })
      .catch(() => undefined);
  }, []);

  const hasPrivacyPolicyUrl = Boolean(appEnv.privacyPolicyUrl);
  const hasTermsOfUseUrl = Boolean(appEnv.termsOfUseUrl);
  const hasSupportUrl = Boolean(appEnv.supportUrl);
  const hasFollowUsUrl = Boolean(appEnv.followUsUrl);
  const hasRateAppUrl = Boolean(appEnv.appStoreUrl || appEnv.playStoreUrl);

  return {
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
  };
}
