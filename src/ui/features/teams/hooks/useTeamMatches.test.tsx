import { useQuery } from '@tanstack/react-query';

import { useTeamMatches } from '@ui/features/teams/hooks/useTeamMatches';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

const mockedUseQuery = jest.mocked(useQuery);

describe('useTeamMatches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseQuery.mockReturnValue({} as never);
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
});
