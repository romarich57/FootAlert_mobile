export function resolveAppLocaleTag(language: string | null | undefined): string {
  if (language?.startsWith('fr')) {
    return 'fr-FR';
  }

  if (language?.startsWith('en')) {
    return 'en-US';
  }

  return Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
}

