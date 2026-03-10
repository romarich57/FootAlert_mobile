import { useQuery, useQueryClient } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import {
  fetchLeagueTopAssists,
  fetchLeagueTopRedCards,
  fetchLeagueTopScorers,
  fetchLeagueTopYellowCards,
} from '@data/endpoints/competitionsApi';
import { mapPlayerStatsDtoToPlayerStats } from '@data/mappers/competitionsMapper';
import { loadCompetitionFullPayload } from '@ui/features/competitions/hooks/competitionFullQuery';
import { useCompetitionPlayerStats } from '@ui/features/competitions/hooks/useCompetitionPlayerStats';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useQueryClient: jest.fn(),
}));
jest.mock('@data/config/env', () => ({
  appEnv: {
    mobileEnableBffCompetitionFull: false,
  },
}));
jest.mock('@data/endpoints/competitionsApi', () => ({
  fetchLeagueTopScorers: jest.fn(),
  fetchLeagueTopAssists: jest.fn(),
  fetchLeagueTopYellowCards: jest.fn(),
  fetchLeagueTopRedCards: jest.fn(),
}));
jest.mock('@data/mappers/competitionsMapper', () => ({
  mapPlayerStatsDtoToPlayerStats: jest.fn(),
}));
jest.mock('@ui/features/competitions/hooks/competitionFullQuery', () => ({
  loadCompetitionFullPayload: jest.fn(),
}));

const mockedUseQuery = jest.mocked(useQuery);
const mockedUseQueryClient = jest.mocked(useQueryClient);
const mockedFetchLeagueTopScorers = jest.mocked(fetchLeagueTopScorers);
const mockedFetchLeagueTopAssists = jest.mocked(fetchLeagueTopAssists);
const mockedFetchLeagueTopYellowCards = jest.mocked(fetchLeagueTopYellowCards);
const mockedFetchLeagueTopRedCards = jest.mocked(fetchLeagueTopRedCards);
const mockedMapPlayerStatsDtoToPlayerStats = jest.mocked(mapPlayerStatsDtoToPlayerStats);
const mockedLoadCompetitionFullPayload = jest.mocked(loadCompetitionFullPayload);

describe('useCompetitionPlayerStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appEnv.mobileEnableBffCompetitionFull = false;
    mockedUseQueryClient.mockReturnValue({} as never);
    mockedUseQuery.mockReturnValue({} as never);
    mockedLoadCompetitionFullPayload.mockResolvedValue(null);
    mockedFetchLeagueTopScorers.mockResolvedValue([] as never);
    mockedFetchLeagueTopAssists.mockResolvedValue([] as never);
    mockedFetchLeagueTopYellowCards.mockResolvedValue([] as never);
    mockedFetchLeagueTopRedCards.mockResolvedValue([] as never);
    mockedMapPlayerStatsDtoToPlayerStats.mockReturnValue([] as never);
  });

  it('uses the expected key and stays disabled without league or season', () => {
    useCompetitionPlayerStats(undefined, 2025, 'goals');
    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['competition_player_stats', undefined, 2025, 'goals'],
        enabled: false,
      }),
    );
  });

  it('uses competitions.full as the first source when available', async () => {
    appEnv.mobileEnableBffCompetitionFull = true;
    mockedLoadCompetitionFullPayload.mockResolvedValue({
      playerStats: {
        topScorers: [{ id: 'from-full' }],
        topAssists: [],
        topYellowCards: [],
        topRedCards: [],
      },
    } as never);
    mockedMapPlayerStatsDtoToPlayerStats.mockReturnValue([{ playerId: 10 }] as never);

    useCompetitionPlayerStats(61, 2025, 'goals');
    const queryConfig = mockedUseQuery.mock.calls[0]?.[0];
    const queryFn = queryConfig?.queryFn as (context: { signal: AbortSignal | undefined }) => Promise<unknown>;
    const result = await queryFn({ signal: undefined });

    expect(mockedLoadCompetitionFullPayload).toHaveBeenCalled();
    expect(mockedFetchLeagueTopScorers).not.toHaveBeenCalled();
    expect(result).toEqual([{ playerId: 10 }]);
  });

  it('falls back to the legacy scorer endpoint when full is unavailable', async () => {
    mockedFetchLeagueTopScorers.mockResolvedValue([{ id: 'legacy' }] as never);
    mockedMapPlayerStatsDtoToPlayerStats.mockReturnValue([{ playerId: 20 }] as never);

    useCompetitionPlayerStats(61, 2025, 'goals');
    const queryConfig = mockedUseQuery.mock.calls[0]?.[0];
    const queryFn = queryConfig?.queryFn as (context: { signal: AbortSignal | undefined }) => Promise<unknown>;
    const result = await queryFn({ signal: undefined });

    expect(mockedFetchLeagueTopScorers).toHaveBeenCalledWith(61, 2025, undefined);
    expect(result).toEqual([{ playerId: 20 }]);
  });
});
