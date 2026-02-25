import { useQuery } from '@tanstack/react-query';

import {
  fetchLeagueStandings,
  fetchTeamAdvancedStats,
  fetchTeamPlayers,
  fetchTeamStatistics,
} from '@data/endpoints/teamsApi';
import {
  mapPlayersToTopPlayers,
  mapPlayersToTopPlayersByCategory,
  mapStandingsToTeamData,
  mapTeamStatisticsToStats,
} from '@data/mappers/teamsMapper';
import { useTeamStats } from '@ui/features/teams/hooks/useTeamStats';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('@data/endpoints/teamsApi', () => ({
  fetchTeamStatistics: jest.fn(),
  fetchLeagueStandings: jest.fn(),
  fetchTeamPlayers: jest.fn(),
  fetchTeamAdvancedStats: jest.fn(),
}));

jest.mock('@data/mappers/teamsMapper', () => ({
  mapStandingsToTeamData: jest.fn(),
  mapPlayersToTopPlayers: jest.fn(),
  mapPlayersToTopPlayersByCategory: jest.fn(),
  mapTeamStatisticsToStats: jest.fn(),
}));

const mockedUseQuery = jest.mocked(useQuery);
const mockedFetchTeamStatistics = jest.mocked(fetchTeamStatistics);
const mockedFetchLeagueStandings = jest.mocked(fetchLeagueStandings);
const mockedFetchTeamPlayers = jest.mocked(fetchTeamPlayers);
const mockedFetchTeamAdvancedStats = jest.mocked(fetchTeamAdvancedStats);
const mockedMapStandingsToTeamData = jest.mocked(mapStandingsToTeamData);
const mockedMapPlayersToTopPlayers = jest.mocked(mapPlayersToTopPlayers);
const mockedMapPlayersToTopPlayersByCategory = jest.mocked(mapPlayersToTopPlayersByCategory);
const mockedMapTeamStatisticsToStats = jest.mocked(mapTeamStatisticsToStats);

type CapturedQueryConfig = {
  queryFn?: (context: { signal?: AbortSignal }) => Promise<unknown>;
};

describe('useTeamStats', () => {
  let capturedQueryConfig: CapturedQueryConfig | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedQueryConfig = null;

    mockedUseQuery.mockImplementation(config => {
      capturedQueryConfig = config as unknown as CapturedQueryConfig;
      return {} as never;
    });
  });

  it('keeps query successful when advanced stats fails', async () => {
    const mappedStats = { points: 58 } as never;
    const playersByCategory = { ratings: [], scorers: [], assisters: [] };

    mockedFetchTeamStatistics.mockResolvedValue({ fixtures: {} } as never);
    mockedFetchLeagueStandings.mockResolvedValue({ league: { standings: [] } } as never);
    mockedFetchTeamPlayers.mockResolvedValue({
      response: [],
      paging: { current: 1, total: 1 },
    } as never);
    mockedFetchTeamAdvancedStats.mockRejectedValue(new Error('advanced endpoint failed'));

    mockedMapStandingsToTeamData.mockReturnValue({ groups: [] } as never);
    mockedMapPlayersToTopPlayers.mockReturnValue([]);
    mockedMapPlayersToTopPlayersByCategory.mockReturnValue(playersByCategory as never);
    mockedMapTeamStatisticsToStats.mockReturnValue(mappedStats);

    useTeamStats({
      teamId: '529',
      leagueId: '140',
      season: 2025,
    });

    expect(capturedQueryConfig).not.toBeNull();

    const queryFn = capturedQueryConfig?.queryFn;
    expect(queryFn).toBeDefined();

    const result = await queryFn?.({ signal: undefined } as never);

    expect(result).toBe(mappedStats);
    expect(mockedMapTeamStatisticsToStats).toHaveBeenCalledWith(
      expect.anything(),
      { groups: [] },
      [],
      playersByCategory,
      null,
    );
  });

  it('throws when both core datasets fail (statistics and standings)', async () => {
    mockedFetchTeamStatistics.mockRejectedValue(new Error('stats failed'));
    mockedFetchLeagueStandings.mockRejectedValue(new Error('standings failed'));
    mockedFetchTeamPlayers.mockResolvedValue({
      response: [],
      paging: { current: 1, total: 1 },
    } as never);
    mockedFetchTeamAdvancedStats.mockResolvedValue(null as never);

    useTeamStats({
      teamId: '529',
      leagueId: '140',
      season: 2025,
    });

    expect(capturedQueryConfig).not.toBeNull();

    const queryFn = capturedQueryConfig?.queryFn;
    expect(queryFn).toBeDefined();

    await expect(queryFn?.({ signal: undefined } as never)).rejects.toThrow('stats failed');
  });
});
