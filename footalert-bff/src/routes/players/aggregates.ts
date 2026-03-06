import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { buildCanonicalCacheKey, withCache } from '../../lib/cache.js';
import { mapWithConcurrency } from '../../lib/concurrency/mapWithConcurrency.js';

import { mapCareerSeasons, type PlayerCareerSeasonAggregate } from './careerMapper.js';

type ApiFootballListResponse<T> = {
  response?: T[];
};

type PlayerStatDto = {
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

type PlayerDetailsDto = {
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

type PlayerTrophyDto = {
  league?: string;
  country?: string | null;
  season?: string | null;
  place?: string | null;
};

type PlayerSeasonStats = {
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

type PlayerCompetitionSeasonStats = {
  leagueId: string | null;
  leagueName: string | null;
  leagueLogo: string | null;
  season: number | null;
  stats: PlayerSeasonStats;
};

type PlayerSeasonStatsDataset = {
  overall: PlayerSeasonStats;
  byCompetition: PlayerCompetitionSeasonStats[];
};

type PlayerProfileCompetitionStats = {
  leagueId: string | null;
  leagueName: string | null;
  leagueLogo: string | null;
  season: number | null;
  matches: number | null;
  goals: number | null;
  assists: number | null;
  rating: string | null;
};

type PlayerProfile = {
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

type PlayerCharacteristics = {
  touches: number | null;
  dribbles: number | null;
  chances: number | null;
  defense: number | null;
  duels: number | null;
  attack: number | null;
};

type PlayerPositionPoint = {
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

type PlayerPositionsData = {
  primary: PlayerPositionPoint | null;
  others: PlayerPositionPoint[];
  all: PlayerPositionPoint[];
};

type PlayerTrophyEntry = {
  competition: string;
  country: string | null;
  season: string | null;
  seasonYear: number | null;
};

type PlayerTrophyCompetitionGroup = {
  competition: string;
  country: string | null;
  count: number;
  seasons: string[];
};

type PlayerTrophyClubGroup = {
  clubId: string | null;
  clubName: string | null;
  clubLogo: string | null;
  total: number;
  competitions: PlayerTrophyCompetitionGroup[];
};

type PlayerOverviewPayload = {
  profile: PlayerProfile | null;
  characteristics: PlayerCharacteristics | null;
  positions: PlayerPositionsData | null;
  seasonStats: PlayerSeasonStats | null;
  seasonStatsDataset: PlayerSeasonStatsDataset | null;
  profileCompetitionStats: PlayerProfileCompetitionStats | null;
  trophiesByClub: PlayerTrophyClubGroup[];
};

type PlayerStatsCatalogCompetition = {
  leagueId: string | null;
  leagueName: string | null;
  leagueLogo: string | null;
  type: string | null;
  country: string | null;
  seasons: number[];
  currentSeason: number | null;
};

type PlayerStatsCatalogSelection = {
  leagueId: string | null;
  season: number | null;
};

type PlayerStatsCatalogPayload = {
  competitions: PlayerStatsCatalogCompetition[];
  defaultSelection: PlayerStatsCatalogSelection;
  availableSeasons: number[];
};

type PlayerAggregateFetchOptions = {
  onUpstreamRequest?: () => void;
};

const PLAYER_DETAILS_TTL_MS = 60_000;
const PLAYER_OVERVIEW_TTL_MS = 60_000;
const PLAYER_STATS_CATALOG_TTL_MS = 10 * 60_000;
const PLAYER_DETAILS_MAX_CONCURRENCY = 4;

type PositionDefinition = {
  id: string;
  code: string;
  shortLabel: string;
  x: number;
  y: number;
};

const POSITION_DEFINITIONS: Record<string, PositionDefinition> = {
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

const POSITION_LOOKUP: Record<string, string> = {
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

function normalizeString(value: string | undefined | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNumber(value: number | undefined | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeRating(
  value: string | number | undefined | null,
  precision = 2,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed.toFixed(precision);
}

function toId(value: number | string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function sumOrNull(first: number | null, second: number | null): number | null {
  if (first === null && second === null) {
    return null;
  }

  return (first ?? 0) + (second ?? 0);
}

function resolvePrimaryStatistic(
  statistics: PlayerDetailsDto['statistics'],
  season?: number,
): PlayerStatDto | null {
  if (!statistics || statistics.length === 0) {
    return null;
  }

  const seasonScoped =
    typeof season === 'number'
      ? statistics.filter(item => item.league?.season === season)
      : statistics;
  const candidates = seasonScoped.length > 0 ? seasonScoped : statistics;

  return (
    [...candidates].sort((first, second) => {
      const firstMinutes = first.games?.minutes ?? 0;
      const secondMinutes = second.games?.minutes ?? 0;
      if (secondMinutes !== firstMinutes) {
        return secondMinutes - firstMinutes;
      }

      const firstAppearances = first.games?.appearences ?? 0;
      const secondAppearances = second.games?.appearences ?? 0;
      if (secondAppearances !== firstAppearances) {
        return secondAppearances - firstAppearances;
      }

      return (second.goals?.total ?? 0) - (first.goals?.total ?? 0);
    })[0] ?? null
  );
}

function resolveSeasonStatistics(
  statistics: PlayerDetailsDto['statistics'],
  season?: number,
): PlayerStatDto[] {
  if (!statistics || statistics.length === 0) {
    return [];
  }

  const seasonScoped =
    typeof season === 'number'
      ? statistics.filter(item => item.league?.season === season)
      : statistics;

  return seasonScoped.length > 0 ? seasonScoped : statistics;
}

function createEmptySeasonStats(): PlayerSeasonStats {
  return {
    matches: null,
    starts: null,
    minutes: null,
    goals: null,
    assists: null,
    rating: null,
    shots: null,
    shotsOnTarget: null,
    penaltyGoals: null,
    passes: null,
    passesAccuracy: null,
    keyPasses: null,
    dribblesAttempts: null,
    dribblesSuccess: null,
    tackles: null,
    interceptions: null,
    blocks: null,
    duelsTotal: null,
    duelsWon: null,
    foulsCommitted: null,
    foulsDrawn: null,
    yellowCards: null,
    redCards: null,
    dribblesBeaten: null,
    saves: null,
    goalsConceded: null,
    penaltiesWon: null,
    penaltiesMissed: null,
    penaltiesCommitted: null,
  };
}

function aggregateSeasonStats(statsRows: PlayerStatDto[]): PlayerSeasonStats {
  if (statsRows.length === 0) {
    return createEmptySeasonStats();
  }

  let matches: number | null = null;
  let starts: number | null = null;
  let minutes: number | null = null;
  let goals: number | null = null;
  let assists: number | null = null;
  let shots: number | null = null;
  let shotsOnTarget: number | null = null;
  let penaltyGoals: number | null = null;
  let passes: number | null = null;
  let keyPasses: number | null = null;
  let dribblesAttempts: number | null = null;
  let dribblesSuccess: number | null = null;
  let tackles: number | null = null;
  let interceptions: number | null = null;
  let blocks: number | null = null;
  let duelsTotal: number | null = null;
  let duelsWon: number | null = null;
  let foulsCommitted: number | null = null;
  let foulsDrawn: number | null = null;
  let yellowCards: number | null = null;
  let redCards: number | null = null;
  let dribblesBeaten: number | null = null;
  let savesTotal: number | null = null;
  let goalsConceded: number | null = null;
  let penaltiesWon: number | null = null;
  let penaltiesMissed: number | null = null;
  let penaltiesCommitted: number | null = null;
  let ratingWeightedSum = 0;
  let ratingWeight = 0;
  let passesAccuracyWeightedSum = 0;
  let passesAccuracyWeight = 0;

  statsRows.forEach(stat => {
    const appearances = normalizeNumber(stat.games?.appearences);
    const lineups = normalizeNumber(stat.games?.lineups);
    const playedMinutes = normalizeNumber(stat.games?.minutes);
    const goalsValue = normalizeNumber(stat.goals?.total);
    const assistsValue = normalizeNumber(stat.goals?.assists);
    const shotsValue = normalizeNumber(stat.shots?.total);
    const shotsOnTargetValue = normalizeNumber(stat.shots?.on);
    const passesValue = normalizeNumber(stat.passes?.total);
    const keyPassesValue = normalizeNumber(stat.passes?.key);
    const tacklesValue = normalizeNumber(stat.tackles?.total);
    const interceptionsValue = normalizeNumber(stat.tackles?.interceptions);
    const blocksValue = normalizeNumber(stat.tackles?.blocks);
    const duelsTotalValue = normalizeNumber(stat.duels?.total);
    const duelsWonValue = normalizeNumber(stat.duels?.won);
    const dribblesAttemptsValue = normalizeNumber(stat.dribbles?.attempts);
    const dribblesSuccessValue = normalizeNumber(stat.dribbles?.success);
    const dribblesBeatenValue = normalizeNumber(stat.dribbles?.past);
    const foulsCommittedValue = normalizeNumber(stat.fouls?.committed);
    const foulsDrawnValue = normalizeNumber(stat.fouls?.drawn);
    const yellowCardsValue = normalizeNumber(stat.cards?.yellow);
    const redCardsValue = normalizeNumber(stat.cards?.red);
    const savesValue = normalizeNumber(stat.goals?.saves);
    const goalsConcededValue = normalizeNumber(stat.goals?.conceded);
    const penaltiesWonValue = normalizeNumber(stat.penalty?.won);
    const penaltiesMissedValue = normalizeNumber(stat.penalty?.missed);
    const penaltiesCommittedValue = normalizeNumber(stat.penalty?.commited);
    const penaltyGoalsValue = normalizeNumber(stat.penalty?.scored);

    matches = sumOrNull(matches, appearances);
    starts = sumOrNull(starts, lineups);
    minutes = sumOrNull(minutes, playedMinutes);
    goals = sumOrNull(goals, goalsValue);
    assists = sumOrNull(assists, assistsValue);
    shots = sumOrNull(shots, shotsValue);
    shotsOnTarget = sumOrNull(shotsOnTarget, shotsOnTargetValue);
    penaltyGoals = sumOrNull(penaltyGoals, penaltyGoalsValue);
    passes = sumOrNull(passes, passesValue);
    keyPasses = sumOrNull(keyPasses, keyPassesValue);
    dribblesAttempts = sumOrNull(dribblesAttempts, dribblesAttemptsValue);
    dribblesSuccess = sumOrNull(dribblesSuccess, dribblesSuccessValue);
    tackles = sumOrNull(tackles, tacklesValue);
    interceptions = sumOrNull(interceptions, interceptionsValue);
    blocks = sumOrNull(blocks, blocksValue);
    duelsTotal = sumOrNull(duelsTotal, duelsTotalValue);
    duelsWon = sumOrNull(duelsWon, duelsWonValue);
    foulsCommitted = sumOrNull(foulsCommitted, foulsCommittedValue);
    foulsDrawn = sumOrNull(foulsDrawn, foulsDrawnValue);
    yellowCards = sumOrNull(yellowCards, yellowCardsValue);
    redCards = sumOrNull(redCards, redCardsValue);
    dribblesBeaten = sumOrNull(dribblesBeaten, dribblesBeatenValue);
    savesTotal = sumOrNull(savesTotal, savesValue);
    goalsConceded = sumOrNull(goalsConceded, goalsConcededValue);
    penaltiesWon = sumOrNull(penaltiesWon, penaltiesWonValue);
    penaltiesMissed = sumOrNull(penaltiesMissed, penaltiesMissedValue);
    penaltiesCommitted = sumOrNull(penaltiesCommitted, penaltiesCommittedValue);

    const ratingValue = toFiniteNumber(stat.games?.rating);
    if (ratingValue !== null) {
      const weight = playedMinutes ?? appearances ?? 1;
      if (weight > 0) {
        ratingWeightedSum += ratingValue * weight;
        ratingWeight += weight;
      }
    }

    const passesAccuracyValue = toFiniteNumber(stat.passes?.accuracy);
    if (passesAccuracyValue !== null) {
      const weight = passesValue ?? playedMinutes ?? appearances ?? 1;
      if (weight > 0) {
        passesAccuracyWeightedSum += passesAccuracyValue * weight;
        passesAccuracyWeight += weight;
      }
    }
  });

  return {
    matches,
    starts,
    minutes,
    goals,
    assists,
    rating: ratingWeight > 0 ? normalizeRating(ratingWeightedSum / ratingWeight, 2) : null,
    shots,
    shotsOnTarget,
    penaltyGoals,
    passes,
    passesAccuracy:
      passesAccuracyWeight > 0
        ? Number((passesAccuracyWeightedSum / passesAccuracyWeight).toFixed(2))
        : null,
    keyPasses,
    dribblesAttempts,
    dribblesSuccess,
    tackles,
    interceptions,
    blocks,
    duelsTotal,
    duelsWon,
    foulsCommitted,
    foulsDrawn,
    yellowCards,
    redCards,
    dribblesBeaten,
    saves: savesTotal,
    goalsConceded,
    penaltiesWon,
    penaltiesMissed,
    penaltiesCommitted,
  };
}

type CompetitionGroup = {
  leagueId: string | null;
  leagueName: string | null;
  leagueLogo: string | null;
  season: number | null;
  statsRows: PlayerStatDto[];
};

function groupStatsByCompetition(statsRows: PlayerStatDto[]): CompetitionGroup[] {
  const groups = new Map<string, CompetitionGroup>();

  statsRows.forEach((stat, index) => {
    const leagueId = toId(stat.league?.id);
    const leagueName = normalizeString(stat.league?.name);
    const leagueLogo = normalizeString(stat.league?.logo);
    const leagueSeason = normalizeNumber(stat.league?.season);
    const fallbackKey = `competition-${index}`;
    const key = `${leagueId ?? leagueName ?? fallbackKey}-${leagueSeason ?? 'unknown'}`;

    const existing = groups.get(key);
    if (existing) {
      existing.statsRows.push(stat);
      if (!existing.leagueName && leagueName) {
        existing.leagueName = leagueName;
      }
      if (!existing.leagueLogo && leagueLogo) {
        existing.leagueLogo = leagueLogo;
      }
      if (existing.season === null && leagueSeason !== null) {
        existing.season = leagueSeason;
      }
      return;
    }

    groups.set(key, {
      leagueId,
      leagueName,
      leagueLogo,
      season: leagueSeason,
      statsRows: [stat],
    });
  });

  return Array.from(groups.values());
}

function compareCompetitionStats(
  first: PlayerCompetitionSeasonStats,
  second: PlayerCompetitionSeasonStats,
): number {
  const firstSeason = first.season ?? Number.NEGATIVE_INFINITY;
  const secondSeason = second.season ?? Number.NEGATIVE_INFINITY;
  if (secondSeason !== firstSeason) {
    return secondSeason - firstSeason;
  }

  const firstMatches = first.stats.matches ?? Number.NEGATIVE_INFINITY;
  const secondMatches = second.stats.matches ?? Number.NEGATIVE_INFINITY;
  if (secondMatches !== firstMatches) {
    return secondMatches - firstMatches;
  }

  return (first.leagueName ?? '').localeCompare(second.leagueName ?? '');
}

function mapPlayerDetailsToSeasonStatsDataset(
  dto: PlayerDetailsDto,
  season?: number,
): PlayerSeasonStatsDataset {
  const statsRows = resolveSeasonStatistics(dto.statistics, season);
  const overall = aggregateSeasonStats(statsRows);

  if (statsRows.length === 0) {
    return {
      overall,
      byCompetition: [],
    };
  }

  const byCompetition = groupStatsByCompetition(statsRows)
    .map<PlayerCompetitionSeasonStats>(group => ({
      leagueId: group.leagueId,
      leagueName: group.leagueName,
      leagueLogo: group.leagueLogo,
      season: group.season,
      stats: aggregateSeasonStats(group.statsRows),
    }))
    .filter(item => (item.stats.matches ?? 0) > 0)
    .sort(compareCompetitionStats);

  return {
    overall,
    byCompetition,
  };
}

function mapPlayerDetailsToProfile(
  dto: PlayerDetailsDto,
  season?: number,
): PlayerProfile | null {
  if (!dto.player) {
    return null;
  }

  const profile = dto.player;
  const statistic = resolvePrimaryStatistic(dto.statistics, season);

  return {
    id: toId(profile.id),
    name: normalizeString(profile.name),
    photo: normalizeString(profile.photo),
    position: normalizeString(statistic?.games?.position),
    age: normalizeNumber(profile.age),
    height: normalizeString(profile.height),
    weight: normalizeString(profile.weight),
    nationality: normalizeString(profile.nationality),
    dateOfBirth: normalizeString(profile.birth?.date),
    number: statistic?.games?.number ?? null,
    foot: null,
    transferValue: null,
    team: {
      id: toId(statistic?.team?.id),
      name: normalizeString(statistic?.team?.name),
      logo: normalizeString(statistic?.team?.logo),
    },
    league: {
      id: toId(statistic?.league?.id),
      name: normalizeString(statistic?.league?.name),
      logo: normalizeString(statistic?.league?.logo),
      season: normalizeNumber(statistic?.league?.season),
    },
  };
}

function mapPlayerDetailsToCharacteristics(
  dto: PlayerDetailsDto,
  season?: number,
): PlayerCharacteristics {
  const statistic = resolvePrimaryStatistic(dto.statistics, season);
  if (!statistic) {
    return {
      touches: null,
      dribbles: null,
      chances: null,
      defense: null,
      duels: null,
      attack: null,
    };
  }

  const touches = sumOrNull(
    normalizeNumber(statistic.passes?.total),
    normalizeNumber(statistic.dribbles?.attempts),
  );
  const dribbles = normalizeNumber(statistic.dribbles?.success);
  const chances = normalizeNumber(statistic.passes?.key);
  const defense = sumOrNull(
    normalizeNumber(statistic.tackles?.total),
    normalizeNumber(statistic.tackles?.interceptions),
  );
  const duels = normalizeNumber(statistic.duels?.won);
  const attack = sumOrNull(
    normalizeNumber(statistic.goals?.total),
    normalizeNumber(statistic.shots?.on),
  );

  return { touches, dribbles, chances, defense, duels, attack };
}

type PositionAccumulator = {
  definition: PositionDefinition;
  label: string;
  labelScore: number;
  appearances: number | null;
  minutes: number | null;
  score: number;
};

function createEmptyPositionsData(): PlayerPositionsData {
  return {
    primary: null,
    others: [],
    all: [],
  };
}

function normalizePositionToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function resolvePositionDefinition(rawPosition: string): PositionDefinition | null {
  const normalized = normalizePositionToken(rawPosition);
  const mappedKey = POSITION_LOOKUP[normalized];
  if (mappedKey && POSITION_DEFINITIONS[mappedKey]) {
    return POSITION_DEFINITIONS[mappedKey];
  }

  if (normalized.includes('leftwing')) return POSITION_DEFINITIONS.lw;
  if (normalized.includes('rightwing')) return POSITION_DEFINITIONS.rw;
  if (normalized.includes('wingback')) {
    if (normalized.startsWith('r')) return POSITION_DEFINITIONS.rwb;
    return POSITION_DEFINITIONS.lwb;
  }
  if (normalized.includes('midfielder')) return POSITION_DEFINITIONS.cm;
  if (normalized.includes('defender') || normalized.includes('defence')) return POSITION_DEFINITIONS.cb;
  if (normalized.includes('striker') || normalized.includes('forward')) return POSITION_DEFINITIONS.st;
  if (normalized.includes('attacker') || normalized.includes('attaquant')) return POSITION_DEFINITIONS.att;

  return null;
}

function comparePositionPoints(first: PlayerPositionPoint, second: PlayerPositionPoint): number {
  if (second.score !== first.score) {
    return second.score - first.score;
  }

  const firstAppearances = first.appearances ?? Number.NEGATIVE_INFINITY;
  const secondAppearances = second.appearances ?? Number.NEGATIVE_INFINITY;
  if (secondAppearances !== firstAppearances) {
    return secondAppearances - firstAppearances;
  }

  const firstMinutes = first.minutes ?? Number.NEGATIVE_INFINITY;
  const secondMinutes = second.minutes ?? Number.NEGATIVE_INFINITY;
  if (secondMinutes !== firstMinutes) {
    return secondMinutes - firstMinutes;
  }

  return first.label.localeCompare(second.label);
}

function mapPlayerDetailsToPositions(
  dto: PlayerDetailsDto,
  season?: number,
): PlayerPositionsData {
  const statsRows = resolveSeasonStatistics(dto.statistics, season);
  if (statsRows.length === 0) {
    return createEmptyPositionsData();
  }

  const accumulators = new Map<string, PositionAccumulator>();

  statsRows.forEach(statRow => {
    const rawPosition = normalizeString(statRow.games?.position);
    if (!rawPosition) {
      return;
    }

    const definition = resolvePositionDefinition(rawPosition);
    if (!definition) {
      return;
    }

    const appearances = normalizeNumber(statRow.games?.appearences);
    const minutes = normalizeNumber(statRow.games?.minutes);
    const rowScore = (appearances ?? 0) * 1000 + (minutes ?? 0);
    const current = accumulators.get(definition.id);

    if (!current) {
      accumulators.set(definition.id, {
        definition,
        label: rawPosition,
        labelScore: rowScore,
        appearances,
        minutes,
        score: rowScore,
      });
      return;
    }

    current.appearances = sumOrNull(current.appearances, appearances);
    current.minutes = sumOrNull(current.minutes, minutes);
    current.score += rowScore;

    if (rowScore > current.labelScore && rawPosition) {
      current.label = rawPosition;
      current.labelScore = rowScore;
    }
  });

  const all = Array.from(accumulators.values())
    .map<PlayerPositionPoint>(item => ({
      id: item.definition.id,
      code: item.definition.code,
      shortLabel: item.definition.shortLabel,
      label: item.label,
      x: item.definition.x,
      y: item.definition.y,
      appearances: item.appearances,
      minutes: item.minutes,
      score: item.score,
      isPrimary: false,
    }))
    .sort(comparePositionPoints)
    .map((item, index) => ({
      ...item,
      isPrimary: index === 0,
    }));

  return {
    primary: all[0] ?? null,
    others: all.slice(1),
    all,
  };
}

function toRatingWeight(value: string | null): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function compareByMostPlayed(
  first: PlayerProfileCompetitionStats,
  second: PlayerProfileCompetitionStats,
): number {
  const firstMatches = first.matches ?? Number.NEGATIVE_INFINITY;
  const secondMatches = second.matches ?? Number.NEGATIVE_INFINITY;
  if (secondMatches !== firstMatches) {
    return secondMatches - firstMatches;
  }

  const firstRating = toRatingWeight(first.rating);
  const secondRating = toRatingWeight(second.rating);
  if (secondRating !== firstRating) {
    return secondRating - firstRating;
  }

  return (first.leagueName ?? '').localeCompare(second.leagueName ?? '');
}

function selectProfileCompetitionStats(
  seasonStatsDataset: PlayerSeasonStatsDataset | null | undefined,
): PlayerProfileCompetitionStats | null {
  if (!seasonStatsDataset || seasonStatsDataset.byCompetition.length === 0) {
    return null;
  }

  const mappedStats = seasonStatsDataset.byCompetition.map<PlayerProfileCompetitionStats>(competition => ({
    leagueId: competition.leagueId,
    leagueName: competition.leagueName,
    leagueLogo: competition.leagueLogo,
    season: competition.season,
    matches: competition.stats.matches,
    goals: competition.stats.goals,
    assists: competition.stats.assists,
    rating: competition.stats.rating,
  }));

  const recentSeasons = mappedStats
    .map(item => item.season)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const latestSeason = recentSeasons.length > 0 ? Math.max(...recentSeasons) : null;
  const seasonScoped =
    latestSeason !== null
      ? mappedStats.filter(item => item.season === latestSeason)
      : mappedStats;

  if (seasonScoped.length === 0) {
    return null;
  }

  return [...seasonScoped].sort(compareByMostPlayed)[0] ?? null;
}

function normalizePlace(place: string | null | undefined): string {
  if (!place) {
    return '';
  }

  return place.trim().toLowerCase();
}

function isWinningPlace(place: string | null | undefined): boolean {
  const normalized = normalizePlace(place);
  if (!normalized) {
    return false;
  }

  return (
    normalized.includes('winner') ||
    normalized.includes('champion') ||
    normalized.includes('title') ||
    normalized.includes('vainqueur')
  );
}

function parseSeasonYear(season: string | null | undefined): number | null {
  if (!season) {
    return null;
  }

  const fourDigitYears = season.match(/\b(19|20)\d{2}\b/g);
  if (!fourDigitYears || fourDigitYears.length === 0) {
    return null;
  }

  const parsed = Number.parseInt(fourDigitYears[0], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function compareSeasonsDesc(first: string, second: string): number {
  const firstYear = parseSeasonYear(first);
  const secondYear = parseSeasonYear(second);
  if (secondYear !== firstYear) {
    return (secondYear ?? Number.NEGATIVE_INFINITY) - (firstYear ?? Number.NEGATIVE_INFINITY);
  }

  return second.localeCompare(first);
}

function toMatchesWeight(matches: number | null): number {
  return typeof matches === 'number' && Number.isFinite(matches) ? matches : 0;
}

type CareerClubYear = {
  clubId: string | null;
  clubName: string | null;
  clubLogo: string | null;
  matches: number;
};

type TrophyCompetitionAccumulator = {
  competition: string;
  country: string | null;
  count: number;
  seasons: string[];
};

type TrophyClubAccumulator = {
  clubId: string | null;
  clubName: string | null;
  clubLogo: string | null;
  total: number;
  competitions: Map<string, TrophyCompetitionAccumulator>;
};

type CareerClubMapping = {
  yearToClubMap: Map<number, CareerClubYear>;
  knownYears: number[];
  primaryClub: CareerClubYear | null;
};

function compareClubNames(first: string | null, second: string | null): number {
  return (first ?? '').localeCompare(second ?? '');
}

function buildCareerYearToClubMap(
  careerSeasons: PlayerCareerSeasonAggregate[],
): Map<number, CareerClubYear> {
  const byYear = new Map<number, CareerClubYear>();

  careerSeasons.forEach(careerSeason => {
    const year = careerSeason.season ? Number.parseInt(careerSeason.season, 10) : Number.NaN;
    if (!Number.isFinite(year)) {
      return;
    }

    const candidate: CareerClubYear = {
      clubId: toId(careerSeason.team.id),
      clubName: normalizeString(careerSeason.team.name),
      clubLogo: normalizeString(careerSeason.team.logo),
      matches: toMatchesWeight(careerSeason.matches),
    };

    const current = byYear.get(year);
    if (!current || candidate.matches > current.matches) {
      byYear.set(year, candidate);
    }
  });

  return byYear;
}

function buildPrimaryCareerClub(careerSeasons: PlayerCareerSeasonAggregate[]): CareerClubYear | null {
  const clubTotals = new Map<string, CareerClubYear>();

  careerSeasons.forEach(careerSeason => {
    const clubId = toId(careerSeason.team.id);
    const clubName = normalizeString(careerSeason.team.name);
    const clubLogo = normalizeString(careerSeason.team.logo);
    if (!clubId && !clubName) {
      return;
    }

    const key = clubId ? `club-${clubId}` : `club-name-${clubName ?? ''}`;
    const existing = clubTotals.get(key) ?? {
      clubId,
      clubName,
      clubLogo,
      matches: 0,
    };

    existing.matches += toMatchesWeight(careerSeason.matches);
    if (!existing.clubLogo && clubLogo) {
      existing.clubLogo = clubLogo;
    }

    clubTotals.set(key, existing);
  });

  const sortedClubs = Array.from(clubTotals.values()).sort((first, second) => {
    if (second.matches !== first.matches) {
      return second.matches - first.matches;
    }

    return compareClubNames(first.clubName, second.clubName);
  });

  return sortedClubs[0] ?? null;
}

function buildCareerClubMapping(careerSeasons: PlayerCareerSeasonAggregate[]): CareerClubMapping {
  const yearToClubMap = buildCareerYearToClubMap(careerSeasons);
  const knownYears = Array.from(yearToClubMap.keys()).sort((first, second) => first - second);
  const primaryClub = buildPrimaryCareerClub(careerSeasons);

  return {
    yearToClubMap,
    knownYears,
    primaryClub,
  };
}

function resolveNearestCareerYear(targetYear: number, knownYears: number[]): number | null {
  if (knownYears.length === 0) {
    return null;
  }

  const [nearest] = [...knownYears].sort((first, second) => {
    const firstDistance = Math.abs(first - targetYear);
    const secondDistance = Math.abs(second - targetYear);
    if (firstDistance !== secondDistance) {
      return firstDistance - secondDistance;
    }

    return second - first;
  });

  return nearest ?? null;
}

function createClubKey(clubId: string | null, clubName: string | null): string {
  if (clubId) {
    return `club-${clubId}`;
  }

  if (clubName) {
    return `club-name-${clubName.toLowerCase()}`;
  }

  return 'club-unknown';
}

function mapPlayerTrophies(dtos: PlayerTrophyDto[]): PlayerTrophyEntry[] {
  return dtos
    .filter(dto => isWinningPlace(dto.place))
    .map<PlayerTrophyEntry>(dto => {
      const season = normalizeString(dto.season);

      return {
        competition: normalizeString(dto.league) ?? '',
        country: normalizeString(dto.country),
        season,
        seasonYear: parseSeasonYear(season),
      };
    })
    .filter(entry => entry.competition.length > 0)
    .sort((first, second) => {
      if (second.seasonYear !== first.seasonYear) {
        return (second.seasonYear ?? Number.NEGATIVE_INFINITY) - (first.seasonYear ?? Number.NEGATIVE_INFINITY);
      }

      return first.competition.localeCompare(second.competition);
    });
}

function groupPlayerTrophiesByClub(
  trophies: PlayerTrophyEntry[],
  careerSeasons: PlayerCareerSeasonAggregate[],
): PlayerTrophyClubGroup[] {
  if (trophies.length === 0) {
    return [];
  }

  const careerMapping = buildCareerClubMapping(careerSeasons);
  const clubs = new Map<string, TrophyClubAccumulator>();

  trophies.forEach(trophy => {
    let linkedClub: CareerClubYear | undefined;

    if (trophy.seasonYear !== null) {
      linkedClub = careerMapping.yearToClubMap.get(trophy.seasonYear);
      if (!linkedClub) {
        const nearestYear = resolveNearestCareerYear(trophy.seasonYear, careerMapping.knownYears);
        linkedClub = nearestYear !== null ? careerMapping.yearToClubMap.get(nearestYear) : undefined;
      }
    }

    if (!linkedClub && careerMapping.primaryClub) {
      linkedClub = careerMapping.primaryClub;
    }

    const clubId = linkedClub?.clubId ?? null;
    const clubName = linkedClub?.clubName ?? null;
    const clubLogo = linkedClub?.clubLogo ?? null;
    const clubKey = createClubKey(clubId, clubName);

    const clubAccumulator = clubs.get(clubKey) ?? {
      clubId,
      clubName,
      clubLogo,
      total: 0,
      competitions: new Map<string, TrophyCompetitionAccumulator>(),
    };

    clubAccumulator.total += 1;
    if (!clubAccumulator.clubLogo && clubLogo) {
      clubAccumulator.clubLogo = clubLogo;
    }

    const competitionKey = `${trophy.competition.toLowerCase()}::${trophy.country ?? ''}`;
    const competitionAccumulator = clubAccumulator.competitions.get(competitionKey) ?? {
      competition: trophy.competition,
      country: trophy.country,
      count: 0,
      seasons: [],
    };

    competitionAccumulator.count += 1;
    if (trophy.season && !competitionAccumulator.seasons.includes(trophy.season)) {
      competitionAccumulator.seasons.push(trophy.season);
      competitionAccumulator.seasons.sort(compareSeasonsDesc);
    }

    clubAccumulator.competitions.set(competitionKey, competitionAccumulator);
    clubs.set(clubKey, clubAccumulator);
  });

  return Array.from(clubs.values())
    .map<PlayerTrophyClubGroup>(club => ({
      clubId: club.clubId,
      clubName: club.clubName,
      clubLogo: club.clubLogo,
      total: club.total,
      competitions: Array.from(club.competitions.values()).sort((first, second) => {
        if (second.count !== first.count) {
          return second.count - first.count;
        }

        return first.competition.localeCompare(second.competition);
      }),
    }))
    .sort((first, second) => {
      if (second.total !== first.total) {
        return second.total - first.total;
      }

      return compareClubNames(first.clubName, second.clubName);
    });
}

async function fetchPlayerDetailForSeason(
  playerId: string,
  season: number,
  options: PlayerAggregateFetchOptions = {},
): Promise<PlayerDetailsDto | null> {
  try {
    const payload = await withCache(
      buildCanonicalCacheKey('players:details:season', { playerId, season }),
      PLAYER_DETAILS_TTL_MS,
      () => {
        options.onUpstreamRequest?.();
        return apiFootballGet<ApiFootballListResponse<PlayerDetailsDto>>(
          `/players?id=${encodeURIComponent(playerId)}&season=${encodeURIComponent(String(season))}`,
        );
      },
    );

    return payload.response?.[0] ?? null;
  } catch {
    return null;
  }
}

function resolveMappedTrophySeasons(
  availableSeasons: number[],
  trophies: PlayerTrophyEntry[],
): number[] {
  if (availableSeasons.length === 0 || trophies.length === 0) {
    return [];
  }

  const uniqueSortedAvailableSeasons = Array.from(
    new Set(availableSeasons.filter(value => Number.isInteger(value))),
  ).sort((first, second) => second - first);

  const resolvedSeasons = new Set<number>();
  trophies.forEach(trophy => {
    const seasonYear = trophy.seasonYear;
    if (seasonYear === null) {
      return;
    }

    if (uniqueSortedAvailableSeasons.includes(seasonYear)) {
      resolvedSeasons.add(seasonYear);
      return;
    }

    const nearestSeason = [...uniqueSortedAvailableSeasons].sort((first, second) => {
      const firstDistance = Math.abs(first - seasonYear);
      const secondDistance = Math.abs(second - seasonYear);
      if (firstDistance !== secondDistance) {
        return firstDistance - secondDistance;
      }

      return second - first;
    })[0];

    if (typeof nearestSeason === 'number') {
      resolvedSeasons.add(nearestSeason);
    }
  });

  return [...resolvedSeasons].sort((first, second) => second - first);
}

function resolveDefaultStatsSelection(
  competitions: PlayerStatsCatalogCompetition[],
): PlayerStatsCatalogSelection {
  const availableSeasons = Array.from(
    new Set(competitions.flatMap(competition => competition.seasons)),
  ).sort((first, second) => second - first);

  const mostRecentSeason = availableSeasons[0] ?? null;
  if (mostRecentSeason === null) {
    return {
      leagueId: null,
      season: null,
    };
  }

  const competitionForSeason = competitions
    .filter(item => item.seasons.includes(mostRecentSeason))
    .sort((first, second) => (first.leagueName ?? '').localeCompare(second.leagueName ?? ''))[0];

  return {
    leagueId: competitionForSeason?.leagueId ?? null,
    season: mostRecentSeason,
  };
}

function buildStatsCatalog(
  competitions: PlayerStatsCatalogCompetition[],
  availableSeasons: number[],
): PlayerStatsCatalogPayload {
  const normalized = competitions
    .map(competition => ({
      ...competition,
      seasons: [...competition.seasons].sort((first, second) => second - first),
      currentSeason:
        competition.currentSeason ??
        [...competition.seasons].sort((first, second) => second - first)[0] ??
        null,
    }))
    .filter(item => item.seasons.length > 0)
    .sort((first, second) => (first.leagueName ?? '').localeCompare(second.leagueName ?? ''));

  return {
    competitions: normalized,
    defaultSelection: resolveDefaultStatsSelection(normalized),
    availableSeasons: [...availableSeasons].sort((first, second) => second - first),
  };
}

export async function fetchPlayerOverview(
  playerId: string,
  season: number,
  options: PlayerAggregateFetchOptions = {},
): Promise<{ response: PlayerOverviewPayload }> {
  const [details, trophiesPayload, seasonsPayload] = await Promise.all([
    fetchPlayerDetailForSeason(playerId, season, options),
    withCache(
      buildCanonicalCacheKey('players:trophies', { playerId }),
      120_000,
      () => {
        options.onUpstreamRequest?.();
        return apiFootballGet<ApiFootballListResponse<PlayerTrophyDto>>(
          `/trophies?player=${encodeURIComponent(playerId)}`,
        );
      },
    ),
    withCache(
      buildCanonicalCacheKey('players:seasons', { playerId }),
      120_000,
      () => {
        options.onUpstreamRequest?.();
        return apiFootballGet<ApiFootballListResponse<number>>(
          `/players/seasons?player=${encodeURIComponent(playerId)}`,
        );
      },
    ),
  ]);

  if (!details) {
    return {
      response: {
        profile: null,
        characteristics: null,
        positions: null,
        seasonStats: null,
        seasonStatsDataset: null,
        profileCompetitionStats: null,
        trophiesByClub: [],
      },
    };
  }

  const seasonStatsDataset = mapPlayerDetailsToSeasonStatsDataset(details, season);
  const mappedTrophies = mapPlayerTrophies(trophiesPayload.response ?? []);
  const seasonsToFetch = resolveMappedTrophySeasons(seasonsPayload.response ?? [], mappedTrophies);

  const trophySeasonDetails = await mapWithConcurrency(
    seasonsToFetch,
    PLAYER_DETAILS_MAX_CONCURRENCY,
    seasonYear => fetchPlayerDetailForSeason(playerId, seasonYear, options),
  );
  const careerSeasons = trophySeasonDetails.flatMap(detail =>
    detail ? mapCareerSeasons(detail) : [],
  );

  return {
    response: {
      profile: mapPlayerDetailsToProfile(details, season),
      characteristics: mapPlayerDetailsToCharacteristics(details, season),
      positions: mapPlayerDetailsToPositions(details, season),
      seasonStats: seasonStatsDataset.overall,
      seasonStatsDataset,
      profileCompetitionStats: selectProfileCompetitionStats(seasonStatsDataset),
      trophiesByClub: groupPlayerTrophiesByClub(mappedTrophies, careerSeasons),
    },
  };
}

export async function fetchPlayerStatsCatalog(
  playerId: string,
  options: PlayerAggregateFetchOptions = {},
): Promise<{ response: PlayerStatsCatalogPayload }> {
  const seasonsPayload = await withCache(
    buildCanonicalCacheKey('players:seasons', { playerId }),
    120_000,
    () => {
      options.onUpstreamRequest?.();
      return apiFootballGet<ApiFootballListResponse<number>>(
        `/players/seasons?player=${encodeURIComponent(playerId)}`,
      );
    },
  );
  const uniqueSeasons = Array.from(
    new Set((seasonsPayload.response ?? []).filter(value => Number.isFinite(value))),
  ).sort((first, second) => second - first);

  if (uniqueSeasons.length === 0) {
    return {
      response: {
        competitions: [],
        defaultSelection: {
          leagueId: null,
          season: null,
        },
        availableSeasons: [],
      },
    };
  }

  const seasonDetails = await mapWithConcurrency(
    uniqueSeasons,
    PLAYER_DETAILS_MAX_CONCURRENCY,
    season => fetchPlayerDetailForSeason(playerId, season, options),
  );

  const competitionsMap = new Map<string, PlayerStatsCatalogCompetition>();

  seasonDetails.forEach((details, index) => {
    const season = uniqueSeasons[index];
    if (!details) {
      return;
    }

    const dataset = mapPlayerDetailsToSeasonStatsDataset(details, season);
    dataset.byCompetition.forEach(item => {
      if (!item.leagueId || item.season === null) {
        return;
      }

      const existing = competitionsMap.get(item.leagueId);
      if (existing) {
        if (!existing.seasons.includes(item.season)) {
          existing.seasons.push(item.season);
        }
        if (
          existing.currentSeason === null ||
          item.season > existing.currentSeason
        ) {
          existing.currentSeason = item.season;
        }
        if (!existing.leagueName && item.leagueName) {
          existing.leagueName = item.leagueName;
        }
        if (!existing.leagueLogo && item.leagueLogo) {
          existing.leagueLogo = item.leagueLogo;
        }
        return;
      }

      competitionsMap.set(item.leagueId, {
        leagueId: item.leagueId,
        leagueName: item.leagueName,
        leagueLogo: item.leagueLogo,
        type: null,
        country: null,
        seasons: [item.season],
        currentSeason: item.season,
      });
    });
  });

  return {
    response: buildStatsCatalog(Array.from(competitionsMap.values()), uniqueSeasons),
  };
}
