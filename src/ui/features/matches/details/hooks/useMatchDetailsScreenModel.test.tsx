import { renderHook } from '@testing-library/react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useQuery } from '@tanstack/react-query';
import {
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { usePowerState } from 'react-native-device-info';

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

      if (key[2] === 'events' || key[2] === 'statistics' || key[2] === 'lineups' || key[2] === 'h2h' || key[2] === 'absences' || key[2] === 'team_players_stats') {
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
    expect(result.current.tabs.map(tab => tab.key)).toEqual(['primary', 'standings', 'stats', 'h2h']);
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
      'standings',
      'stats',
      'h2h',
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
      'standings',
      'stats',
      'h2h',
    ]);
  });
});
