import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { buildTeamAdvancedStatsPayload, computeLeagueAdvancedTeamStats, } from './advancedStats.js';
import { toNumericId } from './helpers.js';
import { fetchOverviewFixtures, fetchOverviewPlayers, fetchOverviewStandings, fetchTeamOverviewCorePayload, fetchTeamOverviewLeadersPayload, parseOverviewHistorySeasons, } from './overview.js';
import { fetchNormalizedTeamTransfers } from './transfers.js';
import { fetchTeamTrophiesWithFallback } from './trophies.js';
function firstSettledError(results) {
    for (const result of results) {
        if (result.status === 'rejected') {
            return result.reason instanceof Error
                ? result.reason
                : new Error(String(result.reason));
        }
    }
    return new Error('Unable to load team full payload');
}
function resolveSettledValue(result, fallback) {
    return result.status === 'fulfilled' ? result.value : fallback;
}
function toOptionalText(value) {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}
function toOptionalNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function sortSeasonsDesc(seasons) {
    return [...seasons].sort((first, second) => second - first);
}
function mapTeamCompetitionOptions(leagues) {
    return leagues
        .map(item => {
        if (!item || typeof item !== 'object') {
            return null;
        }
        const record = item;
        const league = record.league && typeof record.league === 'object'
            ? record.league
            : null;
        if (!league) {
            return null;
        }
        const leagueIdValue = league.id;
        const leagueId = typeof leagueIdValue === 'number' || typeof leagueIdValue === 'string'
            ? String(leagueIdValue)
            : null;
        if (!leagueId) {
            return null;
        }
        const seasonsPayload = Array.isArray(record.seasons) ? record.seasons : [];
        const seasons = seasonsPayload
            .map(seasonEntry => {
            if (!seasonEntry || typeof seasonEntry !== 'object') {
                return null;
            }
            return toOptionalNumber(seasonEntry.year);
        })
            .filter((season) => season !== null);
        const currentSeasonEntry = seasonsPayload.find(seasonEntry => {
            if (!seasonEntry || typeof seasonEntry !== 'object') {
                return false;
            }
            return seasonEntry.current === true;
        });
        return {
            leagueId,
            seasons: sortSeasonsDesc(Array.from(new Set(seasons))),
            currentSeason: currentSeasonEntry && typeof currentSeasonEntry === 'object'
                ? toOptionalNumber(currentSeasonEntry.year)
                : null,
            type: toOptionalText(league.type),
        };
    })
        .filter((item) => item !== null);
}
function resolveDefaultTeamSelection(competitions) {
    const selectMostRecent = (items) => [...items]
        .filter(item => item.seasons.length > 0)
        .sort((first, second) => (second.seasons[0] ?? 0) - (first.seasons[0] ?? 0))[0] ?? null;
    const leagueWithCurrentSeason = competitions.find(option => option.type?.toLowerCase() === 'league' && typeof option.currentSeason === 'number');
    if (leagueWithCurrentSeason) {
        return {
            leagueId: leagueWithCurrentSeason.leagueId,
            season: leagueWithCurrentSeason.currentSeason,
        };
    }
    const withCurrentSeason = competitions.find(option => typeof option.currentSeason === 'number');
    if (withCurrentSeason) {
        return {
            leagueId: withCurrentSeason.leagueId,
            season: withCurrentSeason.currentSeason,
        };
    }
    const leagueWithRecentSeason = selectMostRecent(competitions.filter(option => option.type?.toLowerCase() === 'league'));
    if (leagueWithRecentSeason) {
        return {
            leagueId: leagueWithRecentSeason.leagueId,
            season: leagueWithRecentSeason.seasons[0] ?? null,
        };
    }
    const withRecentSeason = selectMostRecent(competitions);
    if (withRecentSeason) {
        return {
            leagueId: withRecentSeason.leagueId,
            season: withRecentSeason.seasons[0] ?? null,
        };
    }
    return {
        leagueId: null,
        season: null,
    };
}
function resolveRequestedSelection(input) {
    const { competitions, leagueId, season } = input;
    if (leagueId) {
        const selectedCompetition = competitions.find(item => item.leagueId === leagueId);
        if (selectedCompetition) {
            if (typeof season === 'number' && selectedCompetition.seasons.includes(season)) {
                return { leagueId, season };
            }
            return {
                leagueId,
                season: selectedCompetition.currentSeason ?? selectedCompetition.seasons[0] ?? season ?? null,
            };
        }
    }
    if (typeof season === 'number') {
        const seasonScopedCompetitions = competitions.filter(item => item.seasons.includes(season));
        if (seasonScopedCompetitions.length > 0) {
            const preferredCompetition = seasonScopedCompetitions.find(item => item.type?.toLowerCase() === 'league')
                ?? seasonScopedCompetitions[0]
                ?? null;
            if (preferredCompetition) {
                return {
                    leagueId: preferredCompetition.leagueId,
                    season,
                };
            }
        }
    }
    return resolveDefaultTeamSelection(competitions);
}
async function fetchTeamDetailsPayload(teamId) {
    const payload = await apiFootballGet(`/teams?id=${encodeURIComponent(teamId)}`);
    return {
        response: Array.isArray(payload.response) ? payload.response : [],
    };
}
async function fetchTeamLeaguesPayload(teamId) {
    const payload = await apiFootballGet(`/leagues?team=${encodeURIComponent(teamId)}`);
    return {
        response: Array.isArray(payload.response) ? payload.response : [],
    };
}
async function fetchTeamStatisticsPayload(teamId, leagueId, season) {
    const payload = await apiFootballGet(`/teams/statistics?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}&team=${encodeURIComponent(teamId)}`);
    return {
        response: Array.isArray(payload.response)
            ? (payload.response[0] ?? null)
            : (payload.response ?? null),
    };
}
async function fetchTeamStandingsPayload(leagueId, season) {
    return {
        response: await fetchOverviewStandings(leagueId, season),
    };
}
async function fetchTeamMatchesPayload(params) {
    return {
        response: await fetchOverviewFixtures(params.teamId, params.leagueId, params.season, params.timezone),
    };
}
async function fetchTeamStatsPlayersPayload(teamId, leagueId, season) {
    return {
        response: await fetchOverviewPlayers(teamId, leagueId, season),
    };
}
async function fetchTeamSquadPayload(teamId) {
    const [squadResult, coachResult] = await Promise.allSettled([
        apiFootballGet(`/players/squads?team=${encodeURIComponent(teamId)}`),
        apiFootballGet(`/coachs?team=${encodeURIComponent(teamId)}`),
    ]);
    if (squadResult.status === 'rejected' && coachResult.status === 'rejected') {
        throw firstSettledError([squadResult, coachResult]);
    }
    const squadPayload = squadResult.status === 'fulfilled'
        ? squadResult.value
        : { response: [{ players: [] }] };
    const coachPayload = coachResult.status === 'fulfilled'
        ? coachResult.value
        : { response: [] };
    const squad = squadPayload.response?.[0] ?? { players: [] };
    squad.players = Array.isArray(squad.players) ? squad.players : [];
    const coaches = coachPayload.response ?? [];
    const teamIdAsNumber = Number(teamId);
    const currentCoach = coaches.find(coach => coach.career?.[0]?.team?.id === teamIdAsNumber && coach.career?.[0]?.end === null)
        ?? coaches[0]
        ?? null;
    squad.coach = currentCoach
        ? {
            id: currentCoach.id ?? null,
            name: typeof currentCoach.name === 'string' ? currentCoach.name : null,
            photo: typeof currentCoach.photo === 'string' ? currentCoach.photo : null,
            age: typeof currentCoach.age === 'number' ? currentCoach.age : null,
        }
        : null;
    return { response: [squad] };
}
async function fetchTeamAdvancedStatsPayload(teamId, leagueId, season) {
    const rankings = await computeLeagueAdvancedTeamStats(leagueId, season);
    return {
        response: buildTeamAdvancedStatsPayload(toNumericId(teamId) ?? Number(teamId), rankings.leagueId, rankings.season, rankings.sourceUpdatedAt, rankings.rankings),
    };
}
async function fetchTeamTrophiesPayload(teamId, logger) {
    const payload = await fetchTeamTrophiesWithFallback(teamId, logger);
    return {
        response: Array.isArray(payload.response) ? payload.response : [],
    };
}
export async function fetchTeamFullPayload(params) {
    const baseResults = await Promise.allSettled([
        fetchTeamDetailsPayload(params.teamId),
        fetchTeamLeaguesPayload(params.teamId),
    ]);
    if (baseResults.every(result => result.status === 'rejected')) {
        throw firstSettledError(baseResults);
    }
    const details = resolveSettledValue(baseResults[0], { response: [] });
    const leagues = resolveSettledValue(baseResults[1], { response: [] });
    const competitions = mapTeamCompetitionOptions(leagues.response);
    const selection = resolveRequestedSelection({
        competitions,
        leagueId: params.leagueId,
        season: params.season,
    });
    const selectedCompetition = selection.leagueId !== null
        ? competitions.find(item => item.leagueId === selection.leagueId) ?? null
        : null;
    const derivedHistorySeasons = parseOverviewHistorySeasons(params.historySeasons) ?? [];
    const historySeasons = derivedHistorySeasons.length > 0
        ? derivedHistorySeasons
        : (selectedCompetition?.seasons ?? []).filter(season => season !== selection.season).slice(0, 5);
    const hasSelection = Boolean(selection.leagueId) && typeof selection.season === 'number';
    const secondaryResults = await Promise.allSettled([
        hasSelection
            ? fetchTeamOverviewCorePayload({
                teamId: params.teamId,
                leagueId: selection.leagueId ?? '',
                season: selection.season ?? 0,
                timezone: params.timezone,
                historySeasons,
                logger: params.logger,
            })
            : Promise.resolve(null),
        hasSelection
            ? fetchTeamOverviewLeadersPayload({
                teamId: params.teamId,
                leagueId: selection.leagueId ?? '',
                season: selection.season ?? 0,
            })
            : Promise.resolve(null),
        hasSelection
            ? fetchTeamStandingsPayload(selection.leagueId ?? '', selection.season ?? 0)
            : Promise.resolve({ response: null }),
        hasSelection
            ? fetchTeamMatchesPayload({
                teamId: params.teamId,
                leagueId: selection.leagueId ?? '',
                season: selection.season ?? 0,
                timezone: params.timezone,
            })
            : Promise.resolve({ response: [] }),
        hasSelection
            ? fetchTeamStatisticsPayload(params.teamId, selection.leagueId ?? '', selection.season ?? 0)
            : Promise.resolve({ response: null }),
        hasSelection
            ? fetchTeamAdvancedStatsPayload(params.teamId, selection.leagueId ?? '', selection.season ?? 0)
            : Promise.resolve({ response: null }),
        hasSelection
            ? fetchTeamStatsPlayersPayload(params.teamId, selection.leagueId ?? '', selection.season ?? 0)
            : Promise.resolve({ response: [] }),
        fetchTeamSquadPayload(params.teamId),
        fetchNormalizedTeamTransfers(params.teamId, selection.season ?? params.season),
        fetchTeamTrophiesPayload(params.teamId, params.logger),
    ]);
    const [overview, overviewLeaders, standings, matches, statistics, advancedStats, statsPlayers, squad, transfers, trophies,] = secondaryResults;
    return {
        response: {
            details,
            leagues,
            selection,
            overview: resolveSettledValue(overview, null),
            overviewLeaders: resolveSettledValue(overviewLeaders, null),
            standings: resolveSettledValue(standings, { response: null }),
            matches: resolveSettledValue(matches, { response: [] }),
            statistics: resolveSettledValue(statistics, { response: null }),
            advancedStats: resolveSettledValue(advancedStats, { response: null }),
            statsPlayers: resolveSettledValue(statsPlayers, { response: [] }),
            squad: resolveSettledValue(squad, { response: [{ players: [], coach: null }] }),
            transfers: resolveSettledValue(transfers, { response: [] }),
            trophies: resolveSettledValue(trophies, { response: [] }),
        },
    };
}
