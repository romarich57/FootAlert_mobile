import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';

import {
  fetchTeamOverview,
  fetchTeamOverviewLeaders,
} from '@data/endpoints/teamsApi';
import { useTeamOverview } from '@ui/features/teams/hooks/useTeamOverview';
import type {
  TeamOverviewCoreData,
  TeamOverviewLeadersData,
} from '@ui/features/teams/types/teams.types';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('@data/endpoints/teamsApi', () => ({
  fetchTeamOverview: jest.fn(),
  fetchTeamOverviewLeaders: jest.fn(),
}));

const mockedUseQuery = jest.mocked(useQuery);
const mockedFetchTeamOverview = jest.mocked(fetchTeamOverview);
const mockedFetchTeamOverviewLeaders = jest.mocked(fetchTeamOverviewLeaders);

type CapturedQueryConfig<TData> = {
  enabled?: boolean;
  queryKey?: readonly unknown[];
  queryFn?: (context: { signal?: AbortSignal }) => Promise<TData>;
};

const BASE_OVERVIEW_CORE: TeamOverviewCoreData = {
  nextMatch: null,
  recentForm: [],
  seasonStats: {
    rank: 2,
    points: 60,
    played: 25,
    goalDiff: 20,
    wins: 19,
    draws: 3,
    losses: 3,
    scored: 58,
    conceded: 38,
  },
  miniStanding: {
    leagueId: '140',
    leagueName: 'LaLiga',
    leagueLogo: 'laliga.png',
    rows: [],
  },
  standingHistory: [
    { season: 2024, rank: 1 },
    { season: 2023, rank: 2 },
    { season: 2022, rank: 3 },
    { season: 2021, rank: 4 },
    { season: 2020, rank: 5 },
  ],
  coachPerformance: {
    coach: {
      id: 'coach-1',
      name: 'Coach Name',
      photo: null,
      age: 55,
    },
    winRate: 76,
    pointsPerMatch: 2.32,
    played: 25,
    wins: 19,
    draws: 3,
    losses: 3,
  },
  trophiesCount: 6,
  trophyWinsCount: 3,
};

const BASE_OVERVIEW_LEADERS: TeamOverviewLeadersData = {
  seasonLineup: {
    formation: '4-3-3',
    estimated: true,
    goalkeeper: {
      playerId: 'gk-1',
      name: 'GK',
      photo: null,
      teamLogo: null,
      position: 'Goalkeeper',
      goals: 0,
      assists: 0,
      rating: 7.2,
    },
    defenders: [],
    midfielders: [],
    attackers: [],
  },
  playerLeaders: {
    ratings: [],
    scorers: [],
    assisters: [],
  },
  sourceUpdatedAt: '2026-03-07T10:00:00.000Z',
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

describe('useTeamOverview', () => {
  let capturedConfigs: Array<CapturedQueryConfig<unknown>>;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedConfigs = [];

    mockedUseQuery.mockImplementation(config => {
      capturedConfigs.push(config as CapturedQueryConfig<unknown>);
      return createQueryResult();
    });

    mockedFetchTeamOverview.mockResolvedValue(BASE_OVERVIEW_CORE);
    mockedFetchTeamOverviewLeaders.mockResolvedValue(BASE_OVERVIEW_LEADERS);
  });

  it('returns empty core and leaders payloads when required params are missing', async () => {
    renderHook(() =>
      useTeamOverview({
        teamId: '529',
        leagueId: null,
        season: null,
        timezone: 'Europe/Paris',
      }),
    );

    const coreConfig = capturedConfigs[0] as CapturedQueryConfig<TeamOverviewCoreData>;
    const leadersConfig = capturedConfigs[1] as CapturedQueryConfig<TeamOverviewLeadersData>;

    expect(coreConfig.enabled).toBe(false);
    expect(leadersConfig.enabled).toBe(false);

    await expect(coreConfig.queryFn?.({ signal: undefined })).resolves.toEqual({
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
      miniStanding: null,
      standingHistory: [],
      coachPerformance: null,
      trophiesCount: null,
      trophyWinsCount: null,
    });

    await expect(leadersConfig.queryFn?.({ signal: undefined })).resolves.toEqual({
      seasonLineup: {
        formation: '4-3-3',
        estimated: true,
        goalkeeper: null,
        defenders: [],
        midfielders: [],
        attackers: [],
      },
      playerLeaders: {
        ratings: [],
        scorers: [],
        assisters: [],
      },
      sourceUpdatedAt: null,
    });

    expect(mockedFetchTeamOverview).not.toHaveBeenCalled();
    expect(mockedFetchTeamOverviewLeaders).not.toHaveBeenCalled();
  });

  it('excludes the current season before limiting history and delegates to split endpoints', async () => {
    mockedUseQuery.mockReset();
    capturedConfigs = [];

    mockedUseQuery.mockImplementation(config => {
      capturedConfigs.push(config as CapturedQueryConfig<unknown>);
      const callIndex = capturedConfigs.length - 1;

      if (callIndex === 0) {
        return createQueryResult<TeamOverviewCoreData>({
          data: BASE_OVERVIEW_CORE,
          dataUpdatedAt: 100,
          isFetched: true,
          isFetchedAfterMount: true,
          isSuccess: true,
          status: 'success',
        });
      }

      return createQueryResult<TeamOverviewLeadersData>({
        data: BASE_OVERVIEW_LEADERS,
        dataUpdatedAt: 200,
        isFetched: true,
        isFetchedAfterMount: true,
        isSuccess: true,
        status: 'success',
      });
    });

    renderHook(() =>
      useTeamOverview({
        teamId: '529',
        leagueId: '140',
        season: 2025,
        timezone: 'Europe/Paris',
        competitionSeasons: [2025, 2024, 2023, 2022, 2021, 2020, 2019],
      }),
    );

    const coreConfig = capturedConfigs[0] as CapturedQueryConfig<TeamOverviewCoreData>;
    const leadersConfig = capturedConfigs[1] as CapturedQueryConfig<TeamOverviewLeadersData>;

    expect(coreConfig.enabled).toBe(true);
    expect(coreConfig.queryKey).toEqual([
      'team_overview',
      '529',
      '140',
      2025,
      'Europe/Paris',
      '2024,2023,2022,2021,2020',
    ]);
    expect(leadersConfig.enabled).toBe(true);
    expect(leadersConfig.queryKey).toEqual([
      'team_overview_leaders',
      '529',
      '140',
      2025,
    ]);

    await coreConfig.queryFn?.({ signal: undefined });
    await leadersConfig.queryFn?.({ signal: undefined });

    expect(mockedFetchTeamOverview).toHaveBeenCalledWith(
      {
        teamId: '529',
        leagueId: '140',
        season: 2025,
        timezone: 'Europe/Paris',
        historySeasons: [2024, 2023, 2022, 2021, 2020],
      },
      undefined,
    );
    expect(mockedFetchTeamOverviewLeaders).toHaveBeenCalledWith(
      {
        teamId: '529',
        leagueId: '140',
        season: 2025,
      },
      undefined,
    );
  });

  it('returns core data immediately while leaders are still loading', () => {
    mockedUseQuery.mockReset();
    capturedConfigs = [];

    mockedUseQuery.mockImplementation(config => {
      capturedConfigs.push(config as CapturedQueryConfig<unknown>);
      const callIndex = capturedConfigs.length - 1;

      if (callIndex === 0) {
        return createQueryResult<TeamOverviewCoreData>({
          data: BASE_OVERVIEW_CORE,
          dataUpdatedAt: 100,
          isFetched: true,
          isFetchedAfterMount: true,
          isSuccess: true,
          status: 'success',
        });
      }

      return createQueryResult<TeamOverviewLeadersData>({
        data: undefined,
        isLoading: true,
        isFetching: true,
        status: 'pending',
      });
    });

    const { result } = renderHook(() =>
      useTeamOverview({
        teamId: '529',
        leagueId: '140',
        season: 2025,
        timezone: 'Europe/Paris',
      }),
    );

    expect(result.current.data).toEqual({
      ...BASE_OVERVIEW_CORE,
      seasonLineup: {
        formation: '4-3-3',
        estimated: true,
        goalkeeper: null,
        defenders: [],
        midfielders: [],
        attackers: [],
      },
      playerLeaders: {
        ratings: [],
        scorers: [],
        assisters: [],
      },
      sourceUpdatedAt: null,
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isLeadersLoading).toBe(true);
    expect(result.current.isError).toBe(false);
  });
});
