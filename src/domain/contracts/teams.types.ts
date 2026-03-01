export type TeamDetailsTab =
  | 'overview'
  | 'matches'
  | 'standings'
  | 'stats'
  | 'transfers'
  | 'squad'
  | 'trophies';

export type TeamMatchStatus = 'live' | 'upcoming' | 'finished';

export type TeamIdentity = {
  id: string;
  name: string | null;
  logo: string | null;
  country: string | null;
  founded: number | null;
  venueName: string | null;
  venueCity: string | null;
  venueCapacity: number | null;
  venueImage: string | null;
};

export type TeamCompetitionOption = {
  leagueId: string;
  leagueName: string | null;
  leagueLogo: string | null;
  type: string | null;
  country: string | null;
  seasons: number[];
  currentSeason: number | null;
};

export type TeamSelection = {
  leagueId: string | null;
  season: number | null;
};

export type TeamMatchItem = {
  fixtureId: string;
  leagueId: string | null;
  leagueName: string | null;
  leagueLogo: string | null;
  date: string | null;
  round: string | null;
  venue: string | null;
  status: TeamMatchStatus;
  statusLabel: string | null;
  minute: number | null;
  homeTeamId: string | null;
  homeTeamName: string | null;
  homeTeamLogo: string | null;
  awayTeamId: string | null;
  awayTeamName: string | null;
  awayTeamLogo: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
};

export type TeamFormEntry = {
  fixtureId: string;
  result: 'W' | 'D' | 'L' | '';
  score: string | null;
  opponentName: string | null;
  opponentLogo: string | null;
};

export type TeamOverviewSeasonStats = {
  rank: number | null;
  points: number | null;
  played: number | null;
  goalDiff: number | null;
  wins: number | null;
  draws: number | null;
  losses: number | null;
  scored: number | null;
  conceded: number | null;
};

export type TeamOverviewMiniStanding = {
  leagueId: string | null;
  leagueName: string | null;
  leagueLogo: string | null;
  rows: TeamStandingRow[];
};

export type TeamOverviewHistoryPoint = {
  season: number;
  rank: number | null;
};

export type TeamOverviewCoach = {
  id: string | null;
  name: string | null;
  photo: string | null;
  age: number | null;
};

export type TeamOverviewCoachPerformance = {
  coach: TeamOverviewCoach | null;
  winRate: number | null;
  pointsPerMatch: number | null;
  played: number | null;
  wins: number | null;
  draws: number | null;
  losses: number | null;
};

export type TeamSeasonLineup = {
  formation: '4-3-3';
  estimated: boolean;
  goalkeeper: TeamTopPlayer | null;
  defenders: TeamTopPlayer[];
  midfielders: TeamTopPlayer[];
  attackers: TeamTopPlayer[];
};

export type TeamOverviewPlayerLeaders = {
  ratings: TeamTopPlayer[];
  scorers: TeamTopPlayer[];
  assisters: TeamTopPlayer[];
};

export type TeamOverviewData = {
  nextMatch: TeamMatchItem | null;
  recentForm: TeamFormEntry[];
  seasonStats: TeamOverviewSeasonStats;
  seasonLineup: TeamSeasonLineup;
  miniStanding: TeamOverviewMiniStanding | null;
  standingHistory: TeamOverviewHistoryPoint[];
  coachPerformance: TeamOverviewCoachPerformance | null;
  playerLeaders: TeamOverviewPlayerLeaders;
  trophiesCount: number | null;
  trophyWinsCount: number | null;
};

export type TeamMatchesData = {
  all: TeamMatchItem[];
  upcoming: TeamMatchItem[];
  live: TeamMatchItem[];
  past: TeamMatchItem[];
};

export type TeamStandingStats = {
  played: number | null;
  win: number | null;
  draw: number | null;
  lose: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
};

export type TeamStandingRow = {
  rank: number | null;
  teamId: string | null;
  teamName: string | null;
  teamLogo: string | null;
  played: number | null;
  goalDiff: number | null;
  points: number | null;
  isTargetTeam: boolean;
  form: string | null;
  update: string | null;
  all: TeamStandingStats;
  home: TeamStandingStats;
  away: TeamStandingStats;
};

export type TeamStandingGroup = {
  groupName: string | null;
  rows: TeamStandingRow[];
};

export type TeamStandingsData = {
  groups: TeamStandingGroup[];
};

export type TeamGoalBreakdownItem = {
  key: string;
  label: string;
  value: number | null;
};

export type TeamTopPlayer = {
  playerId: string;
  name: string | null;
  photo: string | null;
  teamLogo: string | null;
  position: string | null;
  goals: number | null;
  assists: number | null;
  rating: number | null;
};

export type TeamStatsRecord = {
  played: number | null;
  wins: number | null;
  draws: number | null;
  losses: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  goalDiff: number | null;
  points: number | null;
};

export type TeamTopPlayersByCategory = {
  ratings: TeamTopPlayer[];
  scorers: TeamTopPlayer[];
  assisters: TeamTopPlayer[];
};

export type TeamComparisonMetricKey =
  | 'pointsPerMatch'
  | 'goalsScoredPerMatch'
  | 'goalsConcededPerMatch'
  | 'possession'
  | 'shotsOnTargetPerMatch'
  | 'shotsPerMatch'
  | 'expectedGoalsPerMatch';

export type TeamComparisonLeader = {
  teamId: string;
  teamName: string | null;
  teamLogo: string | null;
  value: number;
};

export type TeamComparisonMetric = {
  key: TeamComparisonMetricKey;
  value: number;
  rank: number;
  totalTeams: number;
  leaders: TeamComparisonLeader[];
};

export type TeamStatsData = {
  rank: number | null;
  points: number | null;
  played: number | null;
  wins: number | null;
  draws: number | null;
  losses: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  homePlayed: number | null;
  homeWins: number | null;
  homeDraws: number | null;
  homeLosses: number | null;
  awayPlayed: number | null;
  awayWins: number | null;
  awayDraws: number | null;
  awayLosses: number | null;
  expectedGoalsFor: number | null;
  pointsByVenue: {
    home: TeamStatsRecord | null;
    away: TeamStatsRecord | null;
  };
  goalsForPerMatch: number | null;
  goalsAgainstPerMatch: number | null;
  cleanSheets: number | null;
  failedToScore: number | null;
  topPlayersByCategory: TeamTopPlayersByCategory;
  comparisonMetrics: TeamComparisonMetric[];
  goalBreakdown: TeamGoalBreakdownItem[];
  topPlayers: TeamTopPlayer[];
};

export type TeamTransferDirection = 'arrival' | 'departure';

export type TeamTransferItem = {
  id: string;
  playerId: string | null;
  playerName: string | null;
  playerPhoto: string | null;
  position: string | null;
  date: string | null;
  type: string | null;
  amount: string | null;
  fromTeamId: string | null;
  fromTeamName: string | null;
  fromTeamLogo: string | null;
  toTeamId: string | null;
  toTeamName: string | null;
  toTeamLogo: string | null;
  direction: TeamTransferDirection;
};

export type TeamTransfersData = {
  arrivals: TeamTransferItem[];
  departures: TeamTransferItem[];
};

export type TeamSquadRole = 'coach' | 'goalkeepers' | 'defenders' | 'midfielders' | 'attackers' | 'other';

export type TeamSquadPlayer = {
  playerId: string;
  name: string | null;
  photo: string | null;
  age: number | null;
  number: number | null;
  position: string | null;
  role: TeamSquadRole;
};

export type TeamCoach = {
  id: string | null;
  name: string | null;
  photo: string | null;
  age: number | null;
};

export type TeamSquadData = {
  coach: TeamCoach | null;
  players: TeamSquadPlayer[];
};

export type TeamTrophyPlacement = {
  place: string;
  count: number;
  seasons: string[];
};

export type TeamTrophyGroup = {
  id: string;
  competition: string | null;
  country: string | null;
  placements: TeamTrophyPlacement[];
};

export type TeamTrophiesData = {
  groups: TeamTrophyGroup[];
  total: number;
  totalWins: number;
};

export type ApiFootballListResponse<T> = {
  response: T[];
  pageInfo?: {
    hasMore: boolean;
    nextCursor: string | null;
    returnedCount: number;
  };
};

export type ApiFootballPagedResponse<T> = {
  response: T[];
  paging?: {
    current?: number;
    total?: number;
  };
  pageInfo?: {
    hasMore: boolean;
    nextCursor: string | null;
    returnedCount: number;
  };
};

export type TeamApiTeamDetailsDto = {
  team?: {
    id?: number;
    name?: string;
    logo?: string;
    country?: string;
    founded?: number;
  };
  venue?: {
    name?: string;
    city?: string;
    capacity?: number;
    image?: string;
  };
};

export type TeamApiLeagueDto = {
  league?: {
    id?: number;
    name?: string;
    type?: string;
    logo?: string;
  };
  country?: {
    name?: string;
  };
  seasons?: Array<{
    year?: number;
    current?: boolean;
  }>;
};

export type TeamApiFixtureDto = {
  fixture?: {
    id?: number;
    date?: string;
    venue?: {
      name?: string | null;
    };
    status?: {
      short?: string;
      long?: string;
      elapsed?: number | null;
    };
  };
  league?: {
    id?: number;
    name?: string;
    logo?: string;
    round?: string;
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
  goals?: {
    home?: number | null;
    away?: number | null;
  };
};

export type TeamApiStandingsDto = {
  league?: {
    standings?: Array<
      Array<{
        rank?: number;
        team?: {
          id?: number;
          name?: string;
          logo?: string;
        };
        points?: number;
        goalsDiff?: number;
        group?: string;
        form?: string;
        all?: {
          played?: number;
          win?: number;
          draw?: number;
          lose?: number;
          goals?: {
            for?: number;
            against?: number;
          };
        };
        home?: {
          played?: number;
          win?: number;
          draw?: number;
          lose?: number;
          goals?: {
            for?: number;
            against?: number;
          };
        };
        away?: {
          played?: number;
          win?: number;
          draw?: number;
          lose?: number;
          goals?: {
            for?: number;
            against?: number;
          };
        };
        update?: string;
      }>
    >;
  };
};

export type TeamApiStatisticsDto = {
  form?: string;
  league?: {
    id?: number;
    name?: string;
    season?: number;
  };
  fixtures?: {
    played?: {
      total?: number;
      home?: number;
      away?: number;
    };
    wins?: {
      total?: number;
      home?: number;
      away?: number;
    };
    draws?: {
      total?: number;
      home?: number;
      away?: number;
    };
    loses?: {
      total?: number;
      home?: number;
      away?: number;
    };
    clean_sheet?: {
      total?: number;
      home?: number;
      away?: number;
    };
    failed_to_score?: {
      total?: number;
      home?: number;
      away?: number;
    };
  };
  goals?: {
    for?: {
      total?: {
        total?: number;
        home?: number;
        away?: number;
      };
      average?: {
        total?: string;
        home?: string;
        away?: string;
      };
      minute?: Record<
        string,
        {
          total?: number | null;
        }
      >;
    };
    against?: {
      total?: {
        total?: number;
        home?: number;
        away?: number;
      };
      average?: {
        total?: string;
        home?: string;
        away?: string;
      };
    };
  };
};

export type TeamAdvancedMetricRankEntryDto = {
  teamId?: number;
  teamName?: string;
  teamLogo?: string;
  value?: number;
};

export type TeamAdvancedMetricDto = {
  value?: number | null;
  rank?: number | null;
  totalTeams?: number;
  leaders?: TeamAdvancedMetricRankEntryDto[];
};

export type TeamAdvancedStatsDto = {
  teamId?: number;
  leagueId?: number;
  season?: number;
  metrics?: {
    possession?: TeamAdvancedMetricDto | null;
    shotsOnTargetPerMatch?: TeamAdvancedMetricDto | null;
    shotsPerMatch?: TeamAdvancedMetricDto | null;
    expectedGoalsPerMatch?: TeamAdvancedMetricDto | null;
  };
};

export type TeamApiPlayerDto = {
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
      id?: number;
      season?: number;
    };
    games?: {
      position?: string;
      rating?: string | null;
      minutes?: number | null;
      appearences?: number | null;
    };
    goals?: {
      total?: number | null;
      assists?: number | null;
    };
  }>;
};

export type TeamApiSquadDto = {
  coach?: {
    id?: number;
    name?: string;
    photo?: string;
    age?: number;
  };
  players?: Array<{
    id?: number;
    name?: string;
    age?: number;
    number?: number;
    position?: string;
    photo?: string;
  }>;
};

export type TeamApiTransferDto = {
  player?: {
    id?: number;
    name?: string;
  };
  transfers?: Array<{
    date?: string;
    type?: string;
    teams?: {
      in?: {
        id?: number;
        name?: string;
        logo?: string;
      };
      out?: {
        id?: number;
        name?: string;
        logo?: string;
      };
    };
  }>;
};

export type TeamApiTrophyDto = {
  league?: string;
  country?: string;
  season?: string;
  place?: string;
};
