export const DEFAULT_ENTITY_CACHE_TTL_MS = {
    teams: 60_000,
    players: 60_000,
    competitions: 60_000,
    matches: 45_000,
};
function readPositiveInt(rawValue, fallback) {
    if (!rawValue) {
        return fallback;
    }
    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return parsed;
}
export function resolveEntityCacheTtlConfig(source = process.env) {
    return {
        teams: readPositiveInt(source.CACHE_TTL_TEAMS_MS, DEFAULT_ENTITY_CACHE_TTL_MS.teams),
        players: readPositiveInt(source.CACHE_TTL_PLAYERS_MS, DEFAULT_ENTITY_CACHE_TTL_MS.players),
        competitions: readPositiveInt(source.CACHE_TTL_COMPETITIONS_MS, DEFAULT_ENTITY_CACHE_TTL_MS.competitions),
        matches: readPositiveInt(source.CACHE_TTL_MATCHES_MS, DEFAULT_ENTITY_CACHE_TTL_MS.matches),
    };
}
