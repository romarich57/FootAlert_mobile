import { getFollowDiscoverySeeds } from '@app-core';

import type {
  FollowDiscoveryPlayerItem,
  FollowDiscoveryResponse,
  FollowDiscoverySource,
  FollowDiscoveryTeamItem,
  FollowEntityTab,
} from '@ui/features/follows/types/follows.types';
import type { OnboardingEntityCardData } from '@ui/features/onboarding/components/OnboardingEntityCard';

function buildSeedMeta(): { source: FollowDiscoverySource } {
  return {
    source: 'static_seed',
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
    return {
      items: getFollowDiscoverySeeds('team', limit) as FollowDiscoveryTeamItem[],
      meta: buildSeedMeta(),
    };
  }

  return {
    items: getFollowDiscoverySeeds('player', limit) as FollowDiscoveryPlayerItem[],
    meta: buildSeedMeta(),
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
