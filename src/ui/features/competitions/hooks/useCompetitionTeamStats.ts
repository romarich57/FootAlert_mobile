import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchTeamAdvancedStats, fetchTeamStatistics } from '@data/endpoints/teamsApi';
import {
  buildCompetitionTeamStatsDashboardData,
  type CompetitionTeamAdvancedPayload,
} from '@data/mappers/competitionsTeamStatsMapper';
import type {
  CompetitionTeamAdvancedSection,
  CompetitionTeamStatsSection,
  CompetitionTeamHomeAwayMetricKey,
  CompetitionTeamStatsMetricKey,
} from '@ui/features/competitions/types/competitions.types';
import { mapWithConcurrency } from '@ui/shared/query/mapWithConcurrency';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import { useCompetitionStandings } from './useCompetitionStandings';

type UseCompetitionTeamStatsParams = {
  leagueId: number | undefined;
  season: number | undefined;
  advancedEnabled: boolean;
  advancedConcurrency?: number;
  networkLiteMode?: boolean;
};

type AdvancedQueryResult = CompetitionTeamAdvancedPayload & {
  hasRequestError: boolean;
};

const DEFAULT_ADVANCED_CONCURRENCY = 3;
const DEFERRED_STAGE_IDLE_TIMEOUT_MS = 250;
const DEFERRED_STAGE_FALLBACK_DELAY_MS = 0;

type IdleRequestHandle = number;
type IdleRequestOptions = {
  timeout?: number;
};
type IdleRequestDeadline = {
  readonly didTimeout: boolean;
  timeRemaining: () => number;
};
type IdleRequestCallback = (deadline: IdleRequestDeadline) => void;
type GlobalWithIdleCallbacks = typeof globalThis & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => IdleRequestHandle;
  cancelIdleCallback?: (handle: IdleRequestHandle) => void;
};
type DeferredTaskHandle = {
  cancel: () => void;
};

function scheduleDeferredStageTask(task: () => void): DeferredTaskHandle {
  const globalScope = globalThis as GlobalWithIdleCallbacks;

  if (typeof globalScope.requestIdleCallback === 'function') {
    const idleHandle = globalScope.requestIdleCallback(
      () => {
        task();
      },
      { timeout: DEFERRED_STAGE_IDLE_TIMEOUT_MS },
    );

    return {
      cancel: () => {
        if (typeof globalScope.cancelIdleCallback === 'function') {
          globalScope.cancelIdleCallback(idleHandle);
        }
      },
    };
  }

  const timeoutHandle = setTimeout(task, DEFERRED_STAGE_FALLBACK_DELAY_MS);
  return {
    cancel: () => {
      clearTimeout(timeoutHandle);
    },
  };
}

function sanitizeAdvancedConcurrency(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_ADVANCED_CONCURRENCY;
  }

  const normalized = Math.floor(value);
  return Math.min(10, Math.max(1, normalized));
}

async function fetchTeamAdvancedPayload(
  leagueId: number,
  season: number,
  teamId: number,
  signal: AbortSignal,
): Promise<AdvancedQueryResult> {
  const [statsResult, advancedResult] = await Promise.allSettled([
    fetchTeamStatistics(String(leagueId), season, String(teamId), signal),
    fetchTeamAdvancedStats(String(leagueId), season, String(teamId), signal),
  ]);

  return {
    teamId,
    statistics: statsResult.status === 'fulfilled' ? statsResult.value : null,
    advanced: advancedResult.status === 'fulfilled' ? advancedResult.value : null,
    hasRequestError: statsResult.status === 'rejected' || advancedResult.status === 'rejected',
  };
}

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
};

export function useCompetitionTeamStats({
  leagueId,
  season,
  advancedEnabled,
  advancedConcurrency,
  networkLiteMode = false,
}: UseCompetitionTeamStatsParams): UseCompetitionTeamStatsResult {
  const standingsQuery = useCompetitionStandings(leagueId, season);
  const effectiveAdvancedConcurrency = useMemo(
    () => sanitizeAdvancedConcurrency(advancedConcurrency),
    [advancedConcurrency],
  );

  const baseDashboard = useMemo(
    () => buildCompetitionTeamStatsDashboardData(standingsQuery.data),
    [standingsQuery.data],
  );

  const top10TeamIds = baseDashboard.advanced.top10TeamIds;
  const shouldRunAdvancedQueries =
    advancedEnabled &&
    !networkLiteMode &&
    typeof leagueId === 'number' &&
    Number.isFinite(leagueId) &&
    typeof season === 'number' &&
    Number.isFinite(season) &&
    top10TeamIds.length > 0;

  const priorityTeamIds = useMemo(
    () => top10TeamIds.slice(0, 5),
    [top10TeamIds],
  );
  const deferredTeamIds = useMemo(
    () => top10TeamIds.slice(5),
    [top10TeamIds],
  );
  const [isDeferredStageEnabled, setIsDeferredStageEnabled] = useState(false);

  useEffect(() => {
    if (!shouldRunAdvancedQueries || deferredTeamIds.length === 0) {
      setIsDeferredStageEnabled(false);
      return;
    }

    setIsDeferredStageEnabled(false);
    const deferredTask = scheduleDeferredStageTask(() => {
      setIsDeferredStageEnabled(true);
    });

    return () => {
      deferredTask.cancel();
    };
  }, [deferredTeamIds.length, shouldRunAdvancedQueries]);

  const priorityAdvancedQuery = useQuery({
    queryKey: queryKeys.competitions.teamAdvancedStatsBatch(
      leagueId,
      season,
      priorityTeamIds,
      effectiveAdvancedConcurrency,
    ),
    enabled: shouldRunAdvancedQueries && priorityTeamIds.length > 0,
    queryFn: async ({ signal }) => {
      return mapWithConcurrency(priorityTeamIds, effectiveAdvancedConcurrency, teamId =>
        fetchTeamAdvancedPayload(leagueId as number, season as number, teamId, signal),
      );
    },
    ...featureQueryOptions.competitions.teamAdvancedStats,
  });

  const deferredAdvancedQuery = useQuery({
    queryKey: queryKeys.competitions.teamAdvancedStatsBatch(
      leagueId,
      season,
      deferredTeamIds,
      effectiveAdvancedConcurrency,
    ),
    enabled:
      shouldRunAdvancedQueries &&
      isDeferredStageEnabled &&
      priorityAdvancedQuery.isSuccess &&
      deferredTeamIds.length > 0,
    queryFn: async ({ signal }) => {
      return mapWithConcurrency(deferredTeamIds, effectiveAdvancedConcurrency, teamId =>
        fetchTeamAdvancedPayload(leagueId as number, season as number, teamId, signal),
      );
    },
    ...featureQueryOptions.competitions.teamAdvancedStats,
  });

  const advancedQueryData = useMemo(
    () => [
      ...(priorityAdvancedQuery.data ?? []),
      ...(deferredAdvancedQuery.data ?? []),
    ],
    [deferredAdvancedQuery.data, priorityAdvancedQuery.data],
  );

  const advancedPayloads = useMemo<CompetitionTeamAdvancedPayload[]>(
    () =>
      advancedQueryData
        .map(data => ({
          teamId: data.teamId,
          statistics: data.statistics,
          advanced: data.advanced,
        })),
    [advancedQueryData],
  );

  const advancedFailures = useMemo(
    () =>
      advancedQueryData.filter(data => data.hasRequestError).length,
    [advancedQueryData],
  );

  const dashboard = useMemo(
    () =>
      buildCompetitionTeamStatsDashboardData(
        standingsQuery.data,
        shouldRunAdvancedQueries ? advancedPayloads : [],
      ),
    [advancedPayloads, shouldRunAdvancedQueries, standingsQuery.data],
  );

  const hasAdvancedData = useMemo(
    () =>
      dashboard.advanced.metrics.some(metric => dashboard.advanced.leaderboards[metric].items.length > 0),
    [dashboard.advanced],
  );

  const advancedProgress = useMemo(() => {
    if (!shouldRunAdvancedQueries || top10TeamIds.length === 0) {
      return 0;
    }

    const loadedTeamCount = advancedQueryData.length;
    return Math.min(100, Math.round((loadedTeamCount / top10TeamIds.length) * 100));
  }, [advancedQueryData.length, shouldRunAdvancedQueries, top10TeamIds.length]);

  const isAdvancedLoading = useMemo(() => {
    if (!shouldRunAdvancedQueries) {
      return false;
    }

    const isPriorityLoading =
      priorityAdvancedQuery.isLoading || priorityAdvancedQuery.isFetching;
    const isDeferredLoading =
      deferredTeamIds.length > 0 &&
      (!isDeferredStageEnabled ||
        !priorityAdvancedQuery.isSuccess ||
        deferredAdvancedQuery.isLoading ||
        deferredAdvancedQuery.isFetching);

    return isPriorityLoading || isDeferredLoading;
  }, [
    deferredAdvancedQuery.isFetching,
    deferredAdvancedQuery.isLoading,
    deferredTeamIds.length,
    isDeferredStageEnabled,
    priorityAdvancedQuery.isFetching,
    priorityAdvancedQuery.isLoading,
    priorityAdvancedQuery.isSuccess,
    shouldRunAdvancedQueries,
  ]);

  return {
    summary: dashboard.summary,
    homeAway: dashboard.homeAway,
    advanced: dashboard.advanced,
    isBaseLoading: standingsQuery.isLoading,
    isAdvancedLoading,
    advancedProgress,
    baseError: (standingsQuery.error as Error | null) ?? null,
    advancedError:
      shouldRunAdvancedQueries
        ? (priorityAdvancedQuery.error as Error | null) ??
          (deferredAdvancedQuery.error as Error | null) ??
          (advancedFailures > 0
            ? new Error('Partial advanced team statistics could not be loaded.')
            : null)
        : null,
    hasAdvancedData,
  };
}
