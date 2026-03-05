import { useInfiniteQuery } from '@tanstack/react-query';

import { useCompetitionFixtures } from '@ui/features/competitions/hooks/useCompetitionFixtures';

jest.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: jest.fn(),
}));

const mockedUseInfiniteQuery = jest.mocked(useInfiniteQuery);

describe('useCompetitionFixtures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseInfiniteQuery.mockReturnValue({} as never);
  });

  it('désactive la query quand leagueId est absent', () => {
    useCompetitionFixtures(undefined, 2025);
    expect(mockedUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('désactive la query quand season est absent', () => {
    useCompetitionFixtures(61, undefined);
    expect(mockedUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('utilise la bonne query key et active la query quand les params sont présents', () => {
    useCompetitionFixtures(61, 2025);
    expect(mockedUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['competition_fixtures', 61, 2025],
        enabled: true,
        staleTime: 2 * 60_000,
      }),
    );
  });

  it('getNextPageParam retourne nextCursor quand hasMore est true', () => {
    useCompetitionFixtures(61, 2025);
    const config = mockedUseInfiniteQuery.mock.calls[0]?.[0];
    const getNextPageParam = config?.getNextPageParam as (page: { hasMore: boolean; nextCursor: string | null }) => string | null | undefined;

    expect(getNextPageParam({ hasMore: true, nextCursor: 'cursor_abc', items: [] } as never)).toBe('cursor_abc');
    expect(getNextPageParam({ hasMore: false, nextCursor: null, items: [] } as never)).toBeUndefined();
  });

  it('queryFn retourne des items vides si leagueId est absent', async () => {
    useCompetitionFixtures(undefined, 2025);
    const config = mockedUseInfiniteQuery.mock.calls[0]?.[0];
    const queryFn = config?.queryFn as (ctx: { pageParam: unknown; signal: AbortSignal | undefined }) => Promise<unknown>;
    const result = await queryFn({ pageParam: undefined, signal: undefined });
    expect(result).toEqual({ items: [], hasMore: false, nextCursor: null });
  });

  it('queryFn retourne des items vides si season est absent', async () => {
    useCompetitionFixtures(61, undefined);
    const config = mockedUseInfiniteQuery.mock.calls[0]?.[0];
    const queryFn = config?.queryFn as (ctx: { pageParam: unknown; signal: AbortSignal | undefined }) => Promise<unknown>;
    const result = await queryFn({ pageParam: undefined, signal: undefined });
    expect(result).toEqual({ items: [], hasMore: false, nextCursor: null });
  });
});
