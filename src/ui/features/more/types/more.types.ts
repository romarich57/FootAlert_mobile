import type { AppLanguage, MeasurementSystem, ThemePreference } from '@/shared/types/preferences.types';

export type MoreSettingsModalKey = 'theme' | 'language' | 'currency' | 'measurement' | null;

export type SettingsSelectionOption<TValue extends string> = {
  value: TValue;
  label: string;
};

export type ThemeOption = SettingsSelectionOption<ThemePreference>;

export type LanguageOption = SettingsSelectionOption<AppLanguage>;

export type MeasurementOption = SettingsSelectionOption<MeasurementSystem>;
