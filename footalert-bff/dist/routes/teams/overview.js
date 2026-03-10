// Orchestration principale de l'overview d'une équipe.
// Ce fichier expose les 3 fonctions publiques utilisées par les handlers de route.
// La logique métier est répartie dans :
//   - overview.types.ts  : définitions de types
//   - overview.mappers.ts : fonctions pures de transformation
//   - overview.fetchers.ts : appels API-Football avec cache
import { buildCoachPerformance, buildHistorySeasons, buildMiniStandingRows, findTeamStandingRow, isWinnerTrophy, mapFixtureToTeamMatch, mapFixturesToTeamMatches, mapRecentTeamForm, mapStandings, parseHistorySeasonsCsv, resolveCurrentStandingRows, buildSeasonStats, toSettledError, toText, } from './overview.mappers.js';
import { buildOverviewLeadersPayload, fetchOverviewCoach, fetchOverviewFixtures, fetchOverviewNextFixture, fetchOverviewPlayers, fetchOverviewStandings, fetchOverviewStatistics, fetchOverviewTrophies, } from './overview.fetchers.js';
export { fetchOverviewFixtures, fetchOverviewPlayers, fetchOverviewStandings, } from './overview.fetchers.js';
export async function fetchTeamOverviewLeadersPayload({ teamId, leagueId, season, }) {
    const playersPayload = await fetchOverviewPlayers(teamId, leagueId, season);
    return buildOverviewLeadersPayload(playersPayload, { teamId, leagueId, season }, new Date().toISOString());
}
export async function fetchTeamOverviewCorePayload({ teamId, leagueId, season, timezone, historySeasons, logger, }) {
    const [fixturesResult, nextFixtureResult, standingsResult, statisticsResult, coachResult, trophiesResult] = await Promise.allSettled([
        fetchOverviewFixtures(teamId, leagueId, season, timezone),
        fetchOverviewNextFixture(teamId, timezone),
        fetchOverviewStandings(leagueId, season),
        fetchOverviewStatistics(teamId, leagueId, season),
        fetchOverviewCoach(teamId),
        fetchOverviewTrophies(teamId, logger),
    ]);
    // Échec critique : impossible de charger les données de match (fixtures + prochain match)
    if (fixturesResult.status === 'rejected' && nextFixtureResult.status === 'rejected') {
        throw toSettledError([fixturesResult, nextFixtureResult], 'Unable to load overview match datasets');
    }
    // Échec critique : impossible de charger classements ET statistiques
    if (standingsResult.status === 'rejected' && statisticsResult.status === 'rejected') {
        throw toSettledError([standingsResult, statisticsResult], 'Unable to load overview standings and statistics datasets');
    }
    const fixturesPayload = fixturesResult.status === 'fulfilled' ? fixturesResult.value : [];
    const nextFixturePayload = nextFixtureResult.status === 'fulfilled' ? nextFixtureResult.value : null;
    const standingsPayload = standingsResult.status === 'fulfilled' ? standingsResult.value : null;
    const statisticsPayload = statisticsResult.status === 'fulfilled' ? statisticsResult.value : null;
    const coach = coachResult.status === 'fulfilled' ? coachResult.value : null;
    const trophiesPayload = trophiesResult.status === 'fulfilled' ? trophiesResult.value : [];
    const matchesData = mapFixturesToTeamMatches(fixturesPayload);
    const standings = mapStandings(standingsPayload, teamId);
    const standingRow = findTeamStandingRow(standings.groups);
    const seasonStats = buildSeasonStats(statisticsPayload, standingRow);
    const currentStandingRows = resolveCurrentStandingRows(standings.groups);
    const miniStandingRows = buildMiniStandingRows(currentStandingRows);
    const coachPerformance = buildCoachPerformance(coach, seasonStats);
    // Récupération parallèle des classements historiques pour construire le graphe de progression
    const resolvedHistorySeasons = buildHistorySeasons(season, historySeasons);
    const historyResults = await Promise.allSettled(resolvedHistorySeasons.map(historySeason => {
        if (historySeason === season && standingsResult.status === 'fulfilled') {
            return Promise.resolve(standingsResult.value);
        }
        return fetchOverviewStandings(leagueId, historySeason);
    }));
    const standingHistory = resolvedHistorySeasons.map((historySeason, index) => {
        const historyPayload = historyResults[index];
        if (historyPayload?.status !== 'fulfilled') {
            return {
                season: historySeason,
                rank: null,
            };
        }
        const historyStandings = mapStandings(historyPayload.value, teamId);
        const historyStandingRow = findTeamStandingRow(historyStandings.groups);
        return {
            season: historySeason,
            rank: historyStandingRow?.rank ?? null,
        };
    });
    const nextMatch = nextFixturePayload
        ? mapFixtureToTeamMatch(nextFixturePayload)
        : matchesData.upcoming[0] ?? null;
    // Résolution du nom et logo de la ligue : classement > fixtures > statistiques
    const leagueName = standings.leagueName ??
        matchesData.all[0]?.leagueName ??
        toText(statisticsPayload?.league?.name);
    const leagueLogo = standings.leagueLogo ?? matchesData.all[0]?.leagueLogo ?? null;
    return {
        nextMatch,
        recentForm: mapRecentTeamForm(matchesData.past, teamId, 5),
        seasonStats,
        miniStanding: miniStandingRows.length > 0
            ? {
                leagueId: standings.leagueId ?? leagueId,
                leagueName,
                leagueLogo,
                rows: miniStandingRows,
            }
            : null,
        standingHistory,
        coachPerformance,
        trophiesCount: trophiesPayload.length,
        trophyWinsCount: trophiesPayload.filter(item => isWinnerTrophy(toText(item.place))).length,
    };
}
export function parseOverviewHistorySeasons(value) {
    return parseHistorySeasonsCsv(value);
}
