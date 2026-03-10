export const COMPETITION_FULL_BASE_SEASON = 'base';

export function buildTeamFullEntityId(teamId: string): string {
  return teamId;
}

export function buildPlayerFullEntityId(playerId: string, season: number): string {
  return `${playerId}:${season}`;
}

export function parsePlayerFullEntityId(entityId: string): {
  playerId: string;
  season: number;
} | null {
  const [playerId, seasonValue] = entityId.split(':');
  const season = Number(seasonValue);

  if (!playerId || !Number.isFinite(season)) {
    return null;
  }

  return {
    playerId,
    season,
  };
}

export function buildCompetitionFullEntityId(
  competitionId: string,
  season?: number | null,
): string {
  return `${competitionId}:${typeof season === 'number' ? season : COMPETITION_FULL_BASE_SEASON}`;
}

export function parseCompetitionFullEntityId(entityId: string): {
  competitionId: string;
  season: number | null;
} | null {
  const [competitionId, seasonValue] = entityId.split(':');
  if (!competitionId || !seasonValue) {
    return null;
  }

  if (seasonValue === COMPETITION_FULL_BASE_SEASON) {
    return {
      competitionId,
      season: null,
    };
  }

  const season = Number(seasonValue);
  if (!Number.isFinite(season)) {
    return null;
  }

  return {
    competitionId,
    season,
  };
}

export function buildMatchFullEntityId(matchId: string): string {
  return matchId;
}
