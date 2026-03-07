import type {
  FollowDiscoveryPlayerItem,
  FollowDiscoveryTeamItem,
} from '@ui/features/follows/types/follows.types';

export function isFollowDiscoveryTeamItem(
  item: FollowDiscoveryTeamItem | FollowDiscoveryPlayerItem | null | undefined,
): item is FollowDiscoveryTeamItem {
  const candidate = item as Partial<FollowDiscoveryTeamItem> | null | undefined;
  return (
    typeof candidate?.teamId === 'string' &&
    typeof candidate.teamName === 'string' &&
    typeof candidate.teamLogo === 'string' &&
    typeof candidate.country === 'string'
  );
}

export function isFollowDiscoveryPlayerItem(
  item: FollowDiscoveryTeamItem | FollowDiscoveryPlayerItem | null | undefined,
): item is FollowDiscoveryPlayerItem {
  const candidate = item as Partial<FollowDiscoveryPlayerItem> | null | undefined;
  return (
    typeof candidate?.playerId === 'string' &&
    typeof candidate.playerName === 'string' &&
    typeof candidate.playerPhoto === 'string' &&
    typeof candidate.position === 'string' &&
    typeof candidate.teamName === 'string' &&
    typeof candidate.teamLogo === 'string' &&
    typeof candidate.leagueName === 'string'
  );
}
