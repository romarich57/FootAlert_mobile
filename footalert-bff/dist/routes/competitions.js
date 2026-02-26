import { z } from 'zod';
import { apiFootballGet } from '../lib/apiFootballClient.js';
import { withCache } from '../lib/cache.js';
import { mapWithConcurrency } from '../lib/concurrency/mapWithConcurrency.js';
import { numericStringSchema, seasonSchema } from '../lib/schemas.js';
import { parseOrThrow } from '../lib/validation.js';
const competitionIdParamsSchema = z
    .object({
    id: numericStringSchema,
})
    .strict();
const searchQuerySchema = z
    .object({
    q: z.string().trim().min(1).max(100),
})
    .strict();
const seasonQuerySchema = z
    .object({
    season: seasonSchema,
})
    .strict();
const playerStatsQuerySchema = z
    .object({
    season: seasonSchema,
    type: z.enum(['topscorers', 'topassists', 'topyellowcards', 'topredcards']),
})
    .strict();
const COMPETITION_TRANSFERS_MAX_CONCURRENCY = 3;
function toFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function toText(value, fallback = '') {
    if (typeof value !== 'string') {
        return fallback;
    }
    const normalized = value.trim().replace(/\s+/g, ' ');
    return normalized || fallback;
}
function toTransferTimestamp(value) {
    if (!value) {
        return Number.MIN_SAFE_INTEGER;
    }
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : Number.MIN_SAFE_INTEGER;
}
function isDateInSeason(dateIso, season) {
    if (!dateIso) {
        return false;
    }
    const parsed = new Date(dateIso);
    if (Number.isNaN(parsed.getTime())) {
        return false;
    }
    const seasonStart = new Date(Date.UTC(season, 6, 1, 0, 0, 0));
    const seasonEnd = new Date(Date.UTC(season + 1, 5, 30, 23, 59, 59));
    return parsed >= seasonStart && parsed <= seasonEnd;
}
function mapTransferTeamPayload(team) {
    const raw = (team ?? {});
    return {
        id: toFiniteNumber(raw.id) ?? 0,
        name: toText(raw.name, ''),
        logo: toText(raw.logo, ''),
    };
}
function normalizeTransferKeyText(value) {
    return value
        .trim()
        .replace(/\s+/g, ' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}
function buildTransferKey(params) {
    const teamOutPart = params.teamOutId > 0
        ? `id:${params.teamOutId}`
        : `name:${normalizeTransferKeyText(params.teamOutName)}`;
    const teamInPart = params.teamInId > 0
        ? `id:${params.teamInId}`
        : `name:${normalizeTransferKeyText(params.teamInName)}`;
    return [
        params.playerId,
        normalizeTransferKeyText(params.playerName),
        normalizeTransferKeyText(params.transferType),
        teamOutPart,
        teamInPart,
        params.teamInInLeague ? '1' : '0',
        params.teamOutInLeague ? '1' : '0',
    ].join('|');
}
function normalizeTransferDate(value) {
    const explicitDate = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (explicitDate) {
        return explicitDate;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed.toISOString().slice(0, 10);
}
function buildPlayerStatsPath(type, leagueId, season) {
    return `/players/${type}?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}`;
}
export async function registerCompetitionsRoutes(app) {
    app.get('/v1/competitions', async (request) => {
        parseOrThrow(z.object({}).strict(), request.query);
        const cacheKey = `competitions:${request.url}`;
        return withCache(cacheKey, 120_000, () => apiFootballGet('/leagues'));
    });
    app.get('/v1/competitions/search', async (request) => {
        const query = parseOrThrow(searchQuerySchema, request.query);
        const cacheKey = `competitions:search:${request.url}`;
        return withCache(cacheKey, 60_000, () => apiFootballGet(`/leagues?search=${encodeURIComponent(query.q)}`));
    });
    app.get('/v1/competitions/:id', async (request) => {
        const params = parseOrThrow(competitionIdParamsSchema, request.params);
        parseOrThrow(z.object({}).strict(), request.query);
        const cacheKey = `competition:${request.url}`;
        return withCache(cacheKey, 120_000, () => apiFootballGet(`/leagues?id=${encodeURIComponent(params.id)}`));
    });
    app.get('/v1/competitions/:id/standings', {
        config: {
            rateLimit: {
                max: 35,
                timeWindow: '1 minute',
            },
        },
    }, async (request) => {
        const params = parseOrThrow(competitionIdParamsSchema, request.params);
        const query = parseOrThrow(seasonQuerySchema, request.query);
        const cacheKey = `competition:standings:${request.url}`;
        return withCache(cacheKey, 60_000, () => apiFootballGet(`/standings?league=${encodeURIComponent(params.id)}&season=${encodeURIComponent(String(query.season))}`));
    });
    app.get('/v1/competitions/:id/matches', async (request) => {
        const params = parseOrThrow(competitionIdParamsSchema, request.params);
        const query = parseOrThrow(seasonQuerySchema, request.query);
        const cacheKey = `competition:matches:${request.url}`;
        return withCache(cacheKey, 60_000, () => apiFootballGet(`/fixtures?league=${encodeURIComponent(params.id)}&season=${encodeURIComponent(String(query.season))}`));
    });
    app.get('/v1/competitions/:id/player-stats', {
        config: {
            rateLimit: {
                max: 30,
                timeWindow: '1 minute',
            },
        },
    }, async (request) => {
        const params = parseOrThrow(competitionIdParamsSchema, request.params);
        const query = parseOrThrow(playerStatsQuerySchema, request.query);
        const cacheKey = `competition:playerstats:${request.url}`;
        return withCache(cacheKey, 90_000, () => apiFootballGet(buildPlayerStatsPath(query.type, params.id, query.season)));
    });
    app.get('/v1/competitions/:id/transfers', async (request) => {
        const params = parseOrThrow(competitionIdParamsSchema, request.params);
        const query = parseOrThrow(z.object({ season: seasonSchema.optional() }).strict(), request.query);
        const cacheKey = `competition:transfers:v2:${request.url}`;
        const selectedSeason = query.season ?? new Date().getFullYear();
        // Cache for 1 hour to heavily preserve API quotas since it does many requests
        return withCache(cacheKey, 3_600_000, async () => {
            // 1. Fetch teams for the league
            const teamsResponse = await apiFootballGet(`/teams?league=${encodeURIComponent(params.id)}&season=${encodeURIComponent(String(selectedSeason))}`);
            const teams = teamsResponse.response ?? [];
            if (teams.length === 0) {
                return { response: [] };
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
                    // Ignore one failing team call and keep the rest of the league transfers.
                    return { response: [] };
                }
            });
            const flattenedTransfersMap = new Map();
            for (const teamTransfersResponse of transfersResponses) {
                const playerTransfers = Array.isArray(teamTransfersResponse?.response)
                    ? teamTransfersResponse.response
                    : [];
                for (const playerTransfer of playerTransfers) {
                    const transferBlock = (playerTransfer ?? {});
                    const player = (transferBlock.player ?? {});
                    const playerId = toFiniteNumber(player.id);
                    const playerName = toText(player.name, '');
                    if (playerId === null) {
                        continue;
                    }
                    if (!playerName) {
                        continue;
                    }
                    const transferItems = Array.isArray(transferBlock.transfers)
                        ? transferBlock.transfers
                        : [];
                    for (const transferItem of transferItems) {
                        const transfer = (transferItem ?? {});
                        const transferDateRaw = toText(transfer.date);
                        const transferDate = transferDateRaw ? normalizeTransferDate(transferDateRaw) : null;
                        if (!transferDate || !isDateInSeason(transferDate, selectedSeason)) {
                            continue;
                        }
                        const transferType = toText(transfer.type);
                        if (!transferType) {
                            continue;
                        }
                        const transferTeams = (transfer.teams ?? {});
                        const teamInPayload = mapTransferTeamPayload(transferTeams.in);
                        const teamOutPayload = mapTransferTeamPayload(transferTeams.out);
                        if (teamInPayload.id <= 0 ||
                            teamOutPayload.id <= 0 ||
                            !teamInPayload.name ||
                            !teamOutPayload.name) {
                            continue;
                        }
                        const teamInInLeague = teamInPayload.id > 0 && leagueTeamIds.has(teamInPayload.id);
                        const teamOutInLeague = teamOutPayload.id > 0 && leagueTeamIds.has(teamOutPayload.id);
                        if (!teamInInLeague && !teamOutInLeague) {
                            continue;
                        }
                        const transferKey = buildTransferKey({
                            playerId,
                            playerName,
                            transferType,
                            teamInId: teamInPayload.id,
                            teamInName: teamInPayload.name,
                            teamOutId: teamOutPayload.id,
                            teamOutName: teamOutPayload.name,
                            teamInInLeague,
                            teamOutInLeague,
                        });
                        const existingTransfer = flattenedTransfersMap.get(transferKey);
                        if (existingTransfer) {
                            const existingDate = existingTransfer.transfers?.[0]?.date ?? null;
                            if (toTransferTimestamp(existingDate) >= toTransferTimestamp(transferDate)) {
                                continue;
                            }
                        }
                        flattenedTransfersMap.set(transferKey, {
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
                                        in: teamInPayload,
                                        out: teamOutPayload,
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
            const flattenedTransfers = Array.from(flattenedTransfersMap.values()).sort((a, b) => {
                const dateA = toTransferTimestamp(a.transfers?.[0]?.date ?? null);
                const dateB = toTransferTimestamp(b.transfers?.[0]?.date ?? null);
                return dateB - dateA;
            });
            return { response: flattenedTransfers };
        });
    });
}
