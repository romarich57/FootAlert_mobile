import { apiFootballGet } from '../../../lib/apiFootballClient.js';
import { buildCanonicalCacheKey, withCache, withCacheStaleWhileRevalidate, } from '../../../lib/cache.js';
import { mapWithConcurrency } from '../../../lib/concurrency/mapWithConcurrency.js';
import { UpstreamBffError } from '../../../lib/errors.js';
import { buildTeamAdvancedStatsPayload, computeLeagueAdvancedTeamStats, TEAM_ADVANCED_STATS_CACHE_TTL_MS, } from '../../teams/advancedStats.js';
import { toFiniteNumber } from '../../teams/helpers.js';
import { ADVANCED_METRICS, ADVANCED_SORT_ORDERS, GOAL_MINUTE_SLOTS } from './contracts.js';
import { buildLeaderboard, buildEmptyAdvancedLeaderboards } from './leaderboards.js';
import { selectTopTeamsForAdvancedScope } from './standingsMapper.js';
function mapGoalMinuteBreakdown(statistics) {
    const mapped = GOAL_MINUTE_SLOTS.map(slot => ({
        key: slot,
        label: slot,
        value: toFiniteNumber(statistics?.goals?.for?.minute?.[slot]?.total),
    }));
    return mapped.some(item => item.value !== null) ? mapped : [];
}
function resolveAvailabilityReason(errors) {
    if (errors.length === 0) {
        return 'provider_missing';
    }
    return errors.some(error => error instanceof UpstreamBffError && error.statusCode === 429)
        ? 'rate_limited'
        : 'upstream_error';
}
async function fetchCompetitionTeamStatistics(leagueId, season, teamId) {
    const payload = await withCache(buildCanonicalCacheKey('competition:team-stats:team', {
        leagueId,
        season,
        teamId,
    }), 60_000, () => apiFootballGet(`/teams/statistics?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}&team=${encodeURIComponent(String(teamId))}`));
    const response = Array.isArray(payload.response)
        ? payload.response[0]
        : payload.response;
    return response && typeof response === 'object'
        ? response
        : null;
}
async function fetchCompetitionAdvancedTeamStatistics(leagueId, season, topTeams) {
    return mapWithConcurrency(topTeams, 4, async (team) => {
        try {
            return {
                teamId: team.teamId,
                statistics: await fetchCompetitionTeamStatistics(leagueId, season, team.teamId),
                error: null,
            };
        }
        catch (error) {
            return {
                teamId: team.teamId,
                statistics: null,
                error,
            };
        }
    });
}
export function buildUnavailableAdvancedSection(reason) {
    return {
        metrics: ADVANCED_METRICS,
        rows: [],
        top10TeamIds: [],
        unavailableMetrics: ADVANCED_METRICS,
        state: 'unavailable',
        reason,
        leaderboards: buildEmptyAdvancedLeaderboards(),
    };
}
export async function buildCompetitionAdvancedSection(leagueId, season, computedRows) {
    if (computedRows.length === 0) {
        return buildUnavailableAdvancedSection('provider_missing');
    }
    const topTeams = selectTopTeamsForAdvancedScope(computedRows);
    const [advancedStatsResult, teamStatisticsResults] = await Promise.all([
        withCacheStaleWhileRevalidate(`team:advancedstats:league:${leagueId}:season:${season}`, TEAM_ADVANCED_STATS_CACHE_TTL_MS, () => computeLeagueAdvancedTeamStats(leagueId, season, computedRows.map(team => ({
            teamId: team.teamId,
            teamName: team.teamName,
            teamLogo: team.teamLogo,
        })))).then(value => ({ value, error: null }), error => ({ value: null, error })),
        fetchCompetitionAdvancedTeamStatistics(leagueId, season, topTeams),
    ]);
    const teamStatsByTeamId = new Map(teamStatisticsResults.map(result => [result.teamId, result.statistics]));
    const advancedErrors = teamStatisticsResults
        .map(result => result.error)
        .filter((error) => error !== null);
    if (advancedStatsResult.error) {
        advancedErrors.push(advancedStatsResult.error);
    }
    const advancedRows = topTeams.map(team => {
        const statistics = teamStatsByTeamId.get(team.teamId) ?? null;
        const advancedPayload = advancedStatsResult.value
            ? buildTeamAdvancedStatsPayload(team.teamId, advancedStatsResult.value.leagueId, advancedStatsResult.value.season, advancedStatsResult.value.sourceUpdatedAt, advancedStatsResult.value.rankings)
            : null;
        return {
            teamId: team.teamId,
            teamName: team.teamName,
            teamLogo: team.teamLogo,
            cleanSheets: toFiniteNumber(statistics?.fixtures?.clean_sheet?.total),
            failedToScore: toFiniteNumber(statistics?.fixtures?.failed_to_score?.total),
            xGPerMatch: toFiniteNumber(advancedPayload?.metrics?.expectedGoalsPerMatch?.value),
            possession: toFiniteNumber(advancedPayload?.metrics?.possession?.value),
            shotsPerMatch: toFiniteNumber(advancedPayload?.metrics?.shotsPerMatch?.value),
            shotsOnTargetPerMatch: toFiniteNumber(advancedPayload?.metrics?.shotsOnTargetPerMatch?.value),
            goalMinuteBreakdown: mapGoalMinuteBreakdown(statistics),
        };
    });
    const leaderboards = {
        cleanSheets: buildLeaderboard('cleanSheets', advancedRows, row => row.cleanSheets, ADVANCED_SORT_ORDERS.cleanSheets),
        failedToScore: buildLeaderboard('failedToScore', advancedRows, row => row.failedToScore, ADVANCED_SORT_ORDERS.failedToScore),
        xGPerMatch: buildLeaderboard('xGPerMatch', advancedRows, row => row.xGPerMatch, ADVANCED_SORT_ORDERS.xGPerMatch),
        possession: buildLeaderboard('possession', advancedRows, row => row.possession, ADVANCED_SORT_ORDERS.possession),
        shotsPerMatch: buildLeaderboard('shotsPerMatch', advancedRows, row => row.shotsPerMatch, ADVANCED_SORT_ORDERS.shotsPerMatch),
        shotsOnTargetPerMatch: buildLeaderboard('shotsOnTargetPerMatch', advancedRows, row => row.shotsOnTargetPerMatch, ADVANCED_SORT_ORDERS.shotsOnTargetPerMatch),
    };
    const unavailableMetrics = ADVANCED_METRICS.filter(metric => leaderboards[metric].items.length === 0);
    const state = unavailableMetrics.length === 0
        ? 'available'
        : unavailableMetrics.length === ADVANCED_METRICS.length
            ? 'unavailable'
            : 'partial';
    return {
        metrics: ADVANCED_METRICS,
        rows: advancedRows,
        top10TeamIds: topTeams.map(team => team.teamId),
        unavailableMetrics,
        state,
        reason: state === 'available' ? null : resolveAvailabilityReason(advancedErrors),
        leaderboards,
    };
}
