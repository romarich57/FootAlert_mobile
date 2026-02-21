import { useCallback, useMemo, useState } from 'react';

import { getAppVersionLabel } from '@data/config/appMeta';
import {
  getCurrencyByCode,
  getCurrencyCatalog,
  resolveSafeCurrencyCode,
} from '@data/config/currencyCatalog';
import {
  getNotificationsPermissionStatus,
  isNotificationsPermissionGranted,
  openNotificationsSettings,
  requestNotificationsPermission,
} from '@data/permissions/notificationsPermission';
import { useAppPreferences } from '@ui/app/providers/AppPreferencesProvider';
import type {
  LanguageOption,
  MeasurementOption,
  ThemeOption,
} from '@ui/features/more/types/more.types';

export function useMoreSettings() {
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

  const appVersion = useMemo(() => getAppVersionLabel(), []);

  const currencyCatalog = useMemo(
    () => getCurrencyCatalog(preferences.language),
    [preferences.language],
  );

  const currentCurrency = useMemo(
    () => getCurrencyByCode(preferences.currencyCode, preferences.language),
    [preferences.currencyCode, preferences.language],
  );

  const themeOptions = useMemo<ThemeOption[]>(
    () => [
      { value: 'system', label: 'system' },
      { value: 'light', label: 'light' },
      { value: 'dark', label: 'dark' },
    ],
    [],
  );

  const languageOptions = useMemo<LanguageOption[]>(
    () => [
      { value: 'fr', label: 'fr' },
      { value: 'en', label: 'en' },
    ],
    [],
  );

  const measurementOptions = useMemo<MeasurementOption[]>(
    () => [
      { value: 'metric', label: 'metric' },
      { value: 'imperial', label: 'imperial' },
    ],
    [],
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
    permissionDenied,
    setPermissionDenied,
    handleThemeChange,
    handleLanguageChange,
    handleCurrencyChange,
    handleMeasurementChange,
    handleNotificationsChange,
    openSystemNotificationSettings,
  };
}
