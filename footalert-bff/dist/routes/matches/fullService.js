import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { env } from '../../config/env.js';
import { buildCanonicalCacheKey, withCache, withCacheStaleWhileRevalidate, } from '../../lib/cache.js';
import { buildFreshnessMeta, freshnessHints, } from '../../lib/freshnessMeta.js';
import { buildOverviewLeadersPayload } from '../teams/overview.fetchers.js';
import { fetchOverviewFixtures as fetchTeamOverviewFixtures, fetchOverviewPlayers, fetchOverviewStandings, } from '../teams/overview.js';
import { filterInjuriesForMatch } from './absences.js';
import { toDateMilliseconds, toEpochMilliseconds, toNumericId, } from './fixtureContext.js';
import { filterFixtureStatisticsByPeriod } from './statistics.js';
const MATCH_CACHE_TTL_MS = env.cacheTtl.matches;
const HEAD_TO_HEAD_LIMIT = 20;
const LIVE_SHORT_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'SUSP', 'LIVE']);
const FINISHED_SHORT_STATUSES = new Set(['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO']);
const LIVE_LONG_HINTS = ['in play', 'live', '1st half', '2nd half', 'half time', 'extra time'];
const FINISHED_LONG_HINTS = ['finished', 'after penalties', 'fulltime', 'full time', 'cancelled'];
function toResponseArray(value) {
    if (!value || typeof value !== 'object') {
        return [];
    }
    const response = value.response;
    return Array.isArray(response) ? response : [];
}
function readFixtureContext(fixture, matchId) {
    if (!fixture || typeof fixture !== 'object') {
        const fallbackFixtureId = Number.parseInt(matchId, 10);
        return {
            fixtureId: Number.isFinite(fallbackFixtureId) ? fallbackFixtureId : null,
            fixtureDateMs: null,
            leagueId: null,
            season: null,
            homeTeamId: null,
            awayTeamId: null,
        };
    }
    const record = fixture;
    const fixtureRecord = record.fixture && typeof record.fixture === 'object'
        ? record.fixture
        : {};
    const leagueRecord = record.league && typeof record.league === 'object'
        ? record.league
        : {};
    const teamsRecord = record.teams && typeof record.teams === 'object'
        ? record.teams
        : {};
    const homeTeam = teamsRecord.home && typeof teamsRecord.home === 'object'
        ? teamsRecord.home
        : {};
    const awayTeam = teamsRecord.away && typeof teamsRecord.away === 'object'
        ? teamsRecord.away
        : {};
    const fallbackFixtureId = Number.parseInt(matchId, 10);
    return {
        fixtureId: toNumericId(fixtureRecord.id) ?? (Number.isFinite(fallbackFixtureId) ? fallbackFixtureId : null),
        fixtureDateMs: toEpochMilliseconds(fixtureRecord.timestamp) ?? toDateMilliseconds(fixtureRecord.date),
        leagueId: toNumericId(leagueRecord.id),
        season: toNumericId(leagueRecord.season),
        homeTeamId: toNumericId(homeTeam.id),
        awayTeamId: toNumericId(awayTeam.id),
    };
}
function resolveLifecycleState(fixture) {
    if (!fixture || typeof fixture !== 'object') {
        return 'pre_match';
    }
    const fixtureRecord = fixture.fixture;
    const status = fixtureRecord && typeof fixtureRecord === 'object'
        ? fixtureRecord.status
        : undefined;
    const shortStatus = typeof status?.short === 'string' ? status.short.trim().toUpperCase() : '';
    const longStatus = typeof status?.long === 'string' ? status.long.trim().toLowerCase() : '';
    const elapsed = toNumericId(status?.elapsed);
    if (LIVE_SHORT_STATUSES.has(shortStatus)) {
        return 'live';
    }
    if (FINISHED_SHORT_STATUSES.has(shortStatus)) {
        return 'finished';
    }
    if (LIVE_LONG_HINTS.some(hint => longStatus.includes(hint)) || (elapsed ?? 0) > 0) {
        return 'live';
    }
    if (FINISHED_LONG_HINTS.some(hint => longStatus.includes(hint))) {
        return 'finished';
    }
    return 'pre_match';
}
async function fetchFixture(matchId, timezone) {
    const payload = await withCache(buildCanonicalCacheKey('match:full:fixture', { matchId, timezone }), MATCH_CACHE_TTL_MS, () => apiFootballGet(`/fixtures?id=${encodeURIComponent(matchId)}&timezone=${encodeURIComponent(timezone)}`));
    return toResponseArray(payload)[0] ?? null;
}
async function fetchSection(key, ttlMs, path) {
    const payload = await withCache(key, ttlMs, () => apiFootballGet(path));
    return toResponseArray(payload);
}
async function fetchStatisticsSection(matchId, period) {
    if (period === 'all') {
        return fetchSection(buildCanonicalCacheKey('match:full:statistics', { matchId, period }), MATCH_CACHE_TTL_MS, `/fixtures/statistics?fixture=${encodeURIComponent(matchId)}`);
    }
    const payload = await withCache(buildCanonicalCacheKey('match:full:statistics', { matchId, period }), MATCH_CACHE_TTL_MS, () => apiFootballGet(`/fixtures/statistics?fixture=${encodeURIComponent(matchId)}&half=true`));
    return toResponseArray(filterFixtureStatisticsByPeriod(payload, period));
}
async function fetchPredictions(matchId) {
    return fetchSection(buildCanonicalCacheKey('match:full:predictions', { matchId }), MATCH_CACHE_TTL_MS, `/predictions?fixture=${encodeURIComponent(matchId)}`);
}
async function fetchHeadToHead(matchId, homeTeamId, awayTeamId) {
    return fetchSection(buildCanonicalCacheKey('match:full:h2h', {
        matchId,
        homeTeamId,
        awayTeamId,
        last: HEAD_TO_HEAD_LIMIT,
    }), MATCH_CACHE_TTL_MS, `/fixtures/headtohead?h2h=${encodeURIComponent(`${homeTeamId}-${awayTeamId}`)}&last=${HEAD_TO_HEAD_LIMIT}`);
}
async function fetchPlayersStats(matchId, teamId) {
    return fetchSection(buildCanonicalCacheKey('match:full:players-stats', { matchId, teamId }), MATCH_CACHE_TTL_MS, `/fixtures/players?fixture=${encodeURIComponent(matchId)}&team=${encodeURIComponent(String(teamId))}`);
}
async function fetchStandings(leagueId, season) {
    return fetchOverviewStandings(String(leagueId), season);
}
async function fetchRecentResults(params) {
    return fetchTeamOverviewFixtures(String(params.teamId), String(params.leagueId), params.season, params.timezone);
}
async function fetchTeamLeaders(params) {
    const players = await fetchOverviewPlayers(String(params.teamId), String(params.leagueId), params.season);
    return buildOverviewLeadersPayload(players, {
        teamId: String(params.teamId),
        leagueId: String(params.leagueId),
        season: params.season,
    }, new Date().toISOString()).playerLeaders;
}
async function fetchAbsences(matchId, context) {
    if (context.leagueId === null ||
        context.season === null ||
        context.homeTeamId === null ||
        context.awayTeamId === null ||
        context.fixtureId === null) {
        return [];
    }
    return withCache(buildCanonicalCacheKey('match:full:absences', {
        matchId,
        leagueId: context.leagueId,
        season: context.season,
    }), MATCH_CACHE_TTL_MS, async () => {
        const entries = await Promise.all([context.homeTeamId, context.awayTeamId].map(async (teamId) => {
            try {
                const payload = await apiFootballGet(`/injuries?league=${encodeURIComponent(String(context.leagueId))}&season=${encodeURIComponent(String(context.season))}&team=${encodeURIComponent(String(teamId))}`);
                return {
                    teamId,
                    response: filterInjuriesForMatch(toResponseArray(payload), context.fixtureId, context.fixtureDateMs),
                };
            }
            catch {
                return {
                    teamId,
                    response: [],
                };
            }
        }));
        return entries;
    });
}
export async function buildMatchFullResponse(matchId, timezone) {
    return withCacheStaleWhileRevalidate(buildCanonicalCacheKey('match:full:v1', {
        matchId,
        timezone,
    }), MATCH_CACHE_TTL_MS, async () => {
        const fixture = await fetchFixture(matchId, timezone);
        const lifecycleState = resolveLifecycleState(fixture);
        const context = readFixtureContext(fixture, matchId);
        const canLoadMatchData = lifecycleState !== 'pre_match';
        const canLoadHalfStats = canLoadMatchData && (context.season ?? 0) >= 2024;
        const canLoadHeadToHead = context.homeTeamId !== null &&
            context.awayTeamId !== null &&
            lifecycleState !== 'live';
        const canLoadContextData = context.leagueId !== null &&
            context.season !== null &&
            context.homeTeamId !== null &&
            context.awayTeamId !== null;
        const [events, allStatistics, firstHalfStatistics, secondHalfStatistics, lineups, predictions, absences, headToHead, standings, homeRecentResults, awayRecentResults, homeLeaders, awayLeaders, homePlayersStats, awayPlayersStats,] = await Promise.all([
            canLoadMatchData
                ? fetchSection(buildCanonicalCacheKey('match:full:events', { matchId }), MATCH_CACHE_TTL_MS, `/fixtures/events?fixture=${encodeURIComponent(matchId)}`)
                : [],
            canLoadMatchData ? fetchStatisticsSection(matchId, 'all') : [],
            canLoadHalfStats ? fetchStatisticsSection(matchId, 'first') : [],
            canLoadHalfStats ? fetchStatisticsSection(matchId, 'second') : [],
            fetchSection(buildCanonicalCacheKey('match:full:lineups', { matchId }), MATCH_CACHE_TTL_MS, `/fixtures/lineups?fixture=${encodeURIComponent(matchId)}`),
            lifecycleState === 'pre_match' ? fetchPredictions(matchId) : [],
            fetchAbsences(matchId, context),
            canLoadHeadToHead
                ? fetchHeadToHead(matchId, context.homeTeamId, context.awayTeamId)
                : [],
            canLoadContextData
                ? fetchStandings(context.leagueId, context.season)
                : null,
            canLoadContextData
                ? fetchRecentResults({
                    teamId: context.homeTeamId,
                    leagueId: context.leagueId,
                    season: context.season,
                    timezone,
                })
                : [],
            canLoadContextData
                ? fetchRecentResults({
                    teamId: context.awayTeamId,
                    leagueId: context.leagueId,
                    season: context.season,
                    timezone,
                })
                : [],
            canLoadContextData
                ? fetchTeamLeaders({
                    teamId: context.homeTeamId,
                    leagueId: context.leagueId,
                    season: context.season,
                })
                : null,
            canLoadContextData
                ? fetchTeamLeaders({
                    teamId: context.awayTeamId,
                    leagueId: context.leagueId,
                    season: context.season,
                })
                : null,
            context.homeTeamId !== null ? fetchPlayersStats(matchId, context.homeTeamId) : [],
            context.awayTeamId !== null ? fetchPlayersStats(matchId, context.awayTeamId) : [],
        ]);
        const isLive = lifecycleState === 'live';
        const isFinished = lifecycleState === 'finished';
        const fixtureHint = isFinished ? freshnessHints.static : freshnessHints.live;
        const matchDataHint = isLive ? freshnessHints.live : isFinished ? freshnessHints.static : freshnessHints.postMatch;
        return {
            _meta: buildFreshnessMeta({
                fixture: fixtureHint,
                events: matchDataHint,
                statistics: matchDataHint,
                lineups: isFinished ? freshnessHints.static : freshnessHints.postMatch,
                playersStats: matchDataHint,
                predictions: freshnessHints.static,
                absences: freshnessHints.postMatch,
                headToHead: freshnessHints.static,
                standings: freshnessHints.postMatch,
                homeRecentResults: freshnessHints.postMatch,
                awayRecentResults: freshnessHints.postMatch,
                homeLeaders: freshnessHints.postMatch,
                awayLeaders: freshnessHints.postMatch,
            }),
            fixture,
            lifecycleState,
            context: {
                leagueId: context.leagueId,
                season: context.season,
                homeTeamId: context.homeTeamId === null ? null : String(context.homeTeamId),
                awayTeamId: context.awayTeamId === null ? null : String(context.awayTeamId),
            },
            events,
            statistics: {
                all: allStatistics,
                first: firstHalfStatistics,
                second: secondHalfStatistics,
            },
            lineups,
            predictions,
            absences,
            headToHead,
            standings,
            homeRecentResults,
            awayRecentResults,
            homeLeaders,
            awayLeaders,
            playersStats: {
                homeTeamId: context.homeTeamId === null ? null : String(context.homeTeamId),
                awayTeamId: context.awayTeamId === null ? null : String(context.awayTeamId),
                home: homePlayersStats,
                away: awayPlayersStats,
            },
        };
    });
}
