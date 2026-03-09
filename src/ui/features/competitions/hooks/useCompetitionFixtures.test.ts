import { useInfiniteQuery } from '@tanstack/react-query';

import { fetchLeagueFixturesPage } from '@data/endpoints/competitionsApi';
import { mapFixturesDtoToFixtures } from '@data/mappers/competitionsMapper';
import { useCompetitionFixtures } from '@ui/features/competitions/hooks/useCompetitionFixtures';

jest.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: jest.fn(),
}));
jest.mock('@data/endpoints/competitionsApi', () => ({
  fetchLeagueFixturesPage: jest.fn(),
}));
jest.mock('@data/mappers/competitionsMapper', () => ({
  mapFixturesDtoToFixtures: jest.fn((items: unknown[]) => items),
}));

const mockedUseInfiniteQuery = jest.mocked(useInfiniteQuery);
const mockedFetchLeagueFixturesPage = jest.mocked(fetchLeagueFixturesPage);
const mockedMapFixturesDtoToFixtures = jest.mocked(mapFixturesDtoToFixtures);

describe('useCompetitionFixtures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseInfiniteQuery.mockReturnValue({} as never);
    mockedFetchLeagueFixturesPage.mockResolvedValue({
      items: [],
      pageInfo: undefined,
    });
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

  it('getPreviousPageParam retourne previousCursor quand hasPrevious est true', () => {
    useCompetitionFixtures(61, 2025);
    const config = mockedUseInfiniteQuery.mock.calls[0]?.[0];
    const getPreviousPageParam = config?.getPreviousPageParam as (
      page: { hasPrevious: boolean; previousCursor: string | null },
    ) => string | null | undefined;

    expect(
      getPreviousPageParam({
        hasPrevious: true,
        previousCursor: 'cursor_prev',
        items: [],
      } as never),
    ).toBe('cursor_prev');
    expect(
      getPreviousPageParam({
        hasPrevious: false,
        previousCursor: null,
        items: [],
      } as never),
    ).toBeUndefined();
  });

  it('queryFn retourne des items vides si leagueId est absent', async () => {
    useCompetitionFixtures(undefined, 2025);
    const config = mockedUseInfiniteQuery.mock.calls[0]?.[0];
    const queryFn = config?.queryFn as (ctx: { pageParam: unknown; signal: AbortSignal | undefined }) => Promise<unknown>;
    const result = await queryFn({ pageParam: undefined, signal: undefined });
    expect(result).toEqual({
      items: [],
      hasMore: false,
      nextCursor: null,
      hasPrevious: false,
      previousCursor: null,
    });
  });

  it('queryFn retourne des items vides si season est absent', async () => {
    useCompetitionFixtures(61, undefined);
    const config = mockedUseInfiniteQuery.mock.calls[0]?.[0];
    const queryFn = config?.queryFn as (ctx: { pageParam: unknown; signal: AbortSignal | undefined }) => Promise<unknown>;
    const result = await queryFn({ pageParam: undefined, signal: undefined });
    expect(result).toEqual({
      items: [],
      hasMore: false,
      nextCursor: null,
      hasPrevious: false,
      previousCursor: null,
    });
  });

  it('queryFn relaie previousCursor et hasPrevious depuis la page BFF', async () => {
    mockedFetchLeagueFixturesPage.mockResolvedValue({
      items: [{ fixture: { id: 77 } }] as never[],
      pageInfo: {
        hasMore: true,
        nextCursor: 'cursor_next',
        hasPrevious: true,
        previousCursor: 'cursor_prev',
      },
    });
    mockedMapFixturesDtoToFixtures.mockReturnValue([
      { id: 77, round: 'Regular Season - 2' } as never,
    ]);

    useCompetitionFixtures(61, 2025);
    const config = mockedUseInfiniteQuery.mock.calls[0]?.[0];
    const queryFn = config?.queryFn as (ctx: {
      pageParam: unknown;
      signal: AbortSignal | undefined;
    }) => Promise<unknown>;
    const result = await queryFn({ pageParam: undefined, signal: undefined });

    expect(mockedFetchLeagueFixturesPage).toHaveBeenCalledWith(
      61,
      2025,
      undefined,
      { limit: 50, cursor: undefined },
    );
    expect(result).toEqual({
      items: [{ id: 77, round: 'Regular Season - 2' }],
      hasMore: true,
      nextCursor: 'cursor_next',
      hasPrevious: true,
      previousCursor: 'cursor_prev',
    });
  });
});
