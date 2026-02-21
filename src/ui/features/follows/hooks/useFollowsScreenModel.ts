import { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@ui/app/navigation/types';
import { useFollowedPlayersCards } from '@ui/features/follows/hooks/useFollowedPlayersCards';
import { useFollowedTeamsCards } from '@ui/features/follows/hooks/useFollowedTeamsCards';
import { useFollowsActions } from '@ui/features/follows/hooks/useFollowsActions';
import { useFollowsTrends } from '@ui/features/follows/hooks/useFollowsTrends';
import type {
  FollowEntityTab,
  TrendPlayerItem,
  TrendTeamItem,
} from '@ui/features/follows/types/follows.types';

export function useFollowsScreenModel() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedTab, setSelectedTab] = useState<FollowEntityTab>('teams');
  const [isEditMode, setIsEditMode] = useState(false);

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

  const handleOpenSearch = useCallback(() => {
    navigation.navigate('FollowsSearch', {
      initialTab: selectedTab,
    });
  }, [navigation, selectedTab]);

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
      navigation.navigate('PlayerDetails', { playerId });
    },
    [navigation],
  );

  const handleOpenTeamDetails = useCallback(
    (nextTeamId: string) => {
      if (!nextTeamId) {
        return;
      }

      navigation.navigate('TeamDetails', { teamId: nextTeamId });
    },
    [navigation],
  );

  const trendsItems = useMemo(() => {
    return trendsQuery.data ?? [];
  }, [trendsQuery.data]);

  const isSectionLoading =
    isLoading ||
    (selectedTab === 'teams' ? teamCardsQuery.isLoading : playerCardsQuery.isLoading);

  return {
    selectedTab,
    setSelectedTab,
    isEditMode,
    setIsEditMode,
    followedTeamIds,
    followedPlayerIds,
    hideTrendsCurrentTab,
    isLoading,
    isSectionLoading,
    lastToggleError,
    teamCards: teamCardsQuery.data ?? [],
    playerCards: playerCardsQuery.data ?? [],
    trendsItems,
    handleOpenSearch,
    handleToggleTeam,
    handleTogglePlayer,
    handleOpenPlayerDetails,
    handleOpenTeamDetails,
    updateHideTrends,
    asTeamTrends: trendsItems as TrendTeamItem[],
    asPlayerTrends: trendsItems as TrendPlayerItem[],
  };
}
