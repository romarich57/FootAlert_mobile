const DEFAULT_BFF_BASE_URL = 'https://api.footalert.romdev.cloud/v1';
const DEFAULT_SUPPORT_EMAIL = 'support@footalert.romdev.cloud';

export function resolveBffBaseUrl(): string {
  const raw = import.meta.env.VITE_BFF_BASE_URL?.trim() || DEFAULT_BFF_BASE_URL;

  try {
    const parsed = new URL(raw);
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    throw new Error(`Invalid VITE_BFF_BASE_URL value: ${raw}`);
  }
}

export function resolveSupportEmail(): string {
  return import.meta.env.VITE_SUPPORT_EMAIL?.trim() || DEFAULT_SUPPORT_EMAIL;
}

export function resolveSocialLinks() {
  return {
    x: import.meta.env.VITE_X_URL?.trim() || 'https://x.com/footalert',
    instagram: import.meta.env.VITE_INSTAGRAM_URL?.trim() || 'https://instagram.com/footalert',
    linkedin: import.meta.env.VITE_LINKEDIN_URL?.trim() || 'https://linkedin.com/company/footalert',
  };
}
