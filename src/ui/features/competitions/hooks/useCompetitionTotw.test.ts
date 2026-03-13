import { renderHook } from '@testing-library/react-native';

import {
  mapCompetitionPlayerStatsToTotw,
  mapPlayerStatsDtoToPlayerStats,
} from '@data/mappers/competitionsMapper';
import { useCompetitionFullQuery } from '@ui/features/competitions/hooks/competitionFullQuery';
import { useCompetitionTotw } from '@ui/features/competitions/hooks/useCompetitionTotw';

jest.mock('@data/mappers/competitionsMapper', () => ({
  mapPlayerStatsDtoToPlayerStats: jest.fn(),
  mapCompetitionPlayerStatsToTotw: jest.fn(),
}));
jest.mock('@ui/features/competitions/hooks/competitionFullQuery', () => ({
  useCompetitionFullQuery: jest.fn(),
}));

const mockedMapPlayerStatsDtoToPlayerStats = jest.mocked(mapPlayerStatsDtoToPlayerStats);
const mockedMapCompetitionPlayerStatsToTotw = jest.mocked(mapCompetitionPlayerStatsToTotw);
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

describe('useCompetitionTotw', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseCompetitionFullQuery.mockReturnValue(
      createCompetitionFullQueryResult() as never,
    );
  });

  it('disables the upstream full query when league or season is missing and returns null', () => {
    const { result: missingLeagueResult } = renderHook(() =>
      useCompetitionTotw(undefined, 2025),
    );

    expect(mockedUseCompetitionFullQuery).toHaveBeenCalledWith(undefined, 2025, false);
    expect(missingLeagueResult.current.data).toBeNull();

    mockedUseCompetitionFullQuery.mockClear();

    const { result: missingSeasonResult } = renderHook(() =>
      useCompetitionTotw(61, undefined),
    );

    expect(mockedUseCompetitionFullQuery).toHaveBeenCalledWith(61, undefined, false);
    expect(missingSeasonResult.current.data).toBeNull();
  });

  it('uses the expected key when parameters are present', () => {
    const { result } = renderHook(() => useCompetitionTotw(61, 2025));

    expect(result.current.queryKey).toEqual(['competition_totw', 61, 2025]);
  });

  it('builds TOTW from competitions.full player stats and forwards data to the strict mapper', () => {
    mockedUseCompetitionFullQuery.mockReturnValue(
      createCompetitionFullQueryResult({
        data: {
          playerStats: {
            topScorers: [{ key: 'scorer' }],
            topAssists: [{ key: 'assist' }],
            topYellowCards: [{ key: 'yellow' }],
            topRedCards: [{ key: 'red' }],
          },
        },
      }) as never,
    );

    mockedMapPlayerStatsDtoToPlayerStats
      .mockReturnValueOnce([{ playerId: 1 }] as never)
      .mockReturnValueOnce([{ playerId: 2 }] as never)
      .mockReturnValueOnce([{ playerId: 3 }] as never)
      .mockReturnValueOnce([{ playerId: 4 }] as never);

    const expectedTotw = { formation: '4-3-3' };
    mockedMapCompetitionPlayerStatsToTotw.mockReturnValue(expectedTotw as never);

    const { result } = renderHook(() => useCompetitionTotw(61, 2025));

    expect(mockedUseCompetitionFullQuery).toHaveBeenCalledWith(61, 2025, true);
    expect(mockedMapPlayerStatsDtoToPlayerStats).toHaveBeenNthCalledWith(
      1,
      [{ key: 'scorer' }],
      2025,
    );
    expect(mockedMapPlayerStatsDtoToPlayerStats).toHaveBeenNthCalledWith(
      2,
      [{ key: 'assist' }],
      2025,
    );
    expect(mockedMapPlayerStatsDtoToPlayerStats).toHaveBeenNthCalledWith(
      3,
      [{ key: 'yellow' }],
      2025,
    );
    expect(mockedMapPlayerStatsDtoToPlayerStats).toHaveBeenNthCalledWith(
      4,
      [{ key: 'red' }],
      2025,
    );
    expect(mockedMapCompetitionPlayerStatsToTotw).toHaveBeenCalledWith(
      [{ playerId: 1 }, { playerId: 2 }, { playerId: 3 }, { playerId: 4 }],
      2025,
    );
    expect(result.current.data).toEqual(expectedTotw);
  });

  it('surfaces the full-query error state without calling the mappers', () => {
    const upstreamError = new Error('competition full unavailable');
    mockedUseCompetitionFullQuery.mockReturnValue(
      createCompetitionFullQueryResult({
        isError: true,
        error: upstreamError,
      }) as never,
    );

    const { result } = renderHook(() => useCompetitionTotw(61, 2025));

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(upstreamError);
    expect(result.current.data).toBeNull();
    expect(mockedMapPlayerStatsDtoToPlayerStats).not.toHaveBeenCalled();
    expect(mockedMapCompetitionPlayerStatsToTotw).not.toHaveBeenCalled();
  });

  it('uses competitions.full playerStats when available and skips any legacy TOTW source', () => {
    mockedUseCompetitionFullQuery.mockReturnValue(
      createCompetitionFullQueryResult({
        data: {
          playerStats: {
            topScorers: [{ key: 'scorer' }],
            topAssists: [{ key: 'assist' }],
            topYellowCards: [{ key: 'yellow' }],
            topRedCards: [{ key: 'red' }],
          },
        },
      }) as never,
    );
    mockedMapPlayerStatsDtoToPlayerStats
      .mockReturnValueOnce([{ playerId: 11 }] as never)
      .mockReturnValueOnce([{ playerId: 12 }] as never)
      .mockReturnValueOnce([{ playerId: 13 }] as never)
      .mockReturnValueOnce([{ playerId: 14 }] as never);
    mockedMapCompetitionPlayerStatsToTotw.mockReturnValue({ formation: '4-3-3' } as never);

    const { result } = renderHook(() => useCompetitionTotw(61, 2025));

    expect(result.current.data).toEqual({ formation: '4-3-3' });
  });
});
