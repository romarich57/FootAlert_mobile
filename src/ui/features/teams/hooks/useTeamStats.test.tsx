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
  mapTeamStatisticsToStats,
} from '@data/mappers/teamsMapper';
import {
  fetchTeamStatsAdvancedData,
  fetchTeamStatsCoreData,
  fetchTeamStatsPlayersData,
  useTeamStats,
} from '@ui/features/teams/hooks/useTeamStats';
import {
  useTeamFull,
} from '@ui/features/teams/hooks/useTeamFull';
import { fetchAllTeamPlayers } from '@data/teams/teamQueryData';
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

jest.mock('@data/teams/teamQueryData', () => ({
  ...jest.requireActual('@data/teams/teamQueryData'),
  fetchAllTeamPlayers: jest.fn(),
}));

jest.mock('@ui/features/teams/hooks/useTeamFull', () => ({
  useTeamFull: jest.fn(),
}));

const mockedUseQuery = jest.mocked(useQuery);
const mockedFetchTeamStatistics = jest.mocked(fetchTeamStatistics);
const mockedFetchLeagueStandings = jest.mocked(fetchLeagueStandings);
const mockedFetchTeamAdvancedStats = jest.mocked(fetchTeamAdvancedStats);
const mockedFetchAllTeamPlayers = jest.mocked(fetchAllTeamPlayers);
const mockedMapPlayersToTopPlayers = jest.mocked(mapPlayersToTopPlayers);
const mockedMapPlayersToTopPlayersByCategory = jest.mocked(mapPlayersToTopPlayersByCategory);
const mockedMapTeamAdvancedComparisonMetrics = jest.mocked(mapTeamAdvancedComparisonMetrics);
const mockedMapTeamStatisticsToStats = jest.mocked(mapTeamStatisticsToStats);
const mockedUseTeamFull = jest.mocked(useTeamFull);

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
    mockedUseTeamFull.mockReturnValue({
      data: undefined,
      dataUpdatedAt: 0,
      isError: false,
      isFetched: false,
      isFetchedAfterMount: false,
      isFetching: false,
      isFullEnabled: false,
      isLoading: false,
      refetch: jest.fn(async () => ({}) as never),
    } as never);
    mockedMapTeamStatisticsToStats.mockReturnValue({
      ...BASE_CORE_DATA,
      topPlayers: [],
      topPlayersByCategory: {
        ratings: [],
        scorers: [],
        assisters: [],
      },
    } as never);
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

  it('uses team full payload first when a canonical payload is available', () => {
    mockedUseTeamFull.mockReturnValue({
      data: {
        selection: {
          leagueId: '140',
          season: 2025,
        },
        standings: {
          response: {
            league: {
              standings: [
                [
                  {
                    rank: 2,
                    points: 58,
                    goalsDiff: 39,
                    all: {
                      played: 24,
                      win: 18,
                      draw: 4,
                      lose: 2,
                      goals: {
                        for: 64,
                        against: 25,
                      },
                    },
                    home: {
                      played: 12,
                      win: 10,
                      draw: 1,
                      lose: 1,
                      goals: {
                        for: 35,
                        against: 10,
                      },
                    },
                    away: {
                      played: 12,
                      win: 8,
                      draw: 3,
                      lose: 1,
                      goals: {
                        for: 29,
                        against: 15,
                      },
                    },
                    team: {
                      id: 529,
                      name: 'Barcelona',
                      logo: 'barca.png',
                    },
                  },
                ],
              ],
            },
          },
        },
        statistics: {
          response: {
            fixtures: {
              played: { total: 24, home: 12, away: 12 },
              wins: { total: 18, home: 10, away: 8 },
              draws: { total: 4, home: 1, away: 3 },
              loses: { total: 2, home: 1, away: 1 },
              clean_sheet: { total: 9 },
              failed_to_score: { total: 2 },
            },
            goals: {
              for: {
                total: { total: 64, home: 35, away: 29 },
                average: { total: '2.67', home: '2.92', away: '2.42' },
              },
              against: {
                total: { total: 25, home: 10, away: 15 },
                average: { total: '1.04', home: '0.83', away: '1.25' },
              },
            },
          },
        },
        advancedStats: {
          response: {
            sourceUpdatedAt: '2026-03-07T12:00:00.000Z',
            metrics: {
              expectedGoalsPerMatch: {
                value: 1.9,
              },
            },
          },
        },
        statsPlayers: {
          response: [
            {
              player: {
                id: 10,
                name: 'Player',
                photo: 'player.png',
              },
              statistics: [
                {
                  team: {
                    id: 529,
                    logo: 'barca.png',
                  },
                  league: {
                    id: 140,
                    season: 2025,
                  },
                  games: {
                    position: 'Attacker',
                    rating: '7.9',
                  },
                  goals: {
                    total: 15,
                    assists: 7,
                  },
                },
              ],
            },
          ],
        },
      },
      dataUpdatedAt: 200,
      isError: false,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isFullEnabled: true,
      isLoading: false,
      refetch: jest.fn(async () => ({}) as never),
    } as never);
    mockedMapTeamAdvancedComparisonMetrics.mockReturnValue(BASE_COMPARISON_METRICS as never);
    mockedMapTeamStatisticsToStats.mockReturnValue({
      ...BASE_CORE_DATA,
      topPlayers: [],
      topPlayersByCategory: {
        ratings: [],
        scorers: [],
        assisters: [],
      },
    } as never);

    const { result } = renderHook(() =>
      useTeamStats({
        teamId: '529',
        leagueId: '140',
        season: 2025,
      }),
    );

    expect(result.current.data?.rank).toBe(2);
    expect(result.current.data?.topPlayers).toEqual([BASE_TOP_PLAYER]);
    expect(result.current.advancedData?.sourceUpdatedAt).toBe('2026-03-07T12:00:00.000Z');
    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['team_stats_core', '529', '140', 2025],
        enabled: false,
      }),
    );
    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['team_stats_players', '529', '140', 2025],
        enabled: false,
      }),
    );
    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['team_stats_advanced', '529', '140', 2025],
        enabled: false,
      }),
    );
  });
});
