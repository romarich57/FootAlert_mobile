export type MatchScoreCard = {
  fixtureId: string;
  kickoffAt: string;
  statusShort: string;
  leagueName: string;
  homeTeamName: string;
  awayTeamName: string;
  homeGoals: number | null;
  awayGoals: number | null;
};

export type MatchesApiEnvelope = {
  response?: unknown;
};
