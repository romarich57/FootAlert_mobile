import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useCompetitionTeamStats } from '@ui/features/competitions/hooks/useCompetitionTeamStats';
import { useCompetitionStandings } from '@ui/features/competitions/hooks/useCompetitionStandings';
import { fetchTeamAdvancedStats, fetchTeamStatistics } from '@data/endpoints/teamsApi';
import type { StandingGroup, StandingRow } from '@ui/features/competitions/types/competitions.types';

jest.mock('@ui/features/competitions/hooks/useCompetitionStandings');
jest.mock('@data/endpoints/teamsApi', () => ({
  fetchTeamStatistics: jest.fn(),
  fetchTeamAdvancedStats: jest.fn(),
}));

const mockedUseCompetitionStandings = jest.mocked(useCompetitionStandings);
const mockedFetchTeamStatistics = jest.mocked(fetchTeamStatistics);
const mockedFetchTeamAdvancedStats = jest.mocked(fetchTeamAdvancedStats);

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

function createStandings(rows: StandingRow[]): StandingGroup[] {
  return [{ groupName: 'League', rows }];
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

    mockedFetchTeamStatistics.mockResolvedValue({
      fixtures: {
        clean_sheet: { total: 7 },
        failed_to_score: { total: 2 },
      },
    } as never);
    mockedFetchTeamAdvancedStats.mockResolvedValue({
      metrics: {
        expectedGoalsPerMatch: { value: 1.8 },
        possession: { value: 55.2 },
        shotsPerMatch: { value: 13.1 },
        shotsOnTargetPerMatch: { value: 4.8 },
      },
    } as never);
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
  });

  it('does not execute advanced queries when advancedEnabled is false', async () => {
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
      expect(mockedFetchTeamStatistics).not.toHaveBeenCalled();
      expect(mockedFetchTeamAdvancedStats).not.toHaveBeenCalled();
    });
  });

  it('runs advanced queries for top 10 teams when enabled', async () => {
    mockedUseCompetitionStandings.mockReturnValue({
      data: createStandings(
        Array.from({ length: 12 }, (_, index) =>
          createStandingRow({
            teamId: index + 1,
            teamName: `Team ${index + 1}`,
            points: 40 - index,
            goalsDiff: 20 - index,
            goalsFor: 30 - index,
          }),
        ),
      ),
      isLoading: false,
      error: null,
    } as never);

    renderHook(
      () =>
        useCompetitionTeamStats({
          leagueId: 61,
          season: 2025,
          advancedEnabled: true,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(mockedFetchTeamStatistics).toHaveBeenCalledTimes(10);
      expect(mockedFetchTeamAdvancedStats).toHaveBeenCalledTimes(10);
    });

    const calledTeamIds = mockedFetchTeamStatistics.mock.calls.map(call => Number(call[2]));
    expect(new Set(calledTeamIds).size).toBe(10);
    expect(calledTeamIds).toContain(1);
    expect(calledTeamIds).not.toContain(12);
  });

  it('limits advanced team request concurrency to 3 by default', async () => {
    mockedUseCompetitionStandings.mockReturnValue({
      data: createStandings(
        Array.from({ length: 8 }, (_, index) =>
          createStandingRow({
            teamId: index + 1,
            teamName: `Team ${index + 1}`,
            points: 40 - index,
          }),
        ),
      ),
      isLoading: false,
      error: null,
    } as never);

    let inFlight = 0;
    let maxInFlight = 0;

    mockedFetchTeamStatistics.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise<void>(resolve => {
        setTimeout(() => resolve(), 10);
      });
      inFlight -= 1;

      return {
        fixtures: {
          clean_sheet: { total: 7 },
          failed_to_score: { total: 2 },
        },
      } as never;
    });

    renderHook(
      () =>
        useCompetitionTeamStats({
          leagueId: 61,
          season: 2025,
          advancedEnabled: true,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(mockedFetchTeamStatistics).toHaveBeenCalledTimes(8);
      expect(mockedFetchTeamAdvancedStats).toHaveBeenCalledTimes(8);
    });

    expect(maxInFlight).toBeLessThanOrEqual(3);
  });

  it('supports custom advanced request concurrency', async () => {
    mockedUseCompetitionStandings.mockReturnValue({
      data: createStandings(
        Array.from({ length: 5 }, (_, index) =>
          createStandingRow({
            teamId: index + 1,
            teamName: `Team ${index + 1}`,
            points: 40 - index,
          }),
        ),
      ),
      isLoading: false,
      error: null,
    } as never);

    let inFlight = 0;
    let maxInFlight = 0;

    mockedFetchTeamStatistics.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise<void>(resolve => {
        setTimeout(() => resolve(), 10);
      });
      inFlight -= 1;
      return {
        fixtures: {
          clean_sheet: { total: 7 },
          failed_to_score: { total: 2 },
        },
      } as never;
    });

    renderHook(
      () =>
        useCompetitionTeamStats({
          leagueId: 61,
          season: 2025,
          advancedEnabled: true,
          advancedConcurrency: 1,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(mockedFetchTeamStatistics).toHaveBeenCalledTimes(5);
      expect(mockedFetchTeamAdvancedStats).toHaveBeenCalledTimes(5);
    });

    expect(maxInFlight).toBe(1);
  });

  it('keeps advanced section non-blocking when partial failures happen', async () => {
    mockedFetchTeamAdvancedStats.mockRejectedValueOnce(new Error('advanced endpoint failed'));

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
      expect(result.current.isAdvancedLoading).toBe(false);
    });

    expect(result.current.hasAdvancedData).toBe(true);
    expect(result.current.advancedError).toBeInstanceOf(Error);
    expect(result.current.advanced.leaderboards.cleanSheets.items.length).toBeGreaterThan(0);
  });

  it('aggregates advanced data and exposes loading/error states', async () => {
    const { result } = renderHook(
      () =>
        useCompetitionTeamStats({
          leagueId: 61,
          season: 2025,
          advancedEnabled: true,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.isBaseLoading).toBe(false);
    expect(result.current.baseError).toBeNull();

    await waitFor(() => {
      expect(result.current.isAdvancedLoading).toBe(false);
    });

    expect(result.current.advancedError).toBeNull();
    expect(result.current.hasAdvancedData).toBe(true);
    expect(result.current.advancedProgress).toBe(100);
    expect(result.current.advanced.leaderboards.xGPerMatch.items[0]?.value).toBe(1.8);
    expect(result.current.advanced.leaderboards.possession.items[0]?.value).toBe(55.2);
  });

  it('disables advanced requests when network-lite mode is enabled', async () => {
    const { result } = renderHook(
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
      expect(result.current.isBaseLoading).toBe(false);
    });

    expect(mockedFetchTeamStatistics).not.toHaveBeenCalled();
    expect(mockedFetchTeamAdvancedStats).not.toHaveBeenCalled();
    expect(result.current.isAdvancedLoading).toBe(false);
    expect(result.current.advancedProgress).toBe(0);
  });
});
