import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { appEnv } from '@data/config/env';
import * as playersApi from '@data/endpoints/playersApi';
import { usePlayerMatches } from '@ui/features/players/hooks/usePlayerMatches';
import { usePlayerOverview } from '@ui/features/players/hooks/usePlayerOverview';
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

describe('player full hooks', () => {
  const initialFullFlag = appEnv.mobileEnableBffPlayerFull;
  const initialOverviewFlag = appEnv.mobileEnablePlayerOverviewAggregate;
  const initialStatsCatalogFlag = appEnv.mobileEnablePlayerStatsCatalogAggregate;
  const initialMatchesFlag = appEnv.mobileEnableBffPlayerAggregates;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    appEnv.mobileEnableBffPlayerFull = initialFullFlag;
    appEnv.mobileEnablePlayerOverviewAggregate = initialOverviewFlag;
    appEnv.mobileEnablePlayerStatsCatalogAggregate = initialStatsCatalogFlag;
    appEnv.mobileEnableBffPlayerAggregates = initialMatchesFlag;
  });

  it('shares a single /full request across overview, stats catalog, and matches', async () => {
    appEnv.mobileEnableBffPlayerFull = true;
    appEnv.mobileEnablePlayerOverviewAggregate = true;
    appEnv.mobileEnablePlayerStatsCatalogAggregate = true;
    appEnv.mobileEnableBffPlayerAggregates = true;

    const fullSpy = jest.spyOn(playersApi, 'fetchPlayerFull').mockResolvedValue({
      details: {
        response: [
          {
            player: {
              id: 278,
              name: 'Player Full',
              age: 27,
              nationality: 'France',
              photo: 'player.png',
            },
            statistics: [
              {
                team: { id: 40, name: 'Team A', logo: 'team-a.png' },
                league: {
                  id: 39,
                  name: 'Premier League',
                  logo: 'pl.png',
                  season: 2025,
                },
                games: {
                  position: 'Midfielder',
                  appearences: 32,
                  lineups: 30,
                  minutes: 2750,
                  rating: '7.4',
                  number: 8,
                },
                goals: { total: 8, assists: 5 },
                shots: { total: 45, on: 20 },
                passes: { total: 1200, key: 42, accuracy: 84 },
                dribbles: { attempts: 90, success: 52, past: 9 },
                tackles: { total: 48, interceptions: 29, blocks: 3 },
                duels: { total: 210, won: 120 },
                fouls: { committed: 18, drawn: 24 },
                cards: { yellow: 5, red: 0 },
                penalty: { won: 1, missed: 0, commited: 0, scored: 1 },
              },
            ],
          },
        ],
      },
      seasons: {
        response: [2025, 2024],
      },
      trophies: {
        response: [
          {
            league: 'Premier League',
            country: 'England',
            season: '2024/2025',
            place: 'Winner',
          },
        ],
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
            id: '278',
            name: 'Player Full',
            photo: 'player.png',
            position: 'Midfielder',
            age: 27,
            height: null,
            weight: null,
            nationality: 'France',
            dateOfBirth: null,
            number: 8,
            foot: null,
            transferValue: null,
            team: {
              id: '40',
              name: 'Team A',
              logo: 'team-a.png',
            },
            league: {
              id: '39',
              name: 'Premier League',
              logo: 'pl.png',
              season: 2025,
            },
          },
          characteristics: {
            touches: 1200,
            dribbles: 52,
            chances: 42,
            defense: 77,
            duels: 120,
            attack: 28,
          },
          positions: {
            primary: null,
            others: [],
            all: [],
          },
          seasonStats: {
            matches: 32,
            starts: 30,
            minutes: 2750,
            goals: 8,
            assists: 5,
            rating: '7.4',
            shots: 45,
            shotsOnTarget: 20,
            penaltyGoals: 1,
            passes: 1200,
            passesAccuracy: 84,
            keyPasses: 42,
            dribblesAttempts: 90,
            dribblesSuccess: 52,
            tackles: 48,
            interceptions: 29,
            blocks: 3,
            duelsTotal: 210,
            duelsWon: 120,
            foulsCommitted: 18,
            foulsDrawn: 24,
            yellowCards: 5,
            redCards: 0,
            dribblesBeaten: 9,
            saves: 0,
            goalsConceded: 0,
            penaltiesWon: 1,
            penaltiesMissed: 0,
            penaltiesCommitted: 0,
          },
          seasonStatsDataset: {
            overall: {
              matches: 32,
              starts: 30,
              minutes: 2750,
              goals: 8,
              assists: 5,
              rating: '7.4',
              shots: 45,
              shotsOnTarget: 20,
              penaltyGoals: 1,
              passes: 1200,
              passesAccuracy: 84,
              keyPasses: 42,
              dribblesAttempts: 90,
              dribblesSuccess: 52,
              tackles: 48,
              interceptions: 29,
              blocks: 3,
              duelsTotal: 210,
              duelsWon: 120,
              foulsCommitted: 18,
              foulsDrawn: 24,
              yellowCards: 5,
              redCards: 0,
              dribblesBeaten: 9,
              saves: 0,
              goalsConceded: 0,
              penaltiesWon: 1,
              penaltiesMissed: 0,
              penaltiesCommitted: 0,
            },
            byCompetition: [],
          },
          profileCompetitionStats: null,
          trophiesByClub: [],
        },
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
              seasons: [2025],
              currentSeason: 2025,
            },
          ],
          defaultSelection: {
            leagueId: '39',
            season: 2025,
          },
          availableSeasons: [2025],
        },
      },
      matches: {
        response: [
          {
            fixtureId: '9001',
            date: '2026-02-20T20:00:00Z',
            playerTeamId: '40',
            competition: { id: '39', name: 'Premier League', logo: 'pl.png' },
            homeTeam: { id: '40', name: 'Team A', logo: 'team-a.png' },
            awayTeam: { id: '50', name: 'Team B', logo: 'team-b.png' },
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

    const overviewSpy = jest.spyOn(playersApi, 'fetchPlayerOverview');
    const statsCatalogSpy = jest.spyOn(playersApi, 'fetchPlayerStatsCatalog');
    const matchesAggregateSpy = jest.spyOn(playersApi, 'fetchPlayerMatchesAggregate');
    const fixturesSpy = jest.spyOn(playersApi, 'fetchTeamFixtures');
    const fixtureStatsSpy = jest.spyOn(playersApi, 'fetchFixturePlayerStats');

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(
      () => ({
        overview: usePlayerOverview('278', 2025),
        statsCatalog: usePlayerStatsCatalog('278', true, 2025),
        matches: usePlayerMatches('278', '40', 2025, true),
      }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.overview.isLoading).toBe(false);
      expect(result.current.statsCatalog.isLoading).toBe(false);
      expect(result.current.matches.isLoading).toBe(false);
    });

    expect(fullSpy).toHaveBeenCalledTimes(1);
    expect(fullSpy).toHaveBeenCalledWith('278', 2025, expect.anything());
    expect(result.current.overview.profile?.id).toBe('278');
    expect(result.current.overview.trophies).toHaveLength(1);
    expect(result.current.statsCatalog.defaultSelection).toEqual({
      leagueId: '39',
      season: 2025,
    });
    expect(result.current.statsCatalog.competitions).toHaveLength(1);
    expect(result.current.matches.matches).toHaveLength(1);
    expect(overviewSpy).not.toHaveBeenCalled();
    expect(statsCatalogSpy).not.toHaveBeenCalled();
    expect(matchesAggregateSpy).not.toHaveBeenCalled();
    expect(fixturesSpy).not.toHaveBeenCalled();
    expect(fixtureStatsSpy).not.toHaveBeenCalled();

    queryClient.clear();
  });

  it('derives overview and stats catalog from full payload fallbacks when sections are missing', async () => {
    appEnv.mobileEnableBffPlayerFull = true;
    appEnv.mobileEnablePlayerOverviewAggregate = false;
    appEnv.mobileEnablePlayerStatsCatalogAggregate = false;
    appEnv.mobileEnableBffPlayerAggregates = false;

    jest.spyOn(playersApi, 'fetchPlayerFull').mockResolvedValue({
      details: {
        response: [
          {
            player: {
              id: 278,
              name: 'Fallback Player',
              age: 24,
              nationality: 'France',
              photo: 'fallback.png',
            },
            statistics: [
              {
                team: { id: 40, name: 'Team A', logo: 'team-a.png' },
                league: {
                  id: 39,
                  name: 'Premier League',
                  logo: 'pl.png',
                  season: 2025,
                },
                games: {
                  position: 'Midfielder',
                  appearences: 20,
                  lineups: 18,
                  minutes: 1600,
                  rating: '7.1',
                  number: 8,
                },
                goals: { total: 4, assists: 3 },
                shots: { total: 18, on: 8 },
                passes: { total: 700, key: 20, accuracy: 82 },
                dribbles: { attempts: 40, success: 21, past: 4 },
                tackles: { total: 22, interceptions: 15, blocks: 2 },
                duels: { total: 100, won: 58 },
                fouls: { committed: 11, drawn: 13 },
                cards: { yellow: 2, red: 0 },
                penalty: { won: 0, missed: 0, commited: 0, scored: 0 },
              },
            ],
          },
        ],
      },
      seasons: {
        response: [2025],
      },
      trophies: {
        response: [
          {
            league: 'Coupe Nationale',
            country: 'France',
            season: '2024/2025',
            place: 'Winner',
          },
        ],
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

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(
      () => ({
        overview: usePlayerOverview('278', 2025),
        statsCatalog: usePlayerStatsCatalog('278', true, 2025),
      }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.overview.isLoading).toBe(false);
      expect(result.current.statsCatalog.isLoading).toBe(false);
    });

    expect(result.current.overview.profile?.name).toBe('Fallback Player');
    expect(result.current.overview.trophies).toHaveLength(1);
    expect(result.current.statsCatalog.competitions).toEqual([
      expect.objectContaining({
        leagueId: '39',
        seasons: [2025],
        currentSeason: 2025,
      }),
    ]);
    expect(result.current.statsCatalog.defaultSelection).toEqual({
      leagueId: '39',
      season: 2025,
    });

    queryClient.clear();
  });

  it('surfaces a query error when the full payload has no resolvable player identity', async () => {
    appEnv.mobileEnableBffPlayerFull = true;
    appEnv.mobileEnablePlayerOverviewAggregate = false;
    appEnv.mobileEnablePlayerStatsCatalogAggregate = false;
    appEnv.mobileEnableBffPlayerAggregates = false;

    jest.spyOn(playersApi, 'fetchPlayerFull').mockResolvedValue({
      details: {
        response: [],
      },
      seasons: {
        response: [],
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

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(
      () => ({
        overview: usePlayerOverview('278', 2025),
        statsCatalog: usePlayerStatsCatalog('278', true, 2025),
      }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.overview.isError).toBe(true);
      expect(result.current.statsCatalog.isError).toBe(true);
    }, { timeout: 5000 });

    expect(result.current.overview.profile).toBeNull();
    expect(result.current.statsCatalog.competitions).toEqual([]);

    queryClient.clear();
  });
});
