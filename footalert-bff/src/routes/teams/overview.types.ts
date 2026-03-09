// Définitions de types pour l'overview d'équipe

export type TeamMatchStatus = 'upcoming' | 'live' | 'finished';

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

export type TeamOverviewCoreResponse = {
  nextMatch: TeamMatchItem | null;
  recentForm: TeamFormEntry[];
  seasonStats: TeamOverviewSeasonStats;
  miniStanding: {
    leagueId: string | null;
    leagueName: string | null;
    leagueLogo: string | null;
    rows: TeamStandingRow[];
  } | null;
  standingHistory: Array<{
    season: number;
    rank: number | null;
  }>;
  coachPerformance: TeamOverviewCoachPerformance | null;
  trophiesCount: number | null;
  trophyWinsCount: number | null;
};

export type TeamOverviewLeadersResponse = {
  seasonLineup: TeamSeasonLineup;
  playerLeaders: TeamOverviewPlayerLeaders;
  sourceUpdatedAt: string | null;
};

// DTOs bruts retournés par API-Football

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

export type TeamApiStandingsPayload = {
  league?: {
    id?: number;
    name?: string;
    logo?: string;
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
  league?: {
    id?: number;
    name?: string;
  };
  fixtures?: {
    played?: {
      total?: number;
    };
    wins?: {
      total?: number;
    };
    draws?: {
      total?: number;
    };
    loses?: {
      total?: number;
    };
  };
  goals?: {
    for?: {
      total?: {
        total?: number;
      };
    };
    against?: {
      total?: {
        total?: number;
      };
    };
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

export type TeamApiPlayersEnvelope = {
  response?: TeamApiPlayerDto[];
  paging?: {
    current?: number;
    total?: number;
  };
};

export type TeamCoachDto = {
  id?: number | string;
  name?: string;
  photo?: string;
  age?: number;
  career?: Array<{
    team?: {
      id?: number;
    };
    end?: string | null;
  }>;
};

export type TeamApiTrophyDto = {
  place?: string;
};

export type WarnLogger = {
  warn: (obj: unknown, msg?: string) => void;
};

export type FetchOverviewParams = {
  teamId: string;
  leagueId: string;
  season: number;
  timezone: string;
  historySeasons?: number[];
  logger: WarnLogger;
};

export type FetchOverviewLeadersParams = {
  teamId: string;
  leagueId: string;
  season: number;
};

export type PlayerLineCategory = 'goalkeeper' | 'defender' | 'midfielder' | 'attacker' | 'other';
