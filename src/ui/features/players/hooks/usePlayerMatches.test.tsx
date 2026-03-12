import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { appEnv } from '@data/config/env';
import * as playersApi from '@data/endpoints/playersApi';
import { usePlayerMatches } from '@ui/features/players/hooks/usePlayerMatches';

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

describe('usePlayerMatches', () => {
  const initialFlag = appEnv.mobileEnableBffPlayerAggregates;
  const initialFullFlag = appEnv.mobileEnableBffPlayerFull;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    appEnv.mobileEnableBffPlayerAggregates = initialFlag;
    appEnv.mobileEnableBffPlayerFull = initialFullFlag;
  });

  it('uses player full matches as the unique source and skips all legacy endpoints', async () => {
    appEnv.mobileEnableBffPlayerAggregates = true;
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
        response: [2025],
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
        response: null,
      },
      matches: {
        response: [
          {
            fixtureId: '9001',
            date: '2026-02-20T20:00:00Z',
            playerTeamId: '40',
            competition: { id: '39', name: 'Premier League', logo: null },
            homeTeam: { id: '40', name: 'Team A', logo: null },
            awayTeam: { id: '50', name: 'Team B', logo: null },
            goalsHome: 2,
            goalsAway: 1,
            playerStats: {
              minutes: 90,
              rating: '7.8',
              goals: 1,
              assists: 0,
              yellowCards: 0,
              secondYellowCards: 0,
              redCards: 0,
              saves: 0,
              penaltiesSaved: 0,
              penaltiesMissed: 0,
              isStarter: true,
            },
          },
        ],
      },
    });

    const aggregateSpy = jest.spyOn(playersApi, 'fetchPlayerMatchesAggregate');
    const fixturesSpy = jest.spyOn(playersApi, 'fetchTeamFixtures');
    const fixtureStatsSpy = jest.spyOn(playersApi, 'fetchFixturePlayerStats');

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => usePlayerMatches('278', '40', 2025), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.matches).toHaveLength(1);
    expect(fullSpy).toHaveBeenCalledWith('278', 2025, expect.anything());
    expect(aggregateSpy).not.toHaveBeenCalled();
    expect(fixturesSpy).not.toHaveBeenCalled();
    expect(fixtureStatsSpy).not.toHaveBeenCalled();

    queryClient.clear();
  });

  it('returns an empty matches list from the full payload without falling back to legacy endpoints', async () => {
    appEnv.mobileEnableBffPlayerAggregates = false;
    appEnv.mobileEnableBffPlayerFull = true;

    jest.spyOn(playersApi, 'fetchPlayerFull').mockResolvedValue({
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
        response: [2025],
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
        response: null,
      },
      matches: {
        response: [],
      },
    });

    const aggregateSpy = jest.spyOn(playersApi, 'fetchPlayerMatchesAggregate');
    const fixturesSpy = jest.spyOn(playersApi, 'fetchTeamFixtures');
    const fixtureStatsSpy = jest.spyOn(playersApi, 'fetchFixturePlayerStats');

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => usePlayerMatches('278', '40', 2025), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.matches).toEqual([]);
    expect(aggregateSpy).not.toHaveBeenCalled();
    expect(fixturesSpy).not.toHaveBeenCalled();
    expect(fixtureStatsSpy).not.toHaveBeenCalled();

    queryClient.clear();
  });
});
