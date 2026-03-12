export const COMPETITION_FULL_BASE_SEASON = 'base';
export const TEAM_FULL_BASE_LEAGUE = 'base';
export const TEAM_FULL_BASE_SEASON = 'base';

export function buildTeamFullEntityId(
  teamId: string,
  leagueId?: string | null,
  season?: number | null,
  timezone: string = 'Europe/Paris',
): string {
  return [
    teamId,
    leagueId ?? TEAM_FULL_BASE_LEAGUE,
    typeof season === 'number' ? season : TEAM_FULL_BASE_SEASON,
    timezone,
  ].join(':');
}

export function parseTeamFullEntityId(entityId: string): {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  timezone: string;
} | null {
  const [teamId, leagueIdValue, seasonValue, ...timezoneParts] = entityId.split(':');
  const timezone = timezoneParts.join(':');

  if (!teamId || !leagueIdValue || !seasonValue || !timezone) {
    return null;
  }

  const season =
    seasonValue === TEAM_FULL_BASE_SEASON ? null : Number(seasonValue);
  if (seasonValue !== TEAM_FULL_BASE_SEASON && !Number.isFinite(season)) {
    return null;
  }

  return {
    teamId,
    leagueId: leagueIdValue === TEAM_FULL_BASE_LEAGUE ? null : leagueIdValue,
    season,
    timezone,
  };
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
