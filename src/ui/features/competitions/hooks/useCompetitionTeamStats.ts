import { useMemo } from 'react';

import { buildCompetitionTeamStatsDashboardData } from '@data/mappers/competitionsTeamStatsMapper';
import { isHydrationSectionLoading } from '@domain/contracts/fullPayloadHydration.types';
import type {
  CompetitionTeamStatsDashboardData,
  CompetitionTeamAdvancedReason,
  CompetitionTeamAdvancedSection,
  CompetitionTeamHomeAwayMetricKey,
  CompetitionTeamStatsMetricKey,
  CompetitionTeamStatsSection,
} from '@ui/features/competitions/types/competitions.types';
import { queryKeys } from '@ui/shared/query/queryKeys';

import { useCompetitionStandings } from './useCompetitionStandings';
import { useCompetitionFullQuery } from './competitionFullQuery';

type UseCompetitionTeamStatsParams = {
  leagueId: number | undefined;
  season: number | undefined;
  advancedEnabled: boolean;
  advancedConcurrency?: number;
  networkLiteMode?: boolean;
};

type UseCompetitionTeamStatsResult = {
  summary: CompetitionTeamStatsSection<CompetitionTeamStatsMetricKey>;
  homeAway: CompetitionTeamStatsSection<CompetitionTeamHomeAwayMetricKey>;
  advanced: CompetitionTeamAdvancedSection;
  isBaseLoading: boolean;
  isAdvancedLoading: boolean;
  advancedProgress: number;
  baseError: Error | null;
  advancedError: Error | null;
  hasAdvancedData: boolean;
  shouldRenderAdvancedSection: boolean;
};

function toUnavailableAdvancedSection(
  advanced: CompetitionTeamAdvancedSection,
  reason: CompetitionTeamAdvancedReason,
): CompetitionTeamAdvancedSection {
  return {
    ...advanced,
    rows: [],
    top10TeamIds: [],
    unavailableMetrics: [...advanced.metrics],
    state: 'unavailable',
    reason,
  };
}

export function useCompetitionTeamStats({
  leagueId,
  season,
  advancedEnabled,
  networkLiteMode: _networkLiteMode = false,
}: UseCompetitionTeamStatsParams): UseCompetitionTeamStatsResult {
  const standingsQuery = useCompetitionStandings(leagueId, season);
  const competitionFullQuery = useCompetitionFullQuery(
    leagueId,
    season,
    advancedEnabled &&
      typeof leagueId === 'number' &&
      Number.isFinite(leagueId) &&
      typeof season === 'number' &&
      Number.isFinite(season),
  );

  const baseDashboard = useMemo(
    () => buildCompetitionTeamStatsDashboardData(standingsQuery.data),
    [standingsQuery.data],
  );

  const isGroupedCompetition = useMemo(
    () => (standingsQuery.data?.length ?? 0) > 1,
    [standingsQuery.data],
  );
  const isTeamStatsSectionLoading =
    !isGroupedCompetition &&
    isHydrationSectionLoading(competitionFullQuery.hydration, 'teamStats');
  const aggregatedData =
    isTeamStatsSectionLoading
      ? null
      : competitionFullQuery.data?.teamStats ?? null;

  const dashboard = useMemo(() => {
    if (isGroupedCompetition) {
      return {
        ...baseDashboard,
        advanced: toUnavailableAdvancedSection(
          baseDashboard.advanced,
          'grouped_competition',
        ),
      };
    }

    return aggregatedData ?? baseDashboard;
  }, [aggregatedData, baseDashboard, isGroupedCompetition]);

  const shouldRenderAdvancedSection = useMemo(() => {
    if (isGroupedCompetition) {
      return false;
    }

    if (advancedEnabled && aggregatedData?.advanced.state === 'unavailable') {
      return false;
    }

    return true;
  }, [advancedEnabled, aggregatedData?.advanced.state, isGroupedCompetition]);

  const hasAdvancedData = useMemo(
    () =>
      dashboard.advanced.metrics.some(
        metric => dashboard.advanced.leaderboards[metric].items.length > 0,
      ),
    [dashboard.advanced],
  );

  const isAdvancedLoading =
    advancedEnabled &&
    !isGroupedCompetition &&
    (
      (competitionFullQuery.isLoading && !competitionFullQuery.data) ||
      isTeamStatsSectionLoading
    ) &&
    aggregatedData == null;
  const advancedProgress = !advancedEnabled ? 0 : isAdvancedLoading ? 45 : aggregatedData ? 100 : 0;

  return {
    summary: dashboard.summary,
    homeAway: dashboard.homeAway,
    advanced: dashboard.advanced,
    isBaseLoading: standingsQuery.isLoading,
    isAdvancedLoading,
    advancedProgress,
    baseError: (standingsQuery.error as Error | null) ?? null,
    advancedError:
      advancedEnabled && competitionFullQuery.isError && !competitionFullQuery.data
        ? ((competitionFullQuery.error as Error | null) ?? null)
        : null,
    hasAdvancedData,
    shouldRenderAdvancedSection,
  };
}
