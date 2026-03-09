export type SummaryMetricKey =
  | 'pointsPerMatch'
  | 'winRate'
  | 'goalsScoredPerMatch'
  | 'goalsConcededPerMatch'
  | 'goalDiffPerMatch'
  | 'formIndex'
  | 'formPointsPerMatch';
export type HomeAwayMetricKey =
  | 'homePPG'
  | 'awayPPG'
  | 'homeGoalsFor'
  | 'awayGoalsFor'
  | 'homeGoalsAgainst'
  | 'awayGoalsAgainst'
  | 'deltaHomeAwayPPG'
  | 'deltaHomeAwayGoalsFor'
  | 'deltaHomeAwayGoalsAgainst';
export type AdvancedMetricKey =
  | 'cleanSheets'
  | 'failedToScore'
  | 'xGPerMatch'
  | 'possession'
  | 'shotsPerMatch'
  | 'shotsOnTargetPerMatch';
export type TeamStatsAvailabilityState = 'available' | 'partial' | 'unavailable';
export type TeamStatsAvailabilityReason =
  | 'provider_missing'
  | 'grouped_competition'
  | 'upstream_error'
  | 'rate_limited'
  | null;

export type StandingSplitRaw = {
  played?: unknown;
  win?: unknown;
  draw?: unknown;
  lose?: unknown;
  goals?: { for?: unknown; against?: unknown };
};
export type StandingRowRaw = {
  rank?: unknown;
  team?: { id?: unknown; name?: unknown; logo?: unknown };
  points?: unknown;
  goalsDiff?: unknown;
  group?: unknown;
  form?: unknown;
  all?: StandingSplitRaw;
  home?: StandingSplitRaw;
  away?: StandingSplitRaw;
};
export type CompetitionStandingsPayload = {
  response?: Array<{ league?: { standings?: StandingRowRaw[][] } }>;
};
export type CompetitionStandingSplit = {
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
};
export type CompetitionStandingRow = {
  rank: number;
  teamId: number;
  teamName: string;
  teamLogo: string;
  points: number;
  goalsDiff: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
  group: string;
  form: string;
  home: CompetitionStandingSplit;
  away: CompetitionStandingSplit;
};
export type CompetitionComputedRow = CompetitionStandingRow & {
  pointsPerMatch: number | null;
  winRate: number | null;
  goalsScoredPerMatch: number | null;
  goalsConcededPerMatch: number | null;
  goalDiffPerMatch: number | null;
  formIndex: number | null;
  formPointsPerMatch: number | null;
  homePPG: number | null;
  awayPPG: number | null;
  homeGoalsFor: number | null;
  awayGoalsFor: number | null;
  homeGoalsAgainst: number | null;
  awayGoalsAgainst: number | null;
  deltaHomeAwayPPG: number | null;
  deltaHomeAwayGoalsFor: number | null;
  deltaHomeAwayGoalsAgainst: number | null;
};

export type TeamStatisticPayload = {
  fixtures?: {
    clean_sheet?: { total?: unknown };
    failed_to_score?: { total?: unknown };
  };
  goals?: { for?: { minute?: Record<string, { total?: unknown }> } };
};
export type CompetitionTeamStatsLeaderboardItem = {
  teamId: number;
  teamName: string;
  teamLogo: string;
  value: number;
};
export type CompetitionTeamStatsLeaderboard<K extends string> = {
  metric: K;
  sortOrder: 'asc' | 'desc';
  items: CompetitionTeamStatsLeaderboardItem[];
};
export type CompetitionTeamStatsSection<K extends string> = {
  metrics: K[];
  leaderboards: Record<K, CompetitionTeamStatsLeaderboard<K>>;
};
export type CompetitionTeamAdvancedRow = {
  teamId: number;
  teamName: string;
  teamLogo: string;
  cleanSheets: number | null;
  failedToScore: number | null;
  xGPerMatch: number | null;
  possession: number | null;
  shotsPerMatch: number | null;
  shotsOnTargetPerMatch: number | null;
  goalMinuteBreakdown: Array<{ key: string; label: string; value: number | null }>;
};
export type CompetitionTeamAdvancedSection = CompetitionTeamStatsSection<AdvancedMetricKey> & {
  rows: CompetitionTeamAdvancedRow[];
  top10TeamIds: number[];
  unavailableMetrics: AdvancedMetricKey[];
  state: TeamStatsAvailabilityState;
  reason: TeamStatsAvailabilityReason;
};
export type CompetitionTeamStatsResponse = {
  summary: CompetitionTeamStatsSection<SummaryMetricKey>;
  homeAway: CompetitionTeamStatsSection<HomeAwayMetricKey>;
  advanced: CompetitionTeamAdvancedSection;
};
export type TeamStatsQueryResult = {
  teamId: number;
  statistics: TeamStatisticPayload | null;
  error: unknown | null;
};

export const SUMMARY_METRICS: SummaryMetricKey[] = [
  'pointsPerMatch',
  'winRate',
  'goalsScoredPerMatch',
  'goalsConcededPerMatch',
  'goalDiffPerMatch',
  'formIndex',
  'formPointsPerMatch',
];
export const HOME_AWAY_METRICS: HomeAwayMetricKey[] = [
  'homePPG',
  'awayPPG',
  'homeGoalsFor',
  'awayGoalsFor',
  'homeGoalsAgainst',
  'awayGoalsAgainst',
  'deltaHomeAwayPPG',
  'deltaHomeAwayGoalsFor',
  'deltaHomeAwayGoalsAgainst',
];
export const ADVANCED_METRICS: AdvancedMetricKey[] = [
  'cleanSheets',
  'failedToScore',
  'xGPerMatch',
  'possession',
  'shotsPerMatch',
  'shotsOnTargetPerMatch',
];
export const GOAL_MINUTE_SLOTS = [
  '0-15',
  '16-30',
  '31-45',
  '46-60',
  '61-75',
  '76-90',
  '91-105',
  '106-120',
];
export const SUMMARY_SORT_ORDERS: Record<SummaryMetricKey, 'asc' | 'desc'> = {
  pointsPerMatch: 'desc',
  winRate: 'desc',
  goalsScoredPerMatch: 'desc',
  goalsConcededPerMatch: 'asc',
  goalDiffPerMatch: 'desc',
  formIndex: 'desc',
  formPointsPerMatch: 'desc',
};
export const HOME_AWAY_SORT_ORDERS: Record<HomeAwayMetricKey, 'asc' | 'desc'> = {
  homePPG: 'desc',
  awayPPG: 'desc',
  homeGoalsFor: 'desc',
  awayGoalsFor: 'desc',
  homeGoalsAgainst: 'asc',
  awayGoalsAgainst: 'asc',
  deltaHomeAwayPPG: 'desc',
  deltaHomeAwayGoalsFor: 'desc',
  deltaHomeAwayGoalsAgainst: 'desc',
};
export const ADVANCED_SORT_ORDERS: Record<AdvancedMetricKey, 'asc' | 'desc'> = {
  cleanSheets: 'desc',
  failedToScore: 'asc',
  xGPerMatch: 'desc',
  possession: 'desc',
  shotsPerMatch: 'desc',
  shotsOnTargetPerMatch: 'desc',
};
