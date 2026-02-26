import { apiFootballGet } from '../../lib/apiFootballClient.js';

import {
  normalizeTransferDate,
  normalizeTransferKeyText,
  toNumericId,
  toTransferTimestamp,
} from './helpers.js';

export async function fetchNormalizedTeamTransfers(teamId: string): Promise<{ response: unknown[] }> {
  const data = await apiFootballGet<{ response?: unknown[] }>(
    `/transfers?team=${encodeURIComponent(teamId)}`,
  );
  const rawTransfers = Array.isArray(data?.response) ? data.response : [];
  const dedupedTransfersMap = new Map<string, unknown>();

  for (const transferBlock of rawTransfers) {
    const transferBlockRecord = (transferBlock ?? {}) as Record<string, unknown>;
    const player = (transferBlockRecord.player ?? {}) as Record<string, unknown>;
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
      const transfer = (transferItem ?? {}) as Record<string, unknown>;
      const transferDateRaw = typeof transfer.date === 'string' ? transfer.date.trim() : '';
      const transferDate = transferDateRaw ? normalizeTransferDate(transferDateRaw) : null;
      const transferType = typeof transfer.type === 'string' ? transfer.type.trim() : '';
      if (!transferDate || !transferType) {
        continue;
      }

      const transferTeams = (transfer.teams ?? {}) as Record<string, unknown>;
      const teamIn = (transferTeams.in ?? {}) as Record<string, unknown>;
      const teamOut = (transferTeams.out ?? {}) as Record<string, unknown>;

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
        const existingTransferRecord = existingTransfer as Record<string, unknown>;
        const existingTransfers = Array.isArray(existingTransferRecord.transfers)
          ? existingTransferRecord.transfers
          : [];
        const existingTransferItem = (existingTransfers[0] ?? {}) as Record<string, unknown>;
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
