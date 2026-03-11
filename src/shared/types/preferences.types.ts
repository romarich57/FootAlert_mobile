import type { AppLanguage } from '@/shared/i18n/languages';

export type ThemePreference = 'system' | 'light' | 'dark';
export type { AppLanguage } from '@/shared/i18n/languages';

export type MeasurementSystem = 'metric' | 'imperial';

export type NotificationPreference = 'enabled' | 'disabled';

export type AppPreferences = {
  theme: ThemePreference;
  language: AppLanguage;
  currencyCode: string;
  measurementSystem: MeasurementSystem;
  notificationsEnabled: boolean;
  updatedAt: string;
};
