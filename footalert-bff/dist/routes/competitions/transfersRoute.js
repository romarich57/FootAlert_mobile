import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { withCache } from '../../lib/cache.js';
import { mapWithConcurrency } from '../../lib/concurrency/mapWithConcurrency.js';
import { parseOrThrow } from '../../lib/validation.js';
import { competitionIdParamsSchema, COMPETITION_TRANSFERS_MAX_CONCURRENCY, optionalSeasonQuerySchema, } from './schemas.js';
import { buildTransferKey, isDateInSeason, mapTransferTeamPayload, normalizeTransferDate, toFiniteNumber, toSortedTransfers, toText, toTransferTimestamp, } from './transfersMapper.js';
export function registerCompetitionTransfersRoute(app) {
    app.get('/v1/competitions/:id/transfers', {
        config: {
            rateLimit: {
                max: 10,
                timeWindow: '1 minute',
            },
        },
    }, async (request) => {
        const params = parseOrThrow(competitionIdParamsSchema, request.params);
        const query = parseOrThrow(optionalSeasonQuerySchema, request.query);
        const cacheKey = `competition:transfers:v2:${request.url}`;
        const selectedSeason = query.season ?? new Date().getFullYear();
        return withCache(cacheKey, 3_600_000, async () => {
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
                    if (playerId === null || !playerName) {
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
                        if (teamInPayload.id <= 0
                            || teamOutPayload.id <= 0
                            || !teamInPayload.name
                            || !teamOutPayload.name) {
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
            return { response: toSortedTransfers(flattenedTransfersMap) };
        });
    });
}
