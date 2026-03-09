import { useEffect, useRef } from 'react';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';
import { useTeamDetailsScreenModel } from '@ui/features/teams/hooks/useTeamDetailsScreenModel';

type TeamDetailsScreenModel = ReturnType<typeof useTeamDetailsScreenModel>;
type TabCacheState = 'cold' | 'warm';

function resolveTabCacheState(
  model: TeamDetailsScreenModel,
  tab: TeamDetailsScreenModel['activeTab'],
): TabCacheState {
  if (tab === 'overview') return model.overviewQuery.coreUpdatedAt > 0 ? 'warm' : 'cold';
  if (tab === 'stats') return model.statsQuery.coreUpdatedAt > 0 ? 'warm' : 'cold';
  if (tab === 'transfers') return model.transfersQuery.dataUpdatedAt > 0 ? 'warm' : 'cold';
  return 'cold';
}

export function useTeamDetailsTelemetry(model: TeamDetailsScreenModel) {
  const screenOpenedAtRef = useRef(Date.now());
  const tabLoadStartedAtRef = useRef(Date.now());
  const lastTrackedTabRef = useRef(model.activeTab);
  const trackedTabTtiKeysRef = useRef(new Set<string>());
  const trackedDatasetKeysRef = useRef(new Set<string>());
  const tabCacheStateRef = useRef<TabCacheState>('cold');
  const activeTabCacheState = resolveTabCacheState(model, model.activeTab);

  useEffect(() => {
    screenOpenedAtRef.current = Date.now();
    tabLoadStartedAtRef.current = Date.now();
    lastTrackedTabRef.current = model.activeTab;
    trackedTabTtiKeysRef.current.clear();
    trackedDatasetKeysRef.current.clear();
    tabCacheStateRef.current = activeTabCacheState;
  }, [activeTabCacheState, model.activeTab, model.teamId]);

  useEffect(() => {
    if (lastTrackedTabRef.current === model.activeTab) {
      return;
    }

    lastTrackedTabRef.current = model.activeTab;
    tabLoadStartedAtRef.current = Date.now();
    trackedTabTtiKeysRef.current.clear();
    tabCacheStateRef.current = activeTabCacheState;
  }, [activeTabCacheState, model.activeTab]);

  useEffect(() => {
    const teamId = model.teamId;
    if (!teamId) {
      return;
    }

    const trackTabTti = (
      tab: 'overview' | 'stats' | 'transfers',
      phase: 'core' | 'full',
      updatedAt: number,
    ) => {
      if (updatedAt <= 0) {
        return;
      }

      const selectionContext =
        tab === 'transfers'
          ? {
              selectionGroup: 'transfers',
              leagueId: null,
              season: model.transfersSeason,
              selectionFingerprint: ['transfers', 'none', model.transfersSeason ?? 'none'].join(':'),
            }
          : {
              selectionGroup: 'content',
              leagueId: model.contentSelection.leagueId,
              season: model.contentSelection.season,
              selectionFingerprint: [
                'content',
                model.contentSelection.leagueId ?? 'none',
                model.contentSelection.season ?? 'none',
              ].join(':'),
            };
      const telemetryKey = [
        teamId,
        tab,
        phase,
        selectionContext.selectionFingerprint,
        updatedAt,
      ].join(':');
      if (trackedTabTtiKeysRef.current.has(telemetryKey)) {
        return;
      }
      trackedTabTtiKeysRef.current.add(telemetryKey);

      getMobileTelemetry().trackEvent('team_details.tab_tti', {
        teamId,
        tab,
        phase,
        leagueId: selectionContext.leagueId,
        season: selectionContext.season,
        cacheState: tabCacheStateRef.current,
        selectionGroup: selectionContext.selectionGroup,
        selectionFingerprint: selectionContext.selectionFingerprint,
        value: Date.now() - tabLoadStartedAtRef.current,
      });
    };

    if (model.activeTab === 'overview' && model.overviewQuery.coreData) {
      trackTabTti('overview', 'core', model.overviewQuery.coreUpdatedAt);
    }

    if (
      model.activeTab === 'overview' &&
      model.overviewQuery.leadersUpdatedAt > 0 &&
      !model.overviewQuery.isLeadersLoading
    ) {
      trackTabTti('overview', 'full', model.overviewQuery.leadersUpdatedAt);
    }

    if (
      model.activeTab === 'stats' &&
      model.statsQuery.coreData &&
      !model.statsQuery.isCoreLoading
    ) {
      trackTabTti('stats', 'core', model.statsQuery.coreUpdatedAt);
    }

    if (
      model.activeTab === 'stats' &&
      !model.statsQuery.isPlayersLoading &&
      !model.statsQuery.isPlayersFetching &&
      !model.statsQuery.isAdvancedLoading &&
      !model.statsQuery.isAdvancedFetching &&
      (model.statsQuery.playersUpdatedAt > 0 || model.statsQuery.isPlayersError) &&
      (model.statsQuery.advancedUpdatedAt > 0 || model.statsQuery.isAdvancedError)
    ) {
      trackTabTti(
        'stats',
        'full',
        Math.max(model.statsQuery.playersUpdatedAt, model.statsQuery.advancedUpdatedAt),
      );
    }

    if (
      model.activeTab === 'transfers' &&
      model.transfersQuery.isFetched &&
      !model.transfersQuery.isLoading
    ) {
      trackTabTti('transfers', 'core', model.transfersQuery.dataUpdatedAt);
    }
  }, [
    model.activeTab,
    model.contentSelection.leagueId,
    model.contentSelection.season,
    model.overviewQuery.coreData,
    model.overviewQuery.coreUpdatedAt,
    model.overviewQuery.isLeadersLoading,
    model.overviewQuery.leadersUpdatedAt,
    model.statsQuery.advancedUpdatedAt,
    model.statsQuery.coreData,
    model.statsQuery.coreUpdatedAt,
    model.statsQuery.isAdvancedError,
    model.statsQuery.isAdvancedFetching,
    model.statsQuery.isAdvancedLoading,
    model.statsQuery.isCoreLoading,
    model.statsQuery.isPlayersError,
    model.statsQuery.isPlayersFetching,
    model.statsQuery.isPlayersLoading,
    model.statsQuery.playersUpdatedAt,
    model.teamId,
    model.transfersSeason,
    model.transfersQuery.dataUpdatedAt,
    model.transfersQuery.isFetched,
    model.transfersQuery.isLoading,
  ]);

  useEffect(() => {
    if (!model.teamId) {
      return;
    }

    const trackDatasetReady = (
      dataset: string,
      updatedAt: number,
      payload: Record<string, unknown>,
    ) => {
      if (updatedAt <= 0) {
        return;
      }

      const telemetryKey = [model.teamId, dataset, updatedAt].join(':');
      if (trackedDatasetKeysRef.current.has(telemetryKey)) {
        return;
      }
      trackedDatasetKeysRef.current.add(telemetryKey);

      getMobileTelemetry().trackEvent('team_details.dataset_ready', {
        teamId: model.teamId,
        dataset,
        value: Date.now() - screenOpenedAtRef.current,
        ...payload,
      });
    };

    if (model.contentSelection.leagueId && typeof model.contentSelection.season === 'number') {
      const contentSelectionFingerprint = [
        'content',
        model.contentSelection.leagueId,
        model.contentSelection.season,
      ].join(':');
      trackDatasetReady('overview-leaders', model.overviewQuery.leadersUpdatedAt, {
        leagueId: model.contentSelection.leagueId,
        season: model.contentSelection.season,
        selectionGroup: 'content',
        selectionFingerprint: contentSelectionFingerprint,
        sourceUpdatedAt: model.overviewQuery.leadersData?.sourceUpdatedAt ?? null,
      });
      trackDatasetReady('stats-players', model.statsQuery.playersUpdatedAt, {
        leagueId: model.contentSelection.leagueId,
        season: model.contentSelection.season,
        selectionGroup: 'content',
        selectionFingerprint: contentSelectionFingerprint,
      });
      trackDatasetReady('advanced-stats', model.statsQuery.advancedUpdatedAt, {
        leagueId: model.contentSelection.leagueId,
        season: model.contentSelection.season,
        selectionGroup: 'content',
        selectionFingerprint: contentSelectionFingerprint,
        sourceUpdatedAt: model.statsQuery.advancedData?.sourceUpdatedAt ?? null,
      });
    }

    if (typeof model.transfersSeason === 'number') {
      const transfersSelectionFingerprint = ['transfers', 'none', model.transfersSeason].join(':');
      trackDatasetReady('transfers', model.transfersQuery.dataUpdatedAt, {
        season: model.transfersSeason,
        selectionGroup: 'transfers',
        selectionFingerprint: transfersSelectionFingerprint,
      });
    }
  }, [
    model.contentSelection.leagueId,
    model.contentSelection.season,
    model.overviewQuery.leadersData?.sourceUpdatedAt,
    model.overviewQuery.leadersUpdatedAt,
    model.statsQuery.advancedData?.sourceUpdatedAt,
    model.statsQuery.advancedUpdatedAt,
    model.statsQuery.playersUpdatedAt,
    model.teamId,
    model.transfersSeason,
    model.transfersQuery.dataUpdatedAt,
  ]);
}
