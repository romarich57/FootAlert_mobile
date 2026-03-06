import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { queryKeys } from '@ui/shared/query/queryKeys';
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

  it('reuses the cached overview dataset for the active season before refetching details', async () => {
    const cachedDataset = {
      overall: {
        matches: 38,
        starts: 34,
        minutes: 3020,
        goals: 19,
        assists: 11,
        rating: '7.85',
        shots: 90,
        shotsOnTarget: 41,
        penaltyGoals: 2,
        passes: 820,
        passesAccuracy: 83,
        keyPasses: 52,
        dribblesAttempts: 80,
        dribblesSuccess: 43,
        tackles: 15,
        interceptions: 8,
        blocks: 1,
        duelsTotal: 120,
        duelsWon: 66,
        foulsCommitted: 11,
        foulsDrawn: 35,
        yellowCards: 3,
        redCards: 0,
        dribblesBeaten: 7,
        saves: null,
        goalsConceded: null,
        penaltiesWon: 4,
        penaltiesMissed: 1,
        penaltiesCommitted: 0,
      },
      byCompetition: [],
    };

    queryClient.setQueryData(queryKeys.players.overview('10', 2025), {
      seasonStatsDataset: cachedDataset,
    });

    const detailsSpy = jest.spyOn(playersApi, 'fetchPlayerDetails');

    const { result } = renderHook(() => usePlayerStats('10', 2025, true), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toEqual(cachedDataset);
    expect(detailsSpy).not.toHaveBeenCalled();
    queryClient.clear();
  });
});
