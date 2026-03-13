import { renderHook } from '@testing-library/react-native';

import { useCompetitionFullQuery } from '@ui/features/competitions/hooks/competitionFullQuery';
import { useCompetitionBracket } from '@ui/features/competitions/hooks/useCompetitionBracket';

jest.mock('@ui/features/competitions/hooks/competitionFullQuery', () => ({
  useCompetitionFullQuery: jest.fn(),
}));

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

describe('useCompetitionBracket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseCompetitionFullQuery.mockReturnValue(
      createCompetitionFullQueryResult() as never,
    );
  });

  it('disables the upstream full query when identifiers are missing and returns a league fallback shape', () => {
    const { result: missingLeagueResult } = renderHook(() =>
      useCompetitionBracket(undefined, 2025),
    );

    expect(mockedUseCompetitionFullQuery).toHaveBeenCalledWith(undefined, 2025, false);
    expect(missingLeagueResult.current.data).toEqual({
      competitionKind: 'league',
      bracket: null,
    });

    mockedUseCompetitionFullQuery.mockClear();

    const { result: missingSeasonResult } = renderHook(() =>
      useCompetitionBracket(61, undefined),
    );

    expect(mockedUseCompetitionFullQuery).toHaveBeenCalledWith(61, undefined, false);
    expect(missingSeasonResult.current.data).toEqual({
      competitionKind: 'league',
      bracket: null,
    });
  });

  it('uses competitions.full bracket data as the unique source', () => {
    mockedUseCompetitionFullQuery.mockReturnValue(
      createCompetitionFullQueryResult({
        data: {
          competitionKind: 'mixed',
          bracket: [{ name: 'Semi-finals', order: 1, matches: [] }],
        },
      }) as never,
    );

    const { result } = renderHook(() => useCompetitionBracket(61, 2025));

    expect(mockedUseCompetitionFullQuery).toHaveBeenCalledWith(61, 2025, true);
    expect(result.current.data).toEqual({
      competitionKind: 'mixed',
      bracket: [{ name: 'Semi-finals', order: 1, matches: [] }],
    });
  });
});
