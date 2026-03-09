import type {
  BracketMatch,
  BracketTeam,
  RawFixture,
  RawFixtureData,
  RawGoalsData,
  RawLeagueData,
  RawPenaltyData,
  RawScoreData,
  RawStatus,
  RawTeam,
  RawTeamsData,
} from './contracts.js';

export function isRawFixture(value: unknown): value is RawFixture {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRawLeagueData(value: unknown): value is RawLeagueData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRawFixtureData(value: unknown): value is RawFixtureData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRawTeamsData(value: unknown): value is RawTeamsData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRawGoalsData(value: unknown): value is RawGoalsData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRawScoreData(value: unknown): value is RawScoreData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRawPenaltyData(value: unknown): value is RawPenaltyData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRawStatus(value: unknown): value is RawStatus {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRawTeam(value: unknown): value is RawTeam {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractTeam(raw: unknown): BracketTeam {
  if (!isRawTeam(raw)) return { id: null, name: '', logo: '' };

  return {
    id: typeof raw.id === 'number' ? raw.id : null,
    name: typeof raw.name === 'string' ? raw.name : '',
    logo: typeof raw.logo === 'string' ? raw.logo : '',
  };
}

function extractNullableInt(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

function computeWinnerId(
  status: string,
  homeId: number | null,
  awayId: number | null,
  homeScore: number | null,
  awayScore: number | null,
  penaltyHome: number | null,
  penaltyAway: number | null,
): number | null {
  const terminalStatuses = new Set(['FT', 'AET', 'PEN']);
  if (!terminalStatuses.has(status)) return null;

  if (status === 'PEN' && penaltyHome !== null && penaltyAway !== null) {
    if (penaltyHome > penaltyAway) return homeId;
    if (penaltyAway > penaltyHome) return awayId;
    return null;
  }

  if (homeScore === null || awayScore === null) return null;
  if (homeScore > awayScore) return homeId;
  if (awayScore > homeScore) return awayId;
  return null;
}

export function extractRoundName(rawFixture: RawFixture): string {
  const leagueRaw = rawFixture.league;
  if (!isRawLeagueData(leagueRaw)) {
    return '';
  }

  return typeof leagueRaw.round === 'string' ? leagueRaw.round : '';
}

export function buildBracketMatch(rawFixture: RawFixture): BracketMatch | null {
  const fixtureData = rawFixture.fixture;
  const teamsData = rawFixture.teams;
  const goalsData = rawFixture.goals;
  const scoreData = rawFixture.score;

  if (!isRawFixtureData(fixtureData) || !isRawTeamsData(teamsData)) {
    return null;
  }

  const matchId = typeof fixtureData.id === 'number' ? fixtureData.id : 0;
  const date = typeof fixtureData.date === 'string' ? fixtureData.date : '';
  const statusRaw = fixtureData.status;
  const status = isRawStatus(statusRaw) && typeof statusRaw.short === 'string'
    ? statusRaw.short
    : '';
  const homeTeam = extractTeam(teamsData.home);
  const awayTeam = extractTeam(teamsData.away);

  let homeScore: number | null = null;
  let awayScore: number | null = null;
  if (isRawGoalsData(goalsData)) {
    homeScore = extractNullableInt(goalsData.home);
    awayScore = extractNullableInt(goalsData.away);
  }

  let penaltyHome: number | null = null;
  let penaltyAway: number | null = null;
  if (isRawScoreData(scoreData)) {
    const penaltyRaw = scoreData.penalty;
    if (isRawPenaltyData(penaltyRaw)) {
      penaltyHome = extractNullableInt(penaltyRaw.home);
      penaltyAway = extractNullableInt(penaltyRaw.away);
    }
  }

  return {
    matchId,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    penaltyHome,
    penaltyAway,
    status,
    date,
    winnerId: computeWinnerId(
      status,
      homeTeam.id,
      awayTeam.id,
      homeScore,
      awayScore,
      penaltyHome,
      penaltyAway,
    ),
  };
}
