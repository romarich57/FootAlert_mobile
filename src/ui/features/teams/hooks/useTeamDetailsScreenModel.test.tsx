import { act, renderHook } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';

import { useFollowsActions } from '@ui/features/follows/hooks/useFollowsActions';
import { useTeamContext } from '@ui/features/teams/hooks/useTeamContext';
import { useTeamDetailsScreenModel } from '@ui/features/teams/hooks/useTeamDetailsScreenModel';
import { useTeamMatches } from '@ui/features/teams/hooks/useTeamMatches';
import { useTeamOverview } from '@ui/features/teams/hooks/useTeamOverview';
import { useTeamSquad } from '@ui/features/teams/hooks/useTeamSquad';
import { useTeamStandings } from '@ui/features/teams/hooks/useTeamStandings';
import { useTeamStats } from '@ui/features/teams/hooks/useTeamStats';
import { useTeamTransfers } from '@ui/features/teams/hooks/useTeamTransfers';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(),
    useRoute: jest.fn(),
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(),
}));

jest.mock('@ui/features/teams/hooks/useTeamContext', () => ({
  useTeamContext: jest.fn(),
}));

jest.mock('@ui/features/teams/hooks/useTeamMatches', () => ({
  useTeamMatches: jest.fn(),
}));

jest.mock('@ui/features/teams/hooks/useTeamOverview', () => ({
  useTeamOverview: jest.fn(),
}));

jest.mock('@ui/features/teams/hooks/useTeamSquad', () => ({
  useTeamSquad: jest.fn(),
}));

jest.mock('@ui/features/teams/hooks/useTeamStandings', () => ({
  useTeamStandings: jest.fn(),
}));

jest.mock('@ui/features/teams/hooks/useTeamStats', () => ({
  useTeamStats: jest.fn(),
}));

jest.mock('@ui/features/teams/hooks/useTeamTransfers', () => ({
  useTeamTransfers: jest.fn(),
}));

jest.mock('@ui/features/follows/hooks/useFollowsActions', () => ({
  useFollowsActions: jest.fn(),
}));

jest.mock('@data/telemetry/mobileTelemetry', () => ({
  getMobileTelemetry: () => ({
    trackEvent: jest.fn(),
    trackError: jest.fn(),
    setUserContext: jest.fn(),
    addBreadcrumb: jest.fn(),
    trackBatch: jest.fn(),
    flush: jest.fn(async () => undefined),
  }),
}));

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseRoute = jest.mocked(useRoute);
const mockedUseQueryClient = jest.mocked(useQueryClient);
const mockedUseTeamContext = jest.mocked(useTeamContext);
const mockedUseTeamMatches = jest.mocked(useTeamMatches);
const mockedUseTeamOverview = jest.mocked(useTeamOverview);
const mockedUseTeamSquad = jest.mocked(useTeamSquad);
const mockedUseTeamStandings = jest.mocked(useTeamStandings);
const mockedUseTeamStats = jest.mocked(useTeamStats);
const mockedUseTeamTransfers = jest.mocked(useTeamTransfers);
const mockedUseFollowsActions = jest.mocked(useFollowsActions);
const prefetchQueryMock = jest.fn(async () => undefined);
const globalScope = globalThis as typeof globalThis & {
  requestIdleCallback?: ((callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void) => number) | undefined;
  cancelIdleCallback?: ((handle: number) => void) | undefined;
};
const originalRequestIdleCallback = globalScope.requestIdleCallback;
const originalCancelIdleCallback = globalScope.cancelIdleCallback;

function makeQueryState(data?: unknown) {
  return {
    data,
    error: null,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isLoading: false,
    isFetching: false,
    isError: false,
    isPending: false,
    isLoadingError: false,
    isRefetchError: false,
    isRefetching: false,
    isFetched: false,
    isFetchedAfterMount: false,
    isSuccess: true,
    isPlaceholderData: false,
    isInitialLoading: false,
    isPaused: false,
    isStale: false,
    fetchStatus: 'idle' as const,
    status: 'success' as const,
    isEnabled: true,
    dataUpdatedAt: 0,
    refetch: jest.fn(async () => undefined),
    promise: Promise.resolve(data),
  };
}

describe('useTeamDetailsScreenModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    globalScope.requestIdleCallback = ((callback: any) => {
      callback({
        didTimeout: false,
        timeRemaining: () => 50,
      });
      return 1;
    }) as typeof globalScope.requestIdleCallback;
    globalScope.cancelIdleCallback = jest.fn() as typeof globalScope.cancelIdleCallback;

    mockedUseNavigation.mockReturnValue({
      navigate: jest.fn(),
      push: jest.fn(),
      goBack: jest.fn(),
    } as never);

    mockedUseQueryClient.mockReturnValue({
      prefetchQuery: prefetchQueryMock,
    } as never);

    mockedUseRoute.mockReturnValue({
      params: {
        teamId: '529',
      },
    } as never);

    mockedUseFollowsActions.mockReturnValue({
      followedTeamIds: [],
      toggleTeamFollow: jest.fn(async () => ({ ids: ['529'], changed: true })),
    } as never);

    mockedUseTeamContext.mockReturnValue({
      team: {
        id: '529',
        name: 'Barcelona',
      },
      timezone: 'Europe/Paris',
      competitions: [
        {
          leagueId: '39',
          seasons: [2025, 2024],
          type: 'league',
        },
      ],
      selectedLeagueId: '39',
      selectedSeason: 2025,
      setLeague: jest.fn(),
      setLeagueSeason: jest.fn(),
      setSeason: jest.fn(),
      isLoading: false,
      isError: false,
      hasCachedData: true,
      lastUpdatedAt: null,
      refetch: jest.fn(),
    } as never);

    mockedUseTeamOverview.mockReturnValue({
      ...makeQueryState({
        recentForm: [],
        seasonStats: {},
      }),
      coreData: {
        recentForm: [],
        seasonStats: {},
      },
      coreUpdatedAt: 100,
      leadersData: undefined,
      leadersUpdatedAt: 0,
      isLeadersLoading: false,
      isLeadersFetching: false,
      isLeadersError: false,
    } as never);
    mockedUseTeamMatches.mockReturnValue(makeQueryState({
      all: [],
      live: [],
      upcoming: [],
      past: [],
    }) as never);
    mockedUseTeamStandings.mockReturnValue(makeQueryState({
      groups: [],
    }) as never);
    mockedUseTeamStats.mockReturnValue({
      ...makeQueryState({
        comparisonMetrics: [],
      }),
      coreData: {
        comparisonMetrics: [],
      },
      coreUpdatedAt: 0,
      playersData: undefined,
      advancedData: undefined,
      playersUpdatedAt: 0,
      advancedUpdatedAt: 0,
      isCoreLoading: false,
      isPlayersLoading: false,
      isAdvancedLoading: false,
      isPlayersFetching: false,
      isAdvancedFetching: false,
      isPlayersError: false,
      isAdvancedError: false,
    } as never);
    mockedUseTeamTransfers.mockReturnValue(makeQueryState({
      arrivals: [],
      departures: [],
    }) as never);
    mockedUseTeamSquad.mockReturnValue(makeQueryState({
      players: [],
      coach: null,
    }) as never);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    globalScope.requestIdleCallback = originalRequestIdleCallback;
    globalScope.cancelIdleCallback = originalCancelIdleCallback;
  });

  it('enables overview query only on initial tab and toggles enabled flags when switching tabs', () => {
    const { result } = renderHook(() => useTeamDetailsScreenModel());

    expect(result.current.activeTab).toBe('overview');
    expect(mockedUseTeamOverview).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: true,
      }),
    );
    expect(mockedUseTeamMatches).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
    expect(mockedUseTeamStandings).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
    expect(mockedUseTeamStats).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
    expect(mockedUseTeamTransfers).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
    expect(mockedUseTeamSquad).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
    expect(result.current.tabs.map(tab => tab.key)).toEqual([
      'overview',
      'matches',
      'standings',
      'stats',
      'transfers',
      'squad',
    ]);

    act(() => {
      result.current.handleChangeTab('matches');
    });

    expect(mockedUseTeamOverview).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
    expect(mockedUseTeamMatches).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: true,
      }),
    );

    act(() => {
      result.current.handleChangeTab('transfers');
    });

    expect(mockedUseTeamTransfers).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: true,
      }),
    );
    expect(mockedUseTeamMatches).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
    expect(result.current.tabs.map(tab => tab.key)).toEqual([
      'overview',
      'matches',
      'standings',
      'stats',
      'transfers',
      'squad',
    ]);
  });

  it('prefetches overview and transfers immediately, then stats core after the deferred task', () => {
    renderHook(() => useTeamDetailsScreenModel());

    expect(prefetchQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['team_overview', '529', '39', 2025, 'Europe/Paris', '2024'],
      }),
    );
    expect(prefetchQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['team_transfers', '529', 2025],
      }),
    );

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(prefetchQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['team_stats_core', '529', '39', 2025],
      }),
    );
  });
});
