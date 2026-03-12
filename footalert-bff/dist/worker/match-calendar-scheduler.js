/**
 * Planificateur intelligent basé sur le calendrier des matchs.
 *
 * Consulte les matchs du jour pour enqueuer des refresh jobs
 * avec des priorités et TTL adaptés au cycle de vie :
 *
 *   pré-match (>1h)  → warm match_full + team_full, priorité 150
 *   imminent (<1h)   → warm match_full, priorité 200
 *   live             → refresh match_full, priorité 250 (fréquence max)
 *   terminé (<2h)    → refresh post-match match_full + team_full, priorité 100
 *   terminé (>2h)    → pas de refresh proactif (données figées)
 */
import { apiFootballGet } from '../lib/apiFootballClient.js';
import { buildCanonicalCacheKey, withCache } from '../lib/cache.js';
import { buildReadStoreScopeKey } from '../lib/readStore/readThrough.js';
import { logWorker, resolveDateInTimezone, resolveSeasonFromDate } from './shared.js';
// ─── Configuration ───
export const CALENDAR_POLL_INTERVAL_MS = 2 * 60_000;
const PRE_MATCH_WARM_LEAD_MS = 60 * 60_000;
const POST_MATCH_WINDOW_MS = 2 * 60 * 60_000;
const MATCHES_TODAY_CACHE_TTL_MS = 60_000;
const PRIORITY_LIVE = 250;
const PRIORITY_IMMINENT = 200;
const PRIORITY_PRE_MATCH = 150;
const PRIORITY_POST_MATCH = 100;
// ─── Extraction des matchs du jour ───
const LIVE_SHORT_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'SUSP', 'LIVE']);
const FINISHED_SHORT_STATUSES = new Set(['FT', 'AET', 'PEN']);
function toNumericId(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }
    if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
        return value.trim();
    }
    return null;
}
function resolveFixtureLifecycle(statusShort, kickoffMs, nowMs) {
    if (LIVE_SHORT_STATUSES.has(statusShort)) {
        return 'live';
    }
    if (FINISHED_SHORT_STATUSES.has(statusShort)) {
        if (kickoffMs !== null && nowMs - kickoffMs < POST_MATCH_WINDOW_MS) {
            return 'post_match';
        }
        return 'settled';
    }
    if (kickoffMs !== null && kickoffMs - nowMs <= PRE_MATCH_WARM_LEAD_MS) {
        return 'imminent';
    }
    if (kickoffMs !== null && kickoffMs > nowMs) {
        return 'pre_match';
    }
    return 'pre_match';
}
function parseFixtureScheduleEntries(fixtures, nowMs) {
    const entries = [];
    for (const item of fixtures) {
        if (!item || typeof item !== 'object')
            continue;
        const record = item;
        const fixtureObj = record.fixture && typeof record.fixture === 'object'
            ? record.fixture
            : null;
        const leagueObj = record.league && typeof record.league === 'object'
            ? record.league
            : null;
        const teamsObj = record.teams && typeof record.teams === 'object'
            ? record.teams
            : null;
        const fixtureId = toNumericId(fixtureObj?.id);
        if (!fixtureId)
            continue;
        const statusObj = fixtureObj?.status && typeof fixtureObj.status === 'object'
            ? fixtureObj.status
            : null;
        const statusShort = typeof statusObj?.short === 'string'
            ? statusObj.short.trim().toUpperCase()
            : '';
        const timestamp = fixtureObj?.timestamp;
        const kickoffMs = typeof timestamp === 'number' && Number.isFinite(timestamp)
            ? timestamp * 1000
            : null;
        const homeTeam = teamsObj?.home && typeof teamsObj.home === 'object'
            ? teamsObj.home
            : null;
        const awayTeam = teamsObj?.away && typeof teamsObj.away === 'object'
            ? teamsObj.away
            : null;
        entries.push({
            fixtureId,
            kickoffMs,
            lifecycleState: resolveFixtureLifecycle(statusShort, kickoffMs, nowMs),
            leagueId: toNumericId(leagueObj?.id),
            homeTeamId: toNumericId(homeTeam?.id),
            awayTeamId: toNumericId(awayTeam?.id),
        });
    }
    return entries;
}
// ─── Fetch des matchs du jour ───
async function fetchTodayFixtures(date, timezone) {
    const payload = await withCache(buildCanonicalCacheKey('calendar:matches-today', { date, timezone }), MATCHES_TODAY_CACHE_TTL_MS, () => apiFootballGet(`/fixtures?date=${encodeURIComponent(date)}&timezone=${encodeURIComponent(timezone)}`));
    return Array.isArray(payload.response) ? payload.response : [];
}
// ─── Enqueue intelligent ───
async function enqueueMatchRefresh(readStore, entry, timezone, priority, notBefore) {
    const scopeKey = buildReadStoreScopeKey({ timezone });
    await readStore.enqueueRefresh({
        entityKind: 'match_full',
        entityId: entry.fixtureId,
        scopeKey,
        priority,
        notBefore,
    });
}
async function enqueueTeamWarm(readStore, teamId, leagueId, season, timezone, priority) {
    const scopeKey = buildReadStoreScopeKey({
        leagueId: leagueId ?? undefined,
        season: String(season),
        timezone,
    });
    await readStore.enqueueRefresh({
        entityKind: 'team_full',
        entityId: teamId,
        scopeKey,
        priority,
        notBefore: new Date(),
    });
}
// ─── Scheduler principal ───
export async function runCalendarScheduleCycle(input) {
    const { readStore, timezone } = input;
    const now = new Date();
    const nowMs = now.getTime();
    const date = resolveDateInTimezone(timezone, now);
    const season = resolveSeasonFromDate(date);
    const rawFixtures = await fetchTodayFixtures(date, timezone);
    const entries = parseFixtureScheduleEntries(rawFixtures, nowMs);
    let scheduled = 0;
    let liveCount = 0;
    let imminentCount = 0;
    for (const entry of entries) {
        try {
            switch (entry.lifecycleState) {
                case 'live': {
                    liveCount++;
                    await enqueueMatchRefresh(readStore, entry, timezone, PRIORITY_LIVE, now);
                    scheduled++;
                    break;
                }
                case 'imminent': {
                    imminentCount++;
                    const warmAt = entry.kickoffMs !== null
                        ? new Date(Math.max(nowMs, entry.kickoffMs - 5 * 60_000))
                        : now;
                    await enqueueMatchRefresh(readStore, entry, timezone, PRIORITY_IMMINENT, warmAt);
                    // Warm les équipes impliquées
                    for (const teamId of [entry.homeTeamId, entry.awayTeamId]) {
                        if (teamId) {
                            await enqueueTeamWarm(readStore, teamId, entry.leagueId, season, timezone, PRIORITY_PRE_MATCH);
                            scheduled++;
                        }
                    }
                    scheduled++;
                    break;
                }
                case 'pre_match': {
                    const warmAt = entry.kickoffMs !== null
                        ? new Date(Math.max(nowMs, entry.kickoffMs - PRE_MATCH_WARM_LEAD_MS))
                        : now;
                    await enqueueMatchRefresh(readStore, entry, timezone, PRIORITY_PRE_MATCH, warmAt);
                    scheduled++;
                    break;
                }
                case 'post_match': {
                    await enqueueMatchRefresh(readStore, entry, timezone, PRIORITY_POST_MATCH, now);
                    // Refresh les équipes pour MAJ stats post-match
                    for (const teamId of [entry.homeTeamId, entry.awayTeamId]) {
                        if (teamId) {
                            await enqueueTeamWarm(readStore, teamId, entry.leagueId, season, timezone, PRIORITY_POST_MATCH);
                            scheduled++;
                        }
                    }
                    scheduled++;
                    break;
                }
                case 'settled':
                    // Match terminé depuis >2h — pas de refresh proactif
                    break;
            }
        }
        catch (error) {
            logWorker('error', 'calendar_schedule_entry_failed', {
                fixtureId: entry.fixtureId,
                lifecycle: entry.lifecycleState,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    if (scheduled > 0 || liveCount > 0) {
        logWorker('info', 'calendar_schedule_cycle', {
            date,
            totalFixtures: entries.length,
            scheduled,
            live: liveCount,
            imminent: imminentCount,
        });
    }
    return { scheduled, live: liveCount, imminent: imminentCount };
}
