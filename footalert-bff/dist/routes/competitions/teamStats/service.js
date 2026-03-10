import { apiFootballGet } from '../../../lib/apiFootballClient.js';
import { buildCanonicalCacheKey, withCache } from '../../../lib/cache.js';
import { buildCompetitionAdvancedSection, buildUnavailableAdvancedSection } from './advancedSection.js';
import { buildHomeAwaySection, buildSummarySection } from './leaderboards.js';
import { isGroupedCompetition, mapStandingRowsToComputedTeamStats, normalizeStandingRows, } from './standingsMapper.js';
export async function buildCompetitionTeamStatsResponse(leagueId, season) {
    const standingsPayload = await withCache(buildCanonicalCacheKey('competition:team-stats:standings', {
        leagueId,
        season,
    }), 90_000, () => apiFootballGet(`/standings?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}`));
    const standingRows = normalizeStandingRows(standingsPayload);
    const computedRows = mapStandingRowsToComputedTeamStats(standingRows);
    return {
        summary: buildSummarySection(computedRows),
        homeAway: buildHomeAwaySection(computedRows),
        advanced: computedRows.length === 0
            ? buildUnavailableAdvancedSection('provider_missing')
            : isGroupedCompetition(standingsPayload)
                ? buildUnavailableAdvancedSection('grouped_competition')
                : await buildCompetitionAdvancedSection(leagueId, season, computedRows),
    };
}
