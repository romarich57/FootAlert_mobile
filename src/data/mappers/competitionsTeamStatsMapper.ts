import type {
  CompetitionTeamAdvancedMetricKey,
  CompetitionTeamAdvancedRow,
  CompetitionTeamAdvancedSection,
  CompetitionTeamHomeAwayMetricKey,
  CompetitionTeamStatsComputedRow,
  CompetitionTeamStatsDashboardData,
  CompetitionTeamStatsLeaderboard,
  CompetitionTeamStatsLeaderboardItem,
  CompetitionTeamStatsMetricKey,
  CompetitionTeamStatsSection,
  CompetitionTeamStatsSortOrder,
  StandingGroup,
  StandingRow,
} from '@domain/contracts/competitions.types';
import type { TeamAdvancedStatsDto, TeamApiStatisticsDto } from '@domain/contracts/teams.types';

export type CompetitionTeamAdvancedPayload = {
  teamId: number;
  statistics: TeamApiStatisticsDto | null;
  advanced: TeamAdvancedStatsDto | null;
};

export const COMPETITION_TEAM_SUMMARY_METRICS: CompetitionTeamStatsMetricKey[] = [
  'pointsPerMatch',
  'winRate',
  'goalsScoredPerMatch',
  'goalsConcededPerMatch',
  'goalDiffPerMatch',
  'formIndex',
  'formPointsPerMatch',
];

export const COMPETITION_TEAM_HOME_AWAY_METRICS: CompetitionTeamHomeAwayMetricKey[] = [
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

export const COMPETITION_TEAM_ADVANCED_METRICS: CompetitionTeamAdvancedMetricKey[] = [
  'cleanSheets',
  'failedToScore',
  'xGPerMatch',
  'possession',
  'shotsPerMatch',
  'shotsOnTargetPerMatch',
];

const SUMMARY_SORT_ORDERS: Record<CompetitionTeamStatsMetricKey, CompetitionTeamStatsSortOrder> = {
  pointsPerMatch: 'desc',
  winRate: 'desc',
  goalsScoredPerMatch: 'desc',
  goalsConcededPerMatch: 'asc',
  goalDiffPerMatch: 'desc',
  formIndex: 'desc',
  formPointsPerMatch: 'desc',
};

const HOME_AWAY_SORT_ORDERS: Record<CompetitionTeamHomeAwayMetricKey, CompetitionTeamStatsSortOrder> = {
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

const ADVANCED_SORT_ORDERS: Record<CompetitionTeamAdvancedMetricKey, CompetitionTeamStatsSortOrder> = {
  cleanSheets: 'desc',
  failedToScore: 'asc',
  xGPerMatch: 'desc',
  possession: 'desc',
  shotsPerMatch: 'desc',
  shotsOnTargetPerMatch: 'desc',
};

const GOAL_MINUTE_SLOTS = ['0-15', '16-30', '31-45', '46-60', '61-75', '76-90', '91-105', '106-120'];

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function round(value: number, digits: number): number {
  return Number(value.toFixed(digits));
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

function sortLeaderboardItems(
  items: CompetitionTeamStatsLeaderboardItem[],
  sortOrder: CompetitionTeamStatsSortOrder,
): CompetitionTeamStatsLeaderboardItem[] {
  return [...items].sort((first, second) => {
    if (first.value !== second.value) {
      return sortOrder === 'desc' ? second.value - first.value : first.value - second.value;
    }

    return first.teamName.localeCompare(second.teamName);
  });
}

function buildLeaderboard<K extends string, T extends { teamId: number; teamName: string; teamLogo: string }>(
  metric: K,
  rows: T[],
  valueGetter: (row: T) => number | null,
  sortOrder: CompetitionTeamStatsSortOrder,
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

function createSummarySection(
  rows: CompetitionTeamStatsComputedRow[],
): CompetitionTeamStatsSection<CompetitionTeamStatsMetricKey> {
  return {
    metrics: COMPETITION_TEAM_SUMMARY_METRICS,
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

function createHomeAwaySection(
  rows: CompetitionTeamStatsComputedRow[],
): CompetitionTeamStatsSection<CompetitionTeamHomeAwayMetricKey> {
  return {
    metrics: COMPETITION_TEAM_HOME_AWAY_METRICS,
    leaderboards: {
      homePPG: buildLeaderboard('homePPG', rows, row => row.homePPG, HOME_AWAY_SORT_ORDERS.homePPG),
      awayPPG: buildLeaderboard('awayPPG', rows, row => row.awayPPG, HOME_AWAY_SORT_ORDERS.awayPPG),
      homeGoalsFor: buildLeaderboard('homeGoalsFor', rows, row => row.homeGoalsFor, HOME_AWAY_SORT_ORDERS.homeGoalsFor),
      awayGoalsFor: buildLeaderboard('awayGoalsFor', rows, row => row.awayGoalsFor, HOME_AWAY_SORT_ORDERS.awayGoalsFor),
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

function mapGoalMinuteBreakdown(payload: TeamApiStatisticsDto | null) {
  if (!payload) {
    return [];
  }

  const mapped = GOAL_MINUTE_SLOTS.map(slot => ({
    key: slot,
    label: slot,
    value: toFiniteNumber(payload.goals?.for?.minute?.[slot]?.total),
  }));

  return mapped.some(item => item.value !== null) ? mapped : [];
}

function mapAdvancedRow(
  team: CompetitionTeamStatsComputedRow,
  payload: CompetitionTeamAdvancedPayload | null,
): CompetitionTeamAdvancedRow {
  return {
    teamId: team.teamId,
    teamName: team.teamName,
    teamLogo: team.teamLogo,
    cleanSheets: toFiniteNumber(payload?.statistics?.fixtures?.clean_sheet?.total),
    failedToScore: toFiniteNumber(payload?.statistics?.fixtures?.failed_to_score?.total),
    xGPerMatch: toFiniteNumber(payload?.advanced?.metrics?.expectedGoalsPerMatch?.value),
    possession: toFiniteNumber(payload?.advanced?.metrics?.possession?.value),
    shotsPerMatch: toFiniteNumber(payload?.advanced?.metrics?.shotsPerMatch?.value),
    shotsOnTargetPerMatch: toFiniteNumber(payload?.advanced?.metrics?.shotsOnTargetPerMatch?.value),
    goalMinuteBreakdown: mapGoalMinuteBreakdown(payload?.statistics ?? null),
  };
}

function createAdvancedSection(
  top10Teams: CompetitionTeamStatsComputedRow[],
  payloads: CompetitionTeamAdvancedPayload[],
): CompetitionTeamAdvancedSection {
  const payloadByTeamId = new Map(payloads.map(payload => [payload.teamId, payload]));
  const rows = top10Teams.map(team => mapAdvancedRow(team, payloadByTeamId.get(team.teamId) ?? null));

  const leaderboards: CompetitionTeamAdvancedSection['leaderboards'] = {
    cleanSheets: buildLeaderboard('cleanSheets', rows, row => row.cleanSheets, ADVANCED_SORT_ORDERS.cleanSheets),
    failedToScore: buildLeaderboard('failedToScore', rows, row => row.failedToScore, ADVANCED_SORT_ORDERS.failedToScore),
    xGPerMatch: buildLeaderboard('xGPerMatch', rows, row => row.xGPerMatch, ADVANCED_SORT_ORDERS.xGPerMatch),
    possession: buildLeaderboard('possession', rows, row => row.possession, ADVANCED_SORT_ORDERS.possession),
    shotsPerMatch: buildLeaderboard('shotsPerMatch', rows, row => row.shotsPerMatch, ADVANCED_SORT_ORDERS.shotsPerMatch),
    shotsOnTargetPerMatch: buildLeaderboard(
      'shotsOnTargetPerMatch',
      rows,
      row => row.shotsOnTargetPerMatch,
      ADVANCED_SORT_ORDERS.shotsOnTargetPerMatch,
    ),
  };

  return {
    metrics: COMPETITION_TEAM_ADVANCED_METRICS,
    rows,
    top10TeamIds: top10Teams.map(team => team.teamId),
    leaderboards,
    unavailableMetrics: COMPETITION_TEAM_ADVANCED_METRICS.filter(metric => leaderboards[metric].items.length === 0),
  };
}

export function flattenStandingGroups(groups: StandingGroup[] | null | undefined): StandingRow[] {
  if (!groups || groups.length === 0) {
    return [];
  }

  return groups.flatMap(group => group.rows);
}

export function mapStandingRowsToComputedTeamStats(rows: StandingRow[]): CompetitionTeamStatsComputedRow[] {
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
      rank: row.rank,
      teamId: row.teamId,
      teamName: row.teamName,
      teamLogo: row.teamLogo,
      points: row.points,
      goalsDiff: row.goalsDiff,
      played: row.played,
      win: row.win,
      draw: row.draw,
      lose: row.lose,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      form: row.form,
      home: row.home,
      away: row.away,
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

export function selectTopTeamsForAdvancedScope(
  rows: CompetitionTeamStatsComputedRow[],
  limit = 10,
): CompetitionTeamStatsComputedRow[] {
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

export function buildCompetitionTeamStatsDashboardData(
  groups: StandingGroup[] | null | undefined,
  advancedPayloads: CompetitionTeamAdvancedPayload[] = [],
): CompetitionTeamStatsDashboardData {
  const standingRows = flattenStandingGroups(groups);
  const computedRows = mapStandingRowsToComputedTeamStats(standingRows);
  const top10Teams = selectTopTeamsForAdvancedScope(computedRows, 10);

  return {
    summary: createSummarySection(computedRows),
    homeAway: createHomeAwaySection(computedRows),
    advanced: createAdvancedSection(top10Teams, advancedPayloads),
  };
}
