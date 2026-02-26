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
      city?: string | null;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    season?: number;
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
  score?: {
    halftime?: {
      home?: number | null;
      away?: number | null;
    };
    fulltime?: {
      home?: number | null;
      away?: number | null;
    };
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

export type MatchLifecycleState = 'pre_match' | 'live' | 'finished';

export type MatchDetailsTabKey =
  | 'primary'
  | 'timeline'
  | 'lineups'
  | 'standings'
  | 'stats'
  | 'h2h';

export type MatchDetailTabDefinition = {
  key: MatchDetailsTabKey;
  label: string;
};

export type MatchOverviewStat = {
  label: string;
  homeValue: string;
  awayValue: string;
  highlight?: 'home' | 'away' | null;
};

export type MatchTimelineItem = {
  id: string;
  minute: string;
  type: string;
  detail: string;
  team: 'home' | 'away' | 'neutral';
  isNew?: boolean;
};

export type MatchLineupPlayer = {
  id: string;
  name: string;
  number?: number | null;
  position?: string | null;
  rating?: number | null;
  goals?: number | null;
  assists?: number | null;
  yellowCards?: number | null;
  redCards?: number | null;
  inMinute?: number | null;
  outMinute?: number | null;
  penaltyScored?: number | null;
  penaltyMissed?: number | null;
  statusTag?: string | null;
};

export type MatchLineupTeam = {
  teamId: string;
  teamName: string;
  teamLogo: string | null;
  formation: string | null;
  coach: string | null;
  startingXI: MatchLineupPlayer[];
  substitutes: MatchLineupPlayer[];
  reserves: MatchLineupPlayer[];
  absences: string[];
};

export type MatchH2HSummary = {
  homeWins: number;
  draws: number;
  awayWins: number;
  total: number;
};
