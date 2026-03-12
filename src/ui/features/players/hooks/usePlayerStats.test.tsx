import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { appEnv } from '@data/config/env';
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
  const initialFullFlag = appEnv.mobileEnableBffPlayerFull;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    appEnv.mobileEnableBffPlayerFull = true;
  });

  afterAll(() => {
    appEnv.mobileEnableBffPlayerFull = initialFullFlag;
  });

  it('returns season dataset from player full payload without calling the legacy details endpoint', async () => {
    const fullSpy = jest.spyOn(playersApi, 'fetchPlayerFull').mockResolvedValue({
      details: {
        response: [],
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
        response: {
          profile: {
            id: '10',
            name: 'Player Test',
            photo: 'player.png',
            position: 'Forward',
            age: 28,
            height: null,
            weight: null,
            nationality: 'France',
            dateOfBirth: null,
            number: 9,
            foot: null,
            transferValue: null,
            team: { id: '40', name: 'Team A', logo: null },
            league: { id: '39', name: 'Premier League', logo: 'pl.png', season: 2025 },
          },
          characteristics: null,
          positions: null,
          seasonStats: null,
          seasonStatsDataset: {
            overall: {
              matches: 12,
              starts: 10,
              minutes: 1000,
              goals: 7,
              assists: 2,
              rating: '7.1',
              shots: 30,
              shotsOnTarget: 15,
              penaltyGoals: 0,
              passes: 250,
              passesAccuracy: 82,
              keyPasses: 9,
              dribblesAttempts: 15,
              dribblesSuccess: 8,
              tackles: 3,
              interceptions: 1,
              blocks: 0,
              duelsTotal: 40,
              duelsWon: 18,
              foulsCommitted: 4,
              foulsDrawn: 7,
              yellowCards: 1,
              redCards: 0,
              dribblesBeaten: 2,
              saves: null,
              goalsConceded: null,
              penaltiesWon: 1,
              penaltiesMissed: 0,
              penaltiesCommitted: 0,
            },
            byCompetition: [
              {
                leagueId: '39',
                leagueName: 'Premier League',
                leagueLogo: 'pl.png',
                season: 2025,
                stats: {
                  matches: 12,
                  starts: 10,
                  minutes: 1000,
                  goals: 7,
                  assists: 2,
                  rating: '7.1',
                  shots: 30,
                  shotsOnTarget: 15,
                  penaltyGoals: 0,
                  passes: 250,
                  passesAccuracy: 82,
                  keyPasses: 9,
                  dribblesAttempts: 15,
                  dribblesSuccess: 8,
                  tackles: 3,
                  interceptions: 1,
                  blocks: 0,
                  duelsTotal: 40,
                  duelsWon: 18,
                  foulsCommitted: 4,
                  foulsDrawn: 7,
                  yellowCards: 1,
                  redCards: 0,
                  dribblesBeaten: 2,
                  saves: null,
                  goalsConceded: null,
                  penaltiesWon: 1,
                  penaltiesMissed: 0,
                  penaltiesCommitted: 0,
                },
              },
            ],
          },
          profileCompetitionStats: null,
          trophiesByClub: [],
        },
      },
      statsCatalog: {
        response: null,
      },
      matches: {
        response: [],
      },
    });
    const detailsSpy = jest.spyOn(playersApi, 'fetchPlayerDetails');

    const { result } = renderHook(() => usePlayerStats('10', 2025, true), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats?.overall.matches).toBe(12);
    expect(result.current.stats?.overall.goals).toBe(7);
    expect(result.current.stats?.byCompetition).toHaveLength(1);
    expect(result.current.stats?.byCompetition[0].leagueId).toBe('39');
    expect(result.current.stats?.byCompetition[0].stats.matches).toBe(12);
    expect(fullSpy).toHaveBeenCalledWith('10', 2025, expect.anything());
    expect(detailsSpy).not.toHaveBeenCalled();
  });

  it('derives the season dataset from the full payload details when overview stats are missing', async () => {
    const detailsSpy = jest.spyOn(playersApi, 'fetchPlayerDetails');
    jest.spyOn(playersApi, 'fetchPlayerFull').mockResolvedValue({
      details: {
        response: [
          {
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
        response: {
          profile: {
            id: '10',
            name: 'Player Test',
          },
          characteristics: null,
          positions: null,
          seasonStats: null,
          seasonStatsDataset: null,
          profileCompetitionStats: null,
          trophiesByClub: [],
        },
      },
      statsCatalog: {
        response: null,
      },
      matches: {
        response: [],
      },
    } as never);

    const { result } = renderHook(() => usePlayerStats('10', 2025, true), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats?.overall.matches).toBe(12);
    expect(result.current.stats?.overall.goals).toBe(7);
    expect(result.current.stats?.byCompetition).toHaveLength(1);
    expect(result.current.stats?.byCompetition[0].leagueId).toBe('39');
    expect(detailsSpy).not.toHaveBeenCalled();
  });
});
