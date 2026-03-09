import { buildApiSportsPlayerPhoto, normalizeFollowDiscoveryPlayerId } from '@footalert/app-core';

import type { FollowDiscoveryMetadata, FollowEntityKind } from '../../../lib/follows/discoveryStore.js';
import type {
  FollowDiscoveryPlayerItem,
  FollowDiscoveryTeamItem,
  PlayerSnapshot,
  TeamSnapshot,
} from '../schemas.js';

export function toSafeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function toMetadataFromSnapshot(
  entityKind: FollowEntityKind,
  entityId: string,
  snapshot: TeamSnapshot | PlayerSnapshot,
): FollowDiscoveryMetadata {
  if (entityKind === 'team') {
    const typedSnapshot = snapshot as TeamSnapshot;
    return {
      name: typedSnapshot.teamName,
      imageUrl: typedSnapshot.teamLogo,
      country: typedSnapshot.country ?? null,
    };
  }

  const typedSnapshot = snapshot as PlayerSnapshot;
  const normalizedPlayerId = normalizeFollowDiscoveryPlayerId(entityId);
  return {
    name: typedSnapshot.playerName,
    imageUrl: buildApiSportsPlayerPhoto(normalizedPlayerId),
    position: typedSnapshot.position ?? null,
    teamName: typedSnapshot.teamName ?? null,
    teamLogo: typedSnapshot.teamLogo ?? null,
    leagueName: typedSnapshot.leagueName ?? null,
  };
}

export function mapDynamicTeamDiscoveryItem(input: {
  entityId: string;
  metadata: FollowDiscoveryMetadata;
  activeFollowersCount: number;
  recentNet30d: number;
  totalFollowAddsCount: number;
}): FollowDiscoveryTeamItem {
  return {
    teamId: input.entityId,
    teamName: input.metadata.name,
    teamLogo: input.metadata.imageUrl,
    country: input.metadata.country ?? '',
    activeFollowersCount: input.activeFollowersCount,
    recentNet30d: input.recentNet30d,
    totalFollowAdds: input.totalFollowAddsCount,
  };
}

export function mapDynamicPlayerDiscoveryItem(input: {
  entityId: string;
  metadata: FollowDiscoveryMetadata;
  activeFollowersCount: number;
  recentNet30d: number;
  totalFollowAddsCount: number;
}): FollowDiscoveryPlayerItem {
  const normalizedPlayerId = normalizeFollowDiscoveryPlayerId(input.entityId);
  return {
    playerId: normalizedPlayerId,
    playerName: input.metadata.name,
    playerPhoto: buildApiSportsPlayerPhoto(normalizedPlayerId),
    position: input.metadata.position ?? '',
    teamName: input.metadata.teamName ?? '',
    teamLogo: input.metadata.teamLogo ?? '',
    leagueName: input.metadata.leagueName ?? '',
    activeFollowersCount: input.activeFollowersCount,
    recentNet30d: input.recentNet30d,
    totalFollowAdds: input.totalFollowAddsCount,
  };
}
