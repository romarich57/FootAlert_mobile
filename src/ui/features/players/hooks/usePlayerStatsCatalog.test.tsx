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
  const initialFullFlag = appEnv.mobileEnableBffPlayerFull;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    appEnv.mobileEnablePlayerStatsCatalogAggregate = initialFlag;
    appEnv.mobileEnableBffPlayerFull = initialFullFlag;
  });

  it('uses player full stats catalog as the unique source and skips legacy catalog endpoints', async () => {
    appEnv.mobileEnablePlayerStatsCatalogAggregate = true;
    appEnv.mobileEnableBffPlayerFull = true;

    const fullSpy = jest.spyOn(playersApi, 'fetchPlayerFull').mockResolvedValue({
      details: {
        response: [
          {
            player: {
              id: 278,
            },
          },
        ],
      },
      seasons: {
        response: [2025, 2024],
      },
      trophies: {
        response: [],
      },
      career: {
        response: {
          seasons: [],
          teams: [],
        },
      },
      overview: {
        response: null,
      },
      statsCatalog: {
        response: {
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
        },
      },
      matches: {
        response: [],
      },
    });
    const aggregateSpy = jest.spyOn(playersApi, 'fetchPlayerStatsCatalog');
    const seasonsSpy = jest.spyOn(playersApi, 'fetchPlayerSeasons');
    const detailsSpy = jest.spyOn(playersApi, 'fetchPlayerDetails');

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => usePlayerStatsCatalog('278', true, 2025), {
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
    expect(fullSpy).toHaveBeenCalledWith('278', expect.anything(), expect.anything());
    expect(aggregateSpy).not.toHaveBeenCalled();
    expect(seasonsSpy).not.toHaveBeenCalled();
    expect(detailsSpy).not.toHaveBeenCalled();

    queryClient.clear();
  });
});
