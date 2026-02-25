import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { usePlayerStats } from '@ui/features/players/hooks/usePlayerStats';
import * as playersApi from '@data/endpoints/playersApi';

jest.mock('@data/endpoints/playersApi');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('usePlayerStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('returns season dataset with overall and competition stats', async () => {
    const mockDetailsDto = {
      player: {
        id: 10,
        name: 'Player Test',
      },
      statistics: [
        {
          league: { id: 39, name: 'Premier League', logo: 'pl.png', season: 2025 },
          games: { appearences: 12, lineups: 10, minutes: 1000, rating: '7.1' },
          goals: { total: 7, assists: 2 },
          shots: { total: 30, on: 15 },
        },
        {
          league: { id: 1, name: 'Domestic Cup', logo: 'cup.png', season: 2025 },
          games: { appearences: 0, lineups: 0, minutes: 0, rating: null },
          goals: { total: 0, assists: 0 },
          shots: { total: 0, on: 0 },
        },
      ],
    };

    jest.spyOn(playersApi, 'fetchPlayerDetails').mockResolvedValue(
      mockDetailsDto as Awaited<ReturnType<typeof playersApi.fetchPlayerDetails>>,
    );

    const { result } = renderHook(() => usePlayerStats('10', 2025, true), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats?.overall.matches).toBe(12);
    expect(result.current.stats?.overall.goals).toBe(7);
    expect(result.current.stats?.byCompetition).toHaveLength(1);
    expect(result.current.stats?.byCompetition[0].leagueId).toBe('39');
    expect(result.current.stats?.byCompetition[0].stats.matches).toBe(12);
  });
});
