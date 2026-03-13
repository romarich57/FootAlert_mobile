import { renderHook } from '@testing-library/react-native';

import { mapTransfersDtoToCompetitionTransfers } from '@data/mappers/competitionsMapper';
import { useCompetitionFullQuery } from '@ui/features/competitions/hooks/competitionFullQuery';
import { useCompetitionTransfers } from '@ui/features/competitions/hooks/useCompetitionTransfers';

jest.mock('@data/mappers/competitionsMapper', () => ({
  mapTransfersDtoToCompetitionTransfers: jest.fn(),
}));
jest.mock('@ui/features/competitions/hooks/competitionFullQuery', () => ({
  useCompetitionFullQuery: jest.fn(),
}));

const mockedMapTransfersDtoToCompetitionTransfers = jest.mocked(
  mapTransfersDtoToCompetitionTransfers,
);
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

describe('useCompetitionTransfers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseCompetitionFullQuery.mockReturnValue(
      createCompetitionFullQueryResult() as never,
    );
    mockedMapTransfersDtoToCompetitionTransfers.mockReturnValue([] as never);
  });

  it('disables the upstream full query when league or season is missing', () => {
    const { result: missingLeagueResult } = renderHook(() =>
      useCompetitionTransfers(undefined, 2025),
    );

    expect(mockedUseCompetitionFullQuery).toHaveBeenCalledWith(undefined, 2025, false);
    expect(missingLeagueResult.current.data).toEqual([]);

    mockedUseCompetitionFullQuery.mockClear();

    const { result: missingSeasonResult } = renderHook(() =>
      useCompetitionTransfers(61, undefined),
    );

    expect(mockedUseCompetitionFullQuery).toHaveBeenCalledWith(61, undefined, false);
    expect(missingSeasonResult.current.data).toEqual([]);
  });

  it('uses the expected key and mapped competitions.full transfers when parameters are present', () => {
    mockedUseCompetitionFullQuery.mockReturnValue(
      createCompetitionFullQueryResult({
        data: {
          transfers: [{ transferId: 1 }],
        },
      }) as never,
    );
    mockedMapTransfersDtoToCompetitionTransfers.mockReturnValue([{ id: '1' }] as never);

    const { result } = renderHook(() => useCompetitionTransfers(61, 2025));

    expect(mockedUseCompetitionFullQuery).toHaveBeenCalledWith(61, 2025, true);
    expect(result.current.queryKey).toEqual(['competition_transfers', 61, 2025]);
    expect(mockedMapTransfersDtoToCompetitionTransfers).toHaveBeenCalledWith(
      [{ transferId: 1 }],
      2025,
    );
    expect(result.current.data).toEqual([{ id: '1' }]);
  });

  it('returns an empty transfers list when competitions.full has no transfers', () => {
    mockedUseCompetitionFullQuery.mockReturnValue(
      createCompetitionFullQueryResult({
        data: {
          transfers: [],
        },
      }) as never,
    );
    mockedMapTransfersDtoToCompetitionTransfers.mockReturnValue([]);

    const { result } = renderHook(() => useCompetitionTransfers(61, 2025));

    expect(mockedMapTransfersDtoToCompetitionTransfers).toHaveBeenCalledWith([], 2025);
    expect(result.current.data).toEqual([]);
  });
});
