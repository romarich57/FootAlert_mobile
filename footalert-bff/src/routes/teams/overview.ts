import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { buildCanonicalCacheKey, withCache } from '../../lib/cache.js';

import {
  buildFixtureQuery,
  normalizeStandingsPayload,
  toNumericId,
} from './helpers.js';
import { fetchTeamTrophiesWithFallback } from './trophies.js';

const TEAM_OVERVIEW_TTL_MS = 45_000;
const TEAM_OVERVIEW_LONG_TTL_MS = 120_000;
const TEAM_PLAYERS_MAX_PAGES = 6;
const TEAM_PLAYERS_TARGET_ITEMS = 120;

type TeamMatchStatus = 'upcoming' | 'live' | 'finished';

type TeamMatchItem = {
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

type TeamFormEntry = {
  fixtureId: string;
  result: 'W' | 'D' | 'L' | '';
  score: string | null;
  opponentName: string | null;
  opponentLogo: string | null;
};

type TeamStandingStats = {
  played: number | null;
  win: number | null;
  draw: number | null;
  lose: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
};

type TeamStandingRow = {
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

type TeamStandingGroup = {
  groupName: string | null;
  rows: TeamStandingRow[];
};

type TeamOverviewSeasonStats = {
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

type TeamOverviewCoach = {
  id: string | null;
  name: string | null;
  photo: string | null;
  age: number | null;
};

type TeamOverviewCoachPerformance = {
  coach: TeamOverviewCoach | null;
  winRate: number | null;
  pointsPerMatch: number | null;
  played: number | null;
  wins: number | null;
  draws: number | null;
  losses: number | null;
};

type TeamTopPlayer = {
  playerId: string;
  name: string | null;
  photo: string | null;
  teamLogo: string | null;
  position: string | null;
  goals: number | null;
  assists: number | null;
  rating: number | null;
};

type TeamSeasonLineup = {
  formation: '4-3-3';
  estimated: boolean;
  goalkeeper: TeamTopPlayer | null;
  defenders: TeamTopPlayer[];
  midfielders: TeamTopPlayer[];
  attackers: TeamTopPlayer[];
};

type TeamOverviewPlayerLeaders = {
  ratings: TeamTopPlayer[];
  scorers: TeamTopPlayer[];
  assisters: TeamTopPlayer[];
};

type TeamOverviewCoreResponse = {
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

type TeamOverviewLeadersResponse = {
  seasonLineup: TeamSeasonLineup;
  playerLeaders: TeamOverviewPlayerLeaders;
  sourceUpdatedAt: string | null;
};

type TeamApiFixtureDto = {
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

type TeamApiStandingsPayload = {
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

type TeamApiStatisticsDto = {
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

type TeamApiPlayerDto = {
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

type TeamApiPlayersEnvelope = {
  response?: TeamApiPlayerDto[];
  paging?: {
    current?: number;
    total?: number;
  };
};

type TeamCoachDto = {
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

type TeamApiTrophyDto = {
  place?: string;
};

type WarnLogger = {
  warn: (obj: unknown, msg?: string) => void;
};

type FetchOverviewParams = {
  teamId: string;
  leagueId: string;
  season: number;
  timezone: string;
  historySeasons?: number[];
  logger: WarnLogger;
};

type FetchOverviewLeadersParams = {
  teamId: string;
  leagueId: string;
  season: number;
};

type PlayerLineCategory = 'goalkeeper' | 'defender' | 'midfielder' | 'attacker' | 'other';

const LIVE_STATUSES = new Set(['1H', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE']);
const UPCOMING_STATUSES = new Set(['TBD', 'NS']);

function toId(value: unknown): string | null {
  if (value === null || typeof value === 'undefined') {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function toText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toParsedFloat(value: unknown): number | null {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function toSortableTimestamp(value: string | null): number {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function toRounded(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function classifyTeamMatchStatus(shortStatus: string | null | undefined): TeamMatchStatus {
  const normalizedStatus = toText(shortStatus)?.toUpperCase() ?? '';
  if (LIVE_STATUSES.has(normalizedStatus)) {
    return 'live';
  }
  if (UPCOMING_STATUSES.has(normalizedStatus)) {
    return 'upcoming';
  }
  return 'finished';
}

function toStatusLabel(dto: TeamApiFixtureDto): string | null {
  return toText(dto.fixture?.status?.long) ?? toText(dto.fixture?.status?.short);
}

function mapFixtureToTeamMatch(dto: TeamApiFixtureDto): TeamMatchItem {
  return {
    fixtureId: toId(dto.fixture?.id) ?? '',
    leagueId: toId(dto.league?.id),
    leagueName: toText(dto.league?.name),
    leagueLogo: toText(dto.league?.logo),
    date: toText(dto.fixture?.date),
    round: toText(dto.league?.round),
    venue: toText(dto.fixture?.venue?.name),
    status: classifyTeamMatchStatus(dto.fixture?.status?.short),
    statusLabel: toStatusLabel(dto),
    minute: toNumber(dto.fixture?.status?.elapsed),
    homeTeamId: toId(dto.teams?.home?.id),
    homeTeamName: toText(dto.teams?.home?.name),
    homeTeamLogo: toText(dto.teams?.home?.logo),
    awayTeamId: toId(dto.teams?.away?.id),
    awayTeamName: toText(dto.teams?.away?.name),
    awayTeamLogo: toText(dto.teams?.away?.logo),
    homeGoals: toNumber(dto.goals?.home),
    awayGoals: toNumber(dto.goals?.away),
  };
}

function mapFixturesToTeamMatches(payload: TeamApiFixtureDto[]) {
  const all = [...payload]
    .map(mapFixtureToTeamMatch)
    .filter(match => match.fixtureId.length > 0)
    .sort((first, second) => toSortableTimestamp(first.date) - toSortableTimestamp(second.date));

  return {
    all,
    upcoming: all.filter(match => match.status === 'upcoming'),
    past: [...all]
      .filter(match => match.status === 'finished')
      .sort((first, second) => toSortableTimestamp(second.date) - toSortableTimestamp(first.date)),
  };
}

function resolveFormResult(match: TeamMatchItem, teamId: string): TeamFormEntry['result'] {
  const homeTeamId = match.homeTeamId;
  const awayTeamId = match.awayTeamId;

  if (!homeTeamId || !awayTeamId || (homeTeamId !== teamId && awayTeamId !== teamId)) {
    return '';
  }

  if (match.homeGoals === null || match.awayGoals === null) {
    return '';
  }

  const goalDelta = match.homeGoals - match.awayGoals;
  if (goalDelta === 0) {
    return 'D';
  }

  const isHome = homeTeamId === teamId;
  return isHome ? (goalDelta > 0 ? 'W' : 'L') : (goalDelta < 0 ? 'W' : 'L');
}

function mapRecentTeamForm(matches: TeamMatchItem[], teamId: string, limit = 5): TeamFormEntry[] {
  return matches
    .filter(match => match.status === 'finished')
    .sort((first, second) => toSortableTimestamp(second.date) - toSortableTimestamp(first.date))
    .slice(0, limit)
    .map(match => {
      const isHome = match.homeTeamId === teamId;

      return {
        fixtureId: match.fixtureId,
        result: resolveFormResult(match, teamId),
        score:
          match.homeGoals === null || match.awayGoals === null
            ? null
            : `${match.homeGoals}-${match.awayGoals}`,
        opponentName: isHome ? match.awayTeamName : match.homeTeamName,
        opponentLogo: isHome ? match.awayTeamLogo : match.homeTeamLogo,
      };
    });
}

function mapStandings(payload: TeamApiStandingsPayload | null, teamId: string) {
  const groups = (payload?.league?.standings ?? []).map<TeamStandingGroup>(standingGroup => ({
    groupName: toText(standingGroup[0]?.group),
    rows: standingGroup.map<TeamStandingRow>(row => {
      const rowTeamId = toId(row.team?.id);

      return {
        rank: toNumber(row.rank),
        teamId: rowTeamId,
        teamName: toText(row.team?.name),
        teamLogo: toText(row.team?.logo),
        played: toNumber(row.all?.played),
        goalDiff: toNumber(row.goalsDiff),
        points: toNumber(row.points),
        isTargetTeam: rowTeamId === teamId,
        form: toText(row.form),
        update: toText(row.update),
        all: {
          played: toNumber(row.all?.played),
          win: toNumber(row.all?.win),
          draw: toNumber(row.all?.draw),
          lose: toNumber(row.all?.lose),
          goalsFor: toNumber(row.all?.goals?.for),
          goalsAgainst: toNumber(row.all?.goals?.against),
        },
        home: {
          played: toNumber(row.home?.played),
          win: toNumber(row.home?.win),
          draw: toNumber(row.home?.draw),
          lose: toNumber(row.home?.lose),
          goalsFor: toNumber(row.home?.goals?.for),
          goalsAgainst: toNumber(row.home?.goals?.against),
        },
        away: {
          played: toNumber(row.away?.played),
          win: toNumber(row.away?.win),
          draw: toNumber(row.away?.draw),
          lose: toNumber(row.away?.lose),
          goalsFor: toNumber(row.away?.goals?.for),
          goalsAgainst: toNumber(row.away?.goals?.against),
        },
      };
    }),
  }));

  return {
    leagueId: toId(payload?.league?.id),
    leagueName: toText(payload?.league?.name),
    leagueLogo: toText(payload?.league?.logo),
    groups,
  };
}

function findTeamStandingRow(groups: TeamStandingGroup[]): TeamStandingRow | null {
  for (const group of groups) {
    const row = group.rows.find(item => item.isTargetTeam);
    if (row) {
      return row;
    }
  }

  return null;
}

function buildSeasonStats(
  statistics: TeamApiStatisticsDto | null,
  standingRow: TeamStandingRow | null,
): TeamOverviewSeasonStats {
  const scored = toNumber(statistics?.goals?.for?.total?.total) ?? standingRow?.all.goalsFor ?? null;
  const conceded =
    toNumber(statistics?.goals?.against?.total?.total) ?? standingRow?.all.goalsAgainst ?? null;

  return {
    rank: standingRow?.rank ?? null,
    points: standingRow?.points ?? null,
    played: toNumber(statistics?.fixtures?.played?.total) ?? standingRow?.played ?? null,
    goalDiff:
      standingRow?.goalDiff ??
      (scored !== null && conceded !== null ? scored - conceded : null),
    wins: toNumber(statistics?.fixtures?.wins?.total) ?? standingRow?.all.win ?? null,
    draws: toNumber(statistics?.fixtures?.draws?.total) ?? standingRow?.all.draw ?? null,
    losses: toNumber(statistics?.fixtures?.loses?.total) ?? standingRow?.all.lose ?? null,
    scored,
    conceded,
  };
}

function resolvePrimaryTeamPlayerStatistic(
  statistics: TeamApiPlayerDto['statistics'],
  context: {
    teamId: string;
    leagueId: string;
    season: number;
  },
) {
  if (!statistics || statistics.length === 0) {
    return undefined;
  }

  const candidates = statistics
    .filter(stat => {
      return (
        toId(stat.team?.id) === context.teamId &&
        toId(stat.league?.id) === context.leagueId &&
        stat.league?.season === context.season
      );
    });

  const pool = candidates.length > 0 ? candidates : statistics;

  return [...pool].sort((first, second) => {
    const secondMinutes = toNumber(second.games?.minutes) ?? 0;
    const firstMinutes = toNumber(first.games?.minutes) ?? 0;
    if (secondMinutes !== firstMinutes) {
      return secondMinutes - firstMinutes;
    }

    const secondAppearances = toNumber(second.games?.appearences) ?? 0;
    const firstAppearances = toNumber(first.games?.appearences) ?? 0;
    if (secondAppearances !== firstAppearances) {
      return secondAppearances - firstAppearances;
    }

    const secondGoals = toNumber(second.goals?.total) ?? 0;
    const firstGoals = toNumber(first.goals?.total) ?? 0;
    if (secondGoals !== firstGoals) {
      return secondGoals - firstGoals;
    }

    const secondAssists = toNumber(second.goals?.assists) ?? 0;
    const firstAssists = toNumber(first.goals?.assists) ?? 0;
    return secondAssists - firstAssists;
  })[0];
}

function mapPlayerStat(
  player: TeamApiPlayerDto,
  context: {
    teamId: string;
    leagueId: string;
    season: number;
  },
): TeamTopPlayer | null {
  const playerId = toId(player.player?.id);
  if (!playerId) {
    return null;
  }

  const stat = resolvePrimaryTeamPlayerStatistic(player.statistics, context);
  return {
    playerId,
    name: toText(player.player?.name),
    photo: toText(player.player?.photo),
    teamLogo: toText(stat?.team?.logo),
    position: toText(stat?.games?.position),
    goals: toNumber(stat?.goals?.total),
    assists: toNumber(stat?.goals?.assists),
    rating: toParsedFloat(stat?.games?.rating),
  };
}

function sortByCompositeScore(first: TeamTopPlayer, second: TeamTopPlayer): number {
  const firstScore = (first.goals ?? 0) * 3 + (first.assists ?? 0) * 2 + (first.rating ?? 0);
  const secondScore = (second.goals ?? 0) * 3 + (second.assists ?? 0) * 2 + (second.rating ?? 0);
  return secondScore - firstScore;
}

function mapPlayersToTopPlayers(
  players: TeamApiPlayerDto[],
  context: {
    teamId: string;
    leagueId: string;
    season: number;
  },
  limit: number,
): TeamTopPlayer[] {
  return players
    .map(player => mapPlayerStat(player, context))
    .filter((item): item is TeamTopPlayer => item !== null)
    .sort(sortByCompositeScore)
    .slice(0, limit);
}

function mapPlayersToTopPlayersByCategory(
  players: TeamApiPlayerDto[],
  context: {
    teamId: string;
    leagueId: string;
    season: number;
  },
  limit: number,
) {
  const mappedPlayers = players
    .map(player => mapPlayerStat(player, context))
    .filter((item): item is TeamTopPlayer => item !== null);

  return {
    ratings: mappedPlayers
      .filter(player => player.rating !== null)
      .sort((first, second) => (second.rating ?? -1) - (first.rating ?? -1))
      .slice(0, limit),
    scorers: mappedPlayers
      .filter(player => typeof player.goals === 'number' && player.goals > 0)
      .sort((first, second) => (second.goals ?? -1) - (first.goals ?? -1))
      .slice(0, limit),
    assisters: mappedPlayers
      .filter(player => typeof player.assists === 'number' && player.assists > 0)
      .sort((first, second) => (second.assists ?? -1) - (first.assists ?? -1))
      .slice(0, limit),
  };
}

function resolvePlayerLineCategory(position: string | null | undefined): PlayerLineCategory {
  const normalized = (position ?? '').trim().toLowerCase();
  if (!normalized) {
    return 'other';
  }

  if (normalized.includes('goal')) {
    return 'goalkeeper';
  }
  if (normalized.includes('def')) {
    return 'defender';
  }
  if (normalized.includes('mid')) {
    return 'midfielder';
  }
  if (
    normalized.includes('att') ||
    normalized.includes('forw') ||
    normalized.includes('strik') ||
    normalized.includes('wing')
  ) {
    return 'attacker';
  }

  return 'other';
}

function sortPlayersForLineup(first: TeamTopPlayer, second: TeamTopPlayer): number {
  const byRating = (second.rating ?? -1) - (first.rating ?? -1);
  if (byRating !== 0) {
    return byRating;
  }

  const byGoals = (second.goals ?? -1) - (first.goals ?? -1);
  if (byGoals !== 0) {
    return byGoals;
  }

  return (second.assists ?? -1) - (first.assists ?? -1);
}

function buildEstimatedLineup(players: TeamTopPlayer[]): TeamSeasonLineup {
  const sortedPlayers = [...players].sort(sortPlayersForLineup);
  const usedPlayerIds = new Set<string>();

  const pickPlayers = (category: PlayerLineCategory, count: number): TeamTopPlayer[] => {
    const selected: TeamTopPlayer[] = [];

    for (const player of sortedPlayers) {
      if (selected.length >= count) {
        break;
      }
      if (usedPlayerIds.has(player.playerId)) {
        continue;
      }
      if (resolvePlayerLineCategory(player.position) !== category) {
        continue;
      }

      selected.push(player);
      usedPlayerIds.add(player.playerId);
    }

    if (selected.length < count) {
      for (const player of sortedPlayers) {
        if (selected.length >= count) {
          break;
        }
        if (usedPlayerIds.has(player.playerId)) {
          continue;
        }

        selected.push(player);
        usedPlayerIds.add(player.playerId);
      }
    }

    return selected;
  };

  return {
    formation: '4-3-3',
    estimated: true,
    goalkeeper: pickPlayers('goalkeeper', 1)[0] ?? null,
    defenders: pickPlayers('defender', 4),
    midfielders: pickPlayers('midfielder', 3),
    attackers: pickPlayers('attacker', 3),
  };
}

function buildMiniStandingRows(rows: TeamStandingRow[]): TeamStandingRow[] {
  if (rows.length === 0) {
    return [];
  }

  const targetIndex = rows.findIndex(row => row.isTargetTeam);
  if (targetIndex < 0) {
    return rows.slice(0, 3);
  }

  let start = Math.max(0, targetIndex - 1);
  let end = Math.min(rows.length, start + 3);
  if (end - start < 3) {
    start = Math.max(0, end - 3);
  }

  return rows.slice(start, end);
}

function buildCoachPerformance(
  coach: TeamOverviewCoach | null,
  seasonStats: TeamOverviewSeasonStats,
): TeamOverviewCoachPerformance | null {
  if (!coach) {
    return null;
  }

  const played = seasonStats.played;
  const wins = seasonStats.wins;
  const draws = seasonStats.draws;
  const losses = seasonStats.losses;
  const points = seasonStats.points;

  const winRate =
    typeof played === 'number' && played > 0 && typeof wins === 'number'
      ? toRounded((wins / played) * 100, 1)
      : null;
  const pointsPerMatch =
    typeof played === 'number' && played > 0
      ? typeof points === 'number'
        ? toRounded(points / played, 2)
        : typeof wins === 'number' || typeof draws === 'number'
          ? toRounded((((wins ?? 0) * 3) + (draws ?? 0)) / played, 2)
          : null
      : null;

  return {
    coach,
    winRate,
    pointsPerMatch,
    played,
    wins,
    draws,
    losses,
  };
}

function isWinnerTrophy(place: string | null): boolean {
  const normalized = (place ?? '').toLowerCase();
  if (normalized.includes('runner') || normalized.includes('vice')) {
    return false;
  }

  return normalized.includes('winner') || normalized.includes('champion');
}

function buildHistorySeasons(currentSeason: number, historySeasons: number[] | undefined): number[] {
  const fallbackSeasons = Array.from({ length: 5 }, (_, index) => currentSeason - (index + 1));
  const raw = historySeasons && historySeasons.length > 0 ? historySeasons : fallbackSeasons;
  return Array.from(
    new Set(
      raw.filter(year => Number.isFinite(year) && year !== currentSeason),
    ),
  )
    .sort((first, second) => second - first)
    .slice(0, 5);
}

function parseHistorySeasonsCsv(value: string | undefined): number[] | undefined {
  if (!value) {
    return undefined;
  }

  const seasons = value
    .split(',')
    .map(item => item.trim())
    .map(item => Number(item))
    .filter(item => Number.isFinite(item));

  return seasons.length > 0 ? seasons : undefined;
}

function resolveCurrentStandingRows(groups: TeamStandingGroup[]): TeamStandingRow[] {
  const targetGroup = groups.find(group => group.rows.some(row => row.isTargetTeam));
  return targetGroup?.rows ?? groups[0]?.rows ?? [];
}

function toSettledError(
  results: ReadonlyArray<PromiseSettledResult<unknown>>,
  fallbackMessage: string,
): Error {
  for (const result of results) {
    if (result.status === 'rejected' && result.reason instanceof Error) {
      return result.reason;
    }
  }

  return new Error(fallbackMessage);
}

async function fetchOverviewFixtures(
  teamId: string,
  leagueId: string,
  season: number,
  timezone: string,
): Promise<TeamApiFixtureDto[]> {
  return withCache(
    buildCanonicalCacheKey('team:overview:fixtures', { teamId, leagueId, season, timezone }),
    TEAM_OVERVIEW_TTL_MS,
    async () => {
      const payload = await apiFootballGet<{ response?: TeamApiFixtureDto[] }>(
        `/fixtures?${buildFixtureQuery(teamId, { leagueId, season, timezone })}`,
      );
      return Array.isArray(payload.response) ? payload.response : [];
    },
  );
}

async function fetchOverviewNextFixture(
  teamId: string,
  timezone: string,
): Promise<TeamApiFixtureDto | null> {
  return withCache(
    buildCanonicalCacheKey('team:overview:next-fixture', { teamId, timezone }),
    TEAM_OVERVIEW_TTL_MS,
    async () => {
      const payload = await apiFootballGet<{ response?: TeamApiFixtureDto[] }>(
        `/fixtures?team=${encodeURIComponent(teamId)}&next=1&timezone=${encodeURIComponent(timezone)}`,
      );
      return payload.response?.[0] ?? null;
    },
  );
}

async function fetchOverviewStandings(
  leagueId: string,
  season: number,
): Promise<TeamApiStandingsPayload | null> {
  return withCache(
    buildCanonicalCacheKey('team:overview:standings', { leagueId, season }),
    60_000,
    async () => {
      const payload = await apiFootballGet<{ response?: TeamApiStandingsPayload[] }>(
        `/standings?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}`,
      );
      const normalized = normalizeStandingsPayload(payload);
      return (normalized.response?.[0] as TeamApiStandingsPayload | undefined) ?? null;
    },
  );
}

async function fetchOverviewStatistics(
  teamId: string,
  leagueId: string,
  season: number,
): Promise<TeamApiStatisticsDto | null> {
  return withCache(
    buildCanonicalCacheKey('team:overview:statistics', { teamId, leagueId, season }),
    60_000,
    async () => {
      const payload = await apiFootballGet<{ response?: TeamApiStatisticsDto | null }>(
        `/teams/statistics?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}&team=${encodeURIComponent(teamId)}`,
      );
      return payload.response ?? null;
    },
  );
}

async function fetchOverviewPlayers(
  teamId: string,
  leagueId: string,
  season: number,
): Promise<TeamApiPlayerDto[]> {
  const aggregated: TeamApiPlayerDto[] = [];

  for (
    let page = 1;
    page <= TEAM_PLAYERS_MAX_PAGES && aggregated.length < TEAM_PLAYERS_TARGET_ITEMS;
    page += 1
  ) {
    const pagePayload = await withCache(
      buildCanonicalCacheKey('team:overview:players:page', { teamId, leagueId, season, page }),
      60_000,
      () =>
        apiFootballGet<TeamApiPlayersEnvelope>(
          `/players?team=${encodeURIComponent(teamId)}&league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}&page=${page}`,
        ),
    );

    const pageItems = Array.isArray(pagePayload.response) ? pagePayload.response : [];
    if (pageItems.length === 0) {
      break;
    }

    const remainingItems = TEAM_PLAYERS_TARGET_ITEMS - aggregated.length;
    aggregated.push(...pageItems.slice(0, Math.max(0, remainingItems)));

    const totalPages = toNumber(pagePayload.paging?.total);
    if (typeof totalPages === 'number' && page >= totalPages) {
      break;
    }
  }

  return aggregated;
}

async function fetchOverviewCoach(teamId: string): Promise<TeamOverviewCoach | null> {
  return withCache(
    buildCanonicalCacheKey('team:overview:coach', { teamId }),
    TEAM_OVERVIEW_LONG_TTL_MS,
    async () => {
      const coachRes = await apiFootballGet<{ response?: TeamCoachDto[] }>(
        `/coachs?team=${encodeURIComponent(teamId)}`,
      );
      const coaches = coachRes.response ?? [];
      const teamIdAsNumber = toNumericId(teamId);

      const currentCoach =
        coaches.find(coach => {
          const currentJob = coach.career?.[0];
          return currentJob?.team?.id === teamIdAsNumber && currentJob.end === null;
        }) ??
        coaches[0] ??
        null;

      if (!currentCoach) {
        return null;
      }

      return {
        id: toId(currentCoach.id),
        name: toText(currentCoach.name),
        photo: toText(currentCoach.photo),
        age: toNumber(currentCoach.age),
      };
    },
  );
}

async function fetchOverviewTrophies(
  teamId: string,
  logger: WarnLogger,
): Promise<TeamApiTrophyDto[]> {
  return withCache(
    buildCanonicalCacheKey('team:overview:trophies', { teamId }),
    TEAM_OVERVIEW_LONG_TTL_MS,
    async () => {
      const payload = await fetchTeamTrophiesWithFallback(teamId, logger);
      return Array.isArray(payload.response) ? (payload.response as TeamApiTrophyDto[]) : [];
    },
  );
}

function buildOverviewLeadersPayload(
  playersPayload: TeamApiPlayerDto[],
  playerContext: {
    teamId: string;
    leagueId: string;
    season: number;
  },
  sourceUpdatedAt: string | null,
): TeamOverviewLeadersResponse {
  const topPlayers = mapPlayersToTopPlayers(playersPayload, playerContext, 30);
  const topPlayersByCategory = mapPlayersToTopPlayersByCategory(playersPayload, playerContext, 5);

  return {
    seasonLineup: buildEstimatedLineup(topPlayers),
    playerLeaders: {
      ratings: topPlayersByCategory.ratings.slice(0, 3),
      scorers: topPlayersByCategory.scorers.slice(0, 3),
      assisters: topPlayersByCategory.assisters.slice(0, 3),
    },
    sourceUpdatedAt,
  };
}

export async function fetchTeamOverviewLeadersPayload({
  teamId,
  leagueId,
  season,
}: FetchOverviewLeadersParams): Promise<TeamOverviewLeadersResponse> {
  const playersPayload = await fetchOverviewPlayers(teamId, leagueId, season);

  return buildOverviewLeadersPayload(
    playersPayload,
    { teamId, leagueId, season },
    new Date().toISOString(),
  );
}

export async function fetchTeamOverviewCorePayload({
  teamId,
  leagueId,
  season,
  timezone,
  historySeasons,
  logger,
}: FetchOverviewParams): Promise<TeamOverviewCoreResponse> {
  const [fixturesResult, nextFixtureResult, standingsResult, statisticsResult, coachResult, trophiesResult] =
    await Promise.allSettled([
    fetchOverviewFixtures(teamId, leagueId, season, timezone),
    fetchOverviewNextFixture(teamId, timezone),
    fetchOverviewStandings(leagueId, season),
    fetchOverviewStatistics(teamId, leagueId, season),
    fetchOverviewCoach(teamId),
    fetchOverviewTrophies(teamId, logger),
  ]);

  if (fixturesResult.status === 'rejected' && nextFixtureResult.status === 'rejected') {
    throw toSettledError(
      [fixturesResult, nextFixtureResult],
      'Unable to load overview match datasets',
    );
  }

  if (standingsResult.status === 'rejected' && statisticsResult.status === 'rejected') {
    throw toSettledError(
      [standingsResult, statisticsResult],
      'Unable to load overview standings and statistics datasets',
    );
  }

  const fixturesPayload = fixturesResult.status === 'fulfilled' ? fixturesResult.value : [];
  const nextFixturePayload = nextFixtureResult.status === 'fulfilled' ? nextFixtureResult.value : null;
  const standingsPayload = standingsResult.status === 'fulfilled' ? standingsResult.value : null;
  const statisticsPayload = statisticsResult.status === 'fulfilled' ? statisticsResult.value : null;
  const coach = coachResult.status === 'fulfilled' ? coachResult.value : null;
  const trophiesPayload = trophiesResult.status === 'fulfilled' ? trophiesResult.value : [];

  const matchesData = mapFixturesToTeamMatches(fixturesPayload);
  const standings = mapStandings(standingsPayload, teamId);
  const standingRow = findTeamStandingRow(standings.groups);
  const seasonStats = buildSeasonStats(statisticsPayload, standingRow);
  const currentStandingRows = resolveCurrentStandingRows(standings.groups);
  const miniStandingRows = buildMiniStandingRows(currentStandingRows);
  const coachPerformance = buildCoachPerformance(coach, seasonStats);

  const resolvedHistorySeasons = buildHistorySeasons(season, historySeasons);
  const historyResults = await Promise.allSettled(
    resolvedHistorySeasons.map(historySeason => {
      if (historySeason === season && standingsResult.status === 'fulfilled') {
        return Promise.resolve(standingsResult.value);
      }

      return fetchOverviewStandings(leagueId, historySeason);
    }),
  );

  const standingHistory = resolvedHistorySeasons.map((historySeason, index) => {
    const historyPayload = historyResults[index];

    if (historyPayload?.status !== 'fulfilled') {
      return {
        season: historySeason,
        rank: null,
      };
    }

    const historyStandings = mapStandings(historyPayload.value, teamId);
    const historyStandingRow = findTeamStandingRow(historyStandings.groups);
    return {
      season: historySeason,
      rank: historyStandingRow?.rank ?? null,
    };
  });

  const nextMatch = nextFixturePayload
    ? mapFixtureToTeamMatch(nextFixturePayload)
    : matchesData.upcoming[0] ?? null;

  const leagueName =
    standings.leagueName ??
    matchesData.all[0]?.leagueName ??
    toText(statisticsPayload?.league?.name);
  const leagueLogo = standings.leagueLogo ?? matchesData.all[0]?.leagueLogo ?? null;

  return {
    nextMatch,
    recentForm: mapRecentTeamForm(matchesData.past, teamId, 5),
    seasonStats,
    miniStanding:
      miniStandingRows.length > 0
        ? {
          leagueId: standings.leagueId ?? leagueId,
          leagueName,
          leagueLogo,
          rows: miniStandingRows,
        }
        : null,
    standingHistory,
    coachPerformance,
    trophiesCount: trophiesPayload.length,
    trophyWinsCount: trophiesPayload.filter(item => isWinnerTrophy(toText(item.place))).length,
  };
}

export function parseOverviewHistorySeasons(value: string | undefined): number[] | undefined {
  return parseHistorySeasonsCsv(value);
}
