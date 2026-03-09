export type ApiFootballListResponse<T> = {
  response?: T[];
};

export type PlayerStatDto = {
  team?: {
    id?: number;
    name?: string;
    logo?: string;
  };
  league?: {
    id?: number;
    name?: string;
    country?: string;
    logo?: string;
    season?: number;
  };
  games?: {
    appearences?: number;
    lineups?: number;
    minutes?: number;
    number?: number | null;
    position?: string;
    rating?: string | null;
  };
  shots?: {
    total?: number;
    on?: number;
  };
  goals?: {
    total?: number;
    conceded?: number;
    assists?: number;
    saves?: number;
  };
  passes?: {
    total?: number;
    key?: number;
    accuracy?: number;
  };
  tackles?: {
    total?: number;
    blocks?: number;
    interceptions?: number;
  };
  duels?: {
    total?: number;
    won?: number;
  };
  dribbles?: {
    attempts?: number;
    success?: number;
    past?: number;
  };
  fouls?: {
    drawn?: number;
    committed?: number;
  };
  cards?: {
    yellow?: number;
    red?: number;
  };
  penalty?: {
    scored?: number;
    missed?: number;
    won?: number;
    commited?: number;
  };
};

export type PlayerDetailsDto = {
  player?: {
    id?: number;
    name?: string;
    age?: number;
    birth?: {
      date?: string;
    };
    nationality?: string;
    height?: string;
    weight?: string;
    photo?: string;
  };
  statistics?: PlayerStatDto[];
};

export type PlayerTrophyDto = {
  league?: string;
  country?: string | null;
  season?: string | null;
  place?: string | null;
};

export type PlayerSeasonStats = {
  matches: number | null;
  starts: number | null;
  minutes: number | null;
  goals: number | null;
  assists: number | null;
  rating: string | null;
  shots: number | null;
  shotsOnTarget: number | null;
  penaltyGoals: number | null;
  passes: number | null;
  passesAccuracy: number | null;
  keyPasses: number | null;
  dribblesAttempts: number | null;
  dribblesSuccess: number | null;
  tackles: number | null;
  interceptions: number | null;
  blocks: number | null;
  duelsTotal: number | null;
  duelsWon: number | null;
  foulsCommitted: number | null;
  foulsDrawn: number | null;
  yellowCards: number | null;
  redCards: number | null;
  dribblesBeaten: number | null;
  saves: number | null;
  goalsConceded: number | null;
  penaltiesWon: number | null;
  penaltiesMissed: number | null;
  penaltiesCommitted: number | null;
};

export type PlayerCompetitionSeasonStats = {
  leagueId: string | null;
  leagueName: string | null;
  leagueLogo: string | null;
  season: number | null;
  stats: PlayerSeasonStats;
};

export type PlayerSeasonStatsDataset = {
  overall: PlayerSeasonStats;
  byCompetition: PlayerCompetitionSeasonStats[];
};

export type PlayerProfileCompetitionStats = {
  leagueId: string | null;
  leagueName: string | null;
  leagueLogo: string | null;
  season: number | null;
  matches: number | null;
  goals: number | null;
  assists: number | null;
  rating: string | null;
};

export type PlayerProfile = {
  id: string | null;
  name: string | null;
  photo: string | null;
  position: string | null;
  age: number | null;
  height: string | null;
  weight: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  number: number | null;
  foot: string | null;
  transferValue: string | null;
  team: {
    id: string | null;
    name: string | null;
    logo: string | null;
  };
  league: {
    id: string | null;
    name: string | null;
    logo: string | null;
    season: number | null;
  };
};

export type PlayerCharacteristics = {
  touches: number | null;
  dribbles: number | null;
  chances: number | null;
  defense: number | null;
  duels: number | null;
  attack: number | null;
};

export type PlayerPositionPoint = {
  id: string;
  code: string;
  shortLabel: string;
  label: string;
  x: number;
  y: number;
  appearances: number | null;
  minutes: number | null;
  score: number;
  isPrimary: boolean;
};

export type PlayerPositionsData = {
  primary: PlayerPositionPoint | null;
  others: PlayerPositionPoint[];
  all: PlayerPositionPoint[];
};

export type PlayerTrophyEntry = {
  competition: string;
  country: string | null;
  season: string | null;
  seasonYear: number | null;
};

export type PlayerTrophyCompetitionGroup = {
  competition: string;
  country: string | null;
  count: number;
  seasons: string[];
};

export type PlayerTrophyClubGroup = {
  clubId: string | null;
  clubName: string | null;
  clubLogo: string | null;
  total: number;
  competitions: PlayerTrophyCompetitionGroup[];
};

export type PlayerOverviewPayload = {
  profile: PlayerProfile | null;
  characteristics: PlayerCharacteristics | null;
  positions: PlayerPositionsData | null;
  seasonStats: PlayerSeasonStats | null;
  seasonStatsDataset: PlayerSeasonStatsDataset | null;
  profileCompetitionStats: PlayerProfileCompetitionStats | null;
  trophiesByClub: PlayerTrophyClubGroup[];
};

export type PlayerStatsCatalogCompetition = {
  leagueId: string | null;
  leagueName: string | null;
  leagueLogo: string | null;
  type: string | null;
  country: string | null;
  seasons: number[];
  currentSeason: number | null;
};

export type PlayerStatsCatalogSelection = {
  leagueId: string | null;
  season: number | null;
};

export type PlayerStatsCatalogPayload = {
  competitions: PlayerStatsCatalogCompetition[];
  defaultSelection: PlayerStatsCatalogSelection;
  availableSeasons: number[];
};

export type PlayerAggregateFetchOptions = {
  onUpstreamRequest?: () => void;
};

export const PLAYER_DETAILS_TTL_MS = 60_000;
export const PLAYER_OVERVIEW_TTL_MS = 60_000;
export const PLAYER_STATS_CATALOG_TTL_MS = 10 * 60_000;
export const PLAYER_DETAILS_MAX_CONCURRENCY = 4;

export type PositionDefinition = {
  id: string;
  code: string;
  shortLabel: string;
  x: number;
  y: number;
};

export const POSITION_DEFINITIONS: Record<string, PositionDefinition> = {
  gk: { id: 'gk', code: 'GK', shortLabel: 'GK', x: 50, y: 90 },
  lb: { id: 'lb', code: 'LB', shortLabel: 'DG', x: 18, y: 74 },
  rb: { id: 'rb', code: 'RB', shortLabel: 'DD', x: 82, y: 74 },
  cb: { id: 'cb', code: 'CB', shortLabel: 'DC', x: 50, y: 76 },
  lwb: { id: 'lwb', code: 'LWB', shortLabel: 'PG', x: 14, y: 58 },
  rwb: { id: 'rwb', code: 'RWB', shortLabel: 'PD', x: 86, y: 58 },
  dm: { id: 'dm', code: 'DM', shortLabel: 'MDC', x: 50, y: 62 },
  cm: { id: 'cm', code: 'CM', shortLabel: 'MC', x: 50, y: 50 },
  am: { id: 'am', code: 'AM', shortLabel: 'MOC', x: 50, y: 36 },
  lm: { id: 'lm', code: 'LM', shortLabel: 'MG', x: 24, y: 44 },
  rm: { id: 'rm', code: 'RM', shortLabel: 'MD', x: 76, y: 44 },
  lw: { id: 'lw', code: 'LW', shortLabel: 'AG', x: 20, y: 26 },
  rw: { id: 'rw', code: 'RW', shortLabel: 'AD', x: 80, y: 26 },
  st: { id: 'st', code: 'ST', shortLabel: 'BU', x: 50, y: 16 },
  att: { id: 'att', code: 'ATT', shortLabel: 'ATT', x: 50, y: 12 },
};

export const POSITION_LOOKUP: Record<string, string> = {
  gk: 'gk',
  goalkeeper: 'gk',
  gardien: 'gk',
  keeper: 'gk',
  portier: 'gk',
  df: 'cb',
  defender: 'cb',
  defenseur: 'cb',
  defenceur: 'cb',
  defense: 'cb',
  defence: 'cb',
  cb: 'cb',
  centerback: 'cb',
  centreback: 'cb',
  centraldefender: 'cb',
  lb: 'lb',
  leftback: 'lb',
  arrieregauche: 'lb',
  rb: 'rb',
  rightback: 'rb',
  arrieredroit: 'rb',
  lwb: 'lwb',
  rwb: 'rwb',
  wingback: 'lwb',
  piston: 'lwb',
  mf: 'cm',
  midfielder: 'cm',
  milieu: 'cm',
  dm: 'dm',
  cdm: 'dm',
  defensivemidfielder: 'dm',
  milieudefensif: 'dm',
  am: 'am',
  cam: 'am',
  attackingmidfielder: 'am',
  milieuoffensif: 'am',
  cm: 'cm',
  centralmidfielder: 'cm',
  milieucentral: 'cm',
  lm: 'lm',
  leftmidfielder: 'lm',
  milieugauche: 'lm',
  rm: 'rm',
  rightmidfielder: 'rm',
  milieudroit: 'rm',
  lw: 'lw',
  leftwing: 'lw',
  leftwinger: 'lw',
  ailiergauche: 'lw',
  rw: 'rw',
  rightwing: 'rw',
  rightwinger: 'rw',
  ailierdroit: 'rw',
  st: 'st',
  striker: 'st',
  buteur: 'st',
  cf: 'st',
  centerforward: 'st',
  centreforward: 'st',
  avantcentre: 'st',
  fw: 'att',
  fwd: 'att',
  forward: 'att',
  attacker: 'att',
  attaquant: 'att',
  att: 'att',
};
