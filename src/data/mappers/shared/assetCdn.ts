import { appEnv } from '@data/config/env';

const API_SPORTS_MEDIA_HOST = 'media.api-sports.io';

function normalizeUrl(rawUrl: string | null | undefined): string | null {
  if (typeof rawUrl !== 'string') {
    return null;
  }

  const trimmed = rawUrl.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function rewriteAssetUrl(rawUrl: string | null | undefined): string | null {
  const normalizedUrl = normalizeUrl(rawUrl);
  if (!normalizedUrl) {
    return null;
  }

  if (!appEnv.assetCdnRewriteEnabled || !appEnv.assetCdnBaseUrl) {
    return normalizedUrl;
  }

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(normalizedUrl);
  } catch {
    return normalizedUrl;
  }

  if (sourceUrl.hostname !== API_SPORTS_MEDIA_HOST) {
    return normalizedUrl;
  }

  let cdnBaseUrl: URL;
  try {
    cdnBaseUrl = new URL(appEnv.assetCdnBaseUrl);
  } catch {
    return normalizedUrl;
  }

  const cdnBasePath = cdnBaseUrl.pathname.replace(/\/+$/, '');
  const sourcePath = sourceUrl.pathname.startsWith('/') ? sourceUrl.pathname : `/${sourceUrl.pathname}`;

  return `${cdnBaseUrl.origin}${cdnBasePath}${sourcePath}${sourceUrl.search}`;
}

export function normalizeAssetImageUri(rawUrl: string | null | undefined): string {
  return rewriteAssetUrl(rawUrl) ?? '';
}
