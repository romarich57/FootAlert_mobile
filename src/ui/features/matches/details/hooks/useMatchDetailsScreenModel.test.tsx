import { renderHook } from '@testing-library/react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useQuery } from '@tanstack/react-query';
import {
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { usePowerState } from 'react-native-device-info';

import { ApiError } from '@data/api/http/client';
import { useMatchesRefresh } from '@ui/features/matches/hooks/useMatchesRefresh';
import { useMatchDetailsScreenModel } from '@ui/features/matches/details/hooks/useMatchDetailsScreenModel';
import i18n from '@ui/shared/i18n';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
  useIsFocused: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(),
}));

jest.mock('react-native-device-info', () => ({
  usePowerState: jest.fn(),
  getVersion: () => '0.0.1',
  getBuildNumber: () => '1',
}));

jest.mock('@ui/features/matches/hooks/useMatchesRefresh', () => ({
  useMatchesRefresh: jest.fn(),
}));

const mockedUseQuery = jest.mocked(useQuery);
const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseRoute = jest.mocked(useRoute);
const mockedUseIsFocused = jest.mocked(useIsFocused);
const mockedUseNetInfo = jest.mocked(useNetInfo);
const mockedUsePowerState = jest.mocked(usePowerState);
const mockedUseMatchesRefresh = jest.mocked(useMatchesRefresh);

let fixtureStatusShort = 'NS';
let fixtureStatusLong = 'Not started';
let fixtureElapsed: number | null = null;

function buildFixture() {
  return {
    fixture: {
      id: 101,
      date: '2026-02-26T20:00:00.000Z',
      status: {
        short: fixtureStatusShort,
        long: fixtureStatusLong,
        elapsed: fixtureElapsed,
      },
      venue: {
        name: 'Stadium',
        city: 'Paris',
      },
    },
    league: {
      id: 61,
      name: 'League',
      country: 'FR',
      logo: '',
      season: 2025,
    },
    teams: {
      home: {
        id: 1,
        name: 'Home',
        logo: '',
      },
      away: {
        id: 2,
        name: 'Away',
        logo: '',
      },
    },
    goals: {
      home: fixtureStatusShort === 'NS' ? null : 1,
      away: fixtureStatusShort === 'NS' ? null : 0,
    },
  };
}

describe('useMatchDetailsScreenModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fixtureStatusShort = 'NS';
    fixtureStatusLong = 'Not started';
    fixtureElapsed = null;

    mockedUseNavigation.mockReturnValue({
      goBack: jest.fn(),
    } as never);
    mockedUseRoute.mockReturnValue({
      params: {
        matchId: '101',
      },
    } as never);
    mockedUseIsFocused.mockReturnValue(true);
    mockedUseNetInfo.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      details: null,
    } as ReturnType<typeof useNetInfo>);
    mockedUsePowerState.mockReturnValue({
      lowPowerMode: false,
    } as ReturnType<typeof usePowerState>);

    mockedUseQuery.mockImplementation((options: { queryKey: readonly unknown[] }) => {
      const key = options.queryKey;
      const baseResult = {
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: jest.fn(async () => ({ isError: false })),
      };

      if (key[0] === 'competition_standings') {
        return {
          ...baseResult,
          data: {
            league: {
              standings: [],
            },
          },
        } as never;
      }

      if (key[0] !== 'match_details') {
        return {
          ...baseResult,
          data: [],
        } as never;
      }

      if (key[2] === 'predictions') {
        return {
          ...baseResult,
          data: [
            {
              predictions: {
                percent: {
                  home: '40%',
                  draw: '30%',
                  away: '30%',
                },
              },
            },
          ],
        } as never;
      }

      if (key[2] === 'events' || key[2] === 'statistics' || key[2] === 'lineups' || key[2] === 'absences' || key[2] === 'team_players_stats') {
        return {
          ...baseResult,
          data: [],
        } as never;
      }

      return {
        ...baseResult,
        data: buildFixture(),
      } as never;
    });
  });

  it('uses pre-match primary tab label before kickoff', () => {
    const { result } = renderHook(() => useMatchDetailsScreenModel());

    expect(result.current.lifecycleState).toBe('pre_match');
    expect(result.current.tabs[0].label).toBe(i18n.t('matchDetails.tabs.preMatch'));
    expect(result.current.tabs.map(tab => tab.key)).toEqual(['primary', 'faceOff']);
    expect(mockedUseMatchesRefresh).toHaveBeenCalledWith(
      expect.objectContaining({
        hasLiveMatches: false,
      }),
    );
  });

  it('switches to live lifecycle and summary tab label during match', () => {
    fixtureStatusShort = '2H';
    fixtureStatusLong = 'Second Half';
    fixtureElapsed = 67;

    const { result } = renderHook(() => useMatchDetailsScreenModel());

    expect(result.current.lifecycleState).toBe('live');
    expect(result.current.tabs[0].label).toBe(i18n.t('matchDetails.tabs.summary'));
    expect(result.current.tabs.map(tab => tab.key)).toEqual([
      'primary',
      'timeline',
      'lineups',
      'faceOff',
    ]);
    expect(mockedUseMatchesRefresh).toHaveBeenCalledWith(
      expect.objectContaining({
        hasLiveMatches: true,
      }),
    );
  });

  it('classifies unknown short status as finished when long status indicates match finished', () => {
    fixtureStatusShort = 'UNK';
    fixtureStatusLong = 'Match Finished';
    fixtureElapsed = 90;

    const { result } = renderHook(() => useMatchDetailsScreenModel());

    expect(result.current.lifecycleState).toBe('finished');
    expect(result.current.tabs.map(tab => tab.key)).toEqual([
      'primary',
      'timeline',
      'lineups',
      'faceOff',
    ]);
  });

  it('does not build lineups from players stats when lineups endpoint is empty', () => {
    fixtureStatusShort = 'FT';
    fixtureStatusLong = 'Match Finished';
    fixtureElapsed = 90;

    mockedUseQuery.mockImplementation((options: { queryKey: readonly unknown[] }) => {
      const key = options.queryKey;
      const baseResult = {
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: jest.fn(async () => ({ isError: false })),
      };

      if (key[0] === 'competition_standings') {
        return {
          ...baseResult,
          data: {
            league: {
              standings: [],
            },
          },
        } as never;
      }

      if (key[0] !== 'match_details') {
        return {
          ...baseResult,
          data: [],
        } as never;
      }

      if (key[2] === 'predictions') {
        return {
          ...baseResult,
          data: [
            {
              predictions: {
                percent: {
                  home: '40%',
                  draw: '30%',
                  away: '30%',
                },
              },
            },
          ],
        } as never;
      }

      if (key[2] === 'lineups') {
        return {
          ...baseResult,
          data: [],
        } as never;
      }

      if (key[2] === 'team_players_stats') {
        const teamId = String(key[3] ?? '');

        return {
          ...baseResult,
          data: [
            {
              team: {
                id: Number(teamId),
              },
              players: [
                {
                  player: { id: teamId === '1' ? 10 : 20, name: teamId === '1' ? 'Home Starter' : 'Away Starter' },
                  statistics: [
                    {
                      games: { number: 9, position: 'Attacker', rating: '7.4', captain: false, substitute: false },
                      goals: { total: 1, assists: 0 },
                      cards: { yellow: 0, red: 0 },
                      substitutes: { in: null, out: null },
                    },
                  ],
                },
                {
                  player: { id: teamId === '1' ? 11 : 21, name: teamId === '1' ? 'Home Sub' : 'Away Sub' },
                  statistics: [
                    {
                      games: { number: 18, position: 'Midfielder', rating: '6.8', captain: false, substitute: true },
                      goals: { total: 0, assists: 0 },
                      cards: { yellow: 1, red: 0 },
                      substitutes: { in: 77, out: null },
                    },
                  ],
                },
              ],
            },
          ],
        } as never;
      }

      if (key[2] === 'events' || key[2] === 'statistics' || key[2] === 'absences') {
        return {
          ...baseResult,
          data: [],
        } as never;
      }

      return {
        ...baseResult,
        data: buildFixture(),
      } as never;
    });

    const { result } = renderHook(() => useMatchDetailsScreenModel());

    expect(result.current.lineupTeams).toEqual([]);
  });

  it('falls back to fixture embedded details when sub-routes are failing', () => {
    fixtureStatusShort = 'FT';
    fixtureStatusLong = 'Match Finished';
    fixtureElapsed = 90;

    const fixtureWithEmbeddedDetails = {
      ...buildFixture(),
      events: [
        {
          time: { elapsed: 14, extra: null },
          team: { id: 1 },
          player: { name: 'Home Scorer' },
          assist: { name: 'Home Assist' },
          type: 'Goal',
          detail: 'Normal Goal',
        },
      ],
      statistics: [
        {
          team: { id: 1 },
          statistics: [{ type: 'Shots on Goal', value: 5 }],
        },
        {
          team: { id: 2 },
          statistics: [{ type: 'Shots on Goal', value: 2 }],
        },
      ],
      lineups: [
        {
          team: { id: 1, name: 'Home', logo: '' },
          coach: { name: 'Coach Home', photo: null },
          formation: '4-3-3',
          startXI: [{ player: { id: 10, name: 'Home Starter', number: 9, pos: 'F', grid: '1:1' } }],
          substitutes: [],
        },
        {
          team: { id: 2, name: 'Away', logo: '' },
          coach: { name: 'Coach Away', photo: null },
          formation: '4-4-2',
          startXI: [{ player: { id: 20, name: 'Away Starter', number: 10, pos: 'F', grid: '1:1' } }],
          substitutes: [],
        },
      ],
      players: [
        {
          team: { id: 1 },
          players: [
            {
              player: { id: 10, photo: null },
              statistics: [
                {
                  games: { rating: '7.2', captain: false },
                  goals: { total: 1, assists: 0 },
                  cards: { yellow: 0, red: 0 },
                  substitutes: { in: null, out: null },
                },
              ],
            },
          ],
        },
        {
          team: { id: 2 },
          players: [
            {
              player: { id: 20, photo: null },
              statistics: [
                {
                  games: { rating: '6.8', captain: false },
                  goals: { total: 0, assists: 0 },
                  cards: { yellow: 1, red: 0 },
                  substitutes: { in: null, out: null },
                },
              ],
            },
          ],
        },
      ],
    };

    mockedUseQuery.mockImplementation((options: { queryKey: readonly unknown[] }) => {
      const key = options.queryKey;
      const baseResult = {
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: jest.fn(async () => ({ isError: false })),
      };

      if (key[0] === 'competition_standings') {
        return {
          ...baseResult,
          data: { league: { standings: [] } },
        } as never;
      }

      if (key[0] !== 'match_details') {
        return {
          ...baseResult,
          data: [],
        } as never;
      }

      if (
        key[2] === 'events' ||
        key[2] === 'statistics' ||
        key[2] === 'lineups' ||
        key[2] === 'team_players_stats'
      ) {
        return {
          ...baseResult,
          isError: true,
          data: [],
        } as never;
      }

      if (key[2] === 'head_to_head' || key[2] === 'absences') {
        return {
          ...baseResult,
          data: [],
        } as never;
      }

      return {
        ...baseResult,
        data: fixtureWithEmbeddedDetails,
      } as never;
    });

    const { result } = renderHook(() => useMatchDetailsScreenModel());

    expect(result.current.events).toHaveLength(1);
    expect(result.current.statistics).toHaveLength(2);
    expect(result.current.lineupTeams).toHaveLength(2);
    expect(result.current.homePlayersStats).toHaveLength(1);
    expect(result.current.awayPlayersStats).toHaveLength(1);
    expect(result.current.dataSources.events).toBe('fixture_fallback');
    expect(result.current.dataSources.statistics).toBe('fixture_fallback');
    expect(result.current.dataSources.lineups).toBe('fixture_fallback');
    expect(result.current.dataSources.homePlayersStats).toBe('fixture_fallback');
    expect(result.current.dataSources.awayPlayersStats).toBe('fixture_fallback');
    expect(result.current.datasetErrors.events).toBe(false);
    expect(result.current.datasetErrors.lineups).toBe(false);
  });

  it('classifies 404 dataset failures as endpoint_not_available', () => {
    fixtureStatusShort = 'FT';
    fixtureStatusLong = 'Match Finished';
    fixtureElapsed = 90;

    mockedUseQuery.mockImplementation((options: { queryKey: readonly unknown[] }) => {
      const key = options.queryKey;
      const baseResult = {
        isLoading: false,
        isError: false,
        isFetching: false,
        error: undefined,
        refetch: jest.fn(async () => ({ isError: false })),
      };

      if (key[0] === 'competition_standings') {
        return {
          ...baseResult,
          data: { league: { standings: [] } },
        } as never;
      }

      if (key[0] !== 'match_details') {
        return {
          ...baseResult,
          data: [],
        } as never;
      }

      if (key[2] === 'events') {
        return {
          ...baseResult,
          isError: true,
          error: new ApiError('HTTP 500', 500, ''),
          data: [],
        } as never;
      }

      if (key[2] === 'head_to_head') {
        return {
          ...baseResult,
          isError: true,
          error: new ApiError('HTTP 404', 404, ''),
          data: [],
        } as never;
      }

      if (key[2] === 'predictions') {
        return {
          ...baseResult,
          data: [
            {
              predictions: {
                percent: {
                  home: '40%',
                  draw: '30%',
                  away: '30%',
                },
              },
            },
          ],
        } as never;
      }

      if (key[2] === 'statistics' || key[2] === 'lineups' || key[2] === 'absences' || key[2] === 'team_players_stats') {
        return {
          ...baseResult,
          data: [],
        } as never;
      }

      return {
        ...baseResult,
        data: buildFixture(),
      } as never;
    });

    const { result } = renderHook(() => useMatchDetailsScreenModel());

    expect(result.current.datasetErrors.events).toBe(true);
    expect(result.current.datasetErrors.faceOff).toBe(true);
    expect(result.current.datasetErrorReasons.events).toBe('request_failed');
    expect(result.current.datasetErrorReasons.faceOff).toBe('endpoint_not_available');
  });

  it('configures detail queries to skip retries on HTTP 404 and refetch on mount', () => {
    renderHook(() => useMatchDetailsScreenModel());

    const fixtureQueryCall = mockedUseQuery.mock.calls.find(
      ([options]) =>
        Array.isArray((options as { queryKey: readonly unknown[] }).queryKey) &&
        (options as { queryKey: readonly unknown[] }).queryKey[0] === 'match_details' &&
        (options as { queryKey: readonly unknown[] }).queryKey[2] !== 'events' &&
        (options as { queryKey: readonly unknown[] }).queryKey[2] !== 'statistics' &&
        (options as { queryKey: readonly unknown[] }).queryKey[2] !== 'lineups' &&
        (options as { queryKey: readonly unknown[] }).queryKey[2] !== 'team_players_stats' &&
        (options as { queryKey: readonly unknown[] }).queryKey[2] !== 'predictions' &&
        (options as { queryKey: readonly unknown[] }).queryKey[2] !== 'absences' &&
        (options as { queryKey: readonly unknown[] }).queryKey[2] !== 'head_to_head',
    );
    const eventsQueryCall = mockedUseQuery.mock.calls.find(
      ([options]) => (options as { queryKey: readonly unknown[] }).queryKey[2] === 'events',
    );
    const playersStatsCall = mockedUseQuery.mock.calls.find(
      ([options]) => (options as { queryKey: readonly unknown[] }).queryKey[2] === 'team_players_stats',
    );

    const fixtureRetry = fixtureQueryCall?.[0].retry as (failureCount: number, error: unknown) => boolean;
    const eventsRetry = eventsQueryCall?.[0].retry as (failureCount: number, error: unknown) => boolean;

    expect(fixtureQueryCall?.[0].refetchOnMount).toBe('always');
    expect(eventsQueryCall?.[0].refetchOnMount).toBe('always');
    expect(playersStatsCall?.[0].refetchOnMount).toBe('always');
    expect(fixtureRetry(1, new ApiError('HTTP 404', 404, ''))).toBe(false);
    expect(eventsRetry(1, new ApiError('HTTP 404', 404, ''))).toBe(false);
    expect(eventsRetry(1, new ApiError('HTTP 500', 500, ''))).toBe(true);
  });

  it('shows stats tab only when at least one supported stat is available', () => {
    fixtureStatusShort = 'FT';
    fixtureStatusLong = 'Match Finished';
    fixtureElapsed = 90;

    mockedUseQuery.mockImplementation((options: { queryKey: readonly unknown[] }) => {
      const key = options.queryKey;
      const baseResult = {
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: jest.fn(async () => ({ isError: false })),
      };

      if (key[0] === 'competition_standings') {
        return {
          ...baseResult,
          data: { league: { standings: [] } },
        } as never;
      }

      if (key[0] !== 'match_details') {
        return {
          ...baseResult,
          data: [],
        } as never;
      }

      if (key[2] === 'statistics' && key[3] === 'all') {
        return {
          ...baseResult,
          data: [
            {
              team: { id: 1 },
              statistics: [
                { type: 'Shots on Goal', value: 5 },
                { type: 'Unsupported metric', value: 2 },
              ],
            },
            {
              team: { id: 2 },
              statistics: [{ type: 'Shots on Goal', value: 3 }],
            },
          ],
        } as never;
      }

      if (key[2] === 'statistics') {
        return {
          ...baseResult,
          data: [],
        } as never;
      }

      if (key[2] === 'events' || key[2] === 'lineups' || key[2] === 'absences' || key[2] === 'team_players_stats') {
        return {
          ...baseResult,
          data: [],
        } as never;
      }

      if (key[2] === 'predictions') {
        return {
          ...baseResult,
          data: [
            {
              predictions: {
                percent: {
                  home: '40%',
                  draw: '30%',
                  away: '30%',
                },
              },
            },
          ],
        } as never;
      }

      return {
        ...baseResult,
        data: buildFixture(),
      } as never;
    });

    const { result } = renderHook(() => useMatchDetailsScreenModel());

    expect(result.current.tabs.map(tab => tab.key)).toEqual([
      'primary',
      'timeline',
      'lineups',
      'stats',
      'faceOff',
    ]);
    expect(result.current.statsAvailablePeriods).toEqual(['all']);
    expect(result.current.statsRowsByPeriod.all).toHaveLength(1);
    expect(result.current.statsRowsByPeriod.first).toHaveLength(0);
    expect(result.current.statsRowsByPeriod.second).toHaveLength(0);
  });

  it('exposes all/first/second periods when half statistics are available', () => {
    fixtureStatusShort = '2H';
    fixtureStatusLong = 'Second Half';
    fixtureElapsed = 70;

    mockedUseQuery.mockImplementation((options: { queryKey: readonly unknown[] }) => {
      const key = options.queryKey;
      const baseResult = {
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: jest.fn(async () => ({ isError: false })),
      };

      if (key[0] === 'competition_standings') {
        return {
          ...baseResult,
          data: { league: { standings: [] } },
        } as never;
      }

      if (key[0] !== 'match_details') {
        return {
          ...baseResult,
          data: [],
        } as never;
      }

      if (key[2] === 'statistics' && key[3] === 'all') {
        return {
          ...baseResult,
          data: [
            {
              team: { id: 1 },
              statistics: [{ type: 'Total Shots', value: 12 }],
            },
            {
              team: { id: 2 },
              statistics: [{ type: 'Total Shots', value: 7 }],
            },
          ],
        } as never;
      }

      if (key[2] === 'statistics' && key[3] === 'first') {
        return {
          ...baseResult,
          data: [
            {
              team: { id: 1 },
              statistics: [{ type: 'Shots on Goal', value: 4 }],
            },
            {
              team: { id: 2 },
              statistics: [{ type: 'Shots on Goal', value: 2 }],
            },
          ],
        } as never;
      }

      if (key[2] === 'statistics' && key[3] === 'second') {
        return {
          ...baseResult,
          data: [
            {
              team: { id: 1 },
              statistics: [{ type: 'Shots on Goal', value: 3 }],
            },
            {
              team: { id: 2 },
              statistics: [{ type: 'Shots on Goal', value: 1 }],
            },
          ],
        } as never;
      }

      if (key[2] === 'events' || key[2] === 'lineups' || key[2] === 'absences' || key[2] === 'team_players_stats') {
        return {
          ...baseResult,
          data: [],
        } as never;
      }

      if (key[2] === 'predictions') {
        return {
          ...baseResult,
          data: [
            {
              predictions: {
                percent: {
                  home: '40%',
                  draw: '30%',
                  away: '30%',
                },
              },
            },
          ],
        } as never;
      }

      return {
        ...baseResult,
        data: buildFixture(),
      } as never;
    });

    const { result } = renderHook(() => useMatchDetailsScreenModel());

    expect(result.current.statsAvailablePeriods).toEqual(['all', 'first', 'second']);
    expect(result.current.statsRowsByPeriod.all).toHaveLength(1);
    expect(result.current.statsRowsByPeriod.first).toHaveLength(1);
    expect(result.current.statsRowsByPeriod.second).toHaveLength(1);
  });
});
