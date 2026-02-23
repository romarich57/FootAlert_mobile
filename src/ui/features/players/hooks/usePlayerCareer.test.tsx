import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import * as playersApi from '@data/endpoints/playersApi';
import { usePlayerCareer } from '@ui/features/players/hooks/usePlayerCareer';

jest.mock('@data/endpoints/playersApi');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { wrapper, queryClient };
}

describe('usePlayerCareer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches aggregated career data from BFF endpoint', async () => {
    jest.spyOn(playersApi, 'fetchPlayerCareerAggregate').mockResolvedValue({
      seasons: [
        {
          season: '2025',
          team: { id: '33', name: 'Team A', logo: null },
          matches: 30,
          goals: 12,
          assists: 7,
          rating: '7.34',
        },
      ],
      teams: [
        {
          team: { id: '33', name: 'Team A', logo: null },
          period: '2024 - 2025',
          matches: 30,
          goals: 12,
          assists: 7,
        },
      ],
    });

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => usePlayerCareer('278'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.careerSeasons).toHaveLength(1);
    expect(result.current.careerTeams).toHaveLength(1);
    expect(playersApi.fetchPlayerCareerAggregate).toHaveBeenCalledWith('278', expect.anything());

    queryClient.clear();
  });

  it('does not fetch when query is disabled', async () => {
    const aggregateSpy = jest.spyOn(playersApi, 'fetchPlayerCareerAggregate');

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => usePlayerCareer('278', false), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.careerSeasons).toHaveLength(0);
    expect(result.current.careerTeams).toHaveLength(0);
    expect(aggregateSpy).not.toHaveBeenCalled();

    queryClient.clear();
  });
});
