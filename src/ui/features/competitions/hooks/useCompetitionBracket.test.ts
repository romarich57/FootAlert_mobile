import { useQuery, useQueryClient } from '@tanstack/react-query';

import { loadCompetitionFullPayload } from '@ui/features/competitions/hooks/competitionFullQuery';
import { useCompetitionBracket } from '@ui/features/competitions/hooks/useCompetitionBracket';

jest.mock('@tanstack/react-query', () => ({
  keepPreviousData: jest.fn(),
  useQuery: jest.fn(),
  useQueryClient: jest.fn(),
}));
jest.mock('@ui/features/competitions/hooks/competitionFullQuery', () => ({
  loadCompetitionFullPayload: jest.fn(),
}));

const mockedUseQuery = jest.mocked(useQuery);
const mockedUseQueryClient = jest.mocked(useQueryClient);
const mockedLoadCompetitionFullPayload = jest.mocked(loadCompetitionFullPayload);

describe('useCompetitionBracket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseQueryClient.mockReturnValue({} as never);
    mockedUseQuery.mockReturnValue({} as never);
    mockedLoadCompetitionFullPayload.mockResolvedValue(null);
  });

  it('disables the query when identifiers are missing and returns a league fallback shape', async () => {
    useCompetitionBracket(undefined, 2025);
    let queryConfig = mockedUseQuery.mock.calls[0]?.[0];
    let queryFn = queryConfig?.queryFn as (context: { signal: AbortSignal | undefined }) => Promise<unknown>;

    expect(queryConfig).toEqual(expect.objectContaining({ enabled: false }));
    await expect(queryFn({ signal: undefined })).resolves.toEqual({
      competitionKind: 'league',
      bracket: null,
    });

    mockedUseQuery.mockClear();

    useCompetitionBracket(61, undefined);
    queryConfig = mockedUseQuery.mock.calls[0]?.[0];
    queryFn = queryConfig?.queryFn as (context: { signal: AbortSignal | undefined }) => Promise<unknown>;

    expect(queryConfig).toEqual(expect.objectContaining({ enabled: false }));
    await expect(queryFn({ signal: undefined })).resolves.toEqual({
      competitionKind: 'league',
      bracket: null,
    });
  });

  it('uses competitions.full bracket data as the unique source', async () => {
    mockedLoadCompetitionFullPayload.mockResolvedValue({
      competitionKind: 'mixed',
      bracket: [{ name: 'Semi-finals', order: 1, matches: [] }],
    } as never);

    useCompetitionBracket(61, 2025);
    const queryConfig = mockedUseQuery.mock.calls[0]?.[0];
    const queryFn = queryConfig?.queryFn as (context: { signal: AbortSignal | undefined }) => Promise<unknown>;
    const result = await queryFn({ signal: undefined });

    expect(mockedLoadCompetitionFullPayload).toHaveBeenCalledWith(expect.anything(), 61, 2025);
    expect(result).toEqual({
      competitionKind: 'mixed',
      bracket: [{ name: 'Semi-finals', order: 1, matches: [] }],
    });
  });
});
