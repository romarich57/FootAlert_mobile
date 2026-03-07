import { getFollowDiscoverySeeds } from '@app-core';

import type {
  FollowDiscoveryPlayerItem,
  FollowDiscoveryResponse,
  FollowDiscoverySource,
  FollowDiscoveryTeamItem,
  FollowEntityTab,
} from '@ui/features/follows/types/follows.types';
import type { OnboardingEntityCardData } from '@ui/features/onboarding/components/OnboardingEntityCard';

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

export function buildOnboardingSeedCards(step: 'teams' | 'players', limit: number): OnboardingEntityCardData[] {
  if (step === 'teams') {
    return getFollowDiscoverySeeds('team', limit).map(item => ({
      id: item.teamId,
      name: item.teamName,
      logo: item.teamLogo,
      subtitle: item.country,
      kind: 'team',
      country: item.country,
    }));
  }

  return getFollowDiscoverySeeds('player', limit).map(item => ({
    id: item.playerId,
    name: item.playerName,
    logo: item.playerPhoto,
    subtitle: item.teamName,
    kind: 'player',
    position: item.position,
    teamName: item.teamName,
    teamLogo: item.teamLogo,
    leagueName: item.leagueName,
  }));
}
