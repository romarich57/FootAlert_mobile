export type BracketTeam = {
  id: number | null;
  name: string;
  logo: string;
};

export type BracketMatch = {
  matchId: number;
  homeTeam: BracketTeam;
  awayTeam: BracketTeam;
  homeScore: number | null;
  awayScore: number | null;
  penaltyHome: number | null;
  penaltyAway: number | null;
  status: string;
  date: string;
  winnerId: number | null;
};

export type KnockoutRound = {
  name: string;
  order: number;
  matches: BracketMatch[];
};

export type CompetitionBracketResult = {
  competitionKind: 'league' | 'cup' | 'mixed';
  bracket: KnockoutRound[] | null;
};

export interface RawTeam {
  id?: unknown;
  name?: unknown;
  logo?: unknown;
}

export interface RawStatus {
  short?: unknown;
}

export interface RawFixtureData {
  id?: unknown;
  date?: unknown;
  status?: unknown;
}

export interface RawTeamsData {
  home?: unknown;
  away?: unknown;
}

export interface RawGoalsData {
  home?: unknown;
  away?: unknown;
}

export interface RawPenaltyData {
  home?: unknown;
  away?: unknown;
}

export interface RawScoreData {
  penalty?: unknown;
}

export interface RawLeagueData {
  round?: unknown;
}

export interface RawFixture {
  fixture?: unknown;
  league?: unknown;
  teams?: unknown;
  goals?: unknown;
  score?: unknown;
}
