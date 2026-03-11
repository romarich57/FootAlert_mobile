import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import type { RootStackParamList } from '@ui/app/navigation/types';
import { sanitizeNumericEntityId } from '@ui/app/navigation/routeParams';
import {
  areSelectionsEqual,
  isLeagueCompetition,
  reconcileCompetitionSelection,
  reconcileSeasonValue,
  resolveActiveSelectionContext,
  resolveCompetitionFallbackSelection,
  type ActiveSelectionContext,
  type TeamDetailsContentSelection,
  type TeamDetailsStandingsSelection,
} from '@ui/features/teams/hooks/teamDetailsSelection';
import { useTeamContext } from '@ui/features/teams/hooks/useTeamContext';
import { useTeamDetailsPrefetch } from '@ui/features/teams/hooks/teamDetailsPrefetch';
import { useTeamMatches } from '@ui/features/teams/hooks/useTeamMatches';
import { useTeamOverview } from '@ui/features/teams/hooks/useTeamOverview';
import { useTeamSquad } from '@ui/features/teams/hooks/useTeamSquad';
import { useTeamStandings } from '@ui/features/teams/hooks/useTeamStandings';
import { useTeamStats } from '@ui/features/teams/hooks/useTeamStats';
import { useTeamTransfers } from '@ui/features/teams/hooks/useTeamTransfers';
import type {
  TeamDetailsTab,
} from '@ui/features/teams/types/teams.types';
import { useFollowsActions } from '@ui/features/follows/hooks/useFollowsActions';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';
import { resolveDefaultTeamSelection } from '@data/mappers/teamsMapper';

type TeamDetailsRoute = RouteProp<RootStackParamList, 'TeamDetails'>;
type TeamDetailsNavigation = NativeStackNavigationProp<RootStackParamList>;

type TeamDetailsTabAvailability = {
  matches: boolean;
  standings: boolean;
  stats: boolean;
  transfers: boolean;
  squad: boolean;
};

export function useTeamDetailsScreenModel() {
  const { t } = useTranslation();
  const navigation = useNavigation<TeamDetailsNavigation>();
  const route = useRoute<TeamDetailsRoute>();
  const safeTeamId = sanitizeNumericEntityId(route.params.teamId);
  const teamId = safeTeamId ?? '';
  const followSource = route.params.followSource ?? 'team_details';

  const [activeTab, setActiveTab] = useState<TeamDetailsTab>('overview');
  const requestCountTelemetryKeyRef = useRef<string | null>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  const { followedTeamIds, toggleTeamFollow } = useFollowsActions();
  const isFollowed = Boolean(safeTeamId) && followedTeamIds.includes(teamId);

  const {
    team,
    timezone,
    competitions,
    defaultSelection,
    isLoading: isContextLoading,
    isError: isContextError,
    lastUpdatedAt: contextLastUpdatedAt,
    hasCachedData: hasContextCachedData,
    refetch: refetchContext,
  } = useTeamContext({ teamId });

  const standingsCompetitions = useMemo(
    () => competitions.filter(item => isLeagueCompetition(item.type)),
    [competitions],
  );
  const defaultStandingsSelection = useMemo<TeamDetailsStandingsSelection>(
    () => resolveDefaultTeamSelection(standingsCompetitions),
    [standingsCompetitions],
  );
  const [contentSelection, setContentSelection] = useState<TeamDetailsContentSelection>(defaultSelection);
  const [standingsSelection, setStandingsSelection] =
    useState<TeamDetailsStandingsSelection>(defaultStandingsSelection);
  const [transfersSeason, setTransfersSeasonState] = useState<number | null>(defaultSelection.season);

  useEffect(() => {
    setContentSelection(current => {
      const nextSelection = reconcileCompetitionSelection(current, competitions, defaultSelection);
      return areSelectionsEqual(current, nextSelection) ? current : nextSelection;
    });
  }, [competitions, defaultSelection]);

  useEffect(() => {
    setStandingsSelection(current => {
      const nextSelection = reconcileCompetitionSelection(
        current,
        standingsCompetitions,
        defaultStandingsSelection,
      );
      return areSelectionsEqual(current, nextSelection) ? current : nextSelection;
    });
  }, [defaultStandingsSelection, standingsCompetitions]);

  const allSeasons = useMemo(
    () => Array.from(new Set(competitions.flatMap(item => item.seasons))).sort((first, second) => second - first),
    [competitions],
  );

  useEffect(() => {
    const fallbackSeason = defaultSelection.season ?? allSeasons[0] ?? null;
    setTransfersSeasonState(current => reconcileSeasonValue(current, allSeasons, fallbackSeason));
  }, [allSeasons, defaultSelection.season]);

  const hasContentSelection =
    Boolean(contentSelection.leagueId) && typeof contentSelection.season === 'number';
  const hasStandingsSelection =
    Boolean(standingsSelection.leagueId) && typeof standingsSelection.season === 'number';
  const isOverviewTabActive = activeTab === 'overview';
  const isMatchesTabActive = activeTab === 'matches';
  const isStandingsTabActive = activeTab === 'standings';
  const isStatsTabActive = activeTab === 'stats';
  const isTransfersTabActive = activeTab === 'transfers';
  const isSquadTabActive = activeTab === 'squad';
  const standingsSeasons = useMemo(() => {
    const selectedStandingsCompetition =
      standingsCompetitions.find(item => item.leagueId === standingsSelection.leagueId) ??
      standingsCompetitions[0] ??
      null;

    return selectedStandingsCompetition?.seasons ?? [];
  }, [standingsCompetitions, standingsSelection.leagueId]);

  const selectedCompetitionSeasons = useMemo(() => {
    const selectedCompetition =
      competitions.find(item => item.leagueId === contentSelection.leagueId) ?? null;
    return selectedCompetition?.seasons ?? [];
  }, [competitions, contentSelection.leagueId]);

  const overviewQuery = useTeamOverview({
    teamId,
    leagueId: contentSelection.leagueId,
    season: contentSelection.season,
    timezone,
    competitionSeasons: selectedCompetitionSeasons,
    enabled: hasContentSelection && isOverviewTabActive,
  });

  const matchesQuery = useTeamMatches({
    teamId,
    leagueId: contentSelection.leagueId,
    season: contentSelection.season,
    timezone,
    enabled: hasContentSelection && isMatchesTabActive,
  });

  const standingsQuery = useTeamStandings({
    teamId,
    leagueId: standingsSelection.leagueId,
    season: standingsSelection.season,
    timezone,
    enabled: hasStandingsSelection && isStandingsTabActive,
  });

  const statsQuery = useTeamStats({
    teamId,
    leagueId: contentSelection.leagueId,
    season: contentSelection.season,
    enabled: hasContentSelection && isStatsTabActive,
  });

  const transfersQuery = useTeamTransfers({
    teamId,
    season: transfersSeason,
    enabled: Boolean(safeTeamId) && isTransfersTabActive,
  });

  const squadQuery = useTeamSquad({
    teamId,
    enabled: Boolean(safeTeamId) && isSquadTabActive,
  });

  useTeamDetailsPrefetch({
    safeTeamId,
    teamId,
    contentSelection,
    selectedCompetitionSeasons,
    timezone,
    transfersSeason,
    overviewCoreData: overviewQuery.coreData,
  });

  const activeRequestCount = useMemo(() => {
    let count = 1; // Team context query.

    if (hasContentSelection && isOverviewTabActive) {
      count += 2;
    }
    if (hasContentSelection && isMatchesTabActive) {
      count += 1;
    }
    if (hasStandingsSelection && isStandingsTabActive) {
      count += 1;
    }
    if (hasContentSelection && isStatsTabActive) {
      count += 3;
    }
    if (safeTeamId && isTransfersTabActive && typeof transfersSeason === 'number') {
      count += 1;
    }
    if (safeTeamId && isSquadTabActive) {
      count += 1;
    }

    return count;
  }, [
    hasContentSelection,
    hasStandingsSelection,
    isMatchesTabActive,
    isOverviewTabActive,
    isSquadTabActive,
    isStandingsTabActive,
    isStatsTabActive,
    isTransfersTabActive,
    safeTeamId,
    transfersSeason,
  ]);

  const activeSelectionContext = useMemo<ActiveSelectionContext>(() => {
    return resolveActiveSelectionContext({
      activeTab,
      contentSelection,
      standingsSelection,
      transfersSeason,
    });
  }, [
    activeTab,
    contentSelection,
    standingsSelection,
    transfersSeason,
  ]);

  useEffect(() => {
    if (!safeTeamId) {
      return;
    }

    const telemetryKey = [
      teamId,
      activeTab,
      activeSelectionContext.selectionFingerprint,
      activeRequestCount,
    ].join('|');
    if (requestCountTelemetryKeyRef.current === telemetryKey) {
      return;
    }
    requestCountTelemetryKeyRef.current = telemetryKey;

    getMobileTelemetry().trackEvent('team_details.request_count', {
      activeTab,
      queryCount: activeRequestCount,
      hasLeagueSelection: hasContentSelection,
      selectionGroup: activeSelectionContext.selectionGroup,
      selectionFingerprint: activeSelectionContext.selectionFingerprint,
    });
  }, [
    activeRequestCount,
    activeSelectionContext.selectionFingerprint,
    activeSelectionContext.selectionGroup,
    activeTab,
    hasContentSelection,
    safeTeamId,
    teamId,
  ]);

  const handleChangeTab = useCallback((tab: TeamDetailsTab) => {
    setActiveTab(tab);
  }, []);

  const setContentLeagueSeason = useCallback(
    (leagueId: string, season: number) => {
      const selectedCompetition = competitions.find(item => item.leagueId === leagueId) ?? null;
      const fallbackSelection = resolveCompetitionFallbackSelection(selectedCompetition);
      const nextSelection = selectedCompetition?.seasons.includes(season)
        ? { leagueId, season }
        : fallbackSelection;

      setContentSelection(current =>
        areSelectionsEqual(current, nextSelection) ? current : nextSelection,
      );
    },
    [competitions],
  );

  const setStandingsSeason = useCallback(
    (season: number) => {
      setStandingsSelection(current => {
        const selectedCompetition =
          standingsCompetitions.find(item => item.leagueId === current.leagueId) ??
          standingsCompetitions[0] ??
          null;
        const fallbackSelection = resolveCompetitionFallbackSelection(selectedCompetition);
        const nextSelection =
          selectedCompetition?.seasons.includes(season)
            ? {
                leagueId: selectedCompetition.leagueId,
                season,
              }
            : fallbackSelection;

        return areSelectionsEqual(current, nextSelection) ? current : nextSelection;
      });
    },
    [standingsCompetitions],
  );

  const setTransfersSeason = useCallback(
    (season: number) => {
      setTransfersSeasonState(current => {
        const nextSeason = reconcileSeasonValue(season, allSeasons, defaultSelection.season);
        return current === nextSeason ? current : nextSeason;
      });
    },
    [allSeasons, defaultSelection.season],
  );

  const handlePressMatch = useCallback(
    (matchId: string) => {
      const safeMatchId = sanitizeNumericEntityId(matchId);
      if (!safeMatchId) {
        return;
      }

      navigation.navigate('MatchDetails', { matchId: safeMatchId });
    },
    [navigation],
  );

  const handlePressTeam = useCallback(
    (nextTeamId: string) => {
      const safeNextTeamId = sanitizeNumericEntityId(nextTeamId);
      if (!safeNextTeamId || safeNextTeamId === teamId) {
        return;
      }

      navigation.push('TeamDetails', { teamId: safeNextTeamId });
    },
    [navigation, teamId],
  );

  const handlePressPlayer = useCallback(
    (playerId: string) => {
      const safePlayerId = sanitizeNumericEntityId(playerId);
      if (!safePlayerId) {
        return;
      }

      navigation.navigate('PlayerDetails', { playerId: safePlayerId });
    },
    [navigation],
  );

  const handleToggleFollow = useCallback(() => {
    if (!safeTeamId) {
      return;
    }

    toggleTeamFollow(teamId, {
      source: followSource,
      snapshot: team.name
        ? {
            teamName: team.name,
            teamLogo: team.logo ?? '',
            country: team.country ?? null,
          }
        : undefined,
    }).catch(() => undefined);
  }, [followSource, safeTeamId, team.country, team.logo, team.name, teamId, toggleTeamFollow]);

  const openNotificationModal = useCallback(() => {
    setIsNotificationModalOpen(true);
  }, []);

  const closeNotificationModal = useCallback(() => {
    setIsNotificationModalOpen(false);
  }, []);

  const tabAvailability = useMemo<TeamDetailsTabAvailability>(() => {
    const contextReady =
      Boolean(safeTeamId) &&
      (hasContextCachedData || !isContextLoading) &&
      (!isContextError || hasContextCachedData);

    return {
      matches: hasContentSelection,
      standings: standingsCompetitions.length > 0,
      stats: hasContentSelection,
      transfers: contextReady,
      squad: contextReady,
    };
  }, [
    hasContentSelection,
    hasContextCachedData,
    isContextError,
    isContextLoading,
    safeTeamId,
    standingsCompetitions.length,
  ]);

  const tabs = useMemo(() => {
    const computedTabs: Array<{ key: TeamDetailsTab; label: string }> = [
      { key: 'overview' as const, label: t('teamDetails.tabs.overview') },
    ];

    if (tabAvailability.matches) {
      computedTabs.push({ key: 'matches' as const, label: t('teamDetails.tabs.matches') });
    }

    if (tabAvailability.standings) {
      computedTabs.push({ key: 'standings' as const, label: t('teamDetails.tabs.standings') });
    }

    if (tabAvailability.stats) {
      computedTabs.push({ key: 'stats' as const, label: t('teamDetails.tabs.stats') });
    }

    if (tabAvailability.transfers) {
      computedTabs.push({ key: 'transfers' as const, label: t('teamDetails.tabs.transfers') });
    }

    if (tabAvailability.squad) {
      computedTabs.push({ key: 'squad' as const, label: t('teamDetails.tabs.squad') });
    }

    return computedTabs;
  }, [t, tabAvailability.matches, tabAvailability.squad, tabAvailability.standings, tabAvailability.stats, tabAvailability.transfers]);

  useEffect(() => {
    if (tabs.some(tab => tab.key === activeTab)) {
      return;
    }

    setActiveTab('overview');
  }, [activeTab, tabs]);

  const activeTabDataUpdatedAt = useMemo(() => {
    if (activeTab === 'overview') {
      return overviewQuery.dataUpdatedAt;
    }
    if (activeTab === 'matches') {
      return matchesQuery.dataUpdatedAt;
    }
    if (activeTab === 'standings') {
      return standingsQuery.dataUpdatedAt;
    }
    if (activeTab === 'stats') {
      return statsQuery.dataUpdatedAt;
    }
    if (activeTab === 'transfers') {
      return transfersQuery.dataUpdatedAt;
    }
    if (activeTab === 'squad') {
      return squadQuery.dataUpdatedAt;
    }
    return 0;
  }, [
    activeTab,
    matchesQuery.dataUpdatedAt,
    overviewQuery.dataUpdatedAt,
    squadQuery.dataUpdatedAt,
    standingsQuery.dataUpdatedAt,
    statsQuery.dataUpdatedAt,
    transfersQuery.dataUpdatedAt,
  ]);

  const lastUpdatedAt = useMemo(() => {
    const maxUpdatedAt = Math.max(
      contextLastUpdatedAt ?? 0,
      overviewQuery.dataUpdatedAt,
      matchesQuery.dataUpdatedAt,
      standingsQuery.dataUpdatedAt,
      statsQuery.dataUpdatedAt,
      transfersQuery.dataUpdatedAt,
      squadQuery.dataUpdatedAt,
    );
    return maxUpdatedAt > 0 ? maxUpdatedAt : null;
  }, [
    contextLastUpdatedAt,
    matchesQuery.dataUpdatedAt,
    overviewQuery.dataUpdatedAt,
    squadQuery.dataUpdatedAt,
    standingsQuery.dataUpdatedAt,
    statsQuery.dataUpdatedAt,
    transfersQuery.dataUpdatedAt,
  ]);

  const hasCachedData = hasContextCachedData || activeTabDataUpdatedAt > 0;

  return {
    isValidTeamId: Boolean(safeTeamId),
    teamId,
    team,
    activeTab,
    tabs,
    competitions,
    allSeasons,
    contentSelection,
    standingsSelection,
    transfersSeason,
    standingsSeasons,
    selectedLeagueId: activeSelectionContext.leagueId,
    selectedSeason: activeSelectionContext.season,
    selectionGroup: activeSelectionContext.selectionGroup,
    selectionFingerprint: activeSelectionContext.selectionFingerprint,
    isContextLoading,
    isContextError,
    hasCachedData,
    lastUpdatedAt,
    isFollowed,
    hasContentSelection,
    hasStandingsSelection,
    overviewQuery,
    matchesQuery,
    standingsQuery,
    statsQuery,
    transfersQuery,
    squadQuery,
    setContentLeagueSeason,
    setStandingsSeason,
    setTransfersSeason,
    refetchContext,
    handleChangeTab,
    handlePressMatch,
    handlePressTeam,
    handlePressPlayer,
    handleToggleFollow,
    isNotificationModalOpen,
    openNotificationModal,
    closeNotificationModal,
    onBack: () => navigation.goBack(),
  };
}
