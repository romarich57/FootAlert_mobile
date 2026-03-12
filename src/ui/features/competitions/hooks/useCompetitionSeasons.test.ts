import { useQuery, useQueryClient } from '@tanstack/react-query';

import { loadCompetitionFullPayload } from '@ui/features/competitions/hooks/competitionFullQuery';
import { useCompetitionSeasons } from '@ui/features/competitions/hooks/useCompetitionSeasons';
import { queryKeys } from '@ui/shared/query/queryKeys';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useQueryClient: jest.fn(),
}));
jest.mock('@ui/features/competitions/hooks/competitionFullQuery', () => ({
  loadCompetitionFullPayload: jest.fn(),
}));

const mockedUseQuery = jest.mocked(useQuery);
const mockedUseQueryClient = jest.mocked(useQueryClient);
const mockedLoadCompetitionFullPayload = jest.mocked(loadCompetitionFullPayload);

describe('useCompetitionSeasons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseQueryClient.mockReturnValue({} as never);
    mockedUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as never);
    mockedLoadCompetitionFullPayload.mockResolvedValue(null);
  });

  it('uses a dedicated competition seasons query key', () => {
    useCompetitionSeasons(61);

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryKeys.competitions.seasons(61),
      }),
    );
  });

  it('derives seasons from competitions.full without using a legacy header route', async () => {
    mockedLoadCompetitionFullPayload.mockResolvedValue({
      competition: {
        league: {
          id: 61,
          name: 'Ligue 1',
          type: 'League',
          logo: 'ligue1.png',
        },
        country: {
          name: 'France',
        },
        seasons: [
          { year: 2024, current: false },
          { year: 2025, current: true },
        ],
      },
    } as never);

    useCompetitionSeasons(61);
    const queryConfig = mockedUseQuery.mock.calls[0]?.[0];
    const queryFn = queryConfig?.queryFn as (context: { signal: AbortSignal | undefined }) => Promise<unknown>;
    const select = queryConfig?.select as (dto: { seasons?: Array<{ year: number; current: boolean }> } | null) => unknown;
    const dto = await queryFn({ signal: undefined });

    expect(mockedLoadCompetitionFullPayload).toHaveBeenCalledWith(expect.anything(), 61);
    expect(select(dto as never)).toEqual([
      { year: 2025, current: true },
      { year: 2024, current: false },
    ]);
  });
});
