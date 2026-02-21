import CurrencyCodes from 'currency-codes';

import type { AppLanguage } from '@/shared/types/preferences.types';

export type CurrencyCatalogItem = {
  code: string;
  name: string;
  symbol: string;
  fractionDigits: number;
};

const FALLBACK_CURRENCY = 'EUR';
const SUPPORTED_LANGUAGES: AppLanguage[] = ['fr', 'en'];

type IntlWithDisplayNames = typeof Intl & {
  DisplayNames?: new (locales?: string | string[], options?: { type: 'currency' }) => {
    of?: (code: string) => string | undefined;
  };
};

function normalizeLanguage(language: string): AppLanguage {
  if (SUPPORTED_LANGUAGES.includes(language as AppLanguage)) {
    return language as AppLanguage;
  }

  return 'fr';
}

function localeFromLanguage(language: AppLanguage): string {
  return language === 'fr' ? 'fr-FR' : 'en-US';
}

function resolveCurrencyName(code: string, fallbackName: string, localeTag: string): string {
  const intlWithDisplayNames = Intl as IntlWithDisplayNames;
  const DisplayNamesCtor = intlWithDisplayNames.DisplayNames;
  if (!DisplayNamesCtor) {
    return fallbackName || code;
  }

  try {
    const names = new DisplayNamesCtor(localeTag, { type: 'currency' });
    const localizedName = names.of?.(code);
    return localizedName || fallbackName || code;
  } catch {
    return fallbackName || code;
  }
}

function resolveCurrencySymbol(code: string, localeTag: string): string {
  try {
    const parts = new Intl.NumberFormat(localeTag, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(1);

    const symbol = parts.find(part => part.type === 'currency')?.value;
    return symbol || code;
  } catch {
    return code;
  }
}

function buildCatalog(language: AppLanguage): CurrencyCatalogItem[] {
  const localeTag = localeFromLanguage(language);

  return CurrencyCodes.data
    .filter(entry => Boolean(entry.code))
    .map(entry => {
      const code = String(entry.code).toUpperCase();
      const name = resolveCurrencyName(code, entry.currency, localeTag);
      const symbol = resolveCurrencySymbol(code, localeTag);

      return {
        code,
        name,
        symbol,
        fractionDigits: Number.isFinite(entry.digits) ? entry.digits : 2,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, localeTag));
}

const catalogCache = new Map<AppLanguage, CurrencyCatalogItem[]>();

function getOrCreateCatalog(language: string): CurrencyCatalogItem[] {
  const normalizedLanguage = normalizeLanguage(language);
  const cached = catalogCache.get(normalizedLanguage);
  if (cached) {
    return cached;
  }

  const catalog = buildCatalog(normalizedLanguage);
  catalogCache.set(normalizedLanguage, catalog);
  return catalog;
}

export function getCurrencyCatalog(language: string): CurrencyCatalogItem[] {
  return getOrCreateCatalog(language);
}

export function getCurrencyByCode(
  code: string,
  language: string,
): CurrencyCatalogItem | null {
  const normalizedCode = String(code).trim().toUpperCase();
  if (!normalizedCode) {
    return null;
  }

  const catalog = getOrCreateCatalog(language);
  return catalog.find(item => item.code === normalizedCode) ?? null;
}

export function resolveSafeCurrencyCode(code: string | null | undefined): string {
  const normalizedCode = String(code ?? '').trim().toUpperCase();
  if (!normalizedCode) {
    return FALLBACK_CURRENCY;
  }

  return CurrencyCodes.code(normalizedCode) ? normalizedCode : FALLBACK_CURRENCY;
}

