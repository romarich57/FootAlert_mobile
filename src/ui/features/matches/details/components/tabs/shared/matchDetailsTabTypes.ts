import type {
  ApiFootballFixtureDto,
  MatchDetailsTabKey,
  MatchLifecycleState,
  MatchLineupTeam,
} from '@ui/features/matches/types/matches.types';
import type { CompetitionsApiStandingDto } from '@ui/features/competitions/types/competitions.types';

export type MatchDetailsWinPercent = {
  home: string;
  draw: string;
  away: string;
};

export type MatchDetailsDatasetSource = 'query' | 'fixture_fallback' | 'none';

export type MatchDetailsDatasetErrors = {
  events: boolean;
  statistics: boolean;
  lineups: boolean;
  predictions: boolean;
  absences: boolean;
  faceOff: boolean;
  homePlayersStats: boolean;
  awayPlayersStats: boolean;
};

export type MatchDetailsDatasetErrorReason = 'none' | 'request_failed' | 'endpoint_not_available';

export type MatchDetailsDatasetErrorReasons = {
  events: MatchDetailsDatasetErrorReason;
  statistics: MatchDetailsDatasetErrorReason;
  lineups: MatchDetailsDatasetErrorReason;
  predictions: MatchDetailsDatasetErrorReason;
  absences: MatchDetailsDatasetErrorReason;
  faceOff: MatchDetailsDatasetErrorReason;
  homePlayersStats: MatchDetailsDatasetErrorReason;
  awayPlayersStats: MatchDetailsDatasetErrorReason;
};

export type MatchDetailsDatasetSources = {
  events: MatchDetailsDatasetSource;
  statistics: MatchDetailsDatasetSource;
  lineups: MatchDetailsDatasetSource;
  predictions: MatchDetailsDatasetSource;
  absences: MatchDetailsDatasetSource;
  faceOff: MatchDetailsDatasetSource;
  homePlayersStats: MatchDetailsDatasetSource;
  awayPlayersStats: MatchDetailsDatasetSource;
};

export type StatsPeriodFilter = 'all' | 'first' | 'second';

export type MatchStatsSectionKey =
  | 'shots'
  | 'possessionPasses'
  | 'discipline'
  | 'other'
  | 'advanced';

export type MatchStatsMetricKey =
  | 'total_shots'
  | 'shots_on_goal'
  | 'shots_off_goal'
  | 'blocked_shots'
  | 'shots_insidebox'
  | 'shots_outsidebox'
  | 'ball_possession'
  | 'total_passes'
  | 'passes_accurate'
  | 'passes_percent'
  | 'fouls'
  | 'yellow_cards'
  | 'red_cards'
  | 'corner_kicks'
  | 'offsides'
  | 'goalkeeper_saves'
  | 'expected_goals'
  | 'goals_prevented';

export type MatchDetailsTabContentProps = {
  activeTab: MatchDetailsTabKey;
  lifecycleState: MatchLifecycleState;
  fixture: ApiFootballFixtureDto | null;
  events: unknown[];
  statistics: unknown[];
  lineupTeams: MatchLineupTeam[];
  predictions: Record<string, unknown> | null;
  winPercent: MatchDetailsWinPercent;
  homePlayersStats: unknown[];
  awayPlayersStats: unknown[];
  standings: CompetitionsApiStandingDto | null | undefined;
  homeTeamId: string | null;
  awayTeamId: string | null;
  headToHead: unknown[];
  isLiveRefreshing: boolean;
  onRefreshLineups?: () => void;
  isLineupsRefetching?: boolean;
  datasetErrors?: Partial<MatchDetailsDatasetErrors>;
  datasetErrorReasons?: Partial<MatchDetailsDatasetErrorReasons>;
  dataSources?: Partial<MatchDetailsDatasetSources>;
  statsRowsByPeriod?: StatRowsByPeriod;
  statsAvailablePeriods?: StatsPeriodFilter[];
};

export type RawRecord = Record<string, unknown>;

export type EventRow = {
  id: string;
  minute: string;
  label: string;
  type: string;
  detail: string;
  team: 'home' | 'away' | 'neutral';
  isNew: boolean;
  playerName: string;
  playerId: string | null;
  playerPhoto: string | null;
  assistName: string | null;
  assistId: string | null;
  assistPhoto: string | null;
};

export type StatRow = {
  key: MatchStatsMetricKey;
  metricKey: MatchStatsMetricKey;
  section: MatchStatsSectionKey;
  label: string;
  labelKey: string;
  homeValue: string;
  awayValue: string;
  homePercent: number;
  awayPercent: number;
};

export type StatRowsByPeriod = Record<StatsPeriodFilter, StatRow[]>;
