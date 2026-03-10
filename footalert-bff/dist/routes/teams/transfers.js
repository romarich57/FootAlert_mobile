import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { normalizeTransferDate, normalizeTransferKeyText, toNumericId, toTransferTimestamp, } from './helpers.js';
function isDateInSeason(dateValue, season) {
    if (!dateValue || typeof season !== 'number') {
        return true;
    }
    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) {
        return true;
    }
    const seasonStart = new Date(Date.UTC(season, 6, 1, 0, 0, 0));
    const seasonEnd = new Date(Date.UTC(season + 1, 5, 30, 23, 59, 59));
    return parsedDate >= seasonStart && parsedDate <= seasonEnd;
}
export function resolveTransfersCacheTtlMs(season, now = new Date()) {
    if (typeof season !== 'number') {
        return 6 * 60 * 60_000;
    }
    const currentSeason = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
    return season >= currentSeason ? 6 * 60 * 60_000 : 24 * 60 * 60_000;
}
export async function fetchNormalizedTeamTransfers(teamId, season) {
    const data = await apiFootballGet(`/transfers?team=${encodeURIComponent(teamId)}`);
    const rawTransfers = Array.isArray(data?.response) ? data.response : [];
    const dedupedTransfersMap = new Map();
    for (const transferBlock of rawTransfers) {
        const transferBlockRecord = (transferBlock ?? {});
        const player = (transferBlockRecord.player ?? {});
        const playerId = toNumericId(player.id);
        const playerName = typeof player.name === 'string' ? player.name.trim() : '';
        if (!playerId || !playerName) {
            continue;
        }
        const update = typeof transferBlockRecord.update === 'string'
            ? transferBlockRecord.update.trim()
            : null;
        const transferItems = Array.isArray(transferBlockRecord.transfers)
            ? transferBlockRecord.transfers
            : [];
        for (const transferItem of transferItems) {
            const transfer = (transferItem ?? {});
            const transferDateRaw = typeof transfer.date === 'string' ? transfer.date.trim() : '';
            const transferDate = transferDateRaw ? normalizeTransferDate(transferDateRaw) : null;
            const transferType = typeof transfer.type === 'string' ? transfer.type.trim() : '';
            if (!transferDate || !transferType) {
                continue;
            }
            if (!isDateInSeason(transferDate, season)) {
                continue;
            }
            const transferTeams = (transfer.teams ?? {});
            const teamIn = (transferTeams.in ?? {});
            const teamOut = (transferTeams.out ?? {});
            const teamInId = toNumericId(teamIn.id);
            const teamOutId = toNumericId(teamOut.id);
            const teamInName = typeof teamIn.name === 'string' ? teamIn.name.trim() : '';
            const teamOutName = typeof teamOut.name === 'string' ? teamOut.name.trim() : '';
            if (!teamInId || !teamOutId || !teamInName || !teamOutName) {
                continue;
            }
            const transferKey = [
                playerId,
                normalizeTransferKeyText(playerName),
                normalizeTransferKeyText(transferType),
                teamOutId,
                teamInId,
            ].join('|');
            const existingTransfer = dedupedTransfersMap.get(transferKey);
            if (existingTransfer) {
                const existingTransferRecord = existingTransfer;
                const existingTransfers = Array.isArray(existingTransferRecord.transfers)
                    ? existingTransferRecord.transfers
                    : [];
                const existingTransferItem = (existingTransfers[0] ?? {});
                const existingDate = typeof existingTransferItem.date === 'string'
                    ? existingTransferItem.date
                    : null;
                if (toTransferTimestamp(existingDate) >= toTransferTimestamp(transferDate)) {
                    continue;
                }
            }
            dedupedTransfersMap.set(transferKey, {
                player: {
                    id: playerId,
                    name: playerName,
                },
                update,
                transfers: [
                    {
                        date: transferDate,
                        type: transferType,
                        teams: {
                            in: {
                                id: teamInId,
                                name: teamInName,
                                logo: typeof teamIn.logo === 'string' ? teamIn.logo : '',
                            },
                            out: {
                                id: teamOutId,
                                name: teamOutName,
                                logo: typeof teamOut.logo === 'string' ? teamOut.logo : '',
                            },
                        },
                    },
                ],
            });
        }
    }
    return {
        response: Array.from(dedupedTransfersMap.values()),
    };
}
