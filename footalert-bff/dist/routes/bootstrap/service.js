import { getFollowDiscoverySeeds } from '@footalert/app-core';
import { env } from '../../config/env.js';
import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { buildCanonicalCacheKey, withCache } from '../../lib/cache.js';
import { mapWithConcurrency } from '../../lib/concurrency/mapWithConcurrency.js';
import { getFollowsDiscoveryStore } from '../../lib/follows/discoveryRuntime.js';
import { mapPlayerCard, mapTeamCard } from '../follows/cards.js';
import { FOLLOW_CARDS_CONCURRENCY, FOLLOW_DISCOVERY_DEFAULT_LIMIT, FOLLOW_DISCOVERY_PLAYERS_BLOCKING_LEAGUE_COUNT, FOLLOW_DISCOVERY_TEAMS_BLOCKING_LEAGUE_COUNT, TOP_COMPETITIONS, } from '../follows/constants.js';
import { buildDiscoveryResponse, getCurrentSeasonYear, loadLegacyPlayerDiscovery, loadLegacyTeamDiscovery, mapDynamicPlayerDiscoveryItems, mapDynamicTeamDiscoveryItems, } from '../follows/discovery/service.js';
export function buildBootstrapScopeKey(input) {
    const normalizeIds = (value) => Array.from(new Set((value ?? [])
        .map(item => item.trim())
        .filter(item => /^\d+$/.test(item)))).sort((first, second) => Number(first) - Number(second));
    const followedTeamIds = normalizeIds(input.followedTeamIds);
    const followedPlayerIds = normalizeIds(input.followedPlayerIds);
    const params = new URLSearchParams();
    params.set('date', input.date);
    params.set('timezone', input.timezone);
    params.set('season', String(input.season));
    if (typeof input.discoveryLimit === 'number' && Number.isFinite(input.discoveryLimit)) {
        params.set('discoveryLimit', String(Math.max(1, Math.floor(input.discoveryLimit))));
    }
    if (followedTeamIds.length > 0) {
        params.set('followedTeamIds', followedTeamIds.join(','));
    }
    if (followedPlayerIds.length > 0) {
        params.set('followedPlayerIds', followedPlayerIds.join(','));
    }
    return params.toString();
}
export function parseBootstrapScopeKey(scopeKey) {
    const parseIds = (value) => {
        if (!value) {
            return [];
        }
        return Array.from(new Set(value
            .split(',')
            .map(item => item.trim())
            .filter(item => /^\d+$/.test(item)))).sort((first, second) => Number(first) - Number(second));
    };
    const params = new URLSearchParams(scopeKey);
    const date = params.get('date');
    const timezone = params.get('timezone');
    const seasonRaw = params.get('season');
    const discoveryLimitRaw = params.get('discoveryLimit');
    const followedTeamIds = parseIds(params.get('followedTeamIds'));
    const followedPlayerIds = parseIds(params.get('followedPlayerIds'));
    const season = seasonRaw ? Number.parseInt(seasonRaw, 10) : Number.NaN;
    const discoveryLimit = discoveryLimitRaw
        ? Number.parseInt(discoveryLimitRaw, 10)
        : FOLLOW_DISCOVERY_DEFAULT_LIMIT;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return null;
    }
    if (!timezone || timezone.trim().length === 0) {
        return null;
    }
    if (!Number.isFinite(season)) {
        return null;
    }
    if (!Number.isFinite(discoveryLimit) || discoveryLimit <= 0) {
        return null;
    }
    return {
        date,
        timezone,
        season,
        discoveryLimit,
        followedTeamIds,
        followedPlayerIds,
    };
}
function readTimezoneDate(now, timezone) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    const parts = formatter.formatToParts(now);
    const year = parts.find(part => part.type === 'year')?.value ?? '';
    const month = parts.find(part => part.type === 'month')?.value ?? '';
    const day = parts.find(part => part.type === 'day')?.value ?? '';
    return `${year}-${month}-${day}`;
}
function toNumericId(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }
    if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
        return value.trim();
    }
    return null;
}
function readFixtureWarmRefs(fixtures) {
    const refs = [];
    for (const fixtureEntry of fixtures) {
        if (!fixtureEntry || typeof fixtureEntry !== 'object') {
            continue;
        }
        const fixtureRecord = fixtureEntry;
        const fixture = fixtureRecord.fixture && typeof fixtureRecord.fixture === 'object'
            ? fixtureRecord.fixture
            : null;
        const league = fixtureRecord.league && typeof fixtureRecord.league === 'object'
            ? fixtureRecord.league
            : null;
        const teams = fixtureRecord.teams && typeof fixtureRecord.teams === 'object'
            ? fixtureRecord.teams
            : null;
        const homeTeam = teams?.home && typeof teams.home === 'object'
            ? teams.home
            : null;
        const awayTeam = teams?.away && typeof teams.away === 'object'
            ? teams.away
            : null;
        const fixtureId = toNumericId(fixture?.id);
        const leagueId = toNumericId(league?.id);
        const homeTeamId = toNumericId(homeTeam?.id);
        const awayTeamId = toNumericId(awayTeam?.id);
        if (fixtureId) {
            refs.push({ kind: 'match', id: fixtureId });
        }
        if (leagueId) {
            refs.push({ kind: 'competition', id: leagueId });
        }
        if (homeTeamId) {
            refs.push({ kind: 'team', id: homeTeamId });
        }
        if (awayTeamId) {
            refs.push({ kind: 'team', id: awayTeamId });
        }
    }
    return refs;
}
function dedupeWarmEntityRefs(refs, limit = 250) {
    const deduped = [];
    const seen = new Set();
    for (const ref of refs) {
        const key = `${ref.kind}:${ref.id}`;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        deduped.push(ref);
        if (deduped.length >= limit) {
            break;
        }
    }
    return deduped;
}
async function fetchMatchesToday(date, timezone) {
    const payload = await withCache(buildCanonicalCacheKey('bootstrap:matches-today', { date, timezone }), 30_000, () => apiFootballGet(`/fixtures?date=${encodeURIComponent(date)}&timezone=${encodeURIComponent(timezone)}`));
    return Array.isArray(payload.response) ? payload.response : [];
}
async function fetchFollowedTeamCards(followedTeamIds, timezone) {
    if (followedTeamIds.length === 0) {
        return [];
    }
    return mapWithConcurrency(followedTeamIds, FOLLOW_CARDS_CONCURRENCY, async (teamId) => {
        const [detailsPayload, nextFixturePayload] = await Promise.all([
            withCache(buildCanonicalCacheKey('bootstrap:team-details', { teamId }), 120_000, () => apiFootballGet(`/teams?id=${encodeURIComponent(teamId)}`)),
            withCache(buildCanonicalCacheKey('bootstrap:team-next-fixture', {
                teamId,
                timezone,
            }), 45_000, () => apiFootballGet(`/fixtures?team=${encodeURIComponent(teamId)}&next=1&timezone=${encodeURIComponent(timezone)}`)),
        ]);
        return mapTeamCard(teamId, detailsPayload, nextFixturePayload);
    });
}
async function fetchFollowedPlayerCards(followedPlayerIds, season) {
    if (followedPlayerIds.length === 0) {
        return [];
    }
    return mapWithConcurrency(followedPlayerIds, FOLLOW_CARDS_CONCURRENCY, async (playerId) => {
        const payload = await withCache(buildCanonicalCacheKey('bootstrap:player-season', { playerId, season }), 60_000, () => apiFootballGet(`/players?id=${encodeURIComponent(playerId)}&season=${encodeURIComponent(String(season))}`));
        return mapPlayerCard(playerId, payload);
    });
}
async function loadTeamDiscovery(limit, season, store, logger) {
    const dynamicItems = store === null
        ? []
        : mapDynamicTeamDiscoveryItems(await store.getDiscovery('team', limit));
    const legacyItems = await loadLegacyTeamDiscovery(limit, season, logger, FOLLOW_DISCOVERY_TEAMS_BLOCKING_LEAGUE_COUNT);
    const staticItems = getFollowDiscoverySeeds('team', limit);
    return buildDiscoveryResponse({
        dynamicItems,
        legacyItems,
        staticItems,
        getId: item => item.teamId,
        limit,
    });
}
async function loadPlayerDiscovery(limit, season, store, logger) {
    const dynamicItems = store === null
        ? []
        : mapDynamicPlayerDiscoveryItems(await store.getDiscovery('player', limit));
    const legacyItems = await loadLegacyPlayerDiscovery(limit, season, logger, FOLLOW_DISCOVERY_PLAYERS_BLOCKING_LEAGUE_COUNT);
    const staticItems = getFollowDiscoverySeeds('player', limit);
    return buildDiscoveryResponse({
        dynamicItems,
        legacyItems,
        staticItems,
        getId: item => item.playerId,
        limit,
    });
}
function toCompetitionCards() {
    return TOP_COMPETITIONS.map(item => ({
        competitionId: item.competitionId,
        competitionName: item.competitionName,
        competitionLogo: item.competitionLogo,
        country: item.country,
        type: item.type,
    }));
}
export async function buildBootstrapPayload(input) {
    const now = input.now ?? new Date();
    const date = input.date ?? readTimezoneDate(now, input.timezone);
    const season = input.season ?? getCurrentSeasonYear(now);
    const discoveryLimit = input.discoveryLimit ?? FOLLOW_DISCOVERY_DEFAULT_LIMIT;
    const topCompetitions = toCompetitionCards();
    let discoveryStore = input.discoveryStore ?? null;
    if (typeof input.discoveryStore === 'undefined') {
        try {
            discoveryStore = await getFollowsDiscoveryStore({
                backend: env.notificationsPersistenceBackend,
                databaseUrl: env.databaseUrl,
            });
        }
        catch (error) {
            input.logger?.warn({
                err: error instanceof Error ? error.message : String(error),
            }, 'bootstrap.discovery_store_unavailable');
            discoveryStore = null;
        }
    }
    const [matchesToday, followedTeamCards, followedPlayerCards, teamsDiscovery, playersDiscovery,] = await Promise.all([
        fetchMatchesToday(date, input.timezone),
        fetchFollowedTeamCards(input.followedTeamIds, input.timezone),
        fetchFollowedPlayerCards(input.followedPlayerIds, season),
        loadTeamDiscovery(discoveryLimit, season, discoveryStore, input.logger),
        loadPlayerDiscovery(discoveryLimit, season, discoveryStore, input.logger),
    ]);
    const warmEntityRefs = dedupeWarmEntityRefs([
        ...readFixtureWarmRefs(matchesToday),
        ...input.followedTeamIds.map(teamId => ({ kind: 'team', id: teamId })),
        ...input.followedPlayerIds.map(playerId => ({ kind: 'player', id: playerId })),
        ...topCompetitions.map(competition => ({
            kind: 'competition',
            id: competition.competitionId,
        })),
    ]);
    return {
        generatedAt: now.toISOString(),
        date,
        timezone: input.timezone,
        season,
        matchesToday,
        topCompetitions,
        competitionsCatalog: topCompetitions,
        followedTeamCards,
        followedPlayerCards,
        discovery: {
            teams: teamsDiscovery,
            players: playersDiscovery,
        },
        warmEntityRefs,
    };
}
