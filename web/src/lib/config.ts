export function resolveWebApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_WEB_API_BASE_URL?.trim();
  const fallback = 'http://localhost:3001/v1';
  const raw = envUrl || fallback;

  try {
    const parsedUrl = new URL(raw);
    return parsedUrl.toString().replace(/\/+$/, '');
  } catch {
    throw new Error(`Invalid VITE_WEB_API_BASE_URL value: ${raw}`);
  }
}
