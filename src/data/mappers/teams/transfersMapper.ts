import type {
  TeamApiTransferDto,
  TeamTransferDirection,
  TeamTransferItem,
  TeamTransfersData,
} from '@ui/features/teams/types/teams.types';

import { toId, toSortableTimestamp, toText } from './shared';

function isDateInSeason(dateIso: string | null, season: number | null): boolean {
  if (!dateIso || season === null) {
    return true;
  }

  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) {
    return true;
  }

  const seasonStart = new Date(Date.UTC(season, 6, 1, 0, 0, 0));
  const seasonEnd = new Date(Date.UTC(season + 1, 5, 30, 23, 59, 59));

  return parsed >= seasonStart && parsed <= seasonEnd;
}

export function mapTransfersToTeamTransfers(
  payload: TeamApiTransferDto[],
  teamId: string,
  season: number | null,
): TeamTransfersData {
  const arrivalsByKey = new Map<string, TeamTransferItem>();
  const departuresByKey = new Map<string, TeamTransferItem>();

  const normalizeKeyTextPart = (value: string | null): string => {
    return (value ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  };

  const normalizeKeyDatePart = (value: string | null): string => {
    if (!value) {
      return '';
    }

    const normalized = value.trim();
    const explicitDatePart = normalized.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (explicitDatePart) {
      return explicitDatePart;
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      return normalized.toLowerCase();
    }

    return parsed.toISOString().slice(0, 10);
  };

  const toTeamKeyPart = (teamIdPart: string | null, teamNamePart: string | null): string => {
    const normalizedId = normalizeKeyTextPart(teamIdPart);
    if (normalizedId) {
      return `id:${normalizedId}`;
    }

    const normalizedName = normalizeKeyTextPart(teamNamePart);
    return normalizedName ? `name:${normalizedName}` : '';
  };

  const buildTransferDedupKey = (
    direction: TeamTransferDirection,
    item: Omit<TeamTransferItem, 'id'>,
  ): string => {
    return [
      direction,
      normalizeKeyTextPart(item.playerId),
      normalizeKeyTextPart(item.playerName),
      normalizeKeyTextPart(item.type),
      toTeamKeyPart(item.fromTeamId, item.fromTeamName),
      toTeamKeyPart(item.toTeamId, item.toTeamName),
    ].join('|');
  };

  payload.forEach(transferBlock => {
    const playerId = toId(transferBlock.player?.id);
    const playerName = toText(transferBlock.player?.name);
    if (!playerId || !playerName) {
      return;
    }

    (transferBlock.transfers ?? []).forEach(transfer => {
      const transferDate = normalizeKeyDatePart(toText(transfer.date));
      const transferType = toText(transfer.type);
      const fromTeamName = toText(transfer.teams?.out?.name);
      const toTeamName = toText(transfer.teams?.in?.name);
      if (!transferDate || !transferType) {
        return;
      }

      if (!isDateInSeason(transferDate, season)) {
        return;
      }

      const teamInId = toId(transfer.teams?.in?.id);
      const teamOutId = toId(transfer.teams?.out?.id);
      if (!teamInId || !teamOutId || !fromTeamName || !toTeamName) {
        return;
      }
      const commonPayload = {
        playerId,
        playerName,
        playerPhoto: playerId ? `https://media.api-sports.io/football/players/${playerId}.png` : null,
        position: null,
        date: transferDate,
        type: transferType,
        amount: null,
        fromTeamId: teamOutId,
        fromTeamName,
        fromTeamLogo: toText(transfer.teams?.out?.logo),
        toTeamId: teamInId,
        toTeamName,
        toTeamLogo: toText(transfer.teams?.in?.logo),
      };

      if (teamInId === teamId) {
        const arrivalItem: Omit<TeamTransferItem, 'id'> = {
          direction: 'arrival',
          ...commonPayload,
        };
        const dedupKey = buildTransferDedupKey('arrival', arrivalItem);
        const nextItem: TeamTransferItem = {
          id: dedupKey,
          ...arrivalItem,
        };
        const existingItem = arrivalsByKey.get(dedupKey);
        if (
          !existingItem ||
          toSortableTimestamp(nextItem.date) > toSortableTimestamp(existingItem.date)
        ) {
          arrivalsByKey.set(dedupKey, nextItem);
        }
      }

      if (teamOutId === teamId) {
        const departureItem: Omit<TeamTransferItem, 'id'> = {
          direction: 'departure',
          ...commonPayload,
        };
        const dedupKey = buildTransferDedupKey('departure', departureItem);
        const nextItem: TeamTransferItem = {
          id: dedupKey,
          ...departureItem,
        };
        const existingItem = departuresByKey.get(dedupKey);
        if (
          !existingItem ||
          toSortableTimestamp(nextItem.date) > toSortableTimestamp(existingItem.date)
        ) {
          departuresByKey.set(dedupKey, nextItem);
        }
      }
    });
  });

  const sortByDateDesc = (first: TeamTransferItem, second: TeamTransferItem) => {
    const firstDate = toSortableTimestamp(first.date);
    const secondDate = toSortableTimestamp(second.date);
    return secondDate - firstDate;
  };

  return {
    arrivals: Array.from(arrivalsByKey.values()).sort(sortByDateDesc),
    departures: Array.from(departuresByKey.values()).sort(sortByDateDesc),
  };
}
