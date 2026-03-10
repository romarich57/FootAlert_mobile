import { useEffect, useRef } from 'react';
import { useIsFetching } from '@tanstack/react-query';

import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';
import { useCompetitionDetailsScreenModel } from '@ui/features/competitions/hooks/useCompetitionDetailsScreenModel';

type CompetitionDetailsScreenModel = ReturnType<typeof useCompetitionDetailsScreenModel>;

function isVisibleCompetitionQuery(
  queryKey: readonly unknown[],
  model: CompetitionDetailsScreenModel,
): boolean {
  if (!model.safeCompetitionId) {
    return false;
  }

  if (
    queryKey[0] === 'competitions' &&
    queryKey[1] === 'full' &&
    queryKey[2] === model.safeCompetitionId &&
    (queryKey[3] === model.actualSeason || queryKey[3] === null)
  ) {
    return true;
  }

  if (
    queryKey[0] === 'competitions' &&
    queryKey[1] === 'details' &&
    queryKey[2] === 'header' &&
    queryKey[3] === model.safeCompetitionId
  ) {
    return true;
  }

  if (queryKey[0] === 'competition_seasons' && queryKey[1] === model.numericCompetitionId) {
    return true;
  }

  if (!Number.isFinite(model.numericCompetitionId) || typeof model.actualSeason !== 'number') {
    return false;
  }

  if (
    model.activeTab === 'standings' &&
    queryKey[0] === 'competition_standings' &&
    queryKey[1] === model.numericCompetitionId &&
    queryKey[2] === model.actualSeason
  ) {
    return true;
  }

  if (
    model.activeTab === 'standings' &&
    queryKey[0] === 'competition_bracket' &&
    queryKey[1] === model.numericCompetitionId &&
    queryKey[2] === model.actualSeason
  ) {
    return true;
  }

  if (
    model.activeTab === 'matches' &&
    queryKey[0] === 'competition_fixtures' &&
    queryKey[1] === model.numericCompetitionId &&
    queryKey[2] === model.actualSeason
  ) {
    return true;
  }

  if (
    model.activeTab === 'playerStats' &&
    queryKey[0] === 'competition_player_stats' &&
    queryKey[1] === model.numericCompetitionId &&
    queryKey[2] === model.actualSeason
  ) {
    return true;
  }

  if (
    model.activeTab === 'teamStats' &&
    (queryKey[0] === 'competition_team_stats' ||
      queryKey[0] === 'competition_team_advanced_stats_batch') &&
    queryKey[1] === model.numericCompetitionId &&
    queryKey[2] === model.actualSeason
  ) {
    return true;
  }

  if (
    model.activeTab === 'transfers' &&
    queryKey[0] === 'competition_transfers' &&
    queryKey[1] === model.numericCompetitionId &&
    queryKey[2] === model.actualSeason
  ) {
    return true;
  }

  return (
    model.activeTab === 'totw' &&
    queryKey[0] === 'competition_totw' &&
    queryKey[1] === model.numericCompetitionId &&
    queryKey[2] === model.actualSeason
  );
}

export function useCompetitionDetailsTelemetry(
  model: CompetitionDetailsScreenModel,
): void {
  const screenOpenedAtRef = useRef(Date.now());
  const firstContentTrackedRef = useRef(false);
  const tabLoadStartedAtRef = useRef(Date.now());
  const trackedTabLoadKeyRef = useRef<string | null>(null);
  const trackedRequestCountKeyRef = useRef<string | null>(null);
  const lastTrackedTabRef = useRef(model.activeTab);

  const visibleRequestCount = useIsFetching({
    predicate: query => isVisibleCompetitionQuery(query.queryKey, model),
  });

  useEffect(() => {
    screenOpenedAtRef.current = Date.now();
    firstContentTrackedRef.current = false;
    trackedRequestCountKeyRef.current = null;
  }, [model.safeCompetitionId]);

  useEffect(() => {
    if (lastTrackedTabRef.current === model.activeTab) {
      return;
    }

    lastTrackedTabRef.current = model.activeTab;
    tabLoadStartedAtRef.current = Date.now();
    trackedTabLoadKeyRef.current = null;
  }, [model.activeTab]);

  useEffect(() => {
    if (!model.safeCompetitionId || !model.competition || firstContentTrackedRef.current) {
      return;
    }

    firstContentTrackedRef.current = true;
    getMobileTelemetry().trackEvent('competition_details.first_content_ms', {
      competitionId: model.safeCompetitionId,
      tab: model.activeTab,
      value: Date.now() - screenOpenedAtRef.current,
      cache_hit_estimate: model.hasCachedData,
    });
  }, [
    model.activeTab,
    model.competition,
    model.hasCachedData,
    model.safeCompetitionId,
  ]);

  useEffect(() => {
    if (!model.safeCompetitionId || !model.competition || visibleRequestCount > 0) {
      return;
    }

    const tabLoadKey = [
      model.safeCompetitionId,
      model.activeTab,
      model.actualSeason ?? 'none',
    ].join(':');
    if (trackedTabLoadKeyRef.current === tabLoadKey) {
      return;
    }
    trackedTabLoadKeyRef.current = tabLoadKey;

    getMobileTelemetry().trackEvent('competition_details.tab_load_ms', {
      competitionId: model.safeCompetitionId,
      tab: model.activeTab,
      season: model.actualSeason ?? null,
      value: Date.now() - tabLoadStartedAtRef.current,
      cache_hit_estimate: model.hasCachedData,
    });
  }, [
    model.activeTab,
    model.actualSeason,
    model.competition,
    model.hasCachedData,
    model.safeCompetitionId,
    visibleRequestCount,
  ]);

  useEffect(() => {
    if (!model.safeCompetitionId) {
      return;
    }

    const requestKey = [
      model.safeCompetitionId,
      model.activeTab,
      model.actualSeason ?? 'none',
      visibleRequestCount,
    ].join(':');
    if (trackedRequestCountKeyRef.current === requestKey) {
      return;
    }
    trackedRequestCountKeyRef.current = requestKey;

    getMobileTelemetry().trackEvent('competition_details.request_count', {
      competitionId: model.safeCompetitionId,
      tab: model.activeTab,
      season: model.actualSeason ?? null,
      queryCount: visibleRequestCount,
      cache_hit_estimate: model.hasCachedData,
    });
  }, [
    model.activeTab,
    model.actualSeason,
    model.hasCachedData,
    model.safeCompetitionId,
    visibleRequestCount,
  ]);
}
