import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { appEnv } from '@data/config/env';
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
  const initialFlag = appEnv.mobileEnableBffPlayerAggregates;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    appEnv.mobileEnableBffPlayerAggregates = initialFlag;
  });

  it('uses aggregated endpoint when feature flag is enabled', async () => {
    appEnv.mobileEnableBffPlayerAggregates = true;

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

    const seasonsSpy = jest.spyOn(playersApi, 'fetchPlayerSeasons');
    const detailsSpy = jest.spyOn(playersApi, 'fetchPlayerDetails');

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => usePlayerCareer('278'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.careerSeasons).toHaveLength(1);
    expect(result.current.careerTeams).toHaveLength(1);
    expect(playersApi.fetchPlayerCareerAggregate).toHaveBeenCalledWith('278', expect.anything());
    expect(seasonsSpy).not.toHaveBeenCalled();
    expect(detailsSpy).not.toHaveBeenCalled();

    queryClient.clear();
  });

  it('falls back to legacy season/details strategy when feature flag is disabled', async () => {
    appEnv.mobileEnableBffPlayerAggregates = false;

    jest.spyOn(playersApi, 'fetchPlayerSeasons').mockResolvedValue([2025]);
    jest.spyOn(playersApi, 'fetchPlayerDetails').mockResolvedValue({
      statistics: [
        {
          team: { id: 33, name: 'Team A', logo: undefined },
          league: { season: 2025 },
          games: { appearences: 21, rating: '7.1' },
          goals: { total: 8, assists: 4 },
        },
      ],
    });
    const aggregateSpy = jest.spyOn(playersApi, 'fetchPlayerCareerAggregate');

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => usePlayerCareer('278'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.careerSeasons).toHaveLength(1);
    expect(result.current.careerTeams).toHaveLength(1);
    expect(result.current.careerSeasons[0]?.season).toBe('2025');
    expect(playersApi.fetchPlayerSeasons).toHaveBeenCalledWith('278', expect.anything());
    expect(playersApi.fetchPlayerDetails).toHaveBeenCalledWith('278', 2025, expect.anything());
    expect(aggregateSpy).not.toHaveBeenCalled();

    queryClient.clear();
  });
});
