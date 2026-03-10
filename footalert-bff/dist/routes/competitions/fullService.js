import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { env } from '../../config/env.js';
import { buildCanonicalCacheKey, withCache, withCacheStaleWhileRevalidate, } from '../../lib/cache.js';
import { mapWithConcurrency } from '../../lib/concurrency/mapWithConcurrency.js';
import { buildCompetitionBracket } from './bracketMapper.js';
import { COMPETITION_TRANSFERS_MAX_CONCURRENCY, } from './schemas.js';
import { buildCompetitionTeamStatsResponse } from './teamStats/service.js';
import { buildPlayerStatsPath, buildTransferKey, isDateInSeason, mapTransferTeamPayload, normalizeTransferDate, toFiniteNumber, toSortedTransfers, toText, } from './transfersMapper.js';
const COMPETITION_CACHE_TTL_MS = env.cacheTtl.competitions;
const EMPTY_PLAYER_STATS = {
    topScorers: [],
    topAssists: [],
    topYellowCards: [],
    topRedCards: [],
};
function toResponseArray(value) {
    if (!value || typeof value !== 'object') {
        return [];
    }
    const response = value.response;
    return Array.isArray(response) ? response : [];
}
function readCompetitionType(value) {
    if (!value || typeof value !== 'object') {
        return '';
    }
    const league = value.league;
    if (!league || typeof league !== 'object') {
        return '';
    }
    const type = league.type;
    return typeof type === 'string' ? type.trim().toLowerCase() : '';
}
function readCompetitionCurrentSeason(value) {
    if (!value || typeof value !== 'object') {
        return null;
    }
    const seasons = value.seasons;
    if (!Array.isArray(seasons)) {
        return null;
    }
    const currentSeasonEntry = seasons.find(entry => {
        if (!entry || typeof entry !== 'object') {
            return false;
        }
        return entry.current === true;
    });
    const fallbackSeasonEntry = currentSeasonEntry ?? seasons[0];
    if (!fallbackSeasonEntry || typeof fallbackSeasonEntry !== 'object') {
        return null;
    }
    const year = fallbackSeasonEntry.year;
    return typeof year === 'number' && Number.isFinite(year) ? year : null;
}
function resolveCompetitionKind(competition, fixtures) {
    const bracketPayload = buildCompetitionBracket(fixtures);
    const competitionType = readCompetitionType(competition);
    if (fixtures.length === 0 && competitionType === 'cup') {
        return {
            competitionKind: 'cup',
            bracket: null,
        };
    }
    return bracketPayload;
}
async function fetchCompetitionRecord(competitionId) {
    const payload = await withCache(buildCanonicalCacheKey('competition:full:league', { competitionId }), COMPETITION_CACHE_TTL_MS, () => apiFootballGet(`/leagues?id=${encodeURIComponent(competitionId)}`));
    return toResponseArray(payload)[0] ?? null;
}
async function fetchCompetitionFixtures(competitionId, season) {
    const payload = await withCache(buildCanonicalCacheKey('competition:matches:upstream', {
        competitionId,
        season,
    }), COMPETITION_CACHE_TTL_MS, () => apiFootballGet(`/fixtures?league=${encodeURIComponent(competitionId)}&season=${encodeURIComponent(String(season))}`));
    return toResponseArray(payload);
}
async function fetchCompetitionStandings(competitionId, season) {
    const payload = await withCache(buildCanonicalCacheKey('competition:team-stats:standings', {
        leagueId: competitionId,
        season,
    }), COMPETITION_CACHE_TTL_MS, () => apiFootballGet(`/standings?league=${encodeURIComponent(competitionId)}&season=${encodeURIComponent(String(season))}`));
    return toResponseArray(payload)[0] ?? null;
}
async function fetchCompetitionPlayerStatsList(competitionId, season, type) {
    const payload = await withCache(buildCanonicalCacheKey('competition:full:player-stats', {
        competitionId,
        season,
        type,
    }), COMPETITION_CACHE_TTL_MS, () => apiFootballGet(buildPlayerStatsPath(type, competitionId, season)));
    return toResponseArray(payload);
}
async function fetchCompetitionPlayerStatsBundle(competitionId, season) {
    const [topScorers, topAssists, topYellowCards, topRedCards] = await Promise.all([
        fetchCompetitionPlayerStatsList(competitionId, season, 'topscorers'),
        fetchCompetitionPlayerStatsList(competitionId, season, 'topassists'),
        fetchCompetitionPlayerStatsList(competitionId, season, 'topyellowcards'),
        fetchCompetitionPlayerStatsList(competitionId, season, 'topredcards'),
    ]);
    return {
        topScorers,
        topAssists,
        topYellowCards,
        topRedCards,
    };
}
async function fetchCompetitionTransfers(competitionId, season) {
    return withCache(buildCanonicalCacheKey('competition:transfers:v2', {
        competitionId,
        season,
    }), COMPETITION_CACHE_TTL_MS, async () => {
        const teamsResponse = await apiFootballGet(`/teams?league=${encodeURIComponent(competitionId)}&season=${encodeURIComponent(String(season))}`);
        const teams = teamsResponse.response ?? [];
        if (teams.length === 0) {
            return [];
        }
        const leagueTeamIds = new Set();
        teams.forEach(teamData => {
            const teamId = toFiniteNumber(teamData?.team?.id);
            if (teamId !== null) {
                leagueTeamIds.add(teamId);
            }
        });
        const transfersResponses = await mapWithConcurrency(teams, COMPETITION_TRANSFERS_MAX_CONCURRENCY, async (teamData) => {
            const teamId = toFiniteNumber(teamData?.team?.id);
            if (teamId === null) {
                return { response: [] };
            }
            try {
                return await apiFootballGet(`/transfers?team=${teamId}`);
            }
            catch {
                return { response: [] };
            }
        });
        const flattenedTransfers = new Map();
        for (const transferResponse of transfersResponses) {
            const playerTransfers = Array.isArray(transferResponse.response)
                ? transferResponse.response
                : [];
            for (const playerTransfer of playerTransfers) {
                const transferBlock = (playerTransfer ?? {});
                const player = (transferBlock.player ?? {});
                const playerId = toFiniteNumber(player.id);
                const playerName = toText(player.name, '');
                if (playerId === null || !playerName) {
                    continue;
                }
                const transferItems = Array.isArray(transferBlock.transfers)
                    ? transferBlock.transfers
                    : [];
                for (const transferItem of transferItems) {
                    const transfer = (transferItem ?? {});
                    const transferDate = normalizeTransferDate(toText(transfer.date));
                    if (!transferDate || !isDateInSeason(transferDate, season)) {
                        continue;
                    }
                    const transferType = toText(transfer.type);
                    if (!transferType) {
                        continue;
                    }
                    const transferTeams = (transfer.teams ?? {});
                    const teamIn = mapTransferTeamPayload(transferTeams.in);
                    const teamOut = mapTransferTeamPayload(transferTeams.out);
                    if (teamIn.id <= 0 || teamOut.id <= 0 || !teamIn.name || !teamOut.name) {
                        continue;
                    }
                    const teamInInLeague = leagueTeamIds.has(teamIn.id);
                    const teamOutInLeague = leagueTeamIds.has(teamOut.id);
                    if (!teamInInLeague && !teamOutInLeague) {
                        continue;
                    }
                    const transferKey = buildTransferKey({
                        playerId,
                        playerName,
                        transferType,
                        teamInId: teamIn.id,
                        teamInName: teamIn.name,
                        teamOutId: teamOut.id,
                        teamOutName: teamOut.name,
                        teamInInLeague,
                        teamOutInLeague,
                    });
                    const existingTransfer = flattenedTransfers.get(transferKey);
                    const existingDate = existingTransfer?.transfers?.[0]?.date ?? '';
                    if (existingDate >= transferDate) {
                        continue;
                    }
                    flattenedTransfers.set(transferKey, {
                        player: {
                            id: playerId,
                            name: playerName,
                        },
                        update: toText(transferBlock.update),
                        transfers: [
                            {
                                date: transferDate,
                                type: transferType,
                                teams: {
                                    in: teamIn,
                                    out: teamOut,
                                },
                            },
                        ],
                        context: {
                            teamInInLeague,
                            teamOutInLeague,
                        },
                    });
                }
            }
        }
        return toSortedTransfers(flattenedTransfers);
    });
}
export async function buildCompetitionFullResponse(competitionId, requestedSeason) {
    return withCacheStaleWhileRevalidate(buildCanonicalCacheKey('competition:full:v1', {
        competitionId,
        season: requestedSeason ?? null,
    }), COMPETITION_CACHE_TTL_MS, async () => {
        const competition = await fetchCompetitionRecord(competitionId);
        const season = requestedSeason ??
            readCompetitionCurrentSeason(competition) ??
            new Date().getUTCFullYear();
        const [matches, transfers] = await Promise.all([
            fetchCompetitionFixtures(competitionId, season),
            fetchCompetitionTransfers(competitionId, season),
        ]);
        const { competitionKind, bracket } = resolveCompetitionKind(competition, matches);
        const shouldLoadAnalytics = competitionKind !== 'cup';
        const [standings, playerStats, teamStats] = await Promise.all([
            shouldLoadAnalytics ? fetchCompetitionStandings(competitionId, season) : null,
            shouldLoadAnalytics
                ? fetchCompetitionPlayerStatsBundle(competitionId, season)
                : EMPTY_PLAYER_STATS,
            shouldLoadAnalytics ? buildCompetitionTeamStatsResponse(competitionId, season) : null,
        ]);
        return {
            competition,
            competitionKind,
            season,
            standings,
            matches,
            bracket,
            playerStats,
            teamStats,
            transfers,
        };
    });
}
