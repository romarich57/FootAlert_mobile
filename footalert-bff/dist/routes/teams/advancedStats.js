import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { mapWithConcurrency } from '../../lib/concurrency/mapWithConcurrency.js';
import { toFiniteNumber, toNumericId } from './helpers.js';
export const TEAM_ADVANCED_STATS_CACHE_TTL_MS = 10 * 60_000;
const TEAM_ADVANCED_STATS_MAX_CONCURRENCY = 4;
const FINISHED_FIXTURE_STATUSES = new Set(['FT', 'AET', 'PEN']);
function normalizeMetricLabel(value) {
    return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}
function resolveAdvancedMetricKey(label) {
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
function roundMetricValue(value) {
    return Number(value.toFixed(2));
}
function upsertTeamProfile(profiles, teamId, teamName, teamLogo) {
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
function buildEmptyMetricAccumulatorMap() {
    return {
        possession: new Map(),
        shotsOnTargetPerMatch: new Map(),
        shotsPerMatch: new Map(),
        expectedGoalsPerMatch: new Map(),
    };
}
function updateMetricAccumulator(accumulators, metricKey, teamId, value) {
    const metricMap = accumulators[metricKey];
    const current = metricMap.get(teamId);
    if (!current) {
        metricMap.set(teamId, { sum: value, count: 1 });
        return;
    }
    current.sum += value;
    current.count += 1;
}
function metricRankEntriesFromAccumulator(metricAccumulator, teamProfiles) {
    const rankEntries = [];
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
function buildMetricPayload(rankEntries, teamId) {
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
export async function computeLeagueAdvancedTeamStats(leagueId, season, seedProfiles) {
    const [fixturesPayload, standingsPayload] = seedProfiles
        ? [
            await apiFootballGet(`/fixtures?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}`),
            null,
        ]
        : await Promise.all([
            apiFootballGet(`/fixtures?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}`),
            apiFootballGet(`/standings?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}`),
        ]);
    const teamProfiles = new Map();
    const metricAccumulators = buildEmptyMetricAccumulatorMap();
    seedProfiles?.forEach(profile => {
        upsertTeamProfile(teamProfiles, profile.teamId, profile.teamName, profile.teamLogo);
    });
    if (standingsPayload) {
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
    }
    const finishedFixtureIds = (fixturesPayload.response ?? [])
        .map(item => {
        const fixtureId = toNumericId(item.fixture?.id);
        const fixtureStatus = normalizeMetricLabel(item.fixture?.status?.short);
        if (!fixtureId || !FINISHED_FIXTURE_STATUSES.has(fixtureStatus.toUpperCase())) {
            return null;
        }
        return fixtureId;
    })
        .filter((fixtureId) => fixtureId !== null);
    await mapWithConcurrency(finishedFixtureIds, TEAM_ADVANCED_STATS_MAX_CONCURRENCY, async (fixtureId) => {
        const fixtureStatisticsPayload = await apiFootballGet(`/fixtures/statistics?fixture=${encodeURIComponent(String(fixtureId))}`);
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
    });
    return {
        leagueId: Number(leagueId),
        season,
        sourceUpdatedAt: new Date().toISOString(),
        rankings: {
            possession: metricRankEntriesFromAccumulator(metricAccumulators.possession, teamProfiles),
            shotsOnTargetPerMatch: metricRankEntriesFromAccumulator(metricAccumulators.shotsOnTargetPerMatch, teamProfiles),
            shotsPerMatch: metricRankEntriesFromAccumulator(metricAccumulators.shotsPerMatch, teamProfiles),
            expectedGoalsPerMatch: metricRankEntriesFromAccumulator(metricAccumulators.expectedGoalsPerMatch, teamProfiles),
        },
    };
}
export function buildTeamAdvancedStatsPayload(teamId, leagueId, season, sourceUpdatedAt, rankings) {
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
