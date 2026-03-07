import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { mapWithConcurrency } from '../../lib/concurrency/mapWithConcurrency.js';

import { toFiniteNumber, toNumericId } from './helpers.js';

export const TEAM_ADVANCED_STATS_CACHE_TTL_MS = 10 * 60_000;
const TEAM_ADVANCED_STATS_MAX_CONCURRENCY = 4;
const FINISHED_FIXTURE_STATUSES = new Set(['FT', 'AET', 'PEN']);

type ApiFootballFixturesResponse = {
  response?: Array<{
    fixture?: {
      id?: number;
      status?: {
        short?: string;
      };
    };
  }>;
};

type ApiFootballStandingsResponse = {
  response?: Array<{
    league?: {
      standings?: Array<
        Array<{
          team?: {
            id?: number;
            name?: string;
            logo?: string;
          };
        }>
      >;
    };
  }>;
};

type ApiFootballFixtureStatisticsResponse = {
  response?: Array<{
    team?: {
      id?: number;
      name?: string;
      logo?: string;
    };
    statistics?: Array<{
      type?: string;
      value?: string | number | null;
    }>;
  }>;
};

type TeamAdvancedMetricKey =
  | 'possession'
  | 'shotsOnTargetPerMatch'
  | 'shotsPerMatch'
  | 'expectedGoalsPerMatch';

type TeamProfile = {
  teamId: number;
  teamName: string;
  teamLogo: string;
};

type TeamMetricAccumulator = {
  sum: number;
  count: number;
};

type TeamAdvancedMetricRankEntry = TeamProfile & {
  value: number;
};

type TeamAdvancedMetricPayload = {
  value: number | null;
  rank: number | null;
  totalTeams: number;
  leaders: TeamAdvancedMetricRankEntry[];
};

export type TeamAdvancedStatsPayload = {
  teamId: number;
  leagueId: number;
  season: number;
  sourceUpdatedAt: string | null;
  metrics: Record<TeamAdvancedMetricKey, TeamAdvancedMetricPayload | null>;
};

function normalizeMetricLabel(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function resolveAdvancedMetricKey(label: string | null | undefined): TeamAdvancedMetricKey | null {
  const normalized = normalizeMetricLabel(label);
  if (normalized === 'ball possession' || normalized === 'possession') {
    return 'possession';
  }

  if (normalized === 'shots on goal' || normalized === 'shots on target') {
    return 'shotsOnTargetPerMatch';
  }

  if (normalized === 'total shots') {
    return 'shotsPerMatch';
  }

  if (normalized === 'expected goals' || normalized === 'xg') {
    return 'expectedGoalsPerMatch';
  }

  return null;
}

function roundMetricValue(value: number): number {
  return Number(value.toFixed(2));
}

function upsertTeamProfile(
  profiles: Map<number, TeamProfile>,
  teamId: number,
  teamName: string,
  teamLogo: string,
): void {
  const existingProfile = profiles.get(teamId);
  if (!existingProfile) {
    profiles.set(teamId, {
      teamId,
      teamName,
      teamLogo,
    });
    return;
  }

  if (!existingProfile.teamName && teamName) {
    existingProfile.teamName = teamName;
  }

  if (!existingProfile.teamLogo && teamLogo) {
    existingProfile.teamLogo = teamLogo;
  }
}

function buildEmptyMetricAccumulatorMap(): Record<TeamAdvancedMetricKey, Map<number, TeamMetricAccumulator>> {
  return {
    possession: new Map<number, TeamMetricAccumulator>(),
    shotsOnTargetPerMatch: new Map<number, TeamMetricAccumulator>(),
    shotsPerMatch: new Map<number, TeamMetricAccumulator>(),
    expectedGoalsPerMatch: new Map<number, TeamMetricAccumulator>(),
  };
}

function updateMetricAccumulator(
  accumulators: Record<TeamAdvancedMetricKey, Map<number, TeamMetricAccumulator>>,
  metricKey: TeamAdvancedMetricKey,
  teamId: number,
  value: number,
): void {
  const metricMap = accumulators[metricKey];
  const current = metricMap.get(teamId);
  if (!current) {
    metricMap.set(teamId, { sum: value, count: 1 });
    return;
  }

  current.sum += value;
  current.count += 1;
}

function metricRankEntriesFromAccumulator(
  metricAccumulator: Map<number, TeamMetricAccumulator>,
  teamProfiles: Map<number, TeamProfile>,
): TeamAdvancedMetricRankEntry[] {
  const rankEntries: TeamAdvancedMetricRankEntry[] = [];

  metricAccumulator.forEach((accumulator, teamId) => {
    if (!accumulator.count) {
      return;
    }

    const teamProfile = teamProfiles.get(teamId) ?? {
      teamId,
      teamName: '',
      teamLogo: '',
    };

    rankEntries.push({
      ...teamProfile,
      value: roundMetricValue(accumulator.sum / accumulator.count),
    });
  });

  return rankEntries.sort((first, second) => {
    if (second.value !== first.value) {
      return second.value - first.value;
    }

    return first.teamName.localeCompare(second.teamName);
  });
}

function buildMetricPayload(
  rankEntries: TeamAdvancedMetricRankEntry[],
  teamId: number,
): TeamAdvancedMetricPayload | null {
  if (rankEntries.length === 0) {
    return null;
  }

  const rankIndex = rankEntries.findIndex(entry => entry.teamId === teamId);
  const selectedEntry = rankIndex >= 0 ? rankEntries[rankIndex] : null;

  return {
    value: selectedEntry?.value ?? null,
    rank: rankIndex >= 0 ? rankIndex + 1 : null,
    totalTeams: rankEntries.length,
    leaders: rankEntries.slice(0, 3),
  };
}

export async function computeLeagueAdvancedTeamStats(leagueId: string, season: number): Promise<{
  leagueId: number;
  season: number;
  sourceUpdatedAt: string;
  rankings: Record<TeamAdvancedMetricKey, TeamAdvancedMetricRankEntry[]>;
}> {
  const [fixturesPayload, standingsPayload] = await Promise.all([
    apiFootballGet<ApiFootballFixturesResponse>(
      `/fixtures?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}`,
    ),
    apiFootballGet<ApiFootballStandingsResponse>(
      `/standings?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}`,
    ),
  ]);

  const teamProfiles = new Map<number, TeamProfile>();
  const metricAccumulators = buildEmptyMetricAccumulatorMap();

  const standings = standingsPayload.response?.[0]?.league?.standings ?? [];
  standings.forEach(group => {
    group.forEach(row => {
      const teamId = toNumericId(row.team?.id);
      if (!teamId) {
        return;
      }

      const teamName = typeof row.team?.name === 'string' ? row.team.name.trim() : '';
      const teamLogo = typeof row.team?.logo === 'string' ? row.team.logo : '';
      upsertTeamProfile(teamProfiles, teamId, teamName, teamLogo);
    });
  });

  const finishedFixtureIds = (fixturesPayload.response ?? [])
    .map(item => {
      const fixtureId = toNumericId(item.fixture?.id);
      const fixtureStatus = normalizeMetricLabel(item.fixture?.status?.short);

      if (!fixtureId || !FINISHED_FIXTURE_STATUSES.has(fixtureStatus.toUpperCase())) {
        return null;
      }

      return fixtureId;
    })
    .filter((fixtureId): fixtureId is number => fixtureId !== null);

  await mapWithConcurrency(
    finishedFixtureIds,
    TEAM_ADVANCED_STATS_MAX_CONCURRENCY,
    async fixtureId => {
      const fixtureStatisticsPayload = await apiFootballGet<ApiFootballFixtureStatisticsResponse>(
        `/fixtures/statistics?fixture=${encodeURIComponent(String(fixtureId))}`,
      );
      const fixtureTeamStats = fixtureStatisticsPayload.response ?? [];

      fixtureTeamStats.forEach(teamStat => {
        const teamId = toNumericId(teamStat.team?.id);
        if (!teamId) {
          return;
        }

        const teamName = typeof teamStat.team?.name === 'string' ? teamStat.team.name.trim() : '';
        const teamLogo = typeof teamStat.team?.logo === 'string' ? teamStat.team.logo : '';
        upsertTeamProfile(teamProfiles, teamId, teamName, teamLogo);

        const statistics = Array.isArray(teamStat.statistics) ? teamStat.statistics : [];
        statistics.forEach(statistic => {
          const metricKey = resolveAdvancedMetricKey(statistic.type);
          if (!metricKey) {
            return;
          }

          const value = toFiniteNumber(statistic.value);
          if (value === null) {
            return;
          }

          updateMetricAccumulator(metricAccumulators, metricKey, teamId, value);
        });
      });
    },
  );

  return {
    leagueId: Number(leagueId),
    season,
    sourceUpdatedAt: new Date().toISOString(),
    rankings: {
      possession: metricRankEntriesFromAccumulator(metricAccumulators.possession, teamProfiles),
      shotsOnTargetPerMatch: metricRankEntriesFromAccumulator(
        metricAccumulators.shotsOnTargetPerMatch,
        teamProfiles,
      ),
      shotsPerMatch: metricRankEntriesFromAccumulator(metricAccumulators.shotsPerMatch, teamProfiles),
      expectedGoalsPerMatch: metricRankEntriesFromAccumulator(
        metricAccumulators.expectedGoalsPerMatch,
        teamProfiles,
      ),
    },
  };
}

export function buildTeamAdvancedStatsPayload(
  teamId: number,
  leagueId: number,
  season: number,
  sourceUpdatedAt: string | null,
  rankings: Record<TeamAdvancedMetricKey, TeamAdvancedMetricRankEntry[]>,
): TeamAdvancedStatsPayload {
  return {
    teamId,
    leagueId,
    season,
    sourceUpdatedAt,
    metrics: {
      possession: buildMetricPayload(rankings.possession, teamId),
      shotsOnTargetPerMatch: buildMetricPayload(rankings.shotsOnTargetPerMatch, teamId),
      shotsPerMatch: buildMetricPayload(rankings.shotsPerMatch, teamId),
      expectedGoalsPerMatch: buildMetricPayload(rankings.expectedGoalsPerMatch, teamId),
    },
  };
}
