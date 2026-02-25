import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import type { RootStackParamList } from '@ui/app/navigation/types';
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

type TeamDetailsRoute = RouteProp<RootStackParamList, 'TeamDetails'>;
type TeamDetailsNavigation = NativeStackNavigationProp<RootStackParamList>;

function isLeagueCompetition(type: string | null | undefined): boolean {
  return (type ?? '').trim().toLowerCase() === 'league';
}

export function useTeamDetailsScreenModel() {
  const { t } = useTranslation();
  const navigation = useNavigation<TeamDetailsNavigation>();
  const route = useRoute<TeamDetailsRoute>();
  const { teamId } = route.params;

  const [activeTab, setActiveTab] = useState<TeamDetailsTab>('overview');
  const [visitedTabs, setVisitedTabs] = useState<Record<TeamDetailsTab, boolean>>({
    overview: true,
    matches: false,
    standings: false,
    stats: false,
    transfers: false,
    squad: false,
    trophies: false,
  });

  const { followedTeamIds, toggleTeamFollow } = useFollowsActions();
  const isFollowed = followedTeamIds.includes(teamId);

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
    enabled: visitedTabs.overview && hasLeagueSelection,
  });

  const matchesQuery = useTeamMatches({
    teamId,
    leagueId: selectedLeagueId,
    season: selectedSeason,
    timezone,
    enabled: visitedTabs.matches && hasLeagueSelection,
  });

  const standingsQuery = useTeamStandings({
    teamId,
    leagueId: selectedLeagueId,
    season: selectedSeason,
    enabled: visitedTabs.standings && hasLeagueSelection,
  });

  const statsQuery = useTeamStats({
    teamId,
    leagueId: selectedLeagueId,
    season: selectedSeason,
    enabled: visitedTabs.stats && hasLeagueSelection,
  });

  const transfersQuery = useTeamTransfers({
    teamId,
    season: selectedSeason,
    enabled: visitedTabs.transfers,
  });

  const squadQuery = useTeamSquad({
    teamId,
    enabled: visitedTabs.squad,
  });

  const trophiesQuery = useTeamTrophies({
    teamId,
    enabled: visitedTabs.trophies,
  });

  useEffect(() => {
    if (activeTab !== 'standings') {
      return;
    }

    if (!selectedLeagueId || typeof selectedSeason !== 'number') {
      return;
    }

    if (standingsQuery.isLoading || standingsQuery.isError) {
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

    const fallbackSeason = selectedCompetition.seasons
      .slice(currentSeasonIndex + 1)
      .find(season => season !== selectedSeason);

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
    setVisitedTabs(current => ({
      ...current,
      [tab]: true,
    }));
  }, []);

  const handlePressMatch = useCallback(
    (matchId: string) => {
      navigation.navigate('MatchDetails', { matchId });
    },
    [navigation],
  );

  const handlePressTeam = useCallback(
    (nextTeamId: string) => {
      if (!nextTeamId || nextTeamId === teamId) {
        return;
      }

      navigation.push('TeamDetails', { teamId: nextTeamId });
    },
    [navigation, teamId],
  );

  const handlePressPlayer = useCallback(
    (playerId: string) => {
      if (!playerId) {
        return;
      }

      navigation.navigate('PlayerDetails', { playerId });
    },
    [navigation],
  );

  const handleToggleFollow = useCallback(() => {
    toggleTeamFollow(teamId).catch(() => undefined);
  }, [teamId, toggleTeamFollow]);

  const tabs = useMemo(
    () => [
      { key: 'overview' as const, label: t('teamDetails.tabs.overview') },
      { key: 'matches' as const, label: t('teamDetails.tabs.matches') },
      { key: 'standings' as const, label: t('teamDetails.tabs.standings') },
      { key: 'stats' as const, label: t('teamDetails.tabs.stats') },
      { key: 'transfers' as const, label: t('teamDetails.tabs.transfers') },
      { key: 'squad' as const, label: t('teamDetails.tabs.squad') },
      { key: 'trophies' as const, label: t('teamDetails.tabs.trophies') },
    ],
    [t],
  );

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
    onBack: () => navigation.goBack(),
  };
}
