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
};

export type RawRecord = Record<string, unknown>;

export type EventRow = {
  id: string;
  minute: string;
  label: string;
  detail: string;
  team: 'home' | 'away' | 'neutral';
  isNew: boolean;
};

export type StatRow = {
  key: string;
  label: string;
  homeValue: string;
  awayValue: string;
  homePercent: number;
  awayPercent: number;
};
