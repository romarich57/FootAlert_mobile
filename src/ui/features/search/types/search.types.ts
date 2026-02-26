import type {
  FollowsSearchResultPlayer,
  FollowsSearchResultTeam,
} from '@ui/features/follows/types/follows.types';

export type SearchEntityTab = 'teams' | 'players';

export type SearchTeamResult = FollowsSearchResultTeam;

export type SearchPlayerResult = FollowsSearchResultPlayer;

export type SearchResult = SearchTeamResult | SearchPlayerResult;
