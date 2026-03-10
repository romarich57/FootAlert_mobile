import { useQuery } from '@tanstack/react-query';

import {
  doesTeamFullSelectionMatch,
  useTeamFull,
} from '@ui/features/teams/hooks/useTeamFull';
import { useTeamMatches } from '@ui/features/teams/hooks/useTeamMatches';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('@ui/features/teams/hooks/useTeamFull', () => ({
  useTeamFull: jest.fn(),
  doesTeamFullSelectionMatch: jest.fn(),
}));

const mockedUseQuery = jest.mocked(useQuery);
const mockedUseTeamFull = jest.mocked(useTeamFull);
const mockedDoesTeamFullSelectionMatch = jest.mocked(doesTeamFullSelectionMatch);

describe('useTeamMatches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseQuery.mockReturnValue({} as never);
    mockedUseTeamFull.mockReturnValue({
      data: undefined,
      dataUpdatedAt: 0,
      isError: false,
      isFetched: false,
      isFetchedAfterMount: false,
      isFetching: false,
      isFullEnabled: false,
      isLoading: false,
      refetch: jest.fn(async () => ({}) as never),
    } as never);
    mockedDoesTeamFullSelectionMatch.mockReturnValue(false);
  });

  it('disables the query when league or season is missing', () => {
    useTeamMatches({
      teamId: '529',
      leagueId: null,
      season: null,
      timezone: 'Europe/Paris',
    });

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('enables the query when team, league and season are present', () => {
    useTeamMatches({
      teamId: '529',
      leagueId: '140',
      season: 2025,
      timezone: 'Europe/Paris',
    });

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['team_matches', '529', '140', 2025, 'Europe/Paris'],
        enabled: true,
      }),
    );
  });

  it('uses team full payload first when the selected season matches', () => {
    mockedUseTeamFull.mockReturnValue({
      data: {
        selection: {
          leagueId: '140',
          season: 2025,
        },
        matches: {
          response: [
            {
              fixture: {
                id: 1001,
                date: '2026-03-10T20:00:00Z',
                status: {
                  short: 'FT',
                  long: 'Match Finished',
                },
              },
              league: {
                id: 140,
                name: 'La Liga',
                logo: 'laliga.png',
                round: 'Regular Season - 25',
              },
              teams: {
                home: {
                  id: 529,
                  name: 'Barcelona',
                  logo: 'barca.png',
                },
                away: {
                  id: 40,
                  name: 'Valencia',
                  logo: 'valencia.png',
                },
              },
              goals: {
                home: 2,
                away: 1,
              },
            },
          ],
        },
      },
      dataUpdatedAt: 100,
      isError: false,
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isFullEnabled: true,
      isLoading: false,
      refetch: jest.fn(async () => ({}) as never),
    } as never);
    mockedDoesTeamFullSelectionMatch.mockReturnValue(true);

    const result = useTeamMatches({
      teamId: '529',
      leagueId: '140',
      season: 2025,
      timezone: 'Europe/Paris',
    });

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['team_matches', '529', '140', 2025, 'Europe/Paris'],
        enabled: false,
      }),
    );
    expect(result.data?.all).toHaveLength(1);
    expect(result.data?.past).toHaveLength(1);
    expect(result.data?.all[0]?.fixtureId).toBe('1001');
  });
});
