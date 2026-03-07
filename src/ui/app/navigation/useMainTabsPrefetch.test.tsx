import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useNetInfo } from '@react-native-community/netinfo';

import { fetchAllLeagues } from '@data/endpoints/competitionsApi';
import {
  fetchDiscoveryPlayers,
  fetchDiscoveryTeams,
  fetchFollowedPlayerCards,
  fetchFollowedTeamCards,
} from '@data/endpoints/followsApi';
import { fetchFixturesByDate } from '@data/endpoints/matchesApi';
import {
  loadFollowedPlayerIds,
  loadFollowedTeamIds,
} from '@data/storage/followsStorage';
import { TAB_PREFETCH_COOLDOWN_MS, useMainTabsPrefetch } from '@ui/app/navigation/useMainTabsPrefetch';

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(),
}));

jest.mock('@data/endpoints/matchesApi', () => ({
  fetchFixturesByDate: jest.fn(async () => []),
}));

jest.mock('@data/endpoints/competitionsApi', () => ({
  fetchAllLeagues: jest.fn(async () => []),
}));

jest.mock('@data/endpoints/followsApi', () => ({
  fetchDiscoveryPlayers: jest.fn(async () => ({ items: [], meta: { source: 'dynamic' } })),
  fetchDiscoveryTeams: jest.fn(async () => ({ items: [], meta: { source: 'dynamic' } })),
  fetchFollowedPlayerCards: jest.fn(async () => []),
  fetchFollowedTeamCards: jest.fn(async () => []),
}));

jest.mock('@data/storage/followsStorage', () => ({
  loadFollowedPlayerIds: jest.fn(async () => []),
  loadFollowedTeamIds: jest.fn(async () => []),
}));

jest.mock('@data/mappers/followsMapper', () => ({
  getCurrentSeasonYear: jest.fn(() => 2026),
  mapPlayerSeasonToFollowedCard: jest.fn((playerId: string) => ({ playerId })),
  mapTeamDetailsAndFixtureToFollowedCard: jest.fn((teamId: string) => ({ teamId })),
  mapTrendingPlayersFromTopScorers: jest.fn(() => []),
  mapTrendingTeamsFromStandings: jest.fn(() => []),
}));

const mockedUseNetInfo = jest.mocked(useNetInfo);
const mockedFetchFixturesByDate = jest.mocked(fetchFixturesByDate);
const mockedFetchAllLeagues = jest.mocked(fetchAllLeagues);
const mockedLoadFollowedTeamIds = jest.mocked(loadFollowedTeamIds);
const mockedLoadFollowedPlayerIds = jest.mocked(loadFollowedPlayerIds);
const mockedFetchDiscoveryPlayers = jest.mocked(fetchDiscoveryPlayers);
const mockedFetchDiscoveryTeams = jest.mocked(fetchDiscoveryTeams);
const mockedFetchFollowedPlayerCards = jest.mocked(fetchFollowedPlayerCards);
const mockedFetchFollowedTeamCards = jest.mocked(fetchFollowedTeamCards);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useMainTabsPrefetch', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseNetInfo.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
    } as ReturnType<typeof useNetInfo>);
  });

  it('prefetches Matches tab and throttles repeated presses during cooldown', async () => {
    const nowSpy = jest.spyOn(Date, 'now');
    const prefetchSpy = jest.spyOn(QueryClient.prototype, 'prefetchQuery');
    nowSpy.mockReturnValue(10_000);

    const { result } = renderHook(() => useMainTabsPrefetch(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.Matches.tabPress();
    });

    await waitFor(() => {
      expect(mockedFetchFixturesByDate).toHaveBeenCalledTimes(1);
      expect(prefetchSpy).toHaveBeenCalledTimes(1);
    });

    nowSpy.mockReturnValue(10_000 + TAB_PREFETCH_COOLDOWN_MS - 1);
    await act(async () => {
      result.current.Matches.tabPress();
    });

    await waitFor(() => {
      expect(mockedFetchFixturesByDate).toHaveBeenCalledTimes(1);
      expect(prefetchSpy).toHaveBeenCalledTimes(1);
    });

    nowSpy.mockReturnValue(10_000 + TAB_PREFETCH_COOLDOWN_MS + 1);
    await act(async () => {
      result.current.Matches.tabPress();
    });

    await waitFor(() => {
      expect(prefetchSpy).toHaveBeenCalledTimes(2);
    });

    prefetchSpy.mockRestore();
    nowSpy.mockRestore();
  });

  it('skips prefetch when device is offline', async () => {
    mockedUseNetInfo.mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
    } as ReturnType<typeof useNetInfo>);

    const { result } = renderHook(() => useMainTabsPrefetch(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.Matches.tabPress();
      result.current.Competitions.tabPress();
      result.current.Follows.tabPress();
    });

    expect(mockedFetchFixturesByDate).not.toHaveBeenCalled();
    expect(mockedFetchAllLeagues).not.toHaveBeenCalled();
    expect(mockedLoadFollowedTeamIds).not.toHaveBeenCalled();
    expect(mockedLoadFollowedPlayerIds).not.toHaveBeenCalled();
  });

  it('prefetches follows datasets when follows tab is pressed', async () => {
    mockedLoadFollowedTeamIds.mockResolvedValueOnce(['85']);
    mockedLoadFollowedPlayerIds.mockResolvedValueOnce(['276']);

    const { result } = renderHook(() => useMainTabsPrefetch(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.Follows.tabPress();
    });

    await waitFor(() => {
      expect(mockedLoadFollowedTeamIds).toHaveBeenCalledTimes(1);
      expect(mockedLoadFollowedPlayerIds).toHaveBeenCalledTimes(1);
      expect(mockedFetchFollowedTeamCards).toHaveBeenCalledTimes(1);
      expect(mockedFetchFollowedPlayerCards).toHaveBeenCalledTimes(1);
      expect(mockedFetchDiscoveryTeams).toHaveBeenCalledTimes(1);
      expect(mockedFetchDiscoveryPlayers).toHaveBeenCalledTimes(1);
    });
  });

  it('still prefetches discovery when no followed ids are stored', async () => {
    mockedLoadFollowedTeamIds.mockResolvedValueOnce([]);
    mockedLoadFollowedPlayerIds.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useMainTabsPrefetch(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.Follows.tabPress();
    });

    await waitFor(() => {
      expect(mockedLoadFollowedTeamIds).toHaveBeenCalledTimes(1);
      expect(mockedLoadFollowedPlayerIds).toHaveBeenCalledTimes(1);
    });

    expect(mockedFetchFollowedTeamCards).not.toHaveBeenCalled();
    expect(mockedFetchFollowedPlayerCards).not.toHaveBeenCalled();
    expect(mockedFetchDiscoveryTeams).toHaveBeenCalledTimes(1);
    expect(mockedFetchDiscoveryPlayers).toHaveBeenCalledTimes(1);
  });
});
