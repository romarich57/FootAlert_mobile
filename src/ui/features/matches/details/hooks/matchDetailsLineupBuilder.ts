import {
  mapMatchLineupTeam,
} from '@data/mappers/fixturesMapper';
import {
  toNullableText,
  toRawRecord,
} from '@ui/features/matches/details/hooks/matchDetailsDataTransforms';
import type {
  MatchLineupAbsence,
  MatchLineupTeam,
} from '@ui/features/matches/types/matches.types';

export function buildTeamLineups({
  absences,
  lineups,
}: {
  absences: unknown[];
  lineups: unknown[];
}): MatchLineupTeam[] {
  const absencesMap = new Map<string, MatchLineupAbsence[]>();

  absences.forEach(item => {
    const rawItem = toRawRecord(item) ?? {};
    const teamId = String(rawItem.teamId ?? '');
    const entries = Array.isArray(rawItem.response) ? rawItem.response : [];

    const absenceRows = entries
      .map(entry => {
        const entryRecord = toRawRecord(entry) ?? {};
        const playerRecord = toRawRecord(entryRecord.player) ?? {};
        const playerIdValue = playerRecord.id;
        const playerId =
          typeof playerIdValue === 'number' && Number.isFinite(playerIdValue)
            ? String(playerIdValue)
            : typeof playerIdValue === 'string'
              ? playerIdValue
              : null;
        const playerName = typeof playerRecord.name === 'string' ? playerRecord.name.trim() : '';

        if (!playerName) {
          return null;
        }

        return {
          id: playerId,
          name: playerName,
          photo: typeof playerRecord.photo === 'string' ? playerRecord.photo : null,
          reason: toNullableText(playerRecord.reason),
          status: toNullableText(entryRecord.status),
          type: toNullableText(playerRecord.type),
        } satisfies MatchLineupAbsence;
      })
      .filter((entry): entry is MatchLineupAbsence => entry !== null);

    if (teamId && absenceRows.length > 0) {
      absencesMap.set(teamId, absenceRows);
    }
  });

  return lineups
    .map(raw => mapMatchLineupTeam(raw))
    .filter((team): team is Omit<MatchLineupTeam, 'absences'> => team !== null)
    .map(team => ({
      ...team,
      absences: absencesMap.get(team.teamId) ?? [],
    }));
}
