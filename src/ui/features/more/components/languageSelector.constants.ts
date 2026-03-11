import {
  getLanguageDefinition,
  RELEASED_LANGUAGE_CODES,
  type AppLanguage,
} from '@/shared/i18n/languages';
import type { SettingsSelectionOption } from '@ui/features/more/types/more.types';

export const LANGUAGE_SELECTOR_OPTIONS: readonly SettingsSelectionOption<AppLanguage>[] =
  RELEASED_LANGUAGE_CODES.map(code => ({
    value: code,
    label: getLanguageDefinition(code).nativeLabel,
  }));

export function getLanguageNativeLabel(language: AppLanguage): string {
  return getLanguageDefinition(language).nativeLabel;
}
