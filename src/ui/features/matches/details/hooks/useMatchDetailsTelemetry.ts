import { useEffect, useRef } from 'react';
import { useIsFetching } from '@tanstack/react-query';

import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';
import { useMatchDetailsScreenModel } from '@ui/features/matches/details/hooks/useMatchDetailsScreenModel';

type MatchDetailsScreenModel = ReturnType<typeof useMatchDetailsScreenModel>;

function isVisibleMatchQuery(
  queryKey: readonly unknown[],
  model: MatchDetailsScreenModel,
): boolean {
  if (!model.safeMatchId) {
    return false;
  }

  if (queryKey[0] === 'match_details_full' && queryKey[1] === model.safeMatchId) {
    return true;
  }

  if (queryKey[0] === 'match_details' && queryKey[1] === model.safeMatchId) {
    return true;
  }

  if (
    queryKey[0] === 'competition_standings' &&
    queryKey[1] === model.queryContext.leagueId &&
    queryKey[2] === model.queryContext.season
  ) {
    return true;
  }

  if (
    queryKey[0] === 'team_recent_results' &&
    (queryKey[1] === model.homeTeamId || queryKey[1] === model.awayTeamId) &&
    queryKey[2] === model.queryContext.leagueId &&
    queryKey[3] === model.queryContext.season
  ) {
    return true;
  }

  return (
    queryKey[0] === 'team_leaders' &&
    (queryKey[1] === model.homeTeamId || queryKey[1] === model.awayTeamId) &&
    queryKey[2] === model.queryContext.leagueId &&
    queryKey[3] === model.queryContext.season
  );
}

export function useMatchDetailsTelemetry(model: MatchDetailsScreenModel): void {
  const screenOpenedAtRef = useRef(Date.now());
  const firstContentTrackedRef = useRef(false);
  const tabLoadStartedAtRef = useRef(Date.now());
  const trackedTabLoadKeyRef = useRef<string | null>(null);
  const trackedRequestCountKeyRef = useRef<string | null>(null);
  const lastTrackedTabRef = useRef(model.activeTab);

  const visibleRequestCount = useIsFetching({
    predicate: query => isVisibleMatchQuery(query.queryKey, model),
  });

  useEffect(() => {
    screenOpenedAtRef.current = Date.now();
    firstContentTrackedRef.current = false;
    trackedRequestCountKeyRef.current = null;
  }, [model.safeMatchId]);

  useEffect(() => {
    if (lastTrackedTabRef.current === model.activeTab) {
      return;
    }

    lastTrackedTabRef.current = model.activeTab;
    tabLoadStartedAtRef.current = Date.now();
    trackedTabLoadKeyRef.current = null;
  }, [model.activeTab]);

  useEffect(() => {
    if (!model.safeMatchId || !model.fixture || firstContentTrackedRef.current) {
      return;
    }

    firstContentTrackedRef.current = true;
    getMobileTelemetry().trackEvent('match_details.first_content_ms', {
      matchId: model.safeMatchId,
      tab: model.activeTab,
      lifecycleState: model.lifecycleState,
      value: Date.now() - screenOpenedAtRef.current,
      cache_hit_estimate: Boolean(model.lastUpdatedAt),
    });
  }, [
    model.activeTab,
    model.fixture,
    model.lastUpdatedAt,
    model.lifecycleState,
    model.safeMatchId,
  ]);

  useEffect(() => {
    if (!model.safeMatchId || !model.fixture || visibleRequestCount > 0) {
      return;
    }

    const tabLoadKey = [
      model.safeMatchId,
      model.activeTab,
      model.lifecycleState,
      model.queryContext.leagueId ?? 'none',
      model.queryContext.season ?? 'none',
    ].join(':');
    if (trackedTabLoadKeyRef.current === tabLoadKey) {
      return;
    }
    trackedTabLoadKeyRef.current = tabLoadKey;

    getMobileTelemetry().trackEvent('match_details.tab_load_ms', {
      matchId: model.safeMatchId,
      tab: model.activeTab,
      lifecycleState: model.lifecycleState,
      value: Date.now() - tabLoadStartedAtRef.current,
      cache_hit_estimate: Boolean(model.lastUpdatedAt),
    });
  }, [
    model.activeTab,
    model.fixture,
    model.lastUpdatedAt,
    model.lifecycleState,
    model.queryContext.leagueId,
    model.queryContext.season,
    model.safeMatchId,
    visibleRequestCount,
  ]);

  useEffect(() => {
    if (!model.safeMatchId) {
      return;
    }

    const requestKey = [
      model.safeMatchId,
      model.activeTab,
      model.lifecycleState,
      visibleRequestCount,
    ].join(':');
    if (trackedRequestCountKeyRef.current === requestKey) {
      return;
    }
    trackedRequestCountKeyRef.current = requestKey;

    getMobileTelemetry().trackEvent('match_details.request_count', {
      matchId: model.safeMatchId,
      tab: model.activeTab,
      lifecycleState: model.lifecycleState,
      queryCount: visibleRequestCount,
      cache_hit_estimate: Boolean(model.lastUpdatedAt),
    });
  }, [
    model.activeTab,
    model.lastUpdatedAt,
    model.lifecycleState,
    model.safeMatchId,
    visibleRequestCount,
  ]);
}
