import { useCallback, useMemo, useState } from 'react';
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
    setSeason,
    isLoading: isContextLoading,
    isError: isContextError,
    refetch: refetchContext,
  } = useTeamContext({ teamId });

  const hasLeagueSelection = Boolean(selectedLeagueId) && typeof selectedSeason === 'number';

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

  return {
    teamId,
    team,
    activeTab,
    tabs,
    competitions,
    selectedLeagueId,
    selectedSeason,
    isContextLoading,
    isContextError,
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
