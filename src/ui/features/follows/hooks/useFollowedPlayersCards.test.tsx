import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useFollowedPlayersCards } from '@ui/features/follows/hooks/useFollowedPlayersCards';
import { fetchPlayerSeasonStats } from '@data/endpoints/followsApi';

jest.mock('@data/endpoints/followsApi', () => ({
  fetchPlayerSeasonStats: jest.fn(async () => null),
  searchTeamsByName: jest.fn(async () => []),
  searchPlayersByName: jest.fn(async () => []),
  fetchNextFixtureForTeam: jest.fn(async () => null),
  fetchTeamById: jest.fn(async () => null),
  fetchTrendingTeams: jest.fn(async () => []),
  fetchTrendingPlayers: jest.fn(async () => []),
}));

const mockedFetchPlayerSeasonStats = jest.mocked(fetchPlayerSeasonStats);

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

describe('useFollowedPlayersCards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not run query when no player IDs are provided', () => {
    const { result } = renderHook(() => useFollowedPlayersCards({ playerIds: [] }), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedFetchPlayerSeasonStats).not.toHaveBeenCalled();
  });

  it('hydrates cards from API', async () => {
    mockedFetchPlayerSeasonStats.mockResolvedValueOnce({
      player: {
        id: 154,
        name: 'Cristiano Ronaldo',
        photo: 'cr7.png',
      },
      statistics: [
        {
          team: {
            name: 'Al-Nassr',
            logo: 'nassr.png',
          },
          league: {
            name: 'Saudi League',
            season: 2025,
          },
          games: {
            position: 'Attacker',
          },
          goals: {
            total: 24,
            assists: 8,
          },
        },
      ],
    });

    const { result } = renderHook(() => useFollowedPlayersCards({ playerIds: ['154'] }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data?.[0].playerName).toBe('Cristiano Ronaldo');
    });

    expect(mockedFetchPlayerSeasonStats).toHaveBeenCalledTimes(1);
  });
});
