import type {
  TeamAdvancedMetricDto,
  TeamAdvancedStatsDto,
  TeamApiPlayerDto,
  TeamApiStatisticsDto,
  TeamComparisonMetric,
  TeamComparisonMetricKey,
  TeamStandingRow,
  TeamStatsData,
  TeamStatsRecord,
  TeamStandingsData,
  TeamTopPlayer,
  TeamTopPlayersByCategory,
} from '@domain/contracts/teams.types';

import {
  resolvePrimaryTeamPlayerStatistic,
  TeamPlayerStatContext,
  toId,
  toNumber,
  toParsedFloat,
  toText,
} from './shared';
import { findTeamStandingRow } from './standingsMapper';

function mapGoalMinuteBreakdown(payload: TeamApiStatisticsDto): TeamStatsData['goalBreakdown'] {
  const goalMinutes = payload.goals?.for?.minute;
  const slots = ['0-15', '16-30', '31-45', '46-60', '61-75', '76-90', '91-105', '106-120'];

  const mapped = slots.map(slot => ({
    key: slot,
    label: slot,
    value: toNumber(goalMinutes?.[slot]?.total),
  }));

  return mapped.some(item => item.value !== null) ? mapped : [];
}

function mapPlayerStat(item: TeamApiPlayerDto, context: TeamPlayerStatContext): TeamTopPlayer | null {
  const playerId = toId(item.player?.id);
  if (!playerId) {
    return null;
  }

  const stat = resolvePrimaryTeamPlayerStatistic(item.statistics, context);
  return {
    playerId,
    name: toText(item.player?.name),
    photo: toText(item.player?.photo),
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

function sortByRating(first: TeamTopPlayer, second: TeamTopPlayer): number {
  const byRating = (second.rating ?? -1) - (first.rating ?? -1);
  if (byRating !== 0) {
    return byRating;
  }

  return sortByCompositeScore(first, second);
}

function sortByGoals(first: TeamTopPlayer, second: TeamTopPlayer): number {
  const byGoals = (second.goals ?? -1) - (first.goals ?? -1);
  if (byGoals !== 0) {
    return byGoals;
  }

  return sortByCompositeScore(first, second);
}

function sortByAssists(first: TeamTopPlayer, second: TeamTopPlayer): number {
  const byAssists = (second.assists ?? -1) - (first.assists ?? -1);
  if (byAssists !== 0) {
    return byAssists;
  }

  return sortByCompositeScore(first, second);
}

export function mapPlayersToTopPlayers(
  payload: TeamApiPlayerDto[],
  limit = 8,
  context: TeamPlayerStatContext = {},
): TeamTopPlayer[] {
  const mapped = payload
    .map(item => mapPlayerStat(item, context))
    .filter((item): item is TeamTopPlayer => item !== null)
    .sort(sortByCompositeScore);

  return mapped.slice(0, limit);
}

export function mapPlayersToTopPlayersByCategory(
  payload: TeamApiPlayerDto[],
  limit = 3,
  context: TeamPlayerStatContext = {},
): TeamTopPlayersByCategory {
  const players = payload
    .map(item => mapPlayerStat(item, context))
    .filter((item): item is TeamTopPlayer => item !== null);

  return {
    ratings: players
      .filter(player => player.rating !== null)
      .sort(sortByRating)
      .slice(0, limit),
    scorers: players
      .filter(player => typeof player.goals === 'number' && player.goals > 0)
      .sort(sortByGoals)
      .slice(0, limit),
    assisters: players
      .filter(player => typeof player.assists === 'number' && player.assists > 0)
      .sort(sortByAssists)
      .slice(0, limit),
  };
}

function toAverage(perMatchValue: number | null, total: number | null, played: number | null): number | null {
  if (typeof perMatchValue === 'number') {
    return perMatchValue;
  }

  if (typeof total === 'number' && typeof played === 'number' && played > 0) {
    return Number((total / played).toFixed(2));
  }

  return null;
}

function buildVenueRecord(
  values: {
    played: number | null;
    wins: number | null;
    draws: number | null;
    losses: number | null;
    goalsFor: number | null;
    goalsAgainst: number | null;
  },
): TeamStatsRecord | null {
  const hasAnyValue =
    values.played !== null ||
    values.wins !== null ||
    values.draws !== null ||
    values.losses !== null ||
    values.goalsFor !== null ||
    values.goalsAgainst !== null;

  if (!hasAnyValue) {
    return null;
  }

  const points =
    values.wins !== null || values.draws !== null
      ? (values.wins ?? 0) * 3 + (values.draws ?? 0)
      : null;

  const goalDiff =
    values.goalsFor !== null && values.goalsAgainst !== null
      ? values.goalsFor - values.goalsAgainst
      : null;

  return {
    played: values.played,
    wins: values.wins,
    draws: values.draws,
    losses: values.losses,
    goalsFor: values.goalsFor,
    goalsAgainst: values.goalsAgainst,
    goalDiff,
    points,
  };
}

function resolveVenueRecord(
  standingValues: TeamStandingRow['home'] | TeamStandingRow['away'] | null,
  fallbackValues: {
    played: number | null;
    wins: number | null;
    draws: number | null;
    losses: number | null;
    goalsFor: number | null;
    goalsAgainst: number | null;
  },
): TeamStatsRecord | null {
  if (standingValues) {
    const fromStandings = buildVenueRecord({
      played: toNumber(standingValues.played),
      wins: toNumber(standingValues.win),
      draws: toNumber(standingValues.draw),
      losses: toNumber(standingValues.lose),
      goalsFor: toNumber(standingValues.goalsFor),
      goalsAgainst: toNumber(standingValues.goalsAgainst),
    });

    if (fromStandings) {
      return fromStandings;
    }
  }

  return buildVenueRecord(fallbackValues);
}

function comparisonRowsForTargetTeam(standings: TeamStandingsData): TeamStandingRow[] {
  const targetGroup = standings.groups.find(group => group.rows.some(row => row.isTargetTeam));
  if (targetGroup) {
    return targetGroup.rows;
  }

  return standings.groups[0]?.rows ?? [];
}

function buildStandingsComparisonMetric(
  key: TeamComparisonMetricKey,
  rows: TeamStandingRow[],
  getValue: (row: TeamStandingRow) => number | null,
  sortOrder: 'asc' | 'desc',
): TeamComparisonMetric | null {
  const ranked = rows
    .map(row => ({
      row,
      value: getValue(row),
    }))
    .filter(
      (entry): entry is { row: TeamStandingRow; value: number } =>
        typeof entry.value === 'number' && Number.isFinite(entry.value),
    )
    .sort((first, second) => {
      if (first.value !== second.value) {
        return sortOrder === 'desc' ? second.value - first.value : first.value - second.value;
      }

      return (first.row.teamName ?? '').localeCompare(second.row.teamName ?? '');
    });

  if (ranked.length === 0) {
    return null;
  }

  const teamRankIndex = ranked.findIndex(entry => entry.row.isTargetTeam);
  if (teamRankIndex < 0) {
    return null;
  }

  return {
    key,
    value: ranked[teamRankIndex].value,
    rank: teamRankIndex + 1,
    totalTeams: ranked.length,
    leaders: ranked.slice(0, 3).map(entry => ({
      teamId: entry.row.teamId ?? '',
      teamName: entry.row.teamName,
      teamLogo: entry.row.teamLogo,
      value: entry.value,
    })),
  };
}

function mapAdvancedComparisonMetric(
  key: TeamComparisonMetricKey,
  payload: TeamAdvancedMetricDto | null | undefined,
): TeamComparisonMetric | null {
  const value = toNumber(payload?.value ?? undefined);
  const rank = toNumber(payload?.rank ?? undefined);
  const totalTeams = toNumber(payload?.totalTeams ?? undefined);

  if (value === null || rank === null || totalTeams === null || totalTeams <= 0) {
    return null;
  }

  const leaders = (payload?.leaders ?? [])
    .map(entry => {
      const teamId = toId(entry.teamId);
      const leaderValue = toNumber(entry.value);
      if (!teamId || leaderValue === null) {
        return null;
      }

      return {
        teamId,
        teamName: toText(entry.teamName),
        teamLogo: toText(entry.teamLogo),
        value: leaderValue,
      };
    })
    .filter((entry): entry is TeamComparisonMetric['leaders'][number] => entry !== null);

  return {
    key,
    value,
    rank,
    totalTeams,
    leaders,
  };
}

function buildComparisonMetrics(
  standings: TeamStandingsData,
  advancedStats: TeamAdvancedStatsDto | null,
): TeamComparisonMetric[] {
  const standingsRows = comparisonRowsForTargetTeam(standings);

  const fromStandings = [
    buildStandingsComparisonMetric(
      'pointsPerMatch',
      standingsRows,
      row => {
        const points = toNumber(row.points);
        const played = toNumber(row.played);

        if (points === null || played === null || played <= 0) {
          return null;
        }

        return Number((points / played).toFixed(2));
      },
      'desc',
    ),
    buildStandingsComparisonMetric(
      'goalsScoredPerMatch',
      standingsRows,
      row => {
        const goalsFor = toNumber(row.all.goalsFor);
        const played = toNumber(row.all.played);

        if (goalsFor === null || played === null || played <= 0) {
          return null;
        }

        return Number((goalsFor / played).toFixed(2));
      },
      'desc',
    ),
    buildStandingsComparisonMetric(
      'goalsConcededPerMatch',
      standingsRows,
      row => {
        const goalsAgainst = toNumber(row.all.goalsAgainst);
        const played = toNumber(row.all.played);

        if (goalsAgainst === null || played === null || played <= 0) {
          return null;
        }

        return Number((goalsAgainst / played).toFixed(2));
      },
      'asc',
    ),
  ].filter((metric): metric is TeamComparisonMetric => metric !== null);

  return [...fromStandings, ...mapTeamAdvancedComparisonMetrics(advancedStats)];
}

export function mapTeamAdvancedComparisonMetrics(
  advancedStats: TeamAdvancedStatsDto | null,
): TeamComparisonMetric[] {
  const advancedMetrics = advancedStats?.metrics;

  return [
    mapAdvancedComparisonMetric('possession', advancedMetrics?.possession ?? null),
    mapAdvancedComparisonMetric(
      'shotsOnTargetPerMatch',
      advancedMetrics?.shotsOnTargetPerMatch ?? null,
    ),
    mapAdvancedComparisonMetric('shotsPerMatch', advancedMetrics?.shotsPerMatch ?? null),
    mapAdvancedComparisonMetric(
      'expectedGoalsPerMatch',
      advancedMetrics?.expectedGoalsPerMatch ?? null,
    ),
  ].filter((metric): metric is TeamComparisonMetric => metric !== null);
}

const EMPTY_TOP_PLAYERS_BY_CATEGORY: TeamTopPlayersByCategory = {
  ratings: [],
  scorers: [],
  assisters: [],
};

export function mapTeamStatisticsToStats(
  payload: TeamApiStatisticsDto | null,
  standings: TeamStandingsData,
  topPlayers: TeamTopPlayer[],
  topPlayersByCategory: TeamTopPlayersByCategory = EMPTY_TOP_PLAYERS_BY_CATEGORY,
  advancedStats: TeamAdvancedStatsDto | null = null,
): TeamStatsData {
  const standingRow = findTeamStandingRow(standings);

  const played = toNumber(payload?.fixtures?.played?.total) ?? toNumber(standingRow?.all.played);
  const wins = toNumber(payload?.fixtures?.wins?.total) ?? toNumber(standingRow?.all.win);
  const draws = toNumber(payload?.fixtures?.draws?.total) ?? toNumber(standingRow?.all.draw);
  const losses = toNumber(payload?.fixtures?.loses?.total) ?? toNumber(standingRow?.all.lose);

  const goalsFor =
    toNumber(payload?.goals?.for?.total?.total) ?? toNumber(standingRow?.all.goalsFor);
  const goalsAgainst =
    toNumber(payload?.goals?.against?.total?.total) ?? toNumber(standingRow?.all.goalsAgainst);

  const homeRecord = resolveVenueRecord(standingRow?.home ?? null, {
    played: toNumber(payload?.fixtures?.played?.home),
    wins: toNumber(payload?.fixtures?.wins?.home),
    draws: toNumber(payload?.fixtures?.draws?.home),
    losses: toNumber(payload?.fixtures?.loses?.home),
    goalsFor: toNumber(payload?.goals?.for?.total?.home),
    goalsAgainst: toNumber(payload?.goals?.against?.total?.home),
  });

  const awayRecord = resolveVenueRecord(standingRow?.away ?? null, {
    played: toNumber(payload?.fixtures?.played?.away),
    wins: toNumber(payload?.fixtures?.wins?.away),
    draws: toNumber(payload?.fixtures?.draws?.away),
    losses: toNumber(payload?.fixtures?.loses?.away),
    goalsFor: toNumber(payload?.goals?.for?.total?.away),
    goalsAgainst: toNumber(payload?.goals?.against?.total?.away),
  });

  const goalsForPerMatch = toAverage(
    toParsedFloat(payload?.goals?.for?.average?.total),
    goalsFor,
    played,
  );
  const goalsAgainstPerMatch = toAverage(
    toParsedFloat(payload?.goals?.against?.average?.total),
    goalsAgainst,
    played,
  );

  const expectedGoalsFor = toNumber(advancedStats?.metrics?.expectedGoalsPerMatch?.value ?? undefined);

  return {
    rank: standingRow?.rank ?? null,
    points: standingRow?.points ?? null,
    played,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    homePlayed: homeRecord?.played ?? null,
    homeWins: homeRecord?.wins ?? null,
    homeDraws: homeRecord?.draws ?? null,
    homeLosses: homeRecord?.losses ?? null,
    awayPlayed: awayRecord?.played ?? null,
    awayWins: awayRecord?.wins ?? null,
    awayDraws: awayRecord?.draws ?? null,
    awayLosses: awayRecord?.losses ?? null,
    expectedGoalsFor,
    pointsByVenue: {
      home: homeRecord,
      away: awayRecord,
    },
    goalsForPerMatch,
    goalsAgainstPerMatch,
    cleanSheets: toNumber(payload?.fixtures?.clean_sheet?.total),
    failedToScore: toNumber(payload?.fixtures?.failed_to_score?.total),
    topPlayersByCategory,
    comparisonMetrics: buildComparisonMetrics(standings, advancedStats),
    goalBreakdown: payload ? mapGoalMinuteBreakdown(payload) : [],
    topPlayers,
  };
}
