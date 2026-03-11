import { resolveLanguageLocaleTag } from '@/shared/i18n/languages';

export function resolveAppLocaleTag(language: string | null | undefined): string {
  return resolveLanguageLocaleTag(language);
}
