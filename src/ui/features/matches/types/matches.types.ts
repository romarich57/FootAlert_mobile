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
    referee?: string | null;
    timezone?: string;
    timestamp?: number;
    status: {
      short: string;
      long: string;
      elapsed: number | null;
    };
    venue: {
      name: string | null;
      city?: string | null;
      capacity?: number | null;
      surface?: string | null;
    };
    weather?: {
      temperature?: number | null;
      feelsLike?: number | null;
      humidity?: number | null;
      windSpeed?: number | null;
      description?: string | null;
      icon?: string | null;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    season?: number;
    round?: string | null;
    type?: string | null;
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
  | 'faceOff';

export type MatchDetailTabDefinition = {
  key: MatchDetailsTabKey;
  label: string;
};

export type MatchPreMatchSectionId =
  | 'winProbability'
  | 'venueWeather'
  | 'competitionMeta'
  | 'recentResults'
  | 'standings'
  | 'leadersComparison';

export type MatchPreMatchWeather = {
  temperature: number | null;
  feelsLike: number | null;
  humidity: number | null;
  windSpeed: number | null;
  description: string | null;
  icon: string | null;
};

export type MatchPreMatchWinProbabilityPayload = {
  homeTeamName: string;
  awayTeamName: string;
  home: string;
  draw: string;
  away: string;
};

export type MatchPreMatchVenueWeatherPayload = {
  venueName: string | null;
  venueCity: string | null;
  capacity: number | null;
  surface: string | null;
  weather: MatchPreMatchWeather | null;
};

export type MatchPreMatchCompetitionMetaPayload = {
  competitionName: string | null;
  competitionType: string | null;
  competitionRound: string | null;
  kickoffDateIso: string | null;
  kickoffDisplay: string | null;
  referee: string | null;
};

export type MatchPreMatchRecentResult = {
  fixtureId: string;
  homeTeamName: string | null;
  homeTeamLogo: string | null;
  awayTeamName: string | null;
  awayTeamLogo: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  score: string | null;
  result: 'W' | 'D' | 'L' | '';
};

export type MatchPreMatchRecentResultsTeam = {
  teamId: string | null;
  teamName: string;
  teamLogo: string | null;
  matches: MatchPreMatchRecentResult[];
};

export type MatchPreMatchRecentResultsPayload = {
  home: MatchPreMatchRecentResultsTeam;
  away: MatchPreMatchRecentResultsTeam;
};

export type MatchPreMatchStandingsRow = {
  teamId: string | null;
  teamName: string | null;
  teamLogo: string | null;
  rank: number | null;
  played: number | null;
  win: number | null;
  draw: number | null;
  lose: number | null;
  goalDiff: number | null;
  points: number | null;
};

export type MatchPreMatchStandingsPayload = {
  competitionName: string | null;
  home: MatchPreMatchStandingsRow;
  away: MatchPreMatchStandingsRow;
};

export type MatchPreMatchLeaderPlayer = {
  playerId: string;
  name: string | null;
  photo: string | null;
  teamLogo: string | null;
  position: string | null;
  goals: number | null;
  assists: number | null;
  rating: number | null;
};

export type MatchPreMatchLeadersTeam = {
  teamId: string | null;
  teamName: string;
  teamLogo: string | null;
  topScorer: MatchPreMatchLeaderPlayer | null;
  topAssister: MatchPreMatchLeaderPlayer | null;
};

export type MatchPreMatchLeadersComparisonPayload = {
  home: MatchPreMatchLeadersTeam;
  away: MatchPreMatchLeadersTeam;
};

export type MatchPreMatchSection =
  | {
    id: 'winProbability';
    order: 1;
    isAvailable: boolean;
    payload: MatchPreMatchWinProbabilityPayload | null;
  }
  | {
    id: 'venueWeather';
    order: 2;
    isAvailable: boolean;
    payload: MatchPreMatchVenueWeatherPayload | null;
  }
  | {
    id: 'competitionMeta';
    order: 3;
    isAvailable: boolean;
    payload: MatchPreMatchCompetitionMetaPayload | null;
  }
  | {
    id: 'recentResults';
    order: 4;
    isAvailable: boolean;
    payload: MatchPreMatchRecentResultsPayload | null;
  }
  | {
    id: 'standings';
    order: 5;
    isAvailable: boolean;
    payload: MatchPreMatchStandingsPayload | null;
  }
  | {
    id: 'leadersComparison';
    order: 6;
    isAvailable: boolean;
    payload: MatchPreMatchLeadersComparisonPayload | null;
  };

export type MatchPreMatchTabViewModel = {
  sectionsOrdered: MatchPreMatchSection[];
  hasAnySection: boolean;
  isLoading: boolean;
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
  photo?: string | null;
  number?: number | null;
  position?: string | null;
  grid?: string | null;
  isCaptain?: boolean | null;
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

export type MatchLineupAbsence = {
  id: string | null;
  name: string;
  photo: string | null;
  reason: string | null;
  status: string | null;
  type: string | null;
};

export type MatchLineupTeam = {
  teamId: string;
  teamName: string;
  teamLogo: string | null;
  formation: string | null;
  coach: string | null;
  coachPhoto?: string | null;
  startingXI: MatchLineupPlayer[];
  substitutes: MatchLineupPlayer[];
  reserves: MatchLineupPlayer[];
  absences: Array<MatchLineupAbsence | string>;
};
