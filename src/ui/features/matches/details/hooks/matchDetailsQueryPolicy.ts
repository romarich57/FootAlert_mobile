import type {
  MatchDetailsTabKey,
  MatchLifecycleState,
} from '@ui/features/matches/types/matches.types';

type MatchDetailsQueryPolicyInput = {
  safeMatchId: string | null;
  lifecycleState: MatchLifecycleState;
  activeTab: MatchDetailsTabKey;
  homeTeamId: string | null;
  awayTeamId: string | null;
  leagueId: number | undefined;
  season: number | null;
};

export type MatchDetailsQueryPolicy = {
  enableFixture: boolean;
  enableEvents: boolean;
  enableStatistics: boolean;
  enableHalfStatistics: boolean;
  enableLineups: boolean;
  enablePredictions: boolean;
  enableAbsences: boolean;
  enableHeadToHead: boolean;
  enableHomePlayersStats: boolean;
  enableAwayPlayersStats: boolean;
  enableStandings: boolean;
  enableTeamContext: boolean;
  enablePreMatchExtras: boolean;
  enabledQueryCount: number;
};

function canUseMatchContext(input: MatchDetailsQueryPolicyInput): boolean {
  return (
    Boolean(input.safeMatchId) &&
    typeof input.leagueId === 'number' &&
    typeof input.season === 'number'
  );
}

function countEnabledQueries(policy: Omit<MatchDetailsQueryPolicy, 'enabledQueryCount'>): number {
  return Object.values(policy).reduce<number>(
    (count, value) => (value ? count + 1 : count),
    0,
  );
}

export function resolveMatchDetailsQueryPolicy(
  input: MatchDetailsQueryPolicyInput,
): MatchDetailsQueryPolicy {
  const hasMatchId = Boolean(input.safeMatchId);
  const hasHeadToHeadIds = hasMatchId && Boolean(input.homeTeamId) && Boolean(input.awayTeamId);
  const shouldLoadContext = canUseMatchContext(input);
  const isPreMatch = input.lifecycleState === 'pre_match';
  const isFinished = input.lifecycleState === 'finished';
  const isPrimaryTab = input.activeTab === 'primary';

  const policyWithoutCount: Omit<MatchDetailsQueryPolicy, 'enabledQueryCount'> = {
    enableFixture: hasMatchId,
    // Live-only timeline payload. Pre-match tab can still render fixture fallback payload if available.
    enableEvents: hasMatchId && !isPreMatch,
    // Match stats are only relevant after kickoff.
    enableStatistics: hasMatchId && !isPreMatch,
    enableHalfStatistics: hasMatchId && !isPreMatch && typeof input.season === 'number' && input.season >= 2024,
    enableLineups: hasMatchId,
    // Pre-match-only insights.
    enablePredictions: hasMatchId && isPreMatch,
    // Used by lineups tab and context cards.
    enableAbsences: hasMatchId && (isPrimaryTab || input.activeTab === 'lineups'),
    // Face-to-face is useful pre-match/finished and on-demand while live.
    enableHeadToHead:
      hasHeadToHeadIds &&
      (isPreMatch || isFinished || input.activeTab === 'faceOff'),
    enableHomePlayersStats: hasMatchId && Boolean(input.homeTeamId) && input.activeTab === 'lineups',
    enableAwayPlayersStats: hasMatchId && Boolean(input.awayTeamId) && input.activeTab === 'lineups',
    enableStandings:
      shouldLoadContext &&
      (input.activeTab === 'standings' || isPreMatch || isFinished),
    enableTeamContext: shouldLoadContext && (isPreMatch || isFinished) && isPrimaryTab,
    enablePreMatchExtras: shouldLoadContext && isPreMatch && isPrimaryTab,
  };

  return {
    ...policyWithoutCount,
    enabledQueryCount: countEnabledQueries(policyWithoutCount),
  };
}
