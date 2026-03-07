import { getFollowDiscoverySeeds } from '@app-core';

import type {
  FollowDiscoveryPlayerItem,
  FollowDiscoveryResponse,
  FollowDiscoveryTeamItem,
  FollowEntityTab,
} from '@ui/features/follows/types/follows.types';

export const DISCOVERY_SEED_REFRESH_AFTER_MS = 1_500;

function buildSeedMeta(seedCount: number): FollowDiscoveryResponse<unknown>['meta'] {
  return {
    source: 'static_seed',
    complete: false,
    seedCount,
    generatedAt: new Date().toISOString(),
    refreshAfterMs: DISCOVERY_SEED_REFRESH_AFTER_MS,
  };
}

export function buildFollowDiscoveryPlaceholderResponse(
  tab: 'teams',
  limit: number,
): FollowDiscoveryResponse<FollowDiscoveryTeamItem>;
export function buildFollowDiscoveryPlaceholderResponse(
  tab: 'players',
  limit: number,
): FollowDiscoveryResponse<FollowDiscoveryPlayerItem>;
export function buildFollowDiscoveryPlaceholderResponse(
  tab: FollowEntityTab,
  limit: number,
):
  | FollowDiscoveryResponse<FollowDiscoveryTeamItem>
  | FollowDiscoveryResponse<FollowDiscoveryPlayerItem>;
export function buildFollowDiscoveryPlaceholderResponse(
  tab: FollowEntityTab,
  limit: number,
):
  | FollowDiscoveryResponse<FollowDiscoveryTeamItem>
  | FollowDiscoveryResponse<FollowDiscoveryPlayerItem> {
  if (tab === 'teams') {
    const items = getFollowDiscoverySeeds('team', limit) as FollowDiscoveryTeamItem[];
    return {
      items,
      meta: buildSeedMeta(items.length),
    };
  }

  const items = getFollowDiscoverySeeds('player', limit) as FollowDiscoveryPlayerItem[];
  return {
    items,
    meta: buildSeedMeta(items.length),
  };
}
