import type {
  FollowsSearchResultPlayer,
  FollowsSearchResultTeam,
  TrendPlayerItem,
  TrendTeamItem,
} from '@ui/features/follows/types/follows.types';

export type FollowsFeedItem =
  | {
    type: 'trend-team';
    key: string;
    item: TrendTeamItem;
  }
  | {
    type: 'trend-player';
    key: string;
    item: TrendPlayerItem;
  }
  | {
    type: 'search-team';
    key: string;
    item: FollowsSearchResultTeam;
  }
  | {
    type: 'search-player';
    key: string;
    item: FollowsSearchResultPlayer;
  }
  | {
    type: 'empty';
    key: string;
    message: string;
  };

type BuildFeedItemsInput = {
  selectedTab: 'teams' | 'players';
  hideTrends: boolean;
  isDiscoveryLoading: boolean;
  teamTrends: TrendTeamItem[];
  playerTrends: TrendPlayerItem[];
  emptyMessage: string;
  search: {
    hasEnoughChars: boolean;
    isLoading: boolean;
    results: Array<FollowsSearchResultTeam | FollowsSearchResultPlayer>;
  };
};

export function buildFollowsFeedItems({
  selectedTab,
  hideTrends,
  isDiscoveryLoading,
  teamTrends,
  playerTrends,
  emptyMessage,
  search,
}: BuildFeedItemsInput): FollowsFeedItem[] {
  if (search.hasEnoughChars) {
    if (selectedTab === 'teams') {
      const results = search.results as FollowsSearchResultTeam[];
      if (results.length === 0 && !search.isLoading) {
        return [{ type: 'empty', key: 'empty-search-teams', message: emptyMessage }];
      }
      return results.map(item => ({
        type: 'search-team',
        key: `search-team-${item.teamId}`,
        item,
      }));
    }

    const results = search.results as FollowsSearchResultPlayer[];
    if (results.length === 0 && !search.isLoading) {
      return [{ type: 'empty', key: 'empty-search-players', message: emptyMessage }];
    }
    return results.map(item => ({
      type: 'search-player',
      key: `search-player-${item.playerId}`,
      item,
    }));
  }

  if (hideTrends) {
    return [];
  }

  if (selectedTab === 'teams') {
    if (isDiscoveryLoading && teamTrends.length === 0) {
      return [];
    }

    if (teamTrends.length === 0) {
      return [{ type: 'empty', key: 'empty-teams', message: emptyMessage }];
    }

    return teamTrends.map(item => ({
      type: 'trend-team',
      key: `trend-team-${item.teamId}`,
      item,
    }));
  }

  if (isDiscoveryLoading && playerTrends.length === 0) {
    return [];
  }

  if (playerTrends.length === 0) {
    return [{ type: 'empty', key: 'empty-players', message: emptyMessage }];
  }

  return playerTrends.map(item => ({
    type: 'trend-player',
    key: `trend-player-${item.playerId}`,
    item,
  }));
}
