import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { DEFAULT_LANGUAGE, type AppLanguage } from '@/shared/i18n/languages';
import {
  loadAppPreferences,
  updateAppPreferences,
} from '@data/storage/appPreferencesStorage';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';
import { resolveDeviceLanguage } from '@/shared/i18n/language';
import i18n, { ensureLanguageResources } from '@ui/shared/i18n';
import type {
  AppPreferences,
  MeasurementSystem,
  ThemePreference,
} from '@/shared/types/preferences.types';

type AppPreferencesContextValue = {
  preferences: AppPreferences;
  isHydrated: boolean;
  setThemePreference: (theme: ThemePreference) => Promise<void>;
  setLanguagePreference: (language: AppLanguage) => Promise<void>;
  setCurrencyCode: (currencyCode: string) => Promise<void>;
  setMeasurementSystem: (measurementSystem: MeasurementSystem) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
};

type AppPreferencesProviderProps = PropsWithChildren<{
  testHydratedPreferences?: AppPreferences;
}>;

const FALLBACK_PREFERENCES: AppPreferences = {
  theme: 'system',
  language: resolveDeviceLanguage(DEFAULT_LANGUAGE),
  currencyCode: 'EUR',
  measurementSystem: 'metric',
  notificationsEnabled: false,
  updatedAt: new Date(0).toISOString(),
};

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null);

export function AppPreferencesProvider({
  children,
  testHydratedPreferences,
}: AppPreferencesProviderProps) {
  const [preferences, setPreferences] = useState<AppPreferences>(
    testHydratedPreferences ?? FALLBACK_PREFERENCES,
  );
  const [isHydrated, setIsHydrated] = useState(Boolean(testHydratedPreferences));

  useEffect(() => {
    if (testHydratedPreferences) {
      return;
    }

    let isMounted = true;

    loadAppPreferences()
      .then(async payload => {
        await ensureLanguageResources(payload.language);

        if (!isMounted) {
          return;
        }

        setPreferences(payload);
        setIsHydrated(true);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setIsHydrated(true);
      });

    return () => {
      isMounted = false;
    };
  }, [testHydratedPreferences]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    ensureLanguageResources(preferences.language)
      .then(() => {
        if (i18n.language === preferences.language) {
          return;
        }

        return i18n.changeLanguage(preferences.language);
      })
      .catch(() => undefined);
  }, [isHydrated, preferences.language]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    getMobileTelemetry().setUserContext({
      language: preferences.language,
      measurementSystem: preferences.measurementSystem,
      notificationsEnabled: preferences.notificationsEnabled,
      currencyCode: preferences.currencyCode,
    });
  }, [
    isHydrated,
    preferences.currencyCode,
    preferences.language,
    preferences.measurementSystem,
    preferences.notificationsEnabled,
  ]);

  const applyPreferenceUpdate = useCallback(
    async (partial: Partial<Omit<AppPreferences, 'updatedAt'>>) => {
      const next = await updateAppPreferences(partial);
      setPreferences(next);
    },
    [],
  );

  const setThemePreference = useCallback(
    async (theme: ThemePreference) => {
      await applyPreferenceUpdate({ theme });
    },
    [applyPreferenceUpdate],
  );

  const setLanguagePreference = useCallback(
    async (language: AppLanguage) => {
      await applyPreferenceUpdate({ language });
    },
    [applyPreferenceUpdate],
  );

  const setCurrencyCode = useCallback(
    async (currencyCode: string) => {
      await applyPreferenceUpdate({ currencyCode });
    },
    [applyPreferenceUpdate],
  );

  const setMeasurementSystem = useCallback(
    async (measurementSystem: MeasurementSystem) => {
      await applyPreferenceUpdate({ measurementSystem });
    },
    [applyPreferenceUpdate],
  );

  const setNotificationsEnabled = useCallback(
    async (enabled: boolean) => {
      await applyPreferenceUpdate({ notificationsEnabled: enabled });
    },
    [applyPreferenceUpdate],
  );

  const value = useMemo<AppPreferencesContextValue>(
    () => ({
      preferences,
      isHydrated,
      setThemePreference,
      setLanguagePreference,
      setCurrencyCode,
      setMeasurementSystem,
      setNotificationsEnabled,
    }),
    [
      isHydrated,
      preferences,
      setCurrencyCode,
      setLanguagePreference,
      setMeasurementSystem,
      setNotificationsEnabled,
      setThemePreference,
    ],
  );

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences(): AppPreferencesContextValue {
  const context = useContext(AppPreferencesContext);
  if (!context) {
    throw new Error('useAppPreferences must be used inside AppPreferencesProvider');
  }

  return context;
}
