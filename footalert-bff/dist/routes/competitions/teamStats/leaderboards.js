import { ADVANCED_METRICS, ADVANCED_SORT_ORDERS, HOME_AWAY_METRICS, HOME_AWAY_SORT_ORDERS, SUMMARY_METRICS, SUMMARY_SORT_ORDERS, } from './contracts.js';
function sortLeaderboardItems(items, sortOrder) {
    return [...items].sort((first, second) => {
        if (first.value !== second.value) {
            return sortOrder === 'desc' ? second.value - first.value : first.value - second.value;
        }
        return first.teamName.localeCompare(second.teamName);
    });
}
export function buildLeaderboard(metric, rows, valueGetter, sortOrder) {
    const items = rows
        .map(row => {
        const value = valueGetter(row);
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            return null;
        }
        return {
            teamId: row.teamId,
            teamName: row.teamName,
            teamLogo: row.teamLogo,
            value,
        };
    })
        .filter((item) => item !== null);
    return {
        metric,
        sortOrder,
        items: sortLeaderboardItems(items, sortOrder).slice(0, 10),
    };
}
export function buildSummarySection(rows) {
    return {
        metrics: SUMMARY_METRICS,
        leaderboards: {
            pointsPerMatch: buildLeaderboard('pointsPerMatch', rows, row => row.pointsPerMatch, SUMMARY_SORT_ORDERS.pointsPerMatch),
            winRate: buildLeaderboard('winRate', rows, row => row.winRate, SUMMARY_SORT_ORDERS.winRate),
            goalsScoredPerMatch: buildLeaderboard('goalsScoredPerMatch', rows, row => row.goalsScoredPerMatch, SUMMARY_SORT_ORDERS.goalsScoredPerMatch),
            goalsConcededPerMatch: buildLeaderboard('goalsConcededPerMatch', rows, row => row.goalsConcededPerMatch, SUMMARY_SORT_ORDERS.goalsConcededPerMatch),
            goalDiffPerMatch: buildLeaderboard('goalDiffPerMatch', rows, row => row.goalDiffPerMatch, SUMMARY_SORT_ORDERS.goalDiffPerMatch),
            formIndex: buildLeaderboard('formIndex', rows, row => row.formIndex, SUMMARY_SORT_ORDERS.formIndex),
            formPointsPerMatch: buildLeaderboard('formPointsPerMatch', rows, row => row.formPointsPerMatch, SUMMARY_SORT_ORDERS.formPointsPerMatch),
        },
    };
}
export function buildHomeAwaySection(rows) {
    return {
        metrics: HOME_AWAY_METRICS,
        leaderboards: {
            homePPG: buildLeaderboard('homePPG', rows, row => row.homePPG, HOME_AWAY_SORT_ORDERS.homePPG),
            awayPPG: buildLeaderboard('awayPPG', rows, row => row.awayPPG, HOME_AWAY_SORT_ORDERS.awayPPG),
            homeGoalsFor: buildLeaderboard('homeGoalsFor', rows, row => row.homeGoalsFor, HOME_AWAY_SORT_ORDERS.homeGoalsFor),
            awayGoalsFor: buildLeaderboard('awayGoalsFor', rows, row => row.awayGoalsFor, HOME_AWAY_SORT_ORDERS.awayGoalsFor),
            homeGoalsAgainst: buildLeaderboard('homeGoalsAgainst', rows, row => row.homeGoalsAgainst, HOME_AWAY_SORT_ORDERS.homeGoalsAgainst),
            awayGoalsAgainst: buildLeaderboard('awayGoalsAgainst', rows, row => row.awayGoalsAgainst, HOME_AWAY_SORT_ORDERS.awayGoalsAgainst),
            deltaHomeAwayPPG: buildLeaderboard('deltaHomeAwayPPG', rows, row => row.deltaHomeAwayPPG, HOME_AWAY_SORT_ORDERS.deltaHomeAwayPPG),
            deltaHomeAwayGoalsFor: buildLeaderboard('deltaHomeAwayGoalsFor', rows, row => row.deltaHomeAwayGoalsFor, HOME_AWAY_SORT_ORDERS.deltaHomeAwayGoalsFor),
            deltaHomeAwayGoalsAgainst: buildLeaderboard('deltaHomeAwayGoalsAgainst', rows, row => row.deltaHomeAwayGoalsAgainst, HOME_AWAY_SORT_ORDERS.deltaHomeAwayGoalsAgainst),
        },
    };
}
export function buildEmptyAdvancedLeaderboards() {
    return {
        cleanSheets: buildLeaderboard('cleanSheets', [], () => null, ADVANCED_SORT_ORDERS.cleanSheets),
        failedToScore: buildLeaderboard('failedToScore', [], () => null, ADVANCED_SORT_ORDERS.failedToScore),
        xGPerMatch: buildLeaderboard('xGPerMatch', [], () => null, ADVANCED_SORT_ORDERS.xGPerMatch),
        possession: buildLeaderboard('possession', [], () => null, ADVANCED_SORT_ORDERS.possession),
        shotsPerMatch: buildLeaderboard('shotsPerMatch', [], () => null, ADVANCED_SORT_ORDERS.shotsPerMatch),
        shotsOnTargetPerMatch: buildLeaderboard('shotsOnTargetPerMatch', [], () => null, ADVANCED_SORT_ORDERS.shotsOnTargetPerMatch),
    };
}
export { ADVANCED_METRICS };
