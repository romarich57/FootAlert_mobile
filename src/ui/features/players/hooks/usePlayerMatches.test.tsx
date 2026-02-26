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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    appEnv.mobileEnableBffPlayerAggregates = initialFlag;
  });

  it('uses aggregated endpoint when feature flag is enabled', async () => {
    appEnv.mobileEnableBffPlayerAggregates = true;

    jest.spyOn(playersApi, 'fetchPlayerMatchesAggregate').mockResolvedValue([
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
    ]);

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
    expect(playersApi.fetchPlayerMatchesAggregate).toHaveBeenCalledWith(
      '278',
      '40',
      2025,
      15,
      expect.anything(),
    );
    expect(fixturesSpy).not.toHaveBeenCalled();
    expect(fixtureStatsSpy).not.toHaveBeenCalled();

    queryClient.clear();
  });

  it('falls back to legacy team fixtures strategy when feature flag is disabled', async () => {
    appEnv.mobileEnableBffPlayerAggregates = false;

    jest.spyOn(playersApi, 'fetchTeamFixtures').mockResolvedValue([
      {
        fixture: { id: 9001, date: '2026-02-20T20:00:00Z' },
        league: { id: 39, name: 'Premier League', logo: undefined, season: 2025 },
        teams: {
          home: { id: 40, name: 'Team A', logo: undefined },
          away: { id: 50, name: 'Team B', logo: undefined },
        },
        goals: { home: 2, away: 1 },
      },
    ]);

    jest.spyOn(playersApi, 'fetchFixturePlayerStats').mockResolvedValue({
      players: [
        {
          team: { id: 40, name: 'Team A', logo: undefined },
          players: [
            {
              player: { id: 278, name: 'Player', photo: undefined },
              statistics: [
                {
                  games: { minutes: 90, rating: '7.8', substitute: false },
                  goals: { total: 1, assists: 0 },
                  cards: { yellow: 0, red: 0 },
                },
              ],
            },
          ],
        },
      ],
    });

    const aggregateSpy = jest.spyOn(playersApi, 'fetchPlayerMatchesAggregate');

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => usePlayerMatches('278', '40', 2025), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.matches).toHaveLength(1);
    expect(playersApi.fetchTeamFixtures).toHaveBeenCalledWith('40', 2025, 15, expect.anything());
    expect(playersApi.fetchFixturePlayerStats).toHaveBeenCalledWith(
      '9001',
      '40',
      expect.anything(),
    );
    expect(aggregateSpy).not.toHaveBeenCalled();

    queryClient.clear();
  });
});
