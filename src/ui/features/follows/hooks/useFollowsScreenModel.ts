import { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@ui/app/navigation/types';
import { safeNavigateEntity } from '@ui/app/navigation/routeParams';
import { useFollowedPlayersCards } from '@ui/features/follows/hooks/useFollowedPlayersCards';
import { useFollowedTeamsCards } from '@ui/features/follows/hooks/useFollowedTeamsCards';
import { useFollowsActions } from '@ui/features/follows/hooks/useFollowsActions';
import { useFollowsSearch } from '@ui/features/follows/hooks/useFollowsSearch';
import { useFollowsTrends } from '@ui/features/follows/hooks/useFollowsTrends';
import type {
  FollowEntityTab,
  FollowsSearchResultPlayer,
  FollowsSearchResultTeam,
  TrendPlayerItem,
  TrendTeamItem,
} from '@ui/features/follows/types/follows.types';

export function useFollowsScreenModel() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedTab, setSelectedTab] = useState<FollowEntityTab>('teams');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const {
    followedTeamIds,
    followedPlayerIds,
    hideTrendsTeams,
    hideTrendsPlayers,
    isLoading,
    lastToggleError,
    clearToggleError,
    toggleTeamFollow,
    togglePlayerFollow,
    updateHideTrends,
  } = useFollowsActions();

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris',
    [],
  );

  const teamCardsQuery = useFollowedTeamsCards({
    teamIds: followedTeamIds,
    timezone,
  });

  const playerCardsQuery = useFollowedPlayersCards({
    playerIds: followedPlayerIds,
  });

  const hideTrendsCurrentTab = selectedTab === 'teams' ? hideTrendsTeams : hideTrendsPlayers;

  const trendsQuery = useFollowsTrends({
    tab: selectedTab,
    hidden: hideTrendsCurrentTab,
  });

  const trendsItems = useMemo(() => {
    return trendsQuery.data ?? [];
  }, [trendsQuery.data]);

  const asTeamTrends = trendsItems as TrendTeamItem[];
  const asPlayerTrends = trendsItems as TrendPlayerItem[];

  const localTeams = useMemo(() => {
    const list: FollowsSearchResultTeam[] = [];
    teamCardsQuery.data?.forEach(t =>
      list.push({ teamId: t.teamId, teamName: t.teamName, teamLogo: t.teamLogo, country: '' }),
    );
    asTeamTrends.forEach(t =>
      list.push({ teamId: t.teamId, teamName: t.teamName, teamLogo: t.teamLogo, country: t.leagueName }),
    );
    return list;
  }, [teamCardsQuery.data, asTeamTrends]);

  const localPlayers = useMemo(() => {
    const list: FollowsSearchResultPlayer[] = [];
    playerCardsQuery.data?.forEach(p =>
      list.push({
        playerId: p.playerId,
        playerName: p.playerName,
        playerPhoto: p.playerPhoto,
        position: p.position,
        teamName: p.teamName,
        teamLogo: p.teamLogo,
        leagueName: p.leagueName,
      }),
    );
    asPlayerTrends.forEach(p =>
      list.push({
        playerId: p.playerId,
        playerName: p.playerName,
        playerPhoto: p.playerPhoto,
        position: p.position,
        teamName: p.teamName,
        teamLogo: p.teamLogo,
        leagueName: '',
      }),
    );
    return list;
  }, [playerCardsQuery.data, asPlayerTrends]);

  const search = useFollowsSearch({
    tab: selectedTab,
    query: searchQuery,
    localTeams,
    localPlayers,
  });

  const lastUpdatedAt = useMemo(() => {
    const maxUpdatedAt = Math.max(
      teamCardsQuery.dataUpdatedAt,
      playerCardsQuery.dataUpdatedAt,
      trendsQuery.dataUpdatedAt,
      search.dataUpdatedAt,
    );
    return maxUpdatedAt > 0 ? maxUpdatedAt : null;
  }, [
    playerCardsQuery.dataUpdatedAt,
    search.dataUpdatedAt,
    teamCardsQuery.dataUpdatedAt,
    trendsQuery.dataUpdatedAt,
  ]);

  const toggleSearchVisibility = useCallback(() => {
    setIsSearchVisible(prev => {
      if (prev) {
        setSearchQuery('');
      }
      return !prev;
    });
  }, []);

  const handleToggleTeam = useCallback(
    (teamId: string) => {
      clearToggleError();
      toggleTeamFollow(teamId).catch(() => undefined);
    },
    [clearToggleError, toggleTeamFollow],
  );

  const handleTogglePlayer = useCallback(
    (playerId: string) => {
      clearToggleError();
      togglePlayerFollow(playerId).catch(() => undefined);
    },
    [clearToggleError, togglePlayerFollow],
  );

  const handleOpenPlayerDetails = useCallback(
    (playerId: string) => {
      safeNavigateEntity(navigation, 'PlayerDetails', playerId);
    },
    [navigation],
  );

  const handleOpenTeamDetails = useCallback(
    (nextTeamId: string) => {
      safeNavigateEntity(navigation, 'TeamDetails', nextTeamId);
    },
    [navigation],
  );


  return {
    selectedTab,
    setSelectedTab,
    searchQuery,
    setSearchQuery,
    isSearchVisible,
    toggleSearchVisibility,
    search,
    followedTeamIds,
    followedPlayerIds,
    hideTrendsCurrentTab,
    isLoading,
    isSectionLoading:
      isLoading ||
      (selectedTab === 'teams' ? teamCardsQuery.isLoading : playerCardsQuery.isLoading),
    lastToggleError,
    teamCards: teamCardsQuery.data ?? [],
    playerCards: playerCardsQuery.data ?? [],
    trendsItems,
    handleToggleTeam,
    handleTogglePlayer,
    handleOpenPlayerDetails,
    handleOpenTeamDetails,
    updateHideTrends,
    asTeamTrends,
    asPlayerTrends,
    lastUpdatedAt,
  };
}
