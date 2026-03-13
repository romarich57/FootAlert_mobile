export type HydrationStatus = 'core_ready' | 'full_ready';

export type HydrationSectionState = 'ready' | 'loading' | 'unavailable';

export type HydrationSectionFreshness = 'fresh' | 'stale' | 'miss';

export type HydrationSection = {
  state: HydrationSectionState;
  freshness: HydrationSectionFreshness;
  updatedAt: string | null;
};

export type FullPayloadHydration = {
  status: HydrationStatus;
  sections: Record<string, HydrationSection>;
  enqueuedHeavyRefresh: boolean;
};

export function toHydrationUpdatedAt(value: Date | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

export function buildHydrationSection(input: {
  state: HydrationSectionState;
  freshness: HydrationSectionFreshness;
  updatedAt?: Date | null;
}): HydrationSection {
  return {
    state: input.state,
    freshness: input.freshness,
    updatedAt: toHydrationUpdatedAt(input.updatedAt),
  };
}

export function buildFullPayloadHydration(input: {
  sections: Record<string, HydrationSection>;
  enqueuedHeavyRefresh: boolean;
}): FullPayloadHydration {
  const status = Object.values(input.sections).every(section => section.state !== 'loading')
    ? 'full_ready'
    : 'core_ready';

  return {
    status,
    sections: input.sections,
    enqueuedHeavyRefresh: input.enqueuedHeavyRefresh,
  };
}

