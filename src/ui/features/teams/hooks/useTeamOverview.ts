import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  fetchLeagueStandings,
  fetchTeamFixtures,
  fetchTeamNextFixture,
  fetchTeamPlayers,
  fetchTeamSquad,
  fetchTeamStatistics,
  fetchTeamTrophies,
} from '@data/endpoints/teamsApi';
import {
  findTeamStandingRow,
  mapFixtureToTeamMatch,
  mapFixturesToTeamMatches,
  mapPlayersToTopPlayers,
  mapPlayersToTopPlayersByCategory,
  mapRecentTeamForm,
  mapSquadToTeamSquad,
  mapStandingsToTeamData,
  mapTeamStatisticsToStats,
  mapTrophiesToTeamTrophies,
} from '@data/mappers/teamsMapper';
import type {
  TeamApiPlayerDto,
  TeamOverviewCoach,
  TeamOverviewCoachPerformance,
  TeamOverviewData,
  TeamOverviewMiniStanding,
  TeamOverviewSeasonStats,
  TeamSeasonLineup,
  TeamTopPlayer,
} from '@ui/features/teams/types/teams.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

type UseTeamOverviewParams = {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  timezone: string;
  competitionSeasons?: number[];
  enabled?: boolean;
};

const EMPTY_OVERVIEW: TeamOverviewData = {
  nextMatch: null,
  recentForm: [],
  seasonStats: {
    rank: null,
    points: null,
    played: null,
    goalDiff: null,
    wins: null,
    draws: null,
    losses: null,
    scored: null,
    conceded: null,
  },
  seasonLineup: {
    formation: '4-3-3',
    estimated: true,
    goalkeeper: null,
    defenders: [],
    midfielders: [],
    attackers: [],
  },
  miniStanding: null,
  standingHistory: [],
  coachPerformance: null,
  playerLeaders: {
    ratings: [],
    scorers: [],
    assisters: [],
  },
  trophiesCount: null,
  trophyWinsCount: null,
};

type PlayerLineCategory = 'goalkeeper' | 'defender' | 'midfielder' | 'attacker' | 'other';

function toRounded(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function asFiniteNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
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
  const byRating = (asFiniteNumber(second.rating) ?? -1) - (asFiniteNumber(first.rating) ?? -1);
  if (byRating !== 0) {
    return byRating;
  }

  const byGoals = (asFiniteNumber(second.goals) ?? -1) - (asFiniteNumber(first.goals) ?? -1);
  if (byGoals !== 0) {
    return byGoals;
  }

  return (asFiniteNumber(second.assists) ?? -1) - (asFiniteNumber(first.assists) ?? -1);
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

  const goalkeeper = pickPlayers('goalkeeper', 1)[0] ?? null;

  return {
    formation: '4-3-3',
    estimated: true,
    goalkeeper,
    defenders: pickPlayers('defender', 4),
    midfielders: pickPlayers('midfielder', 3),
    attackers: pickPlayers('attacker', 3),
  };
}

function pickMiniStandingRows(overviewData: TeamOverviewData): TeamOverviewMiniStanding['rows'] {
  const rows = overviewData.miniStanding?.rows ?? [];
  return rows;
}

function buildMiniStandingRows(
  rows: TeamOverviewMiniStanding['rows'],
): TeamOverviewMiniStanding['rows'] {
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

  const played = asFiniteNumber(seasonStats.played);
  const wins = asFiniteNumber(seasonStats.wins);
  const draws = asFiniteNumber(seasonStats.draws);
  const losses = asFiniteNumber(seasonStats.losses);
  const points = asFiniteNumber(seasonStats.points);

  const winRate = played && wins !== null && played > 0 ? toRounded((wins / played) * 100, 1) : null;

  const pointsPerMatch =
    played && played > 0
      ? points !== null
        ? toRounded(points / played, 2)
        : wins !== null || draws !== null
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

function buildSeasonStats(
  fallbackStats: ReturnType<typeof mapTeamStatisticsToStats>,
  standingRow: ReturnType<typeof findTeamStandingRow>,
): TeamOverviewSeasonStats {
  const scored = asFiniteNumber(fallbackStats.goalsFor);
  const conceded = asFiniteNumber(fallbackStats.goalsAgainst);

  return {
    rank: asFiniteNumber(standingRow?.rank) ?? asFiniteNumber(fallbackStats.rank),
    points: asFiniteNumber(standingRow?.points) ?? asFiniteNumber(fallbackStats.points),
    played: asFiniteNumber(standingRow?.played) ?? asFiniteNumber(fallbackStats.played),
    goalDiff:
      asFiniteNumber(standingRow?.goalDiff) ??
      (scored !== null && conceded !== null ? scored - conceded : null),
    wins: asFiniteNumber(fallbackStats.wins),
    draws: asFiniteNumber(fallbackStats.draws),
    losses: asFiniteNumber(fallbackStats.losses),
    scored,
    conceded,
  };
}

function buildHistorySeasons(currentSeason: number, competitionSeasons: number[] | undefined): number[] {
  const fallbackSeason =
    (competitionSeasons ?? [])
      .filter(year => Number.isFinite(year))
      .sort((first, second) => second - first)[0] ?? null;

  const anchorSeason = Number.isFinite(currentSeason)
    ? currentSeason
    : fallbackSeason;

  if (!Number.isFinite(anchorSeason)) {
    return [];
  }

  // Keep a stable 5-season window so missing API seasons can still render as null ranks ("-").
  return Array.from({ length: 5 }, (_, offset) => (anchorSeason as number) - offset);
}

function extractCurrentStandingRows(teamId: string, standingsPayload: ReturnType<typeof mapStandingsToTeamData>) {
  const targetGroup = standingsPayload.groups.find(group => group.rows.some(row => row.isTargetTeam));
  return targetGroup?.rows ?? standingsPayload.groups[0]?.rows ?? [];
}

async function fetchAllTeamPlayers(
  teamId: string,
  leagueId: string,
  season: number,
  signal?: AbortSignal,
): Promise<TeamApiPlayerDto[]> {
  const firstPage = await fetchTeamPlayers(
    {
      teamId,
      leagueId,
      season,
      page: 1,
    },
    signal,
  );

  const totalPages = Math.max(1, firstPage.paging?.total ?? 1);
  if (totalPages <= 1) {
    return firstPage.response ?? [];
  }

  const nextPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchTeamPlayers(
        {
          teamId,
          leagueId,
          season,
          page: index + 2,
        },
        signal,
      ),
    ),
  );

  return [firstPage, ...nextPages].flatMap(page => page.response ?? []);
}

export function useTeamOverview({
  teamId,
  leagueId,
  season,
  timezone,
  competitionSeasons,
  enabled = true,
}: UseTeamOverviewParams) {
  const historySeasonsKey = useMemo(
    () => (competitionSeasons ?? []).slice(0, 5).join(','),
    [competitionSeasons],
  );

  return useQuery({
    queryKey: queryKeys.teams.overview(teamId, leagueId, season, timezone, historySeasonsKey),
    enabled: enabled && Boolean(teamId) && Boolean(leagueId) && typeof season === 'number',
    ...featureQueryOptions.teams.overview,
    queryFn: async ({ signal }): Promise<TeamOverviewData> => {
      if (!teamId || !leagueId || typeof season !== 'number') {
        return EMPTY_OVERVIEW;
      }

      const [
        fixturesResult,
        nextFixtureResult,
        standingsResult,
        statsResult,
        playersResult,
        squadResult,
        trophiesResult,
      ] = await Promise.allSettled([
        fetchTeamFixtures(
          {
            teamId,
            leagueId,
            season,
            timezone,
          },
          signal,
        ),
        fetchTeamNextFixture(teamId, timezone, signal),
        fetchLeagueStandings(leagueId, season, signal),
        fetchTeamStatistics(leagueId, season, teamId, signal),
        fetchAllTeamPlayers(teamId, leagueId, season, signal),
        fetchTeamSquad(teamId, signal),
        fetchTeamTrophies(teamId, signal),
      ]);

      const coreUnavailable =
        fixturesResult.status === 'rejected' &&
        standingsResult.status === 'rejected' &&
        statsResult.status === 'rejected';

      if (coreUnavailable) {
        const candidateError =
          fixturesResult.reason instanceof Error
            ? fixturesResult.reason
            : standingsResult.reason instanceof Error
              ? standingsResult.reason
              : statsResult.reason instanceof Error
                ? statsResult.reason
                : new Error('Unable to load overview core datasets');

        throw candidateError;
      }

      const fixturesPayload = fixturesResult.status === 'fulfilled' ? fixturesResult.value : [];
      const nextFixturePayload = nextFixtureResult.status === 'fulfilled' ? nextFixtureResult.value : null;
      const standingsPayload = standingsResult.status === 'fulfilled' ? standingsResult.value : null;
      const statsPayload = statsResult.status === 'fulfilled' ? statsResult.value : null;
      const playersPayload = playersResult.status === 'fulfilled' ? playersResult.value : [];
      const squadPayload = squadResult.status === 'fulfilled' ? squadResult.value : null;
      const trophiesPayload = trophiesResult.status === 'fulfilled' ? trophiesResult.value : [];

      const matchesData = mapFixturesToTeamMatches(fixturesPayload);
      const standings = mapStandingsToTeamData(standingsPayload, teamId);
      const topPlayers = mapPlayersToTopPlayers(playersPayload, 30, {
        teamId,
        leagueId,
        season,
      });
      const topPlayersByCategory = mapPlayersToTopPlayersByCategory(playersPayload, 5, {
        teamId,
        leagueId,
        season,
      });

      const mappedStats = mapTeamStatisticsToStats(
        statsPayload,
        standings,
        topPlayers,
        topPlayersByCategory,
      );
      const standingRow = findTeamStandingRow(standings);
      const seasonStats = buildSeasonStats(mappedStats, standingRow);

      const currentStandingRows = extractCurrentStandingRows(teamId, standings);
      const miniStandingRows = buildMiniStandingRows(currentStandingRows);

      const historySeasons = buildHistorySeasons(season, competitionSeasons);
      const standingsHistoryResults = await Promise.allSettled(
        historySeasons.map(historySeason => {
          if (historySeason === season && standingsResult.status === 'fulfilled') {
            return Promise.resolve(standingsResult.value);
          }

          return fetchLeagueStandings(leagueId, historySeason, signal);
        }),
      );

      const standingHistory = historySeasons.map((historySeason, index) => {
        const historyPayload = standingsHistoryResults[index];

        if (historyPayload?.status !== 'fulfilled') {
          return {
            season: historySeason,
            rank: null,
          };
        }

        const historyStandings = mapStandingsToTeamData(historyPayload.value, teamId);
        const historyStandingRow = findTeamStandingRow(historyStandings);

        return {
          season: historySeason,
          rank: asFiniteNumber(historyStandingRow?.rank),
        };
      });

      const squad = mapSquadToTeamSquad(squadPayload);
      const coach: TeamOverviewCoach | null = squad.coach
        ? {
          id: squad.coach.id,
          name: squad.coach.name,
          photo: squad.coach.photo,
          age: squad.coach.age,
        }
        : null;

      const coachPerformance = buildCoachPerformance(coach, seasonStats);
      const trophies = mapTrophiesToTeamTrophies(trophiesPayload);

      const nextMatch = nextFixturePayload
        ? mapFixtureToTeamMatch(nextFixturePayload)
        : matchesData.upcoming[0] ?? null;

      const leagueName = matchesData.all[0]?.leagueName ?? statsPayload?.league?.name ?? null;
      const leagueLogo = matchesData.all[0]?.leagueLogo ?? null;

      const data: TeamOverviewData = {
        nextMatch,
        recentForm: mapRecentTeamForm(matchesData.past, teamId, 5),
        seasonStats,
        seasonLineup: buildEstimatedLineup(topPlayers),
        miniStanding:
          miniStandingRows.length > 0
            ? {
              leagueId,
              leagueName,
              leagueLogo,
              rows: miniStandingRows,
            }
            : null,
        standingHistory,
        coachPerformance,
        playerLeaders: {
          ratings: topPlayersByCategory.ratings.slice(0, 3),
          scorers: topPlayersByCategory.scorers.slice(0, 3),
          assisters: topPlayersByCategory.assisters.slice(0, 3),
        },
        trophiesCount: trophies.total,
        trophyWinsCount: trophies.totalWins,
      };

      return {
        ...data,
        miniStanding: data.miniStanding
          ? {
            ...data.miniStanding,
            rows: pickMiniStandingRows(data),
          }
          : null,
      };
    },
  });
}
