import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { fetchCompetitionTeamStats } from '@data/endpoints/competitionsApi';
import { useCompetitionTeamStats } from '@ui/features/competitions/hooks/useCompetitionTeamStats';
import { useCompetitionStandings } from '@ui/features/competitions/hooks/useCompetitionStandings';
import type {
  CompetitionTeamStatsDashboardData,
  StandingGroup,
  StandingRow,
} from '@domain/contracts/competitions.types';

jest.mock('@ui/features/competitions/hooks/useCompetitionStandings');
jest.mock('@data/endpoints/competitionsApi', () => ({
  fetchCompetitionTeamStats: jest.fn(),
}));

const mockedUseCompetitionStandings = jest.mocked(useCompetitionStandings);
const mockedFetchCompetitionTeamStats = jest.mocked(fetchCompetitionTeamStats);

function createStandingRow(overrides: Partial<StandingRow> = {}): StandingRow {
  return {
    rank: 1,
    teamId: 1,
    teamName: 'Team 1',
    teamLogo: 'team-1.png',
    points: 30,
    goalsDiff: 10,
    played: 10,
    win: 6,
    draw: 2,
    lose: 2,
    goalsFor: 20,
    goalsAgainst: 10,
    group: 'League',
    form: 'WWDL',
    description: null,
    home: {
      played: 5,
      win: 4,
      draw: 1,
      lose: 0,
      goalsFor: 12,
      goalsAgainst: 3,
    },
    away: {
      played: 5,
      win: 2,
      draw: 1,
      lose: 2,
      goalsFor: 8,
      goalsAgainst: 7,
    },
    ...overrides,
  };
}

function createStandings(rows: StandingRow[], groupName = 'League'): StandingGroup[] {
  return [{ groupName, rows }];
}

function createCompetitionTeamStatsResponse(
  overrides: Partial<CompetitionTeamStatsDashboardData> = {},
): CompetitionTeamStatsDashboardData {
  return {
    summary: {
      metrics: [
        'pointsPerMatch',
        'winRate',
        'goalsScoredPerMatch',
        'goalsConcededPerMatch',
        'goalDiffPerMatch',
        'formIndex',
        'formPointsPerMatch',
      ],
      leaderboards: {
        pointsPerMatch: {
          metric: 'pointsPerMatch',
          sortOrder: 'desc',
          items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'alpha.png', value: 2.6 }],
        },
        winRate: {
          metric: 'winRate',
          sortOrder: 'desc',
          items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'alpha.png', value: 72.3 }],
        },
        goalsScoredPerMatch: {
          metric: 'goalsScoredPerMatch',
          sortOrder: 'desc',
          items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'alpha.png', value: 2.1 }],
        },
        goalsConcededPerMatch: {
          metric: 'goalsConcededPerMatch',
          sortOrder: 'asc',
          items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'alpha.png', value: 0.8 }],
        },
        goalDiffPerMatch: {
          metric: 'goalDiffPerMatch',
          sortOrder: 'desc',
          items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'alpha.png', value: 1.3 }],
        },
        formIndex: {
          metric: 'formIndex',
          sortOrder: 'desc',
          items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'alpha.png', value: 11 }],
        },
        formPointsPerMatch: {
          metric: 'formPointsPerMatch',
          sortOrder: 'desc',
          items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'alpha.png', value: 2.2 }],
        },
      },
    },
    homeAway: {
      metrics: [
        'homePPG',
        'awayPPG',
        'homeGoalsFor',
        'awayGoalsFor',
        'homeGoalsAgainst',
        'awayGoalsAgainst',
        'deltaHomeAwayPPG',
        'deltaHomeAwayGoalsFor',
        'deltaHomeAwayGoalsAgainst',
      ],
      leaderboards: {
        homePPG: {
          metric: 'homePPG',
          sortOrder: 'desc',
          items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'alpha.png', value: 2.8 }],
        },
        awayPPG: {
          metric: 'awayPPG',
          sortOrder: 'desc',
          items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'alpha.png', value: 1.8 }],
        },
        homeGoalsFor: {
          metric: 'homeGoalsFor',
          sortOrder: 'desc',
          items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'alpha.png', value: 19 }],
        },
        awayGoalsFor: {
          metric: 'awayGoalsFor',
          sortOrder: 'desc',
          items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'alpha.png', value: 12 }],
        },
        homeGoalsAgainst: {
          metric: 'homeGoalsAgainst',
          sortOrder: 'asc',
          items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'alpha.png', value: 4 }],
        },
        awayGoalsAgainst: {
          metric: 'awayGoalsAgainst',
          sortOrder: 'asc',
          items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'alpha.png', value: 7 }],
        },
        deltaHomeAwayPPG: {
          metric: 'deltaHomeAwayPPG',
          sortOrder: 'desc',
          items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'alpha.png', value: 1 }],
        },
        deltaHomeAwayGoalsFor: {
          metric: 'deltaHomeAwayGoalsFor',
          sortOrder: 'desc',
          items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'alpha.png', value: 7 }],
        },
        deltaHomeAwayGoalsAgainst: {
          metric: 'deltaHomeAwayGoalsAgainst',
          sortOrder: 'desc',
          items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'alpha.png', value: 3 }],
        },
      },
    },
    advanced: {
      metrics: [
        'cleanSheets',
        'failedToScore',
        'xGPerMatch',
        'possession',
        'shotsPerMatch',
        'shotsOnTargetPerMatch',
      ],
      rows: [
        {
          teamId: 1,
          teamName: 'Alpha',
          teamLogo: 'alpha.png',
          cleanSheets: 9,
          failedToScore: 2,
          xGPerMatch: 1.91,
          possession: 58.3,
          shotsPerMatch: 14.2,
          shotsOnTargetPerMatch: 5.1,
          goalMinuteBreakdown: [],
        },
      ],
      top10TeamIds: [1],
      unavailableMetrics: [],
      state: 'available',
      reason: null,
      leaderboards: {
        cleanSheets: {
          metric: 'cleanSheets',
          sortOrder: 'desc',
          items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'alpha.png', value: 9 }],
        },
        failedToScore: {
          metric: 'failedToScore',
          sortOrder: 'asc',
          items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'alpha.png', value: 2 }],
        },
        xGPerMatch: {
          metric: 'xGPerMatch',
          sortOrder: 'desc',
          items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'alpha.png', value: 1.91 }],
        },
        possession: {
          metric: 'possession',
          sortOrder: 'desc',
          items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'alpha.png', value: 58.3 }],
        },
        shotsPerMatch: {
          metric: 'shotsPerMatch',
          sortOrder: 'desc',
          items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'alpha.png', value: 14.2 }],
        },
        shotsOnTargetPerMatch: {
          metric: 'shotsOnTargetPerMatch',
          sortOrder: 'desc',
          items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'alpha.png', value: 5.1 }],
        },
      },
    },
    ...overrides,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useCompetitionTeamStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseCompetitionStandings.mockReturnValue({
      data: createStandings([
        createStandingRow({ teamId: 1, teamName: 'Alpha' }),
        createStandingRow({ teamId: 2, teamName: 'Beta', points: 27 }),
      ]),
      isLoading: false,
      error: null,
    } as never);

    mockedFetchCompetitionTeamStats.mockResolvedValue(createCompetitionTeamStatsResponse());
  });

  it('returns base standings-derived sections when advanced is disabled', () => {
    const { result } = renderHook(
      () =>
        useCompetitionTeamStats({
          leagueId: 61,
          season: 2025,
          advancedEnabled: false,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.isBaseLoading).toBe(false);
    expect(result.current.baseError).toBeNull();
    expect(result.current.summary.leaderboards.pointsPerMatch.items.length).toBeGreaterThan(0);
    expect(result.current.homeAway.leaderboards.homePPG.items.length).toBeGreaterThan(0);
    expect(result.current.hasAdvancedData).toBe(false);
    expect(result.current.shouldRenderAdvancedSection).toBe(true);
  });

  it('does not execute the aggregated team-stats query when advanced is disabled', async () => {
    renderHook(
      () =>
        useCompetitionTeamStats({
          leagueId: 61,
          season: 2025,
          advancedEnabled: false,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(mockedFetchCompetitionTeamStats).not.toHaveBeenCalled();
    });
  });

  it('runs a single aggregated request when advanced is enabled', async () => {
    const { result } = renderHook(
      () =>
        useCompetitionTeamStats({
          leagueId: 61,
          season: 2025,
          advancedEnabled: true,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(mockedFetchCompetitionTeamStats).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(result.current.isAdvancedLoading).toBe(false);
    });

    expect(result.current.isAdvancedLoading).toBe(false);
    expect(result.current.advancedProgress).toBe(100);
    expect(result.current.hasAdvancedData).toBe(true);
    expect(result.current.advanced.state).toBe('available');
    expect(result.current.advanced.leaderboards.xGPerMatch.items[0]?.value).toBe(1.91);
  });

  it('keeps the aggregated advanced request enabled on network-lite mode after user opt-in', async () => {
    renderHook(
      () =>
        useCompetitionTeamStats({
          leagueId: 61,
          season: 2025,
          advancedEnabled: true,
          networkLiteMode: true,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(mockedFetchCompetitionTeamStats).toHaveBeenCalledTimes(1);
    });
  });

  it('hides the advanced section for grouped competitions without hitting the aggregated endpoint', async () => {
    mockedUseCompetitionStandings.mockReturnValue({
      data: [
        { groupName: 'Group A', rows: [createStandingRow({ teamId: 1, group: 'Group A' })] },
        { groupName: 'Group B', rows: [createStandingRow({ teamId: 2, group: 'Group B' })] },
      ],
      isLoading: false,
      error: null,
    } as never);

    const { result } = renderHook(
      () =>
        useCompetitionTeamStats({
          leagueId: 61,
          season: 2025,
          advancedEnabled: true,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isBaseLoading).toBe(false);
    });

    expect(mockedFetchCompetitionTeamStats).not.toHaveBeenCalled();
    expect(result.current.shouldRenderAdvancedSection).toBe(false);
    expect(result.current.advanced.state).toBe('unavailable');
    expect(result.current.advanced.reason).toBe('grouped_competition');
  });

  it('hides the advanced section when backend marks advanced data unavailable', async () => {
    mockedFetchCompetitionTeamStats.mockResolvedValue(
      createCompetitionTeamStatsResponse({
        advanced: {
          ...createCompetitionTeamStatsResponse().advanced,
          rows: [],
          top10TeamIds: [],
          state: 'unavailable',
          reason: 'provider_missing',
          leaderboards: {
            ...createCompetitionTeamStatsResponse().advanced.leaderboards,
            cleanSheets: {
              metric: 'cleanSheets',
              sortOrder: 'desc',
              items: [],
            },
            failedToScore: {
              metric: 'failedToScore',
              sortOrder: 'asc',
              items: [],
            },
            xGPerMatch: {
              metric: 'xGPerMatch',
              sortOrder: 'desc',
              items: [],
            },
            possession: {
              metric: 'possession',
              sortOrder: 'desc',
              items: [],
            },
            shotsPerMatch: {
              metric: 'shotsPerMatch',
              sortOrder: 'desc',
              items: [],
            },
            shotsOnTargetPerMatch: {
              metric: 'shotsOnTargetPerMatch',
              sortOrder: 'desc',
              items: [],
            },
          },
        },
      }),
    );

    const { result } = renderHook(
      () =>
        useCompetitionTeamStats({
          leagueId: 61,
          season: 2025,
          advancedEnabled: true,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(mockedFetchCompetitionTeamStats).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(result.current.shouldRenderAdvancedSection).toBe(false);
    });

    expect(result.current.hasAdvancedData).toBe(false);
    expect(result.current.shouldRenderAdvancedSection).toBe(false);
    expect(result.current.advanced.state).toBe('unavailable');
    expect(result.current.advanced.reason).toBe('provider_missing');
  });
});
