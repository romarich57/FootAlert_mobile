import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useFollowsTrends } from '@ui/features/follows/hooks/useFollowsTrends';
import { fetchTrendingPlayers, fetchTrendingTeams } from '@data/endpoints/followsApi';
import {
  loadCachedPlayerTrends,
  loadCachedTeamTrends,
  saveCachedPlayerTrends,
  saveCachedTeamTrends,
} from '@data/storage/followsTrendsCacheStorage';

jest.mock('@data/endpoints/followsApi', () => ({
  fetchTrendingTeams: jest.fn(async () => []),
  fetchTrendingPlayers: jest.fn(async () => []),
}));

jest.mock('@data/storage/followsTrendsCacheStorage', () => ({
  loadCachedTeamTrends: jest.fn(async () => null),
  saveCachedTeamTrends: jest.fn(async () => undefined),
  loadCachedPlayerTrends: jest.fn(async () => null),
  saveCachedPlayerTrends: jest.fn(async () => undefined),
}));

const mockedFetchTrendingTeams = jest.mocked(fetchTrendingTeams);
const mockedFetchTrendingPlayers = jest.mocked(fetchTrendingPlayers);
const mockedLoadCachedTeamTrends = jest.mocked(loadCachedTeamTrends);
const mockedSaveCachedTeamTrends = jest.mocked(saveCachedTeamTrends);
const mockedLoadCachedPlayerTrends = jest.mocked(loadCachedPlayerTrends);
const mockedSaveCachedPlayerTrends = jest.mocked(saveCachedPlayerTrends);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useFollowsTrends', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached team trends when cache is valid', async () => {
    mockedLoadCachedTeamTrends.mockResolvedValueOnce([
      {
        teamId: '50',
        teamName: 'Man City',
        teamLogo: 'city.png',
        leagueName: 'Premier League',
      },
    ]);

    const { result } = renderHook(() => useFollowsTrends({ tab: 'teams', hidden: false }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
    });

    expect(mockedFetchTrendingTeams).not.toHaveBeenCalled();
  });

  it('hides trends on API error for teams', async () => {
    mockedFetchTrendingTeams.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useFollowsTrends({ tab: 'teams', hidden: false }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });

    expect(mockedSaveCachedTeamTrends).not.toHaveBeenCalled();
  });

  it('returns player trends and caches them', async () => {
    mockedFetchTrendingPlayers.mockResolvedValueOnce([
      {
        player: { id: 154, name: 'Cristiano Ronaldo', photo: 'cr7.png' },
        statistics: [{ team: { name: 'Al-Nassr', logo: 'nassr.png' }, games: { position: 'Att' } }],
      },
    ]);

    const { result } = renderHook(() => useFollowsTrends({ tab: 'players', hidden: false }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
    });

    expect(mockedLoadCachedPlayerTrends).toHaveBeenCalled();
    expect(mockedSaveCachedPlayerTrends).toHaveBeenCalled();
  });
});
