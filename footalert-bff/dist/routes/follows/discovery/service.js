import { buildApiSportsPlayerPhoto, normalizeFollowDiscoveryPlayerId } from '@footalert/app-core';
import { apiFootballGet } from '../../../lib/apiFootballClient.js';
import { primeCacheValue } from '../../../lib/cache.js';
import { mapWithConcurrency } from '../../../lib/concurrency/mapWithConcurrency.js';
import { FOLLOW_DISCOVERY_CACHE_TTL_MS, FOLLOW_DISCOVERY_MAX_LEAGUE_COUNT, FOLLOW_DISCOVERY_METADATA_STALE_MS, FOLLOW_DISCOVERY_PARTIAL_REFRESH_AFTER_MS, FOLLOW_DISCOVERY_PLAYERS_BLOCKING_LEAGUE_COUNT, FOLLOW_DISCOVERY_TEAMS_BLOCKING_LEAGUE_COUNT, TRENDS_MAX_CONCURRENCY, TOP_COMPETITIONS, } from '../constants.js';
import { mapDynamicPlayerDiscoveryItem, mapDynamicTeamDiscoveryItem, toSafeNumber, } from './mappers.js';
export function getCurrentSeasonYear(now = new Date()) {
    return now.getUTCMonth() + 1 >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}
function getLegacyDiscoveryLeagueIds(maxLeagueIds = FOLLOW_DISCOVERY_MAX_LEAGUE_COUNT) {
    return TOP_COMPETITIONS
        .filter(item => item.type === 'League')
        .slice(0, Math.max(0, maxLeagueIds))
        .map(item => item.competitionId);
}
export async function loadLegacyTeamDiscovery(limit, season, logger, maxLeagueIds = FOLLOW_DISCOVERY_TEAMS_BLOCKING_LEAGUE_COUNT) {
    const leagueIds = getLegacyDiscoveryLeagueIds(maxLeagueIds);
    if (limit <= 0 || leagueIds.length === 0) {
        return [];
    }
    const responses = await mapWithConcurrency(leagueIds, TRENDS_MAX_CONCURRENCY, leagueId => apiFootballGet(`/standings?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}`).catch(error => {
        logger?.warn({
            leagueId,
            err: error instanceof Error ? error.message : String(error),
        }, 'follows.discovery.legacy_team_failed');
        return { response: [] };
    }));
    const items = [];
    const seen = new Set();
    for (const payload of responses) {
        for (const leagueItem of payload.response ?? []) {
            const standing = leagueItem.league?.standings?.[0] ?? [];
            for (const row of standing) {
                const teamId = String(row.team?.id ?? '').trim();
                const teamName = row.team?.name?.trim() ?? '';
                if (!teamId || !teamName || seen.has(teamId)) {
                    continue;
                }
                seen.add(teamId);
                items.push({
                    teamId,
                    teamName,
                    teamLogo: row.team?.logo ?? '',
                    country: '',
                    activeFollowersCount: 0,
                    recentNet30d: 0,
                    totalFollowAdds: 0,
                });
                if (items.length >= limit) {
                    return items;
                }
            }
        }
    }
    return items;
}
export async function loadLegacyPlayerDiscovery(limit, season, logger, maxLeagueIds = FOLLOW_DISCOVERY_PLAYERS_BLOCKING_LEAGUE_COUNT) {
    const leagueIds = getLegacyDiscoveryLeagueIds(maxLeagueIds);
    if (limit <= 0 || leagueIds.length === 0) {
        return [];
    }
    const responses = await mapWithConcurrency(leagueIds, TRENDS_MAX_CONCURRENCY, leagueId => apiFootballGet(`/players/topscorers?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}`).catch(error => {
        logger?.warn({
            leagueId,
            err: error instanceof Error ? error.message : String(error),
        }, 'follows.discovery.legacy_player_failed');
        return { response: [] };
    }));
    const items = [];
    const seen = new Set();
    for (const payload of responses) {
        for (const item of payload.response ?? []) {
            const playerId = String(item.player?.id ?? '').trim();
            const normalizedPlayerId = normalizeFollowDiscoveryPlayerId(playerId);
            const playerName = item.player?.name?.trim() ?? '';
            if (!normalizedPlayerId || !playerName || seen.has(normalizedPlayerId)) {
                continue;
            }
            const firstStats = item.statistics?.[0];
            seen.add(normalizedPlayerId);
            items.push({
                playerId: normalizedPlayerId,
                playerName,
                playerPhoto: buildApiSportsPlayerPhoto(normalizedPlayerId),
                position: firstStats?.games?.position ?? '',
                teamName: firstStats?.team?.name ?? '',
                teamLogo: firstStats?.team?.logo ?? '',
                leagueName: firstStats?.league?.name ?? '',
                activeFollowersCount: 0,
                recentNet30d: 0,
                totalFollowAdds: 0,
            });
            if (items.length >= limit) {
                return items;
            }
        }
    }
    return items;
}
function mergeDiscoveryItems(sources, getId, limit) {
    if (limit <= 0) {
        return {
            items: [],
            seedCount: 0,
        };
    }
    const merged = [];
    const seen = new Set();
    let seedCount = 0;
    for (const source of sources) {
        for (const item of source.items) {
            const itemId = getId(item);
            if (!itemId || seen.has(itemId)) {
                continue;
            }
            seen.add(itemId);
            merged.push(item);
            if (source.origin === 'static') {
                seedCount += 1;
            }
            if (merged.length >= limit) {
                return {
                    items: merged,
                    seedCount,
                };
            }
        }
    }
    return {
        items: merged,
        seedCount,
    };
}
function createDiscoveryMeta(params) {
    const complete = params.source !== 'static_seed' && params.seedCount === 0;
    return {
        source: params.source,
        complete,
        seedCount: params.seedCount,
        generatedAt: new Date().toISOString(),
        refreshAfterMs: complete ? null : FOLLOW_DISCOVERY_PARTIAL_REFRESH_AFTER_MS,
    };
}
function resolveDiscoverySource(params) {
    if (params.seedCount > 0) {
        if (params.dynamicItemsCount > 0 || params.legacyItemsCount > 0) {
            return 'hybrid';
        }
        return 'static_seed';
    }
    if (params.legacyItemsCount > 0) {
        return params.dynamicItemsCount > 0 ? 'hybrid' : 'legacy_fill';
    }
    return 'dynamic';
}
export function buildDiscoveryResponse(params) {
    const merged = mergeDiscoveryItems([
        { items: params.dynamicItems, origin: 'dynamic' },
        { items: params.legacyItems, origin: 'legacy' },
        { items: params.staticItems, origin: 'static' },
    ], params.getId, params.limit);
    const source = resolveDiscoverySource({
        dynamicItemsCount: params.dynamicItems.length,
        legacyItemsCount: params.legacyItems.length,
        seedCount: merged.seedCount,
    });
    return {
        items: merged.items,
        meta: createDiscoveryMeta({
            source,
            seedCount: merged.seedCount,
        }),
    };
}
export function waitForResultWithinBudget(promise, timeoutMs) {
    return Promise.race([
        promise,
        new Promise(resolve => {
            setTimeout(() => {
                resolve(null);
            }, timeoutMs);
        }),
    ]);
}
export function scheduleDiscoveryCacheRefresh(params) {
    void params.refreshPromise
        .then(async (refreshedValue) => {
        await primeCacheValue(params.cacheKey, refreshedValue, FOLLOW_DISCOVERY_CACHE_TTL_MS);
    })
        .catch(error => {
        params.logger.warn({
            err: error instanceof Error ? error.message : String(error),
            cacheKey: params.cacheKey,
        }, 'follows.discovery.refresh_failed');
    });
}
export async function hydrateDiscoveryMetadataIfNeeded(params) {
    const normalizedEntityId = params.entityKind === 'player'
        ? normalizeFollowDiscoveryPlayerId(params.entityId)
        : params.entityId;
    const updatedAt = await params.store.getMetadataUpdatedAt(params.entityKind, normalizedEntityId);
    if (updatedAt && Date.now() - updatedAt.getTime() < FOLLOW_DISCOVERY_METADATA_STALE_MS) {
        return;
    }
    if (params.entityKind === 'team') {
        const payload = await apiFootballGet(`/teams?id=${encodeURIComponent(params.entityId)}`);
        const team = payload.response?.[0]?.team;
        const teamId = toSafeNumber(team?.id);
        const teamName = team?.name?.trim() ?? '';
        if (!teamId || !teamName) {
            return;
        }
        await params.store.upsertMetadata('team', normalizedEntityId, {
            name: teamName,
            imageUrl: team?.logo ?? '',
            country: team?.country ?? null,
        });
        return;
    }
    const payload = await apiFootballGet(`/players?id=${encodeURIComponent(normalizedEntityId)}&season=${encodeURIComponent(String(getCurrentSeasonYear()))}`);
    const item = payload.response?.[0];
    const playerId = toSafeNumber(item?.player?.id);
    const playerName = item?.player?.name?.trim() ?? '';
    if (!item || !playerId || !playerName) {
        return;
    }
    const firstStats = item.statistics?.[0];
    await params.store.upsertMetadata('player', normalizedEntityId, {
        name: playerName,
        imageUrl: buildApiSportsPlayerPhoto(normalizedEntityId),
        position: firstStats?.games?.position ?? null,
        teamName: firstStats?.team?.name ?? null,
        teamLogo: firstStats?.team?.logo ?? null,
        leagueName: firstStats?.league?.name ?? null,
    });
}
export function mapDynamicTeamDiscoveryItems(storeItems) {
    return storeItems.map(mapDynamicTeamDiscoveryItem);
}
export function mapDynamicPlayerDiscoveryItems(storeItems) {
    return storeItems.map(mapDynamicPlayerDiscoveryItem);
}
