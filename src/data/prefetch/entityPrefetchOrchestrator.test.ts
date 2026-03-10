import { appEnv } from '@data/config/env';
import {
  getCompetitionPrefetchStrategies,
  getMatchPrefetchStrategies,
  getPlayerPrefetchStrategies,
  getTeamPrefetchStrategies,
} from '@data/prefetch/entityPrefetchOrchestrator';
import { queryKeys } from '@data/query/queryKeys';

describe('entityPrefetchOrchestrator', () => {
  const initialFlags = {
    team: appEnv.mobileEnableBffTeamFull,
    player: appEnv.mobileEnableBffPlayerFull,
    competition: appEnv.mobileEnableBffCompetitionFull,
    match: appEnv.mobileEnableBffMatchFull,
  };

  afterEach(() => {
    appEnv.mobileEnableBffTeamFull = initialFlags.team;
    appEnv.mobileEnableBffPlayerFull = initialFlags.player;
    appEnv.mobileEnableBffCompetitionFull = initialFlags.competition;
    appEnv.mobileEnableBffMatchFull = initialFlags.match;
  });

  it('uses team full as the primary prefetch strategy when the flag is enabled', () => {
    appEnv.mobileEnableBffTeamFull = true;

    const strategies = getTeamPrefetchStrategies({
      teamId: '529',
      leagueId: '39',
      season: 2025,
      timezone: 'Europe/Paris',
    });

    expect(strategies).toHaveLength(1);
    expect(strategies[0]?.queryKey).toEqual(
      queryKeys.teams.full('529', 'Europe/Paris', '39', 2025),
    );
  });

  it('uses player full as the primary prefetch strategy when the flag is enabled', () => {
    appEnv.mobileEnableBffPlayerFull = true;

    const strategies = getPlayerPrefetchStrategies({
      playerId: '278',
      teamId: '40',
      season: 2025,
    });

    expect(strategies).toHaveLength(1);
    expect(strategies[0]?.queryKey).toEqual(queryKeys.players.full('278', 2025));
  });

  it('uses competition full as the primary prefetch strategy when the flag is enabled', () => {
    appEnv.mobileEnableBffCompetitionFull = true;

    const strategies = getCompetitionPrefetchStrategies({
      competitionId: '39',
      season: 2025,
    });

    expect(strategies).toHaveLength(1);
    expect(strategies[0]?.queryKey).toEqual(queryKeys.competitions.full('39', 2025));
  });

  it('uses match full as the primary prefetch strategy when the flag is enabled', () => {
    appEnv.mobileEnableBffMatchFull = true;

    const strategies = getMatchPrefetchStrategies({
      matchId: '101',
      timezone: 'Europe/Paris',
      enableEvents: true,
      enableLineups: true,
      enablePredictions: true,
      enableFaceOff: true,
    });

    expect(strategies).toHaveLength(1);
    expect(strategies[0]?.queryKey).toEqual(queryKeys.matchesFull('101', 'Europe/Paris'));
  });
});
