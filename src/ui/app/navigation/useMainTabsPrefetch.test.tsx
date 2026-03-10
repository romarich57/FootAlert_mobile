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
  fetchDiscoveryPlayers: jest.fn(async () => ({
    items: [],
    meta: {
      source: 'dynamic',
      complete: true,
      seedCount: 0,
      generatedAt: '2026-03-07T00:00:00.000Z',
      refreshAfterMs: null,
    },
  })),
  fetchDiscoveryTeams: jest.fn(async () => ({
    items: [],
    meta: {
      source: 'dynamic',
      complete: true,
      seedCount: 0,
      generatedAt: '2026-03-07T00:00:00.000Z',
      refreshAfterMs: null,
    },
  })),
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

    await waitFor(() => {
      expect(prefetchSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    const baselinePrefetchCount = prefetchSpy.mock.calls.length;
    const baselineMatchesFetchCount = mockedFetchFixturesByDate.mock.calls.length;
    const baselineCompetitionsFetchCount = mockedFetchAllLeagues.mock.calls.length;

    await act(async () => {
      result.current.Matches.tabPress();
    });

    await waitFor(() => {
      expect(mockedFetchFixturesByDate).toHaveBeenCalledTimes(baselineMatchesFetchCount + 1);
      expect(mockedFetchAllLeagues).toHaveBeenCalledTimes(
        baselineCompetitionsFetchCount + 1,
      );
      expect(prefetchSpy).toHaveBeenCalledTimes(baselinePrefetchCount + 2);
    });

    nowSpy.mockReturnValue(10_000 + TAB_PREFETCH_COOLDOWN_MS - 1);
    await act(async () => {
      result.current.Matches.tabPress();
    });

    await waitFor(() => {
      expect(mockedFetchFixturesByDate).toHaveBeenCalledTimes(baselineMatchesFetchCount + 1);
      expect(mockedFetchAllLeagues).toHaveBeenCalledTimes(
        baselineCompetitionsFetchCount + 1,
      );
      expect(prefetchSpy).toHaveBeenCalledTimes(baselinePrefetchCount + 2);
    });

    nowSpy.mockReturnValue(10_000 + TAB_PREFETCH_COOLDOWN_MS + 1);
    await act(async () => {
      result.current.Matches.tabPress();
    });

    await waitFor(() => {
      expect(mockedFetchFixturesByDate).toHaveBeenCalledTimes(baselineMatchesFetchCount + 2);
      expect(mockedFetchAllLeagues).toHaveBeenCalledTimes(
        baselineCompetitionsFetchCount + 2,
      );
      expect(prefetchSpy).toHaveBeenCalledTimes(baselinePrefetchCount + 4);
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
      expect(mockedLoadFollowedTeamIds.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(mockedLoadFollowedPlayerIds.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(mockedFetchFollowedTeamCards.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(mockedFetchFollowedPlayerCards.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(mockedFetchDiscoveryTeams.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(mockedFetchDiscoveryPlayers.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(mockedFetchFixturesByDate.mock.calls.length).toBeGreaterThanOrEqual(1);
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
      expect(mockedLoadFollowedTeamIds.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(mockedLoadFollowedPlayerIds.mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    expect(mockedFetchFollowedTeamCards).not.toHaveBeenCalled();
    expect(mockedFetchFollowedPlayerCards).not.toHaveBeenCalled();
    expect(mockedFetchDiscoveryTeams.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(mockedFetchDiscoveryPlayers.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('prefetches follows discovery on mount when online and not in lite mode', async () => {
    renderHook(() => useMainTabsPrefetch(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockedFetchDiscoveryTeams.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(mockedFetchDiscoveryPlayers.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });
});
