import { getCountry, getCurrencies } from 'react-native-localize';

import {
  isAppLanguage,
  DEFAULT_LANGUAGE,
  type AppLanguage,
} from '@/shared/i18n/languages';
import { resolveSafeCurrencyCode } from '@data/config/currencyCatalog';
import {
  getNotificationsPermissionStatus,
  isNotificationsPermissionGranted,
} from '@data/permissions/notificationsPermission';
import { getJsonValue, setJsonValue } from '@data/storage/asyncStorage';
import type {
  AppPreferences,
  MeasurementSystem,
  ThemePreference,
} from '@/shared/types/preferences.types';
import { resolveDeviceLanguage } from '@/shared/i18n/language';

export const APP_PREFERENCES_STORAGE_KEY = 'app_preferences_v1';

const IMPERIAL_COUNTRIES = new Set(['US', 'LR', 'MM']);

function isValidThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function isValidLanguage(value: unknown): value is AppLanguage {
  return isAppLanguage(value);
}

function isValidMeasurementSystem(value: unknown): value is MeasurementSystem {
  return value === 'metric' || value === 'imperial';
}

function buildUpdatedAt(): string {
  return new Date().toISOString();
}

function resolveMeasurementSystemFromCountry(countryCode: string): MeasurementSystem {
  return IMPERIAL_COUNTRIES.has(countryCode) ? 'imperial' : 'metric';
}

function resolveCurrencyFromLocale(): string {
  const [deviceCurrency] = getCurrencies();
  return resolveSafeCurrencyCode(deviceCurrency);
}

type PersistedAppPreferences = Partial<AppPreferences> | null;

function sanitizePersistedPreferences(
  payload: PersistedAppPreferences,
  defaults: AppPreferences,
): AppPreferences {
  if (!payload || typeof payload !== 'object') {
    return defaults;
  }

  return {
    theme: isValidThemePreference(payload.theme) ? payload.theme : defaults.theme,
    language: isValidLanguage(payload.language) ? payload.language : defaults.language,
    currencyCode: resolveSafeCurrencyCode(payload.currencyCode),
    measurementSystem: isValidMeasurementSystem(payload.measurementSystem)
      ? payload.measurementSystem
      : defaults.measurementSystem,
    notificationsEnabled:
      typeof payload.notificationsEnabled === 'boolean'
        ? payload.notificationsEnabled
        : defaults.notificationsEnabled,
    updatedAt:
      typeof payload.updatedAt === 'string' && payload.updatedAt.length > 0
        ? payload.updatedAt
        : defaults.updatedAt,
  };
}

async function persistPreferences(preferences: AppPreferences): Promise<AppPreferences> {
  await setJsonValue<AppPreferences>(APP_PREFERENCES_STORAGE_KEY, preferences);
  return preferences;
}

export async function resolveDefaultPreferencesFromLocale(): Promise<AppPreferences> {
  const permissionStatus = await getNotificationsPermissionStatus();
  const notificationsEnabled = isNotificationsPermissionGranted(permissionStatus);
  const countryCode = getCountry();

  return {
    theme: 'system',
    language: resolveDeviceLanguage(DEFAULT_LANGUAGE),
    currencyCode: resolveCurrencyFromLocale(),
    measurementSystem: resolveMeasurementSystemFromCountry(countryCode),
    notificationsEnabled,
    updatedAt: buildUpdatedAt(),
  };
}

export async function loadAppPreferences(): Promise<AppPreferences> {
  const defaults = await resolveDefaultPreferencesFromLocale();
  const payload = await getJsonValue<PersistedAppPreferences>(APP_PREFERENCES_STORAGE_KEY);
  const normalized = sanitizePersistedPreferences(payload, defaults);

  if (!payload || JSON.stringify(payload) !== JSON.stringify(normalized)) {
    await persistPreferences(normalized);
  }

  return normalized;
}

export async function saveAppPreferences(preferences: AppPreferences): Promise<AppPreferences> {
  const defaults = await resolveDefaultPreferencesFromLocale();
  const normalized = sanitizePersistedPreferences(preferences, defaults);
  const nextPreferences = {
    ...normalized,
    updatedAt: buildUpdatedAt(),
  };
  return persistPreferences(nextPreferences);
}

export async function updateAppPreferences(
  partial: Partial<Omit<AppPreferences, 'updatedAt'>>,
): Promise<AppPreferences> {
  const current = await loadAppPreferences();
  const merged = {
    ...current,
    ...partial,
  };
  return saveAppPreferences(merged);
}
