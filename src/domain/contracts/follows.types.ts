export type FollowEntityTab = 'teams' | 'players';
export type FollowEntityKind = 'team' | 'player';
export type FollowEventAction = 'follow' | 'unfollow';
export type FollowEventSource =
  | 'follows_trending'
  | 'follows_search'
  | 'onboarding_trending'
  | 'onboarding_search'
  | 'team_details'
  | 'player_details'
  | 'search_tab';
export type FollowEventState = 'followed' | 'unfollowed';
export type FollowDiscoverySource = 'dynamic' | 'legacy_fill' | 'hybrid';

export type FollowTeamSnapshot = {
  teamName: string;
  teamLogo: string;
  country?: string | null;
};

export type FollowPlayerSnapshot = {
  playerName: string;
  playerPhoto: string;
  position?: string | null;
  teamName?: string | null;
  teamLogo?: string | null;
  leagueName?: string | null;
};

export type FollowEventPayload =
  | {
      entityKind: 'team';
      entityId: string;
      action: FollowEventAction;
      source: FollowEventSource;
      occurredAt?: string;
      entitySnapshot?: FollowTeamSnapshot;
    }
  | {
      entityKind: 'player';
      entityId: string;
      action: FollowEventAction;
      source: FollowEventSource;
      occurredAt?: string;
      entitySnapshot?: FollowPlayerSnapshot;
    };

export type FollowEventResponse = {
  status: 'accepted';
  applied: boolean;
  state: FollowEventState;
};

export type FollowDiscoveryTeamItem = {
  teamId: string;
  teamName: string;
  teamLogo: string;
  country: string;
  activeFollowersCount: number;
  recentNet30d: number;
  totalFollowAdds: number;
};

export type FollowDiscoveryPlayerItem = {
  playerId: string;
  playerName: string;
  playerPhoto: string;
  position: string;
  teamName: string;
  teamLogo: string;
  leagueName: string;
  activeFollowersCount: number;
  recentNet30d: number;
  totalFollowAdds: number;
};

export type FollowDiscoveryResponse<T> = {
  items: T[];
  meta: {
    source: FollowDiscoverySource;
  };
};

export type TeamNextMatch = {
  fixtureId: string;
  opponentTeamName: string;
  opponentTeamLogo: string;
  startDate: string;
};

export type FollowedTeamCard = {
  teamId: string;
  teamName: string;
  teamLogo: string;
  nextMatch: TeamNextMatch | null;
};

export type FollowedPlayerCard = {
  playerId: string;
  playerName: string;
  playerPhoto: string;
  position: string;
  teamName: string;
  teamLogo: string;
  leagueName: string;
  goals: number | null;
  assists: number | null;
};

export type TrendTeamItem = {
  teamId: string;
  teamName: string;
  teamLogo: string;
  leagueName: string;
};

export type TrendPlayerItem = {
  playerId: string;
  playerName: string;
  playerPhoto: string;
  position: string;
  teamName: string;
  teamLogo: string;
};

export type FollowsSearchResultTeam = {
  teamId: string;
  teamName: string;
  teamLogo: string;
  country: string;
};

export type FollowsSearchResultPlayer = {
  playerId: string;
  playerName: string;
  playerPhoto: string;
  position: string;
  teamName: string;
  teamLogo: string;
  leagueName: string;
};

export type FollowsSearchResults = {
  teams: FollowsSearchResultTeam[];
  players: FollowsSearchResultPlayer[];
};

export type CachedWithFetchedAt<T> = {
  fetchedAt: string;
  items: T[];
};

export type CachedTeamCards = {
  fetchedAt: string;
  cards: FollowedTeamCard[];
};

export type CachedPlayerCards = {
  fetchedAt: string;
  cards: FollowedPlayerCard[];
};

export type FollowsApiTeamSearchDto = {
  team?: {
    id?: number;
    name?: string;
    logo?: string;
    country?: string;
  };
};

export type FollowsApiTeamDetailsDto = {
  team?: {
    id?: number;
    name?: string;
    logo?: string;
    country?: string;
  };
};

export type FollowsApiPlayerSearchDto = {
  player?: {
    id?: number;
    name?: string;
    photo?: string;
  };
  statistics?: Array<{
    team?: {
      name?: string;
      logo?: string;
    };
    league?: {
      name?: string;
      season?: number;
    };
    games?: {
      position?: string;
      minutes?: number;
      appearences?: number;
    };
    goals?: {
      total?: number | null;
    };
  }>;
};

export type FollowsApiFixtureDto = {
  fixture?: {
    id?: number;
    date?: string;
  };
  teams?: {
    home?: {
      id?: number;
      name?: string;
      logo?: string;
    };
    away?: {
      id?: number;
      name?: string;
      logo?: string;
    };
  };
};

export type FollowsApiPlayerSeasonDto = {
  player?: {
    id?: number;
    name?: string;
    photo?: string;
  };
  statistics?: Array<{
    team?: {
      id?: number;
      name?: string;
      logo?: string;
    };
    league?: {
      name?: string;
      season?: number;
    };
    games?: {
      position?: string;
      minutes?: number;
      appearences?: number;
    };
    goals?: {
      total?: number | null;
      assists?: number | null;
    };
  }>;
};

export type FollowsApiStandingDto = {
  league?: {
    name?: string;
    standings?: Array<
      Array<{
        team?: {
          id?: number;
          name?: string;
          logo?: string;
        };
      }>
    >;
  };
};

export type FollowsApiTopScorerDto = {
  player?: {
    id?: number;
    name?: string;
    photo?: string;
  };
  statistics?: Array<{
    team?: {
      name?: string;
      logo?: string;
    };
    league?: {
      season?: number;
    };
    games?: {
      position?: string;
      minutes?: number;
      appearences?: number;
    };
    goals?: {
      total?: number | null;
    };
  }>;
};

export type FollowsApiResponse<T> = {
  response: T[];
};
