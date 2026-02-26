import { linking } from '@ui/app/navigation/linking';

describe('linking', () => {
  it('exposes the app deep link prefix', () => {
    expect(linking.prefixes).toEqual(['footalert://']);
  });

  it('maps detail routes to stable deep link patterns', () => {
    const screens = linking.config?.screens as Record<string, unknown>;
    expect(screens.MatchDetails).toEqual(
      expect.objectContaining({
        path: 'match/:matchId',
        parse: expect.objectContaining({
          matchId: expect.any(Function),
        }),
      }),
    );
    expect(screens.CompetitionDetails).toEqual(
      expect.objectContaining({
        path: 'competition/:competitionId',
        parse: expect.objectContaining({
          competitionId: expect.any(Function),
        }),
      }),
    );
    expect(screens.TeamDetails).toEqual(
      expect.objectContaining({
        path: 'team/:teamId',
        parse: expect.objectContaining({
          teamId: expect.any(Function),
        }),
      }),
    );
    expect(screens.PlayerDetails).toEqual(
      expect.objectContaining({
        path: 'player/:playerId',
        parse: expect.objectContaining({
          playerId: expect.any(Function),
        }),
      }),
    );
  });

  it('maps tab routes under MainTabs', () => {
    const screens = linking.config?.screens as Record<string, unknown>;
    const mainTabs = screens.MainTabs as { screens?: Record<string, string> };

    expect(mainTabs.screens).toEqual({
      Matches: 'matches',
      Competitions: 'competitions',
      Follows: 'follows',
      More: 'more',
    });
  });
});
