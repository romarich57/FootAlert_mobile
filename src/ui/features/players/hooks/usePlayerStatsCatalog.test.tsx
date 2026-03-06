import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { appEnv } from '@data/config/env';
import * as playersApi from '@data/endpoints/playersApi';
import { usePlayerStatsCatalog } from '@ui/features/players/hooks/usePlayerStatsCatalog';

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

describe('usePlayerStatsCatalog', () => {
  const initialFlag = appEnv.mobileEnablePlayerStatsCatalogAggregate;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    appEnv.mobileEnablePlayerStatsCatalogAggregate = initialFlag;
  });

  it('uses the aggregated stats catalog endpoint when the feature flag is enabled', async () => {
    appEnv.mobileEnablePlayerStatsCatalogAggregate = true;

    const aggregateSpy = jest.spyOn(playersApi, 'fetchPlayerStatsCatalog').mockResolvedValue({
      competitions: [
        {
          leagueId: '39',
          leagueName: 'Premier League',
          leagueLogo: 'pl.png',
          type: null,
          country: null,
          seasons: [2025, 2024],
          currentSeason: 2025,
        },
      ],
      defaultSelection: {
        leagueId: '39',
        season: 2025,
      },
      availableSeasons: [2025, 2024],
    });
    const seasonsSpy = jest.spyOn(playersApi, 'fetchPlayerSeasons');
    const detailsSpy = jest.spyOn(playersApi, 'fetchPlayerDetails');

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => usePlayerStatsCatalog('278', true), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.competitions).toHaveLength(1);
    expect(result.current.defaultSelection).toEqual({
      leagueId: '39',
      season: 2025,
    });
    expect(aggregateSpy).toHaveBeenCalledWith('278', expect.anything());
    expect(seasonsSpy).not.toHaveBeenCalled();
    expect(detailsSpy).not.toHaveBeenCalled();

    queryClient.clear();
  });
});
