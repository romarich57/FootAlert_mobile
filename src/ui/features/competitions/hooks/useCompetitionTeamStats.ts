import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { fetchCompetitionTeamStats } from '@data/endpoints/competitionsApi';
import { buildCompetitionTeamStatsDashboardData } from '@data/mappers/competitionsTeamStatsMapper';
import type {
  CompetitionTeamAdvancedReason,
  CompetitionTeamAdvancedSection,
  CompetitionTeamHomeAwayMetricKey,
  CompetitionTeamStatsMetricKey,
  CompetitionTeamStatsSection,
} from '@ui/features/competitions/types/competitions.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

import { useCompetitionStandings } from './useCompetitionStandings';
import { loadCompetitionFullPayload } from './competitionFullQuery';

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
  const queryClient = useQueryClient();
  const standingsQuery = useCompetitionStandings(leagueId, season);

  const baseDashboard = useMemo(
    () => buildCompetitionTeamStatsDashboardData(standingsQuery.data),
    [standingsQuery.data],
  );

  const isGroupedCompetition = useMemo(
    () => (standingsQuery.data?.length ?? 0) > 1,
    [standingsQuery.data],
  );

  const aggregatedQuery = useQuery({
    queryKey: queryKeys.competitions.teamStats(leagueId, season),
    enabled:
      advancedEnabled &&
      typeof leagueId === 'number' &&
      Number.isFinite(leagueId) &&
      typeof season === 'number' &&
      Number.isFinite(season) &&
      !isGroupedCompetition,
    queryFn: ({ signal }) =>
      (async () => {
        if (appEnv.mobileEnableBffCompetitionFull) {
          try {
            const payload = await loadCompetitionFullPayload(
              queryClient,
              leagueId as number,
              season as number,
            );
            if (payload?.teamStats) {
              return payload.teamStats;
            }
          } catch {
            // Fallback legacy conservé pour les erreurs réseau/full.
          }
        }

        return fetchCompetitionTeamStats(leagueId as number, season as number, signal);
      })(),
    ...featureQueryOptions.competitions.teamStats,
  });

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

    return aggregatedQuery.data ?? baseDashboard;
  }, [aggregatedQuery.data, baseDashboard, isGroupedCompetition]);

  const shouldRenderAdvancedSection = useMemo(() => {
    if (isGroupedCompetition) {
      return false;
    }

    if (advancedEnabled && aggregatedQuery.data?.advanced.state === 'unavailable') {
      return false;
    }

    return true;
  }, [advancedEnabled, aggregatedQuery.data?.advanced.state, isGroupedCompetition]);

  const hasAdvancedData = useMemo(
    () =>
      dashboard.advanced.metrics.some(
        metric => dashboard.advanced.leaderboards[metric].items.length > 0,
      ),
    [dashboard.advanced],
  );

  const isAdvancedLoading =
    advancedEnabled &&
    aggregatedQuery.fetchStatus === 'fetching' &&
    aggregatedQuery.data == null;
  const advancedProgress = !advancedEnabled ? 0 : isAdvancedLoading ? 45 : aggregatedQuery.data ? 100 : 0;

  return {
    summary: dashboard.summary,
    homeAway: dashboard.homeAway,
    advanced: dashboard.advanced,
    isBaseLoading: standingsQuery.isLoading,
    isAdvancedLoading,
    advancedProgress,
    baseError: (standingsQuery.error as Error | null) ?? null,
    advancedError: advancedEnabled ? ((aggregatedQuery.error as Error | null) ?? null) : null,
    hasAdvancedData,
    shouldRenderAdvancedSection,
  };
}
