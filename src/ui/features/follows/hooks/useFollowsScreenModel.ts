import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@ui/app/navigation/types';
import { safeNavigateEntity } from '@ui/app/navigation/routeParams';
import { useFollowedPlayersCards } from '@ui/features/follows/hooks/useFollowedPlayersCards';
import { useFollowedTeamsCards } from '@ui/features/follows/hooks/useFollowedTeamsCards';
import { useFollowsActions } from '@ui/features/follows/hooks/useFollowsActions';
import { useFollowsDiscovery } from '@ui/features/follows/hooks/useFollowsDiscovery';
import { useFollowsSearch } from '@ui/features/follows/hooks/useFollowsSearch';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';
import type {
  FollowDiscoveryPlayerItem,
  FollowDiscoveryTeamItem,
  FollowEntityTab,
  FollowsSearchResultPlayer,
  FollowsSearchResultTeam,
  FollowPlayerSnapshot,
  FollowTeamSnapshot,
  TrendPlayerItem,
  TrendTeamItem,
} from '@ui/features/follows/types/follows.types';

export function useFollowsScreenModel() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedTab, setSelectedTab] = useState<FollowEntityTab>('teams');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const requestCountTelemetryKeyRef = useRef<string | null>(null);

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
  const isTeamsTabSelected = selectedTab === 'teams';

  const teamCardsQuery = useFollowedTeamsCards({
    teamIds: followedTeamIds,
    timezone,
    enabled: isTeamsTabSelected,
  });

  const playerCardsQuery = useFollowedPlayersCards({
    playerIds: followedPlayerIds,
    enabled: !isTeamsTabSelected,
  });

  const hideTrendsCurrentTab = selectedTab === 'teams' ? hideTrendsTeams : hideTrendsPlayers;

  const discoveryQuery = useFollowsDiscovery({
    tab: selectedTab,
    hidden: hideTrendsCurrentTab,
  });

  const trendsItems = useMemo(() => {
    const discoveryItems = discoveryQuery.data?.items ?? [];
    if (selectedTab === 'teams') {
      return (discoveryItems as FollowDiscoveryTeamItem[]).map<TrendTeamItem>(item => ({
        teamId: item.teamId,
        teamName: item.teamName,
        teamLogo: item.teamLogo,
        leagueName: item.country,
      }));
    }

    return (discoveryItems as FollowDiscoveryPlayerItem[]).map<TrendPlayerItem>(item => ({
      playerId: item.playerId,
      playerName: item.playerName,
      playerPhoto: item.playerPhoto,
      position: item.position,
      teamName: item.teamName,
      teamLogo: item.teamLogo,
    }));
  }, [discoveryQuery.data?.items, selectedTab]);

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

  const teamSnapshotsById = useMemo(() => {
    const snapshots = new Map<string, FollowTeamSnapshot>();
    teamCardsQuery.data?.forEach(item => {
      snapshots.set(item.teamId, {
        teamName: item.teamName,
        teamLogo: item.teamLogo,
        country: null,
      });
    });
    (discoveryQuery.data?.items as FollowDiscoveryTeamItem[] | undefined)?.forEach(item => {
      snapshots.set(item.teamId, {
        teamName: item.teamName,
        teamLogo: item.teamLogo,
        country: item.country,
      });
    });
    return snapshots;
  }, [discoveryQuery.data?.items, teamCardsQuery.data]);

  const playerSnapshotsById = useMemo(() => {
    const snapshots = new Map<string, FollowPlayerSnapshot>();
    playerCardsQuery.data?.forEach(item => {
      snapshots.set(item.playerId, {
        playerName: item.playerName,
        playerPhoto: item.playerPhoto,
        position: item.position,
        teamName: item.teamName,
        teamLogo: item.teamLogo,
        leagueName: item.leagueName,
      });
    });
    (discoveryQuery.data?.items as FollowDiscoveryPlayerItem[] | undefined)?.forEach(item => {
      snapshots.set(item.playerId, {
        playerName: item.playerName,
        playerPhoto: item.playerPhoto,
        position: item.position,
        teamName: item.teamName,
        teamLogo: item.teamLogo,
        leagueName: item.leagueName,
      });
    });
    return snapshots;
  }, [discoveryQuery.data?.items, playerCardsQuery.data]);

  const search = useFollowsSearch({
    tab: selectedTab,
    query: searchQuery,
    localTeams,
    localPlayers,
  });

  const activeRequestCount = useMemo(() => {
    const cardsQueryCount = 1;
    const trendsQueryCount = 1;
    const remoteSearchQueryCount = search.hasEnoughChars ? 1 : 0;
    return cardsQueryCount + trendsQueryCount + remoteSearchQueryCount;
  }, [search.hasEnoughChars]);

  useEffect(() => {
    const telemetryKey = `${selectedTab}|${search.debouncedQuery}|${activeRequestCount}`;
    if (requestCountTelemetryKeyRef.current === telemetryKey) {
      return;
    }
    requestCountTelemetryKeyRef.current = telemetryKey;

    getMobileTelemetry().trackEvent('follows_screen.request_count', {
      selectedTab,
      queryCount: activeRequestCount,
      hasSearch: search.hasEnoughChars,
    });
  }, [activeRequestCount, search.debouncedQuery, search.hasEnoughChars, selectedTab]);

  const lastUpdatedAt = useMemo(() => {
    const maxUpdatedAt = Math.max(
      teamCardsQuery.dataUpdatedAt,
      playerCardsQuery.dataUpdatedAt,
      discoveryQuery.dataUpdatedAt,
      search.dataUpdatedAt,
    );
    return maxUpdatedAt > 0 ? maxUpdatedAt : null;
  }, [
    playerCardsQuery.dataUpdatedAt,
    search.dataUpdatedAt,
    teamCardsQuery.dataUpdatedAt,
    discoveryQuery.dataUpdatedAt,
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
      toggleTeamFollow(teamId, {
        source: search.hasEnoughChars ? 'follows_search' : 'follows_trending',
        snapshot: teamSnapshotsById.get(teamId),
      }).catch(() => undefined);
    },
    [clearToggleError, search.hasEnoughChars, teamSnapshotsById, toggleTeamFollow],
  );

  const handleTogglePlayer = useCallback(
    (playerId: string) => {
      clearToggleError();
      togglePlayerFollow(playerId, {
        source: search.hasEnoughChars ? 'follows_search' : 'follows_trending',
        snapshot: playerSnapshotsById.get(playerId),
      }).catch(() => undefined);
    },
    [clearToggleError, playerSnapshotsById, search.hasEnoughChars, togglePlayerFollow],
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
      (selectedTab === 'teams' ? teamCardsQuery.isLoading : playerCardsQuery.isLoading) ||
      (!search.hasEnoughChars &&
        !hideTrendsCurrentTab &&
        discoveryQuery.isLoading &&
        !discoveryQuery.data),
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
    discoverySource: discoveryQuery.data?.meta.source ?? null,
    lastUpdatedAt,
  };
}
