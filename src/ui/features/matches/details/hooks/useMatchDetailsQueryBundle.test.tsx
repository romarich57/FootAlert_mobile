import { renderHook } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';

import { useMatchDetailsQueryBundle } from '@ui/features/matches/details/hooks/useMatchDetailsQueryBundle';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('@data/config/env', () => ({
  appEnv: {
    mobileEnableBffMatchFull: true,
  },
}));

const mockedUseQuery = jest.mocked(useQuery);

describe('useMatchDetailsQueryBundle', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseQuery.mockImplementation((options: { queryKey: readonly unknown[] }) => {
      const key = options.queryKey;
      const baseResult = {
        error: null,
        isError: false,
        isFetching: false,
        isLoading: false,
        refetch: jest.fn(async () => ({ isError: false })),
      };

      if (key[0] === 'match_details_full') {
        return {
          ...baseResult,
          data: {
            fixture: {
              fixture: {
                id: 101,
                date: '2099-02-26T20:00:00.000Z',
                status: {
                  short: 'NS',
                  long: 'Not started',
                  elapsed: null,
                },
              },
              league: {
                id: 61,
                season: 2025,
              },
              teams: {
                home: {
                  id: 1,
                  name: 'Home',
                  logo: 'home.png',
                },
                away: {
                  id: 2,
                  name: 'Away',
                  logo: 'away.png',
                },
              },
              goals: {
                home: null,
                away: null,
              },
            },
            lifecycleState: 'pre_match',
            context: {
              leagueId: 61,
              season: 2025,
              homeTeamId: '1',
              awayTeamId: '2',
            },
            events: [],
            statistics: {
              all: [],
              first: [],
              second: [],
            },
            lineups: [],
            predictions: [],
            absences: [],
            headToHead: [],
            standings: {
              league: {
                id: 61,
                standings: [[{ rank: 1, team: { id: 1, name: 'Home', logo: 'home.png' } }]],
              },
            },
            homeRecentResults: [
              {
                fixture: {
                  id: 701,
                  date: '2099-02-20T20:00:00.000Z',
                  status: {
                    short: 'FT',
                    long: 'Match Finished',
                    elapsed: 90,
                  },
                },
                league: {
                  id: 61,
                  name: 'League',
                  logo: 'league.png',
                  round: 'Regular Season - 24',
                },
                teams: {
                  home: {
                    id: 1,
                    name: 'Home',
                    logo: 'home.png',
                  },
                  away: {
                    id: 9,
                    name: 'Opponent',
                    logo: 'opponent.png',
                  },
                },
                goals: {
                  home: 2,
                  away: 1,
                },
              },
            ],
            awayRecentResults: [
              {
                fixture: {
                  id: 702,
                  date: '2099-02-20T20:00:00.000Z',
                  status: {
                    short: 'FT',
                    long: 'Match Finished',
                    elapsed: 90,
                  },
                },
                league: {
                  id: 61,
                  name: 'League',
                  logo: 'league.png',
                  round: 'Regular Season - 24',
                },
                teams: {
                  home: {
                    id: 2,
                    name: 'Away',
                    logo: 'away.png',
                  },
                  away: {
                    id: 8,
                    name: 'Opponent 2',
                    logo: 'opponent-2.png',
                  },
                },
                goals: {
                  home: 1,
                  away: 0,
                },
              },
            ],
            homeLeaders: {
              ratings: [],
              scorers: [{ playerId: '1', name: 'Home Scorer' }],
              assisters: [],
            },
            awayLeaders: {
              ratings: [],
              scorers: [{ playerId: '2', name: 'Away Scorer' }],
              assisters: [],
            },
            playersStats: {
              homeTeamId: '1',
              awayTeamId: '2',
              home: [],
              away: [],
            },
          },
        } as never;
      }

      return {
        ...baseResult,
        data: [],
      } as never;
    });
  });

  it('uses the full payload for standings, team context and leaders when match full is enabled', () => {
    const { result } = renderHook(() =>
      useMatchDetailsQueryBundle({
        safeMatchId: '101',
        timezone: 'Europe/Paris',
        activeTab: 'primary',
      }),
    );

    expect(result.current.standingsQuery.data).toEqual(
      expect.objectContaining({
        league: expect.objectContaining({
          id: 61,
        }),
      }),
    );
    expect(result.current.homeTeamMatchesQuery.data?.all).toHaveLength(1);
    expect(result.current.awayTeamMatchesQuery.data?.all).toHaveLength(1);
    expect(result.current.homeLeadersQuery.data?.scorers?.[0]).toEqual(
      expect.objectContaining({
        name: 'Home Scorer',
      }),
    );
    expect(result.current.awayLeadersQuery.data?.scorers?.[0]).toEqual(
      expect.objectContaining({
        name: 'Away Scorer',
      }),
    );
    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['competition_standings', 61, 2025],
        enabled: false,
      }),
    );
    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['team_recent_results', '1', 61, 2025, 'Europe/Paris'],
        enabled: false,
      }),
    );
    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['team_recent_results', '2', 61, 2025, 'Europe/Paris'],
        enabled: false,
      }),
    );
    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['team_leaders', '1', 61, 2025],
        enabled: false,
      }),
    );
    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['team_leaders', '2', 61, 2025],
        enabled: false,
      }),
    );
  });
});
