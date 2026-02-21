import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useFollowsTrends } from '@ui/features/follows/hooks/useFollowsTrends';
import { fetchTrendingPlayers, fetchTrendingTeams } from '@data/endpoints/followsApi';

jest.mock('@data/endpoints/followsApi', () => ({
  fetchTrendingTeams: jest.fn(async () => []),
  fetchTrendingPlayers: jest.fn(async () => []),
}));

const mockedFetchTrendingTeams = jest.mocked(fetchTrendingTeams);
const mockedFetchTrendingPlayers = jest.mocked(fetchTrendingPlayers);

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

  it('does not query when trends are hidden', () => {
    const { result } = renderHook(() => useFollowsTrends({ tab: 'teams', hidden: true }), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedFetchTrendingTeams).not.toHaveBeenCalled();
  });

  it('returns empty trends on team API error', async () => {
    mockedFetchTrendingTeams.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useFollowsTrends({ tab: 'teams', hidden: false }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });
  });

  it('returns mapped player trends', async () => {
    mockedFetchTrendingPlayers.mockResolvedValueOnce([
      {
        player: { id: 154, name: 'Cristiano Ronaldo', photo: 'cr7.png' },
        statistics: [
          { team: { name: 'Al-Nassr', logo: 'nassr.png' }, games: { position: 'Att' } },
        ],
      },
    ]);

    const { result } = renderHook(() => useFollowsTrends({ tab: 'players', hidden: false }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
    });

    expect(mockedFetchTrendingPlayers).toHaveBeenCalled();
  });
});
