import { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueries, useQueryClient } from '@tanstack/react-query';

import type { RootStackParamList } from '@ui/app/navigation/types';
import { safeNavigateEntity } from '@ui/app/navigation/routeParams';
import { fetchPlayerAvailabilitySnapshot } from '@ui/features/players/hooks/usePlayerAvailability';
import { fetchTeamAvailabilitySnapshot } from '@ui/features/teams/hooks/useTeamAvailability';
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
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

type FollowAvailabilityStatus = {
  disabled: boolean;
  reason?: 'checking' | 'missing';
  isCheckingAvailability: boolean;
};

export function useFollowsScreenModel() {
  const queryClient = useQueryClient();
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
  const currentSeason = useMemo(() => {
    const currentDate = new Date();
    return currentDate.getUTCMonth() + 1 >= 7
      ? currentDate.getUTCFullYear()
      : currentDate.getUTCFullYear() - 1;
  }, []);

  const teamCardsQuery = useFollowedTeamsCards({
    teamIds: followedTeamIds,
    timezone,
  });

  const playerCardsQuery = useFollowedPlayersCards({
    playerIds: followedPlayerIds,
  });
  const teamCards = useMemo(() => teamCardsQuery.data ?? [], [teamCardsQuery.data]);
  const playerCards = useMemo(() => playerCardsQuery.data ?? [], [playerCardsQuery.data]);

  const teamAvailabilityQueries = useQueries({
    queries: teamCards.map(card => ({
      queryKey: queryKeys.teams.availability(card.teamId, null, currentSeason),
      enabled: Boolean(card.teamId),
      staleTime: featureQueryOptions.teams.availability.staleTime,
      retry: featureQueryOptions.teams.availability.retry,
      queryFn: () =>
        fetchTeamAvailabilitySnapshot({
          queryClient,
          teamId: card.teamId,
          leagueId: null,
          season: currentSeason,
          timezone,
          concurrency: 2,
        }),
    })),
  });
  const playerAvailabilityQueries = useQueries({
    queries: playerCards.map(card => ({
      queryKey: queryKeys.players.availability(card.playerId, currentSeason),
      enabled: Boolean(card.playerId),
      staleTime: featureQueryOptions.players.availability.staleTime,
      retry: featureQueryOptions.players.availability.retry,
      queryFn: () =>
        fetchPlayerAvailabilitySnapshot({
          queryClient,
          playerId: card.playerId,
          season: currentSeason,
          concurrency: 2,
        }),
    })),
  });

  const teamAvailabilityById = useMemo(() => {
    const map = new Map<string, FollowAvailabilityStatus>();

    teamCards.forEach((card, index) => {
      const query = teamAvailabilityQueries[index];
      const isCheckingAvailability = Boolean(
        !query || query.isLoading || query.isFetching || !query.data,
      );
      const isMissing = Boolean(query?.data && query.data.state === 'missing' && !query.data.hasAnyTab);
      map.set(card.teamId, {
        disabled: isCheckingAvailability || isMissing,
        isCheckingAvailability,
        reason: isCheckingAvailability
          ? 'checking'
          : isMissing
            ? 'missing'
            : undefined,
      });
    });

    return map;
  }, [teamAvailabilityQueries, teamCards]);

  const playerAvailabilityById = useMemo(() => {
    const map = new Map<string, FollowAvailabilityStatus>();

    playerCards.forEach((card, index) => {
      const query = playerAvailabilityQueries[index];
      const isCheckingAvailability = Boolean(
        !query || query.isLoading || query.isFetching || !query.data,
      );
      const isMissing = Boolean(query?.data && query.data.state === 'missing' && !query.data.hasAnyTab);
      map.set(card.playerId, {
        disabled: isCheckingAvailability || isMissing,
        isCheckingAvailability,
        reason: isCheckingAvailability
          ? 'checking'
          : isMissing
            ? 'missing'
            : undefined,
      });
    });

    return map;
  }, [playerAvailabilityQueries, playerCards]);

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
    teamCards.forEach(t =>
      list.push({ teamId: t.teamId, teamName: t.teamName, teamLogo: t.teamLogo, country: '' }),
    );
    asTeamTrends.forEach(t =>
      list.push({ teamId: t.teamId, teamName: t.teamName, teamLogo: t.teamLogo, country: t.leagueName }),
    );
    return list;
  }, [asTeamTrends, teamCards]);

  const localPlayers = useMemo(() => {
    const list: FollowsSearchResultPlayer[] = [];
    playerCards.forEach(p =>
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
  }, [asPlayerTrends, playerCards]);

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
      const availabilityStatus = playerAvailabilityById.get(playerId);
      if (availabilityStatus?.disabled) {
        return;
      }
      safeNavigateEntity(navigation, 'PlayerDetails', playerId);
    },
    [navigation, playerAvailabilityById],
  );

  const handleOpenTeamDetails = useCallback(
    (nextTeamId: string) => {
      const availabilityStatus = teamAvailabilityById.get(nextTeamId);
      if (availabilityStatus?.disabled) {
        return;
      }
      safeNavigateEntity(navigation, 'TeamDetails', nextTeamId);
    },
    [navigation, teamAvailabilityById],
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
    teamCards,
    playerCards,
    teamAvailabilityById,
    playerAvailabilityById,
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
