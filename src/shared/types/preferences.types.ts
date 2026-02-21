export type ThemePreference = 'system' | 'light' | 'dark';

export type AppLanguage = 'fr' | 'en';

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
