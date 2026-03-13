import { renderHook } from '@testing-library/react-native';

import { mapPlayerStatsDtoToPlayerStats } from '@data/mappers/competitionsMapper';
import { useCompetitionFullQuery } from '@ui/features/competitions/hooks/competitionFullQuery';
import { useCompetitionPlayerStats } from '@ui/features/competitions/hooks/useCompetitionPlayerStats';

jest.mock('@data/mappers/competitionsMapper', () => ({
  mapPlayerStatsDtoToPlayerStats: jest.fn(),
}));
jest.mock('@ui/features/competitions/hooks/competitionFullQuery', () => ({
  useCompetitionFullQuery: jest.fn(),
}));

const mockedMapPlayerStatsDtoToPlayerStats = jest.mocked(mapPlayerStatsDtoToPlayerStats);
const mockedUseCompetitionFullQuery = jest.mocked(useCompetitionFullQuery);

function createCompetitionFullQueryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    hydration: null,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    ...overrides,
  };
}

describe('useCompetitionPlayerStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseCompetitionFullQuery.mockReturnValue(
      createCompetitionFullQueryResult() as never,
    );
    mockedMapPlayerStatsDtoToPlayerStats.mockReturnValue([] as never);
  });

  it('uses the expected key and disables the upstream full query without league or season', () => {
    const { result } = renderHook(() =>
      useCompetitionPlayerStats(undefined, 2025, 'goals'),
    );

    expect(mockedUseCompetitionFullQuery).toHaveBeenCalledWith(undefined, 2025, false);
    expect(result.current.queryKey).toEqual([
      'competition_player_stats',
      undefined,
      2025,
      'goals',
    ]);
    expect(result.current.data).toEqual([]);
  });

  it('uses competitions.full as the unique player stats source', () => {
    mockedUseCompetitionFullQuery.mockReturnValue(
      createCompetitionFullQueryResult({
        data: {
          playerStats: {
            topScorers: [{ id: 'from-full' }],
            topAssists: [],
            topYellowCards: [],
            topRedCards: [],
          },
        },
      }) as never,
    );
    mockedMapPlayerStatsDtoToPlayerStats.mockReturnValue([{ playerId: 10 }] as never);

    const { result } = renderHook(() =>
      useCompetitionPlayerStats(61, 2025, 'goals'),
    );

    expect(mockedUseCompetitionFullQuery).toHaveBeenCalledWith(61, 2025, true);
    expect(mockedMapPlayerStatsDtoToPlayerStats).toHaveBeenCalledWith(
      [{ id: 'from-full' }],
      2025,
    );
    expect(result.current.data).toEqual([{ playerId: 10 }]);
  });

  it('returns an empty list when competitions.full has no matching stat bucket entries', () => {
    mockedUseCompetitionFullQuery.mockReturnValue(
      createCompetitionFullQueryResult({
        data: {
          playerStats: {
            topScorers: [],
            topAssists: [],
            topYellowCards: [],
            topRedCards: [],
          },
        },
      }) as never,
    );
    mockedMapPlayerStatsDtoToPlayerStats.mockReturnValue([]);

    const { result } = renderHook(() =>
      useCompetitionPlayerStats(61, 2025, 'goals'),
    );

    expect(mockedMapPlayerStatsDtoToPlayerStats).toHaveBeenCalledWith([], 2025);
    expect(result.current.data).toEqual([]);
  });
});
