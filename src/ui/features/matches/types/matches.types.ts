export type MatchStatus = 'live' | 'upcoming' | 'finished';

export type MatchStatusFilter = 'all' | MatchStatus;

export type MatchNotificationPrefs = {
  goal: boolean;
  redCard: boolean;
  start: boolean;
  end: boolean;
};

export type MatchItem = {
  fixtureId: string;
  competitionId: string;
  competitionName: string;
  competitionLogo: string;
  competitionCountry: string;
  startDate: string;
  minute: number | null;
  venue: string;
  status: MatchStatus;
  statusLabel: string;
  homeTeamId: string;
  homeTeamName: string;
  homeTeamLogo: string;
  awayTeamId: string;
  awayTeamName: string;
  awayTeamLogo: string;
  homeGoals: number | null;
  awayGoals: number | null;
  hasBroadcast: boolean;
};

export type CompetitionSection = {
  id: string;
  name: string;
  logo: string;
  country: string;
  isFollowSection?: boolean;
  isTopCompetition?: boolean;
  matches: MatchItem[];
  weight?: number;
};

export type ApiFootballFixtureDto = {
  fixture: {
    id: number;
    date: string;
    status: {
      short: string;
      long: string;
      elapsed: number | null;
    };
    venue: {
      name: string | null;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
    };
    away: {
      id: number;
      name: string;
      logo: string;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
};

export type ApiFootballResponse<T> = {
  get: string;
  parameters: Record<string, string>;
  errors: Record<string, string>;
  results: number;
  response: T[];
};

export type MatchesQueryResult = {
  sections: CompetitionSection[];
  requestDurationMs: number;
  fetchedAt: string;
  hasLiveMatches: boolean;
};
