import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useNetInfo } from '@react-native-community/netinfo';

import { fetchAllLeagues } from '@data/endpoints/competitionsApi';
import {
  fetchNextFixtureForTeam,
  fetchPlayerSeasonStats,
  fetchTeamById,
  fetchTrendingPlayers,
  fetchTrendingTeams,
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
  fetchNextFixtureForTeam: jest.fn(async () => null),
  fetchPlayerSeasonStats: jest.fn(async () => null),
  fetchTeamById: jest.fn(async () => null),
  fetchTrendingPlayers: jest.fn(async () => []),
  fetchTrendingTeams: jest.fn(async () => []),
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
const mockedFetchTeamById = jest.mocked(fetchTeamById);
const mockedFetchNextFixtureForTeam = jest.mocked(fetchNextFixtureForTeam);
const mockedFetchPlayerSeasonStats = jest.mocked(fetchPlayerSeasonStats);
const mockedFetchTrendingTeams = jest.mocked(fetchTrendingTeams);
const mockedFetchTrendingPlayers = jest.mocked(fetchTrendingPlayers);

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
      expect(mockedFetchTeamById).toHaveBeenCalledTimes(1);
      expect(mockedFetchNextFixtureForTeam).toHaveBeenCalledTimes(1);
      expect(mockedFetchPlayerSeasonStats).toHaveBeenCalledTimes(1);
      expect(mockedFetchTrendingTeams).toHaveBeenCalledTimes(1);
      expect(mockedFetchTrendingPlayers).toHaveBeenCalledTimes(1);
    });
  });

  it('skips follows trends prefetch when no followed ids are stored', async () => {
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

    expect(mockedFetchTeamById).not.toHaveBeenCalled();
    expect(mockedFetchNextFixtureForTeam).not.toHaveBeenCalled();
    expect(mockedFetchPlayerSeasonStats).not.toHaveBeenCalled();
    expect(mockedFetchTrendingTeams).not.toHaveBeenCalled();
    expect(mockedFetchTrendingPlayers).not.toHaveBeenCalled();
  });
});
