import type { PayloadFreshnessMeta } from './freshnessMeta.types';

export type MobileHydrationStatus = 'core_ready' | 'full_ready';

export type MobileHydrationSectionState = 'ready' | 'loading' | 'unavailable';

export type MobileHydrationSectionFreshness = 'fresh' | 'stale' | 'miss';

export type MobileHydrationSection = {
  state: MobileHydrationSectionState;
  freshness: MobileHydrationSectionFreshness;
  updatedAt: string | null;
};

export type MobileFullPayloadHydration = {
  status: MobileHydrationStatus;
  sections: Record<string, MobileHydrationSection>;
  enqueuedHeavyRefresh: boolean;
};

export type MobileProgressivePayloadMeta = {
  _meta?: PayloadFreshnessMeta;
  _hydration?: MobileFullPayloadHydration;
};

export function getHydrationSection(
  hydration: MobileFullPayloadHydration | null | undefined,
  sectionKey: string,
): MobileHydrationSection | null {
  if (!hydration) {
    return null;
  }

  const section = hydration.sections[sectionKey];
  return section ?? null;
}

export function isHydrationSectionLoading(
  hydration: MobileFullPayloadHydration | null | undefined,
  sectionKey: string,
): boolean {
  return getHydrationSection(hydration, sectionKey)?.state === 'loading';
}

export function isHydrationPending(
  hydration: MobileFullPayloadHydration | null | undefined,
): boolean {
  return hydration?.status === 'core_ready' && hydration.enqueuedHeavyRefresh;
}

export function resolveProgressiveHydrationRefetchInterval(
  hydration: MobileFullPayloadHydration | null | undefined,
  dataUpdatedAt: number,
): number | false {
  if (!isHydrationPending(hydration)) {
    return false;
  }

  const safeUpdatedAt = Number.isFinite(dataUpdatedAt) ? dataUpdatedAt : 0;
  const ageMs = safeUpdatedAt > 0 ? Math.max(0, Date.now() - safeUpdatedAt) : 0;

  if (ageMs < 15_000) {
    return 5_000;
  }

  if (ageMs < 60_000) {
    return 15_000;
  }

  if (ageMs < 180_000) {
    return 30_000;
  }

  if (ageMs < 300_000) {
    return 60_000;
  }

  return false;
}
