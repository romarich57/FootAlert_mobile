import type { FastifyInstance } from 'fastify';

import { apiFootballGet } from '../../lib/apiFootballClient.js';
import {
  buildCanonicalCacheKey,
  withCache,
  withCacheStaleWhileRevalidate,
} from '../../lib/cache.js';
import { mapWithConcurrency } from '../../lib/concurrency/mapWithConcurrency.js';
import { UpstreamBffError } from '../../lib/errors.js';
import { parseOrThrow } from '../../lib/validation.js';
import {
  buildTeamAdvancedStatsPayload,
  computeLeagueAdvancedTeamStats,
  TEAM_ADVANCED_STATS_CACHE_TTL_MS,
} from '../teams/advancedStats.js';
import { toFiniteNumber, toNumericId } from '../teams/helpers.js';

import { registerCompetitionBracketRoute } from './bracketRoute.js';
import { registerCompetitionCoreRoutes } from './coreRoutes.js';
import { registerCompetitionMatchesRoute } from './matchesRoute.js';
import { registerCompetitionPlayerStatsRoute } from './playerStatsRoute.js';
import { requiredSeasonQuerySchema, competitionIdParamsSchema } from './schemas.js';
import { registerCompetitionStandingsRoute } from './standingsRoute.js';
import { registerCompetitionTotwRoute } from './totwRoute.js';
import { registerCompetitionTransfersRoute } from './transfersRoute.js';

type SummaryMetricKey =
  | 'pointsPerMatch'
  | 'winRate'
  | 'goalsScoredPerMatch'
  | 'goalsConcededPerMatch'
  | 'goalDiffPerMatch'
  | 'formIndex'
  | 'formPointsPerMatch';

type HomeAwayMetricKey =
  | 'homePPG'
  | 'awayPPG'
  | 'homeGoalsFor'
  | 'awayGoalsFor'
  | 'homeGoalsAgainst'
  | 'awayGoalsAgainst'
  | 'deltaHomeAwayPPG'
  | 'deltaHomeAwayGoalsFor'
  | 'deltaHomeAwayGoalsAgainst';

type AdvancedMetricKey =
  | 'cleanSheets'
  | 'failedToScore'
  | 'xGPerMatch'
  | 'possession'
  | 'shotsPerMatch'
  | 'shotsOnTargetPerMatch';

type TeamStatsAvailabilityState = 'available' | 'partial' | 'unavailable';
type TeamStatsAvailabilityReason =
  | 'provider_missing'
  | 'grouped_competition'
  | 'upstream_error'
  | 'rate_limited'
  | null;

type StandingSplitRaw = {
  played?: unknown;
  win?: unknown;
  draw?: unknown;
  lose?: unknown;
  goals?: {
    for?: unknown;
    against?: unknown;
  };
};

type StandingRowRaw = {
  rank?: unknown;
  team?: {
    id?: unknown;
    name?: unknown;
    logo?: unknown;
  };
  points?: unknown;
  goalsDiff?: unknown;
  group?: unknown;
  form?: unknown;
  all?: StandingSplitRaw;
  home?: StandingSplitRaw;
  away?: StandingSplitRaw;
};

type CompetitionStandingsPayload = {
  response?: Array<{
    league?: {
      standings?: StandingRowRaw[][];
    };
  }>;
};

type CompetitionStandingSplit = {
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
};

type CompetitionStandingRow = {
  rank: number;
  teamId: number;
  teamName: string;
  teamLogo: string;
  points: number;
  goalsDiff: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
  group: string;
  form: string;
  home: CompetitionStandingSplit;
  away: CompetitionStandingSplit;
};

type CompetitionComputedRow = CompetitionStandingRow & {
  pointsPerMatch: number | null;
  winRate: number | null;
  goalsScoredPerMatch: number | null;
  goalsConcededPerMatch: number | null;
  goalDiffPerMatch: number | null;
  formIndex: number | null;
  formPointsPerMatch: number | null;
  homePPG: number | null;
  awayPPG: number | null;
  homeGoalsFor: number | null;
  awayGoalsFor: number | null;
  homeGoalsAgainst: number | null;
  awayGoalsAgainst: number | null;
  deltaHomeAwayPPG: number | null;
  deltaHomeAwayGoalsFor: number | null;
  deltaHomeAwayGoalsAgainst: number | null;
};

type TeamStatisticPayload = {
  fixtures?: {
    clean_sheet?: {
      total?: unknown;
    };
    failed_to_score?: {
      total?: unknown;
    };
  };
  goals?: {
    for?: {
      minute?: Record<
        string,
        {
          total?: unknown;
        }
      >;
    };
  };
};

type CompetitionTeamStatsLeaderboardItem = {
  teamId: number;
  teamName: string;
  teamLogo: string;
  value: number;
};

type CompetitionTeamStatsLeaderboard<K extends string> = {
  metric: K;
  sortOrder: 'asc' | 'desc';
  items: CompetitionTeamStatsLeaderboardItem[];
};

type CompetitionTeamStatsSection<K extends string> = {
  metrics: K[];
  leaderboards: Record<K, CompetitionTeamStatsLeaderboard<K>>;
};

type CompetitionTeamAdvancedRow = {
  teamId: number;
  teamName: string;
  teamLogo: string;
  cleanSheets: number | null;
  failedToScore: number | null;
  xGPerMatch: number | null;
  possession: number | null;
  shotsPerMatch: number | null;
  shotsOnTargetPerMatch: number | null;
  goalMinuteBreakdown: Array<{
    key: string;
    label: string;
    value: number | null;
  }>;
};

type CompetitionTeamAdvancedSection = CompetitionTeamStatsSection<AdvancedMetricKey> & {
  rows: CompetitionTeamAdvancedRow[];
  top10TeamIds: number[];
  unavailableMetrics: AdvancedMetricKey[];
  state: TeamStatsAvailabilityState;
  reason: TeamStatsAvailabilityReason;
};

type CompetitionTeamStatsResponse = {
  summary: CompetitionTeamStatsSection<SummaryMetricKey>;
  homeAway: CompetitionTeamStatsSection<HomeAwayMetricKey>;
  advanced: CompetitionTeamAdvancedSection;
};

type TeamStatsQueryResult = {
  teamId: number;
  statistics: TeamStatisticPayload | null;
  error: unknown | null;
};

const SUMMARY_METRICS: SummaryMetricKey[] = [
  'pointsPerMatch',
  'winRate',
  'goalsScoredPerMatch',
  'goalsConcededPerMatch',
  'goalDiffPerMatch',
  'formIndex',
  'formPointsPerMatch',
];

const HOME_AWAY_METRICS: HomeAwayMetricKey[] = [
  'homePPG',
  'awayPPG',
  'homeGoalsFor',
  'awayGoalsFor',
  'homeGoalsAgainst',
  'awayGoalsAgainst',
  'deltaHomeAwayPPG',
  'deltaHomeAwayGoalsFor',
  'deltaHomeAwayGoalsAgainst',
];

const ADVANCED_METRICS: AdvancedMetricKey[] = [
  'cleanSheets',
  'failedToScore',
  'xGPerMatch',
  'possession',
  'shotsPerMatch',
  'shotsOnTargetPerMatch',
];

const GOAL_MINUTE_SLOTS = [
  '0-15',
  '16-30',
  '31-45',
  '46-60',
  '61-75',
  '76-90',
  '91-105',
  '106-120',
];

const SUMMARY_SORT_ORDERS: Record<SummaryMetricKey, 'asc' | 'desc'> = {
  pointsPerMatch: 'desc',
  winRate: 'desc',
  goalsScoredPerMatch: 'desc',
  goalsConcededPerMatch: 'asc',
  goalDiffPerMatch: 'desc',
  formIndex: 'desc',
  formPointsPerMatch: 'desc',
};

const HOME_AWAY_SORT_ORDERS: Record<HomeAwayMetricKey, 'asc' | 'desc'> = {
  homePPG: 'desc',
  awayPPG: 'desc',
  homeGoalsFor: 'desc',
  awayGoalsFor: 'desc',
  homeGoalsAgainst: 'asc',
  awayGoalsAgainst: 'asc',
  deltaHomeAwayPPG: 'desc',
  deltaHomeAwayGoalsFor: 'desc',
  deltaHomeAwayGoalsAgainst: 'desc',
};

const ADVANCED_SORT_ORDERS: Record<AdvancedMetricKey, 'asc' | 'desc'> = {
  cleanSheets: 'desc',
  failedToScore: 'asc',
  xGPerMatch: 'desc',
  possession: 'desc',
  shotsPerMatch: 'desc',
  shotsOnTargetPerMatch: 'desc',
};

function round(value: number, digits: number): number {
  return Number(value.toFixed(digits));
}

function toSafeNumber(value: unknown): number {
  return toNumericId(value) ?? 0;
}

function toPerMatch(total: number, played: number, digits = 2): number | null {
  if (!Number.isFinite(total) || !Number.isFinite(played) || played <= 0) {
    return null;
  }

  return round(total / played, digits);
}

function parseForm(form: string): { formIndex: number | null; matchesInForm: number } {
  const normalized = form.toUpperCase();
  let points = 0;
  let matchesInForm = 0;

  for (const char of normalized) {
    if (char === 'W') {
      points += 3;
      matchesInForm += 1;
      continue;
    }

    if (char === 'D') {
      points += 1;
      matchesInForm += 1;
      continue;
    }

    if (char === 'L') {
      matchesInForm += 1;
    }
  }

  return {
    formIndex: matchesInForm > 0 ? points : null,
    matchesInForm,
  };
}

function normalizeStandingSplit(raw: StandingSplitRaw | null | undefined): CompetitionStandingSplit {
  return {
    played: toSafeNumber(raw?.played),
    win: toSafeNumber(raw?.win),
    draw: toSafeNumber(raw?.draw),
    lose: toSafeNumber(raw?.lose),
    goalsFor: toSafeNumber(raw?.goals?.for),
    goalsAgainst: toSafeNumber(raw?.goals?.against),
  };
}

function normalizeStandingRows(payload: CompetitionStandingsPayload): CompetitionStandingRow[] {
  const groups = payload.response?.[0]?.league?.standings ?? [];

  return groups.flatMap((group, groupIndex) =>
    group
      .map(row => {
        const teamId = toNumericId(row.team?.id);
        if (!teamId) {
          return null;
        }

        return {
          rank: toSafeNumber(row.rank),
          teamId,
          teamName: typeof row.team?.name === 'string' ? row.team.name.trim() : '',
          teamLogo: typeof row.team?.logo === 'string' ? row.team.logo : '',
          points: toSafeNumber(row.points),
          goalsDiff: toSafeNumber(row.goalsDiff),
          played: toSafeNumber(row.all?.played),
          win: toSafeNumber(row.all?.win),
          draw: toSafeNumber(row.all?.draw),
          lose: toSafeNumber(row.all?.lose),
          goalsFor: toSafeNumber(row.all?.goals?.for),
          goalsAgainst: toSafeNumber(row.all?.goals?.against),
          group:
            typeof row.group === 'string' && row.group.trim().length > 0
              ? row.group.trim()
              : `Group ${groupIndex + 1}`,
          form: typeof row.form === 'string' ? row.form : '',
          home: normalizeStandingSplit(row.home),
          away: normalizeStandingSplit(row.away),
        } satisfies CompetitionStandingRow;
      })
      .filter((row): row is CompetitionStandingRow => row !== null),
  );
}

function isGroupedCompetition(payload: CompetitionStandingsPayload): boolean {
  const groups = payload.response?.[0]?.league?.standings ?? [];
  return groups.length > 1;
}

function mapStandingRowsToComputedTeamStats(rows: CompetitionStandingRow[]): CompetitionComputedRow[] {
  return rows.map(row => {
    const pointsPerMatch = toPerMatch(row.points, row.played, 2);
    const winRate = row.played > 0 ? round((row.win / row.played) * 100, 1) : null;
    const goalsScoredPerMatch = toPerMatch(row.goalsFor, row.played, 2);
    const goalsConcededPerMatch = toPerMatch(row.goalsAgainst, row.played, 2);
    const goalDiffPerMatch = toPerMatch(row.goalsDiff, row.played, 2);
    const parsedForm = parseForm(row.form);
    const formPointsPerMatch =
      parsedForm.formIndex !== null && parsedForm.matchesInForm > 0
        ? round(parsedForm.formIndex / parsedForm.matchesInForm, 2)
        : null;
    const homePoints = row.home.win * 3 + row.home.draw;
    const awayPoints = row.away.win * 3 + row.away.draw;
    const homePPG = toPerMatch(homePoints, row.home.played, 2);
    const awayPPG = toPerMatch(awayPoints, row.away.played, 2);

    return {
      ...row,
      pointsPerMatch,
      winRate,
      goalsScoredPerMatch,
      goalsConcededPerMatch,
      goalDiffPerMatch,
      formIndex: parsedForm.formIndex,
      formPointsPerMatch,
      homePPG,
      awayPPG,
      homeGoalsFor: row.home.goalsFor,
      awayGoalsFor: row.away.goalsFor,
      homeGoalsAgainst: row.home.goalsAgainst,
      awayGoalsAgainst: row.away.goalsAgainst,
      deltaHomeAwayPPG:
        homePPG !== null && awayPPG !== null ? round(homePPG - awayPPG, 2) : null,
      deltaHomeAwayGoalsFor: row.home.goalsFor - row.away.goalsFor,
      deltaHomeAwayGoalsAgainst: row.away.goalsAgainst - row.home.goalsAgainst,
    };
  });
}

function sortLeaderboardItems(
  items: CompetitionTeamStatsLeaderboardItem[],
  sortOrder: 'asc' | 'desc',
): CompetitionTeamStatsLeaderboardItem[] {
  return [...items].sort((first, second) => {
    if (first.value !== second.value) {
      return sortOrder === 'desc' ? second.value - first.value : first.value - second.value;
    }

    return first.teamName.localeCompare(second.teamName);
  });
}

function buildLeaderboard<
  K extends string,
  T extends {
    teamId: number;
    teamName: string;
    teamLogo: string;
  },
>(
  metric: K,
  rows: T[],
  valueGetter: (row: T) => number | null,
  sortOrder: 'asc' | 'desc',
): CompetitionTeamStatsLeaderboard<K> {
  const items = rows
    .map(row => {
      const value = valueGetter(row);
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return null;
      }

      return {
        teamId: row.teamId,
        teamName: row.teamName,
        teamLogo: row.teamLogo,
        value,
      } satisfies CompetitionTeamStatsLeaderboardItem;
    })
    .filter((item): item is CompetitionTeamStatsLeaderboardItem => item !== null);

  return {
    metric,
    sortOrder,
    items: sortLeaderboardItems(items, sortOrder).slice(0, 10),
  };
}

function buildSummarySection(
  rows: CompetitionComputedRow[],
): CompetitionTeamStatsSection<SummaryMetricKey> {
  return {
    metrics: SUMMARY_METRICS,
    leaderboards: {
      pointsPerMatch: buildLeaderboard('pointsPerMatch', rows, row => row.pointsPerMatch, SUMMARY_SORT_ORDERS.pointsPerMatch),
      winRate: buildLeaderboard('winRate', rows, row => row.winRate, SUMMARY_SORT_ORDERS.winRate),
      goalsScoredPerMatch: buildLeaderboard(
        'goalsScoredPerMatch',
        rows,
        row => row.goalsScoredPerMatch,
        SUMMARY_SORT_ORDERS.goalsScoredPerMatch,
      ),
      goalsConcededPerMatch: buildLeaderboard(
        'goalsConcededPerMatch',
        rows,
        row => row.goalsConcededPerMatch,
        SUMMARY_SORT_ORDERS.goalsConcededPerMatch,
      ),
      goalDiffPerMatch: buildLeaderboard(
        'goalDiffPerMatch',
        rows,
        row => row.goalDiffPerMatch,
        SUMMARY_SORT_ORDERS.goalDiffPerMatch,
      ),
      formIndex: buildLeaderboard('formIndex', rows, row => row.formIndex, SUMMARY_SORT_ORDERS.formIndex),
      formPointsPerMatch: buildLeaderboard(
        'formPointsPerMatch',
        rows,
        row => row.formPointsPerMatch,
        SUMMARY_SORT_ORDERS.formPointsPerMatch,
      ),
    },
  };
}

function buildHomeAwaySection(
  rows: CompetitionComputedRow[],
): CompetitionTeamStatsSection<HomeAwayMetricKey> {
  return {
    metrics: HOME_AWAY_METRICS,
    leaderboards: {
      homePPG: buildLeaderboard('homePPG', rows, row => row.homePPG, HOME_AWAY_SORT_ORDERS.homePPG),
      awayPPG: buildLeaderboard('awayPPG', rows, row => row.awayPPG, HOME_AWAY_SORT_ORDERS.awayPPG),
      homeGoalsFor: buildLeaderboard(
        'homeGoalsFor',
        rows,
        row => row.homeGoalsFor,
        HOME_AWAY_SORT_ORDERS.homeGoalsFor,
      ),
      awayGoalsFor: buildLeaderboard(
        'awayGoalsFor',
        rows,
        row => row.awayGoalsFor,
        HOME_AWAY_SORT_ORDERS.awayGoalsFor,
      ),
      homeGoalsAgainst: buildLeaderboard(
        'homeGoalsAgainst',
        rows,
        row => row.homeGoalsAgainst,
        HOME_AWAY_SORT_ORDERS.homeGoalsAgainst,
      ),
      awayGoalsAgainst: buildLeaderboard(
        'awayGoalsAgainst',
        rows,
        row => row.awayGoalsAgainst,
        HOME_AWAY_SORT_ORDERS.awayGoalsAgainst,
      ),
      deltaHomeAwayPPG: buildLeaderboard(
        'deltaHomeAwayPPG',
        rows,
        row => row.deltaHomeAwayPPG,
        HOME_AWAY_SORT_ORDERS.deltaHomeAwayPPG,
      ),
      deltaHomeAwayGoalsFor: buildLeaderboard(
        'deltaHomeAwayGoalsFor',
        rows,
        row => row.deltaHomeAwayGoalsFor,
        HOME_AWAY_SORT_ORDERS.deltaHomeAwayGoalsFor,
      ),
      deltaHomeAwayGoalsAgainst: buildLeaderboard(
        'deltaHomeAwayGoalsAgainst',
        rows,
        row => row.deltaHomeAwayGoalsAgainst,
        HOME_AWAY_SORT_ORDERS.deltaHomeAwayGoalsAgainst,
      ),
    },
  };
}

function selectTopTeamsForAdvancedScope(rows: CompetitionComputedRow[], limit = 10): CompetitionComputedRow[] {
  return [...rows]
    .sort((first, second) => {
      if (first.points !== second.points) {
        return second.points - first.points;
      }

      if (first.goalsDiff !== second.goalsDiff) {
        return second.goalsDiff - first.goalsDiff;
      }

      if (first.goalsFor !== second.goalsFor) {
        return second.goalsFor - first.goalsFor;
      }

      return first.teamName.localeCompare(second.teamName);
    })
    .slice(0, limit);
}

function mapGoalMinuteBreakdown(statistics: TeamStatisticPayload | null) {
  const mapped = GOAL_MINUTE_SLOTS.map(slot => ({
    key: slot,
    label: slot,
    value: toFiniteNumber(statistics?.goals?.for?.minute?.[slot]?.total),
  }));

  return mapped.some(item => item.value !== null) ? mapped : [];
}

function resolveAvailabilityReason(errors: unknown[]): TeamStatsAvailabilityReason {
  if (errors.length === 0) {
    return 'provider_missing';
  }

  return errors.some(
    error => error instanceof UpstreamBffError && error.statusCode === 429,
  )
    ? 'rate_limited'
    : 'upstream_error';
}

async function fetchCompetitionTeamStatistics(
  leagueId: string,
  season: number,
  teamId: number,
): Promise<TeamStatisticPayload | null> {
  const payload = await withCache(
    buildCanonicalCacheKey('competition:team-stats:team', {
      leagueId,
      season,
      teamId,
    }),
    60_000,
    () =>
      apiFootballGet<{ response?: unknown }>(
        `/teams/statistics?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}&team=${encodeURIComponent(String(teamId))}`,
      ),
  );

  const response = Array.isArray(payload.response)
    ? payload.response[0]
    : payload.response;

  return response && typeof response === 'object'
    ? (response as TeamStatisticPayload)
    : null;
}

async function fetchCompetitionAdvancedTeamStatistics(
  leagueId: string,
  season: number,
  topTeams: CompetitionComputedRow[],
): Promise<TeamStatsQueryResult[]> {
  return mapWithConcurrency(topTeams, 4, async team => {
    try {
      return {
        teamId: team.teamId,
        statistics: await fetchCompetitionTeamStatistics(leagueId, season, team.teamId),
        error: null,
      } satisfies TeamStatsQueryResult;
    } catch (error) {
      return {
        teamId: team.teamId,
        statistics: null,
        error,
      } satisfies TeamStatsQueryResult;
    }
  });
}

async function buildCompetitionTeamStatsResponse(
  leagueId: string,
  season: number,
): Promise<CompetitionTeamStatsResponse> {
  const standingsPayload = await withCache(
    buildCanonicalCacheKey('competition:team-stats:standings', {
      leagueId,
      season,
    }),
    90_000,
    () =>
      apiFootballGet<CompetitionStandingsPayload>(
        `/standings?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}`,
      ),
  );

  const standingRows = normalizeStandingRows(standingsPayload);
  const computedRows = mapStandingRowsToComputedTeamStats(standingRows);
  const summary = buildSummarySection(computedRows);
  const homeAway = buildHomeAwaySection(computedRows);

  if (computedRows.length === 0) {
    return {
      summary,
      homeAway,
      advanced: {
        metrics: ADVANCED_METRICS,
        rows: [],
        top10TeamIds: [],
        unavailableMetrics: ADVANCED_METRICS,
        state: 'unavailable',
        reason: 'provider_missing',
        leaderboards: {
          cleanSheets: buildLeaderboard('cleanSheets', [], () => null, ADVANCED_SORT_ORDERS.cleanSheets),
          failedToScore: buildLeaderboard('failedToScore', [], () => null, ADVANCED_SORT_ORDERS.failedToScore),
          xGPerMatch: buildLeaderboard('xGPerMatch', [], () => null, ADVANCED_SORT_ORDERS.xGPerMatch),
          possession: buildLeaderboard('possession', [], () => null, ADVANCED_SORT_ORDERS.possession),
          shotsPerMatch: buildLeaderboard('shotsPerMatch', [], () => null, ADVANCED_SORT_ORDERS.shotsPerMatch),
          shotsOnTargetPerMatch: buildLeaderboard(
            'shotsOnTargetPerMatch',
            [],
            () => null,
            ADVANCED_SORT_ORDERS.shotsOnTargetPerMatch,
          ),
        },
      },
    };
  }

  if (isGroupedCompetition(standingsPayload)) {
    return {
      summary,
      homeAway,
      advanced: {
        metrics: ADVANCED_METRICS,
        rows: [],
        top10TeamIds: [],
        unavailableMetrics: ADVANCED_METRICS,
        state: 'unavailable',
        reason: 'grouped_competition',
        leaderboards: {
          cleanSheets: buildLeaderboard('cleanSheets', [], () => null, ADVANCED_SORT_ORDERS.cleanSheets),
          failedToScore: buildLeaderboard('failedToScore', [], () => null, ADVANCED_SORT_ORDERS.failedToScore),
          xGPerMatch: buildLeaderboard('xGPerMatch', [], () => null, ADVANCED_SORT_ORDERS.xGPerMatch),
          possession: buildLeaderboard('possession', [], () => null, ADVANCED_SORT_ORDERS.possession),
          shotsPerMatch: buildLeaderboard('shotsPerMatch', [], () => null, ADVANCED_SORT_ORDERS.shotsPerMatch),
          shotsOnTargetPerMatch: buildLeaderboard(
            'shotsOnTargetPerMatch',
            [],
            () => null,
            ADVANCED_SORT_ORDERS.shotsOnTargetPerMatch,
          ),
        },
      },
    };
  }

  const topTeams = selectTopTeamsForAdvancedScope(computedRows);
  const [advancedStatsResult, teamStatisticsResults] = await Promise.all([
    withCacheStaleWhileRevalidate(
      `team:advancedstats:league:${leagueId}:season:${season}`,
      TEAM_ADVANCED_STATS_CACHE_TTL_MS,
      () =>
        computeLeagueAdvancedTeamStats(
          leagueId,
          season,
          computedRows.map(team => ({
            teamId: team.teamId,
            teamName: team.teamName,
            teamLogo: team.teamLogo,
          })),
        ),
    ).then(
      value => ({ value, error: null }),
      error => ({ value: null, error }),
    ),
    fetchCompetitionAdvancedTeamStatistics(leagueId, season, topTeams),
  ]);

  const teamStatsByTeamId = new Map(
    teamStatisticsResults.map(result => [result.teamId, result.statistics]),
  );
  const advancedErrors = teamStatisticsResults
    .map(result => result.error)
    .filter((error): error is unknown => error !== null);

  if (advancedStatsResult.error) {
    advancedErrors.push(advancedStatsResult.error);
  }

  const advancedRows = topTeams.map(team => {
    const statistics = teamStatsByTeamId.get(team.teamId) ?? null;
    const advancedPayload = advancedStatsResult.value
      ? buildTeamAdvancedStatsPayload(
          team.teamId,
          advancedStatsResult.value.leagueId,
          advancedStatsResult.value.season,
          advancedStatsResult.value.sourceUpdatedAt,
          advancedStatsResult.value.rankings,
        )
      : null;

    return {
      teamId: team.teamId,
      teamName: team.teamName,
      teamLogo: team.teamLogo,
      cleanSheets: toFiniteNumber(statistics?.fixtures?.clean_sheet?.total),
      failedToScore: toFiniteNumber(statistics?.fixtures?.failed_to_score?.total),
      xGPerMatch: toFiniteNumber(advancedPayload?.metrics?.expectedGoalsPerMatch?.value),
      possession: toFiniteNumber(advancedPayload?.metrics?.possession?.value),
      shotsPerMatch: toFiniteNumber(advancedPayload?.metrics?.shotsPerMatch?.value),
      shotsOnTargetPerMatch: toFiniteNumber(
        advancedPayload?.metrics?.shotsOnTargetPerMatch?.value,
      ),
      goalMinuteBreakdown: mapGoalMinuteBreakdown(statistics),
    } satisfies CompetitionTeamAdvancedRow;
  });

  const advancedLeaderboards: CompetitionTeamAdvancedSection['leaderboards'] = {
    cleanSheets: buildLeaderboard(
      'cleanSheets',
      advancedRows,
      row => row.cleanSheets,
      ADVANCED_SORT_ORDERS.cleanSheets,
    ),
    failedToScore: buildLeaderboard(
      'failedToScore',
      advancedRows,
      row => row.failedToScore,
      ADVANCED_SORT_ORDERS.failedToScore,
    ),
    xGPerMatch: buildLeaderboard(
      'xGPerMatch',
      advancedRows,
      row => row.xGPerMatch,
      ADVANCED_SORT_ORDERS.xGPerMatch,
    ),
    possession: buildLeaderboard(
      'possession',
      advancedRows,
      row => row.possession,
      ADVANCED_SORT_ORDERS.possession,
    ),
    shotsPerMatch: buildLeaderboard(
      'shotsPerMatch',
      advancedRows,
      row => row.shotsPerMatch,
      ADVANCED_SORT_ORDERS.shotsPerMatch,
    ),
    shotsOnTargetPerMatch: buildLeaderboard(
      'shotsOnTargetPerMatch',
      advancedRows,
      row => row.shotsOnTargetPerMatch,
      ADVANCED_SORT_ORDERS.shotsOnTargetPerMatch,
    ),
  };

  const unavailableMetrics = ADVANCED_METRICS.filter(
    metric => advancedLeaderboards[metric].items.length === 0,
  );
  const state: TeamStatsAvailabilityState =
    unavailableMetrics.length === 0
      ? 'available'
      : unavailableMetrics.length === ADVANCED_METRICS.length
        ? 'unavailable'
        : 'partial';

  return {
    summary,
    homeAway,
    advanced: {
      metrics: ADVANCED_METRICS,
      rows: advancedRows,
      top10TeamIds: topTeams.map(team => team.teamId),
      unavailableMetrics,
      state,
      reason: state === 'available' ? null : resolveAvailabilityReason(advancedErrors),
      leaderboards: advancedLeaderboards,
    },
  };
}

function registerCompetitionTeamStatsRoute(app: FastifyInstance): void {
  app.get(
    '/v1/competitions/:id/team-stats',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
    },
    async request => {
      const params = parseOrThrow(competitionIdParamsSchema, request.params);
      const query = parseOrThrow(requiredSeasonQuerySchema, request.query);

      return withCacheStaleWhileRevalidate(
        buildCanonicalCacheKey('competition:team-stats:v1', {
          leagueId: params.id,
          season: query.season,
        }),
        5 * 60_000,
        () => buildCompetitionTeamStatsResponse(params.id, query.season),
      );
    },
  );
}

export async function registerCompetitionsRoutes(app: FastifyInstance): Promise<void> {
  registerCompetitionCoreRoutes(app);
  registerCompetitionStandingsRoute(app);
  registerCompetitionMatchesRoute(app);
  registerCompetitionBracketRoute(app);
  registerCompetitionPlayerStatsRoute(app);
  registerCompetitionTeamStatsRoute(app);
  registerCompetitionTotwRoute(app);
  registerCompetitionTransfersRoute(app);
}
