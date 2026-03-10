import { buildApiSportsPlayerPhoto, normalizeFollowDiscoveryPlayerId } from '@footalert/app-core';
export function toSafeNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
export function toMetadataFromSnapshot(entityKind, entityId, snapshot) {
    if (entityKind === 'team') {
        const typedSnapshot = snapshot;
        return {
            name: typedSnapshot.teamName,
            imageUrl: typedSnapshot.teamLogo,
            country: typedSnapshot.country ?? null,
        };
    }
    const typedSnapshot = snapshot;
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
export function mapDynamicTeamDiscoveryItem(input) {
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
export function mapDynamicPlayerDiscoveryItem(input) {
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
