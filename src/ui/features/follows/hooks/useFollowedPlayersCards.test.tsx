import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useFollowedPlayersCards } from '@ui/features/follows/hooks/useFollowedPlayersCards';
import { fetchFollowedPlayerCards } from '@data/endpoints/followsApi';

jest.mock('@data/endpoints/followsApi', () => ({
  fetchFollowedPlayerCards: jest.fn(async () => []),
}));

const mockedFetchFollowedPlayerCards = jest.mocked(fetchFollowedPlayerCards);

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
    expect(mockedFetchFollowedPlayerCards).not.toHaveBeenCalled();
  });

  it('hydrates cards from API', async () => {
    mockedFetchFollowedPlayerCards.mockResolvedValueOnce([
      {
        playerId: '154',
        playerName: 'Cristiano Ronaldo',
        playerPhoto: 'cr7.png',
        position: 'Attacker',
        teamName: 'Al-Nassr',
        teamLogo: 'nassr.png',
        leagueName: 'Saudi League',
        goals: 24,
        assists: 8,
      },
    ]);

    const { result } = renderHook(() => useFollowedPlayersCards({ playerIds: ['154'] }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data?.[0].playerName).toBe('Cristiano Ronaldo');
    });

    expect(mockedFetchFollowedPlayerCards).toHaveBeenCalledTimes(1);
  });
});
