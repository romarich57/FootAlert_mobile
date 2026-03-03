import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import type { RootStackParamList } from '@ui/app/navigation/types';
import { sanitizeNumericEntityId } from '@ui/app/navigation/routeParams';
import { useTeamContext } from '@ui/features/teams/hooks/useTeamContext';
import { useTeamMatches } from '@ui/features/teams/hooks/useTeamMatches';
import { useTeamOverview } from '@ui/features/teams/hooks/useTeamOverview';
import { useTeamSquad } from '@ui/features/teams/hooks/useTeamSquad';
import { useTeamStandings } from '@ui/features/teams/hooks/useTeamStandings';
import { useTeamStats } from '@ui/features/teams/hooks/useTeamStats';
import { useTeamTrophies } from '@ui/features/teams/hooks/useTeamTrophies';
import { useTeamTransfers } from '@ui/features/teams/hooks/useTeamTransfers';
import { resolveTeamStatsVisibility } from '@ui/features/teams/components/stats/teamStatsSelectors';
import type { TeamDetailsTab } from '@ui/features/teams/types/teams.types';
import { useFollowsActions } from '@ui/features/follows/hooks/useFollowsActions';

type TeamDetailsRoute = RouteProp<RootStackParamList, 'TeamDetails'>;
type TeamDetailsNavigation = NativeStackNavigationProp<RootStackParamList>;

function isLeagueCompetition(type: string | null | undefined): boolean {
  return (type ?? '').trim().toLowerCase() === 'league';
}

type QueryStateLike = Pick<
  UseQueryResult<unknown>,
  'isLoading' | 'isFetching' | 'isError' | 'isFetched' | 'isFetchedAfterMount'
>;

function shouldDisplayDataTab({
  hasData,
  query,
}: {
  hasData: boolean;
  query: QueryStateLike;
}): boolean {
  if (query.isError) {
    return true;
  }

  if (query.isLoading || query.isFetching) {
    return true;
  }

  const hasFetchedAfterMount = query.isFetchedAfterMount ?? query.isFetched;
  if (!hasFetchedAfterMount) {
    return true;
  }

  return hasData;
}

export function useTeamDetailsScreenModel() {
  const { t } = useTranslation();
  const navigation = useNavigation<TeamDetailsNavigation>();
  const route = useRoute<TeamDetailsRoute>();
  const safeTeamId = sanitizeNumericEntityId(route.params.teamId);
  const teamId = safeTeamId ?? '';

  const [activeTab, setActiveTab] = useState<TeamDetailsTab>('overview');
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  const { followedTeamIds, toggleTeamFollow } = useFollowsActions();
  const isFollowed = Boolean(safeTeamId) && followedTeamIds.includes(teamId);

  const {
    team,
    timezone,
    competitions,
    selectedLeagueId,
    selectedSeason,
    setLeague,
    setLeagueSeason,
    setSeason,
    isLoading: isContextLoading,
    isError: isContextError,
    lastUpdatedAt: contextLastUpdatedAt,
    hasCachedData: hasContextCachedData,
    refetch: refetchContext,
  } = useTeamContext({ teamId });

  const hasLeagueSelection = Boolean(selectedLeagueId) && typeof selectedSeason === 'number';
  const standingsCompetitions = useMemo(
    () => competitions.filter(item => isLeagueCompetition(item.type)),
    [competitions],
  );
  const standingsSeasons = useMemo(() => {
    if (activeTab !== 'standings') {
      return [];
    }

    const selectedStandingsCompetition =
      standingsCompetitions.find(item => item.leagueId === selectedLeagueId) ??
      standingsCompetitions[0] ??
      null;

    return selectedStandingsCompetition?.seasons ?? [];
  }, [activeTab, selectedLeagueId, standingsCompetitions]);

  const selectedCompetitionSeasons = useMemo(() => {
    const selectedCompetition = competitions.find(item => item.leagueId === selectedLeagueId) ?? null;
    return selectedCompetition?.seasons ?? [];
  }, [competitions, selectedLeagueId]);

  useEffect(() => {
    if (activeTab !== 'standings') {
      return;
    }

    if (standingsCompetitions.length === 0) {
      return;
    }

    const selectedCompetition = competitions.find(item => item.leagueId === selectedLeagueId) ?? null;
    if (selectedCompetition && isLeagueCompetition(selectedCompetition.type)) {
      return;
    }

    setLeague(standingsCompetitions[0].leagueId);
  }, [activeTab, competitions, selectedLeagueId, setLeague, standingsCompetitions]);

  const overviewQuery = useTeamOverview({
    teamId,
    leagueId: selectedLeagueId,
    season: selectedSeason,
    timezone,
    competitionSeasons: selectedCompetitionSeasons,
    enabled: hasLeagueSelection,
  });

  const matchesQuery = useTeamMatches({
    teamId,
    leagueId: selectedLeagueId,
    season: selectedSeason,
    timezone,
    enabled: hasLeagueSelection,
  });

  const standingsQuery = useTeamStandings({
    teamId,
    leagueId: selectedLeagueId,
    season: selectedSeason,
    enabled: hasLeagueSelection,
  });

  const statsQuery = useTeamStats({
    teamId,
    leagueId: selectedLeagueId,
    season: selectedSeason,
    enabled: hasLeagueSelection,
  });

  const transfersQuery = useTeamTransfers({
    teamId,
    season: selectedSeason,
    enabled: Boolean(safeTeamId),
  });

  const squadQuery = useTeamSquad({
    teamId,
    enabled: Boolean(safeTeamId),
  });

  const trophiesQuery = useTeamTrophies({
    teamId,
    enabled: Boolean(safeTeamId),
  });

  const hasTrophiesData = useMemo(
    () => (trophiesQuery.data?.groups ?? []).some(group => group.placements.length > 0),
    [trophiesQuery.data?.groups],
  );

  useEffect(() => {
    if (activeTab !== 'standings') {
      return;
    }

    if (!selectedLeagueId || typeof selectedSeason !== 'number') {
      return;
    }

    if (standingsQuery.isLoading) {
      return;
    }

    const hasRows = (standingsQuery.data?.groups ?? []).some(group => group.rows.length > 0);
    if (hasRows) {
      return;
    }

    const selectedCompetition = competitions.find(c => c.leagueId === selectedLeagueId);
    if (!selectedCompetition) {
      return;
    }

    const currentSeasonIndex = selectedCompetition.seasons.indexOf(selectedSeason);
    if (currentSeasonIndex === -1) {
      return;
    }

    const fallbackCandidates = [
      ...selectedCompetition.seasons.slice(currentSeasonIndex + 1),
      ...selectedCompetition.seasons.slice(0, currentSeasonIndex).reverse(),
    ];

    const fallbackSeason = fallbackCandidates.find(season => season !== selectedSeason);

    if (typeof fallbackSeason === 'number') {
      setSeason(fallbackSeason);
    }
  }, [
    activeTab,
    selectedLeagueId,
    selectedSeason,
    standingsQuery.data,
    standingsQuery.isError,
    standingsQuery.isLoading,
    competitions,
    setSeason,
  ]);

  const handleChangeTab = useCallback((tab: TeamDetailsTab) => {
    setActiveTab(tab);
  }, []);

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

    toggleTeamFollow(teamId).catch(() => undefined);
  }, [safeTeamId, teamId, toggleTeamFollow]);

  const openNotificationModal = useCallback(() => {
    setIsNotificationModalOpen(true);
  }, []);

  const closeNotificationModal = useCallback(() => {
    setIsNotificationModalOpen(false);
  }, []);

  const hasMatchesData = useMemo(
    () => (matchesQuery.data?.all.length ?? 0) > 0,
    [matchesQuery.data?.all.length],
  );
  const hasStandingsData = useMemo(
    () => (standingsQuery.data?.groups ?? []).some(group => group.rows.length > 0),
    [standingsQuery.data?.groups],
  );
  const hasStatsData = useMemo(() => {
    const visibility = resolveTeamStatsVisibility(statsQuery.data);

    return (
      visibility.pointsCardVisible ||
      visibility.goalsCardVisible ||
      visibility.playersCardVisible ||
      (statsQuery.data?.comparisonMetrics.length ?? 0) > 0
    );
  }, [statsQuery.data]);
  const hasTransfersData = useMemo(
    () =>
      (transfersQuery.data?.arrivals.length ?? 0) > 0 ||
      (transfersQuery.data?.departures.length ?? 0) > 0,
    [transfersQuery.data?.arrivals.length, transfersQuery.data?.departures.length],
  );
  const hasSquadData = useMemo(
    () => (squadQuery.data?.players.length ?? 0) > 0 || Boolean(squadQuery.data?.coach),
    [squadQuery.data?.coach, squadQuery.data?.players.length],
  );

  const showMatchesTab = hasLeagueSelection && shouldDisplayDataTab({
    hasData: hasMatchesData,
    query: matchesQuery,
  });
  const showStandingsTab = hasLeagueSelection && shouldDisplayDataTab({
    hasData: hasStandingsData,
    query: standingsQuery,
  });
  const showStatsTab = hasLeagueSelection && shouldDisplayDataTab({
    hasData: hasStatsData,
    query: statsQuery,
  });
  const showTransfersTab = shouldDisplayDataTab({
    hasData: hasTransfersData,
    query: transfersQuery,
  });
  const showSquadTab = shouldDisplayDataTab({
    hasData: hasSquadData,
    query: squadQuery,
  });
  const showTrophiesTab = shouldDisplayDataTab({
    hasData: hasTrophiesData,
    query: trophiesQuery,
  });

  const tabs = useMemo(() => {
    const computedTabs: Array<{ key: TeamDetailsTab; label: string }> = [
      { key: 'overview' as const, label: t('teamDetails.tabs.overview') },
    ];

    if (showMatchesTab) {
      computedTabs.push({ key: 'matches' as const, label: t('teamDetails.tabs.matches') });
    }

    if (showStandingsTab) {
      computedTabs.push({ key: 'standings' as const, label: t('teamDetails.tabs.standings') });
    }

    if (showStatsTab) {
      computedTabs.push({ key: 'stats' as const, label: t('teamDetails.tabs.stats') });
    }

    if (showTransfersTab) {
      computedTabs.push({ key: 'transfers' as const, label: t('teamDetails.tabs.transfers') });
    }

    if (showSquadTab) {
      computedTabs.push({ key: 'squad' as const, label: t('teamDetails.tabs.squad') });
    }

    if (showTrophiesTab) {
      computedTabs.push({ key: 'trophies' as const, label: t('teamDetails.tabs.trophies') });
    }

    return computedTabs;
  }, [
    showMatchesTab,
    showStandingsTab,
    showStatsTab,
    showTransfersTab,
    showSquadTab,
    showTrophiesTab,
    t,
  ]);

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
    return trophiesQuery.dataUpdatedAt;
  }, [
    activeTab,
    matchesQuery.dataUpdatedAt,
    overviewQuery.dataUpdatedAt,
    squadQuery.dataUpdatedAt,
    standingsQuery.dataUpdatedAt,
    statsQuery.dataUpdatedAt,
    transfersQuery.dataUpdatedAt,
    trophiesQuery.dataUpdatedAt,
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
      trophiesQuery.dataUpdatedAt,
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
    trophiesQuery.dataUpdatedAt,
  ]);

  const hasCachedData = hasContextCachedData || activeTabDataUpdatedAt > 0;

  return {
    isValidTeamId: Boolean(safeTeamId),
    teamId,
    team,
    activeTab,
    tabs,
    competitions,
    standingsSeasons,
    selectedLeagueId,
    selectedSeason,
    isContextLoading,
    isContextError,
    hasCachedData,
    lastUpdatedAt,
    isFollowed,
    hasLeagueSelection,
    overviewQuery,
    matchesQuery,
    standingsQuery,
    statsQuery,
    transfersQuery,
    squadQuery,
    trophiesQuery,
    setLeague,
    setLeagueSeason,
    setSeason,
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
