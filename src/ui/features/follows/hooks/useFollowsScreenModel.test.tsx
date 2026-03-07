import { act, renderHook } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';

import { useFollowsActions } from '@ui/features/follows/hooks/useFollowsActions';
import { useDiscoveryEntities } from '@ui/features/follows/hooks/useDiscoveryEntities';
import { useFollowedPlayersCards } from '@ui/features/follows/hooks/useFollowedPlayersCards';
import { useFollowedTeamsCards } from '@ui/features/follows/hooks/useFollowedTeamsCards';
import { useFollowsScreenModel } from '@ui/features/follows/hooks/useFollowsScreenModel';
import { useFollowsSearch } from '@ui/features/follows/hooks/useFollowsSearch';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(),
  };
});

jest.mock('@ui/features/follows/hooks/useFollowsActions', () => ({
  useFollowsActions: jest.fn(),
}));

jest.mock('@ui/features/follows/hooks/useFollowedTeamsCards', () => ({
  useFollowedTeamsCards: jest.fn(),
}));

jest.mock('@ui/features/follows/hooks/useFollowedPlayersCards', () => ({
  useFollowedPlayersCards: jest.fn(),
}));

jest.mock('@ui/features/follows/hooks/useDiscoveryEntities', () => ({
  useDiscoveryEntities: jest.fn(),
}));

jest.mock('@ui/features/follows/hooks/useFollowsSearch', () => ({
  useFollowsSearch: jest.fn(),
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
const mockedUseFollowsActions = jest.mocked(useFollowsActions);
const mockedUseFollowedTeamsCards = jest.mocked(useFollowedTeamsCards);
const mockedUseFollowedPlayersCards = jest.mocked(useFollowedPlayersCards);
const mockedUseDiscoveryEntities = jest.mocked(useDiscoveryEntities);
const mockedUseFollowsSearch = jest.mocked(useFollowsSearch);

describe('useFollowsScreenModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseNavigation.mockReturnValue({
      navigate: jest.fn(),
    } as never);

    mockedUseFollowsActions.mockReturnValue({
      followedTeamIds: ['529'],
      followedPlayerIds: ['278'],
      hideTrendsTeams: false,
      hideTrendsPlayers: false,
      isLoading: false,
      lastToggleError: null,
      clearToggleError: jest.fn(),
      toggleTeamFollow: jest.fn(async () => ({ ids: [], changed: true })),
      togglePlayerFollow: jest.fn(async () => ({ ids: [], changed: true })),
      updateHideTrends: jest.fn(async () => undefined),
    } as never);

    mockedUseFollowedTeamsCards.mockReturnValue({
      data: [],
      isLoading: false,
      dataUpdatedAt: 0,
    } as never);
    mockedUseFollowedPlayersCards.mockReturnValue({
      data: [],
      isLoading: false,
      dataUpdatedAt: 0,
    } as never);
    mockedUseDiscoveryEntities.mockReturnValue({
      resolvedItems: [],
      remoteItems: [],
      meta: {
        source: 'dynamic',
        complete: true,
        seedCount: 0,
        generatedAt: '2026-03-07T00:00:00.000Z',
        refreshAfterMs: null,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      hasRemoteData: false,
      usedLastGood: false,
      usedSeedFallback: false,
      dataUpdatedAt: 0,
      refetch: jest.fn(),
    } as never);
    mockedUseFollowsSearch.mockReturnValue({
      data: [],
      dataUpdatedAt: 0,
      isLoading: false,
      hasEnoughChars: false,
      debouncedQuery: '',
      results: [],
    } as never);
  });

  it('enables only current tab followed cards query', () => {
    const { result } = renderHook(() => useFollowsScreenModel());

    expect(result.current.selectedTab).toBe('teams');
    expect(mockedUseFollowedTeamsCards).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
      }),
    );
    expect(mockedUseFollowedPlayersCards).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );

    act(() => {
      result.current.setSelectedTab('players');
    });

    expect(mockedUseFollowedTeamsCards).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
    expect(mockedUseFollowedPlayersCards).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: true,
      }),
    );
  });

  it('keeps section loading active while discovery is still resolving', () => {
    mockedUseDiscoveryEntities.mockReturnValue({
      resolvedItems: [],
      remoteItems: [],
      meta: {
        source: 'static_seed',
        complete: false,
        seedCount: 0,
        generatedAt: '2026-03-07T00:00:00.000Z',
        refreshAfterMs: 1500,
      },
      isLoading: true,
      isFetching: false,
      isError: false,
      hasRemoteData: false,
      usedLastGood: false,
      usedSeedFallback: false,
      dataUpdatedAt: 0,
      refetch: jest.fn(),
    } as never);

    const { result } = renderHook(() => useFollowsScreenModel());

    expect(result.current.isSectionLoading).toBe(true);
  });
});
