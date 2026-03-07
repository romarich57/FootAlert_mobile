import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';

import {
  fetchLeagueStandings,
  fetchTeamAdvancedStats,
  fetchTeamStatistics,
} from '@data/endpoints/teamsApi';
import {
  mapPlayersToTopPlayers,
  mapPlayersToTopPlayersByCategory,
  mapTeamAdvancedComparisonMetrics,
} from '@data/mappers/teamsMapper';
import {
  fetchTeamStatsAdvancedData,
  fetchTeamStatsCoreData,
  fetchTeamStatsPlayersData,
  useTeamStats,
} from '@ui/features/teams/hooks/useTeamStats';
import { fetchAllTeamPlayers } from '@ui/features/teams/utils/fetchAllTeamPlayers';
import type {
  TeamComparisonMetric,
  TeamStatsCoreData,
  TeamTopPlayer,
} from '@ui/features/teams/types/teams.types';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('@data/endpoints/teamsApi', () => ({
  fetchTeamStatistics: jest.fn(),
  fetchLeagueStandings: jest.fn(),
  fetchTeamAdvancedStats: jest.fn(),
}));

jest.mock('@data/mappers/teamsMapper', () => ({
  mapStandingsToTeamData: jest.fn(),
  mapPlayersToTopPlayers: jest.fn(),
  mapPlayersToTopPlayersByCategory: jest.fn(),
  mapTeamAdvancedComparisonMetrics: jest.fn(),
  mapTeamStatisticsToStats: jest.fn(),
}));

jest.mock('@ui/features/teams/utils/fetchAllTeamPlayers', () => ({
  fetchAllTeamPlayers: jest.fn(),
}));

const mockedUseQuery = jest.mocked(useQuery);
const mockedFetchTeamStatistics = jest.mocked(fetchTeamStatistics);
const mockedFetchLeagueStandings = jest.mocked(fetchLeagueStandings);
const mockedFetchTeamAdvancedStats = jest.mocked(fetchTeamAdvancedStats);
const mockedFetchAllTeamPlayers = jest.mocked(fetchAllTeamPlayers);
const mockedMapPlayersToTopPlayers = jest.mocked(mapPlayersToTopPlayers);
const mockedMapPlayersToTopPlayersByCategory = jest.mocked(mapPlayersToTopPlayersByCategory);
const mockedMapTeamAdvancedComparisonMetrics = jest.mocked(mapTeamAdvancedComparisonMetrics);

const BASE_COMPARISON_METRICS: TeamComparisonMetric[] = [
  {
    key: 'possession',
    value: 55,
    rank: 2,
    totalTeams: 20,
    leaders: [],
  },
];

const BASE_CORE_DATA: TeamStatsCoreData = {
  rank: 2,
  points: 58,
  played: 24,
  wins: 18,
  draws: 4,
  losses: 2,
  goalsFor: 64,
  goalsAgainst: 25,
  homePlayed: 12,
  homeWins: 10,
  homeDraws: 1,
  homeLosses: 1,
  awayPlayed: 12,
  awayWins: 8,
  awayDraws: 3,
  awayLosses: 1,
  expectedGoalsFor: 1.8,
  pointsByVenue: {
    home: {
      played: 12,
      wins: 10,
      draws: 1,
      losses: 1,
      goalsFor: 35,
      goalsAgainst: 10,
      goalDiff: 25,
      points: 31,
    },
    away: {
      played: 12,
      wins: 8,
      draws: 3,
      losses: 1,
      goalsFor: 29,
      goalsAgainst: 15,
      goalDiff: 14,
      points: 27,
    },
  },
  goalsForPerMatch: 2.67,
  goalsAgainstPerMatch: 1.04,
  cleanSheets: 9,
  failedToScore: 2,
  comparisonMetrics: BASE_COMPARISON_METRICS,
  goalBreakdown: [],
};

const BASE_TOP_PLAYER: TeamTopPlayer = {
  playerId: '10',
  name: 'Player',
  photo: null,
  teamLogo: null,
  position: 'Attacker',
  goals: 15,
  assists: 7,
  rating: 7.9,
};

function createQueryResult<TData>(
  overrides: Partial<UseQueryResult<TData>> & { data?: TData | undefined } = {},
): UseQueryResult<TData> {
  return {
    data: undefined,
    dataUpdatedAt: 0,
    error: null,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isError: false,
    isFetched: false,
    isFetchedAfterMount: false,
    isFetching: false,
    isInitialLoading: false,
    isLoading: false,
    isLoadingError: false,
    isPaused: false,
    isPending: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    isSuccess: false,
    fetchStatus: 'idle',
    status: 'pending',
    refetch: jest.fn(async () => ({}) as never),
    ...overrides,
  } as unknown as UseQueryResult<TData>;
}

describe('useTeamStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseQuery.mockImplementation(() => createQueryResult());
  });

  it('fetchTeamStatsPlayersData requests a bounded player sample for stats enrichment', async () => {
    mockedFetchAllTeamPlayers.mockResolvedValue([{ player: { id: 10 } }] as never);
    mockedMapPlayersToTopPlayers.mockReturnValue([BASE_TOP_PLAYER] as never);
    mockedMapPlayersToTopPlayersByCategory.mockReturnValue({
      ratings: [BASE_TOP_PLAYER],
      scorers: [BASE_TOP_PLAYER],
      assisters: [BASE_TOP_PLAYER],
    } as never);

    const result = await fetchTeamStatsPlayersData({
      teamId: '529',
      leagueId: '140',
      season: 2025,
    });

    expect(mockedFetchAllTeamPlayers).toHaveBeenCalledWith({
      teamId: '529',
      leagueId: '140',
      season: 2025,
      signal: undefined,
      maxRequests: 4,
      targetItems: 120,
    });
    expect(result).toEqual({
      topPlayers: [BASE_TOP_PLAYER],
      topPlayersByCategory: {
        ratings: [BASE_TOP_PLAYER],
        scorers: [BASE_TOP_PLAYER],
        assisters: [BASE_TOP_PLAYER],
      },
    });
  });

  it('fetchTeamStatsCoreData throws when both core datasets fail', async () => {
    mockedFetchTeamStatistics.mockRejectedValue(new Error('stats failed'));
    mockedFetchLeagueStandings.mockRejectedValue(new Error('standings failed'));

    await expect(
      fetchTeamStatsCoreData({
        teamId: '529',
        leagueId: '140',
        season: 2025,
      }),
    ).rejects.toThrow('stats failed');
  });

  it('fetchTeamStatsAdvancedData preserves sourceUpdatedAt for telemetry', async () => {
    mockedFetchTeamAdvancedStats.mockResolvedValue({
      sourceUpdatedAt: '2026-03-07T12:00:00.000Z',
      metrics: {
        expectedGoalsPerMatch: {
          value: 1.9,
          rank: 2,
          totalTeams: 20,
          leaders: [],
        },
      },
    } as never);
    mockedMapTeamAdvancedComparisonMetrics.mockReturnValue(BASE_COMPARISON_METRICS as never);

    const result = await fetchTeamStatsAdvancedData({
      teamId: '529',
      leagueId: '140',
      season: 2025,
    });

    expect(result).toEqual({
      comparisonMetrics: BASE_COMPARISON_METRICS,
      expectedGoalsFor: 1.9,
      sourceUpdatedAt: '2026-03-07T12:00:00.000Z',
    });
  });

  it('returns core stats immediately while players and advanced queries are still loading', () => {
    let callIndex = 0;
    mockedUseQuery.mockImplementation(() => {
      callIndex += 1;

      if (callIndex === 1) {
        return createQueryResult<TeamStatsCoreData>({
          data: BASE_CORE_DATA,
          dataUpdatedAt: 100,
          isFetched: true,
          isFetchedAfterMount: true,
          isSuccess: true,
          status: 'success',
        });
      }

      return createQueryResult({
        data: undefined,
        isLoading: true,
        isFetching: true,
        status: 'pending',
      });
    });

    const { result } = renderHook(() =>
      useTeamStats({
        teamId: '529',
        leagueId: '140',
        season: 2025,
      }),
    );

    expect(result.current.data).toEqual({
      ...BASE_CORE_DATA,
      topPlayers: [],
      topPlayersByCategory: {
        ratings: [],
        scorers: [],
        assisters: [],
      },
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isCoreLoading).toBe(false);
    expect(result.current.isPlayersLoading).toBe(true);
    expect(result.current.isAdvancedLoading).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it('keeps the stats tab usable when advanced enrichment errors after core data is ready', () => {
    let callIndex = 0;
    mockedUseQuery.mockImplementation(() => {
      callIndex += 1;

      if (callIndex === 1) {
        return createQueryResult<TeamStatsCoreData>({
          data: BASE_CORE_DATA,
          dataUpdatedAt: 100,
          isFetched: true,
          isFetchedAfterMount: true,
          isSuccess: true,
          status: 'success',
        });
      }

      if (callIndex === 2) {
        return createQueryResult({
          data: {
            topPlayers: [BASE_TOP_PLAYER],
            topPlayersByCategory: {
              ratings: [BASE_TOP_PLAYER],
              scorers: [BASE_TOP_PLAYER],
              assisters: [BASE_TOP_PLAYER],
            },
          },
          dataUpdatedAt: 150,
          isFetched: true,
          isFetchedAfterMount: true,
          isSuccess: true,
          status: 'success',
        });
      }

      return createQueryResult({
        data: undefined,
        isError: true,
        status: 'error',
      });
    });

    const { result } = renderHook(() =>
      useTeamStats({
        teamId: '529',
        leagueId: '140',
        season: 2025,
      }),
    );

    expect(result.current.isError).toBe(false);
    expect(result.current.isAdvancedError).toBe(true);
    expect(result.current.data?.rank).toBe(2);
    expect(result.current.data?.topPlayers).toEqual([BASE_TOP_PLAYER]);
  });
});
