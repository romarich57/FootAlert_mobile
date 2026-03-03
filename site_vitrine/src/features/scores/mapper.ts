import type { MatchScoreCard } from './types';

function safeObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readGoals(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return null;
}

export function mapFixtureToScoreCard(input: unknown): MatchScoreCard | null {
  const root = safeObject(input);
  if (!root) {
    return null;
  }

  const fixture = safeObject(root.fixture);
  const league = safeObject(root.league);
  const teams = safeObject(root.teams);
  const goals = safeObject(root.goals);
  const home = teams ? safeObject(teams.home) : null;
  const away = teams ? safeObject(teams.away) : null;
  const status = fixture ? safeObject(fixture.status) : null;

  const fixtureIdRaw = fixture?.id;
  const fixtureId =
    typeof fixtureIdRaw === 'number'
      ? String(fixtureIdRaw)
      : typeof fixtureIdRaw === 'string'
        ? fixtureIdRaw.trim()
        : '';

  const kickoffAt = readString(fixture?.date);
  const statusShort = readString(status?.short);
  const leagueName = readString(league?.name);
  const homeTeamName = readString(home?.name);
  const awayTeamName = readString(away?.name);
  const homeGoals = readGoals(goals?.home);
  const awayGoals = readGoals(goals?.away);

  if (!fixtureId || !kickoffAt || !homeTeamName || !awayTeamName) {
    return null;
  }

  return {
    fixtureId,
    kickoffAt,
    statusShort,
    leagueName,
    homeTeamName,
    awayTeamName,
    homeGoals,
    awayGoals,
  };
}

export function mapFixturesToScoreCards(input: unknown): MatchScoreCard[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map(mapFixtureToScoreCard)
    .filter((value): value is MatchScoreCard => value !== null);
}
