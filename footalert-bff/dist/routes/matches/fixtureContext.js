import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { withCache } from '../../lib/cache.js';
export function toNumericId(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
export function toEpochMilliseconds(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return null;
    }
    if (value > 1_000_000_000_000) {
        return value;
    }
    if (value > 1_000_000_000) {
        return value * 1_000;
    }
    return null;
}
export function toDateMilliseconds(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
}
function buildFixtureContextKey(matchId, timezone) {
    return timezone ? `match:context:${matchId}:${timezone}` : `match:context:${matchId}`;
}
export async function fetchFixtureContext(matchId, timezone) {
    const contextKey = buildFixtureContextKey(matchId, timezone);
    const payload = await withCache(contextKey, 30_000, () => apiFootballGet(timezone
        ? `/fixtures?id=${encodeURIComponent(matchId)}&timezone=${encodeURIComponent(timezone)}`
        : `/fixtures?id=${encodeURIComponent(matchId)}`));
    return payload.response?.[0] ?? null;
}
