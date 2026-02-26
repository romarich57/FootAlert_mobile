import { useCallback, useEffect, useMemo, useState } from 'react';
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
import type { TeamDetailsTab } from '@ui/features/teams/types/teams.types';
import { useFollowsActions } from '@ui/features/follows/hooks/useFollowsActions';
import { firstAvailableTab, hasAnyPresentValue, type TabAvailability } from '@ui/shared/availability';

type TeamDetailsRoute = RouteProp<RootStackParamList, 'TeamDetails'>;
type TeamDetailsNavigation = NativeStackNavigationProp<RootStackParamList>;

function isLeagueCompetition(type: string | null | undefined): boolean {
  return (type ?? '').trim().toLowerCase() === 'league';
}

export function useTeamDetailsScreenModel() {
  const { t } = useTranslation();
  const navigation = useNavigation<TeamDetailsNavigation>();
  const route = useRoute<TeamDetailsRoute>();
  const safeTeamId = sanitizeNumericEntityId(route.params.teamId);
  const teamId = safeTeamId ?? '';

  const [activeTab, setActiveTab] = useState<TeamDetailsTab>(
    route.params.initialTab ?? 'overview',
  );

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
  const tabAvailability = useMemo<Array<TabAvailability<TeamDetailsTab>>>(() => {
    const hasOverviewData = hasAnyPresentValue(overviewQuery.data as Record<string, unknown> | null);
    const hasMatchesData = (matchesQuery.data?.all ?? []).length > 0;
    const hasStandingsData = (standingsQuery.data?.groups ?? []).some(group => group.rows.length > 0);
    const hasStatsData = hasAnyPresentValue(statsQuery.data as Record<string, unknown> | null);
    const hasTransfersData =
      (transfersQuery.data?.arrivals ?? []).length > 0 ||
      (transfersQuery.data?.departures ?? []).length > 0;
    const hasSquadData =
      (squadQuery.data?.players ?? []).length > 0 ||
      hasAnyPresentValue(squadQuery.data?.coach as Record<string, unknown> | null);
    const hasTrophiesData = (trophiesQuery.data?.groups ?? []).some(group => group.placements.length > 0);

    const resolveState = (
      hasData: boolean,
      isError: boolean,
      data: unknown,
    ): 'available' | 'missing' | 'unknown' => {
      if (hasData) {
        return 'available';
      }
      if (isError && !data) {
        return 'unknown';
      }
      return 'missing';
    };

    return [
      {
        key: 'overview',
        state: resolveState(hasOverviewData, overviewQuery.isError, overviewQuery.data),
      },
      {
        key: 'matches',
        state: resolveState(hasMatchesData, matchesQuery.isError, matchesQuery.data),
      },
      {
        key: 'standings',
        state: resolveState(hasStandingsData, standingsQuery.isError, standingsQuery.data),
      },
      {
        key: 'stats',
        state: resolveState(hasStatsData, statsQuery.isError, statsQuery.data),
      },
      {
        key: 'transfers',
        state: resolveState(hasTransfersData, transfersQuery.isError, transfersQuery.data),
      },
      {
        key: 'squad',
        state: resolveState(hasSquadData, squadQuery.isError, squadQuery.data),
      },
      {
        key: 'trophies',
        state: resolveState(hasTrophiesData, trophiesQuery.isError, trophiesQuery.data),
      },
    ];
  }, [
    matchesQuery.data,
    matchesQuery.isError,
    overviewQuery.data,
    overviewQuery.isError,
    squadQuery.data,
    squadQuery.isError,
    standingsQuery.data,
    standingsQuery.isError,
    statsQuery.data,
    statsQuery.isError,
    transfersQuery.data,
    transfersQuery.isError,
    trophiesQuery.data,
    trophiesQuery.isError,
  ]);

  const availableTabs = useMemo(
    () => tabAvailability.filter(tab => tab.state !== 'missing').map(tab => tab.key),
    [tabAvailability],
  );

  useEffect(() => {
    const nextActiveTab = firstAvailableTab(tabAvailability, activeTab);
    if (nextActiveTab && nextActiveTab !== activeTab) {
      setActiveTab(nextActiveTab);
    }
  }, [activeTab, tabAvailability]);

  const tabs = useMemo(
    () =>
      availableTabs.map(tabKey => ({
        key: tabKey,
        label: t(`teamDetails.tabs.${tabKey}`),
      })),
    [availableTabs, t],
  );

  const hasAnyAvailableTab = useMemo(
    () => tabAvailability.some(tab => tab.state === 'available'),
    [tabAvailability],
  );

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
  const hasCachedData =
    hasContextCachedData ||
    [
      overviewQuery.dataUpdatedAt,
      matchesQuery.dataUpdatedAt,
      standingsQuery.dataUpdatedAt,
      statsQuery.dataUpdatedAt,
      transfersQuery.dataUpdatedAt,
      squadQuery.dataUpdatedAt,
      trophiesQuery.dataUpdatedAt,
    ].some(updatedAt => updatedAt > 0);

  return {
    isValidTeamId: Boolean(safeTeamId),
    teamId,
    team,
    activeTab,
    tabs,
    availableTabs,
    hasAnyAvailableTab,
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
    onBack: () => navigation.goBack(),
  };
}
