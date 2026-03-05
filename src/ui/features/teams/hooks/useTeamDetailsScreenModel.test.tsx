import { act, renderHook } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useFollowsActions } from '@ui/features/follows/hooks/useFollowsActions';
import { useTeamContext } from '@ui/features/teams/hooks/useTeamContext';
import { useTeamDetailsScreenModel } from '@ui/features/teams/hooks/useTeamDetailsScreenModel';
import { useTeamMatches } from '@ui/features/teams/hooks/useTeamMatches';
import { useTeamOverview } from '@ui/features/teams/hooks/useTeamOverview';
import { useTeamSquad } from '@ui/features/teams/hooks/useTeamSquad';
import { useTeamStandings } from '@ui/features/teams/hooks/useTeamStandings';
import { useTeamStats } from '@ui/features/teams/hooks/useTeamStats';
import { useTeamTrophies } from '@ui/features/teams/hooks/useTeamTrophies';
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

jest.mock('@ui/features/teams/hooks/useTeamTrophies', () => ({
  useTeamTrophies: jest.fn(),
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
const mockedUseTeamContext = jest.mocked(useTeamContext);
const mockedUseTeamMatches = jest.mocked(useTeamMatches);
const mockedUseTeamOverview = jest.mocked(useTeamOverview);
const mockedUseTeamSquad = jest.mocked(useTeamSquad);
const mockedUseTeamStandings = jest.mocked(useTeamStandings);
const mockedUseTeamStats = jest.mocked(useTeamStats);
const mockedUseTeamTrophies = jest.mocked(useTeamTrophies);
const mockedUseTeamTransfers = jest.mocked(useTeamTransfers);
const mockedUseFollowsActions = jest.mocked(useFollowsActions);

const makeQueryState = (data?: unknown) =>
  ({
    data,
    isLoading: false,
    isFetching: false,
    isError: false,
    isFetched: false,
    isFetchedAfterMount: false,
    dataUpdatedAt: 0,
    refetch: jest.fn(async () => undefined),
  }) as never;

describe('useTeamDetailsScreenModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseNavigation.mockReturnValue({
      navigate: jest.fn(),
      push: jest.fn(),
      goBack: jest.fn(),
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

    mockedUseTeamOverview.mockReturnValue(makeQueryState({
      recentForm: [],
      seasonStats: {},
    }));
    mockedUseTeamMatches.mockReturnValue(makeQueryState({
      all: [],
      live: [],
      upcoming: [],
      past: [],
    }));
    mockedUseTeamStandings.mockReturnValue(makeQueryState({
      groups: [],
    }));
    mockedUseTeamStats.mockReturnValue(makeQueryState({
      comparisonMetrics: [],
    }));
    mockedUseTeamTransfers.mockReturnValue(makeQueryState({
      arrivals: [],
      departures: [],
    }));
    mockedUseTeamSquad.mockReturnValue(makeQueryState({
      players: [],
      coach: null,
    }));
    mockedUseTeamTrophies.mockReturnValue(makeQueryState({
      groups: [],
    }));
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
    expect(mockedUseTeamTrophies).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );

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
  });
});
