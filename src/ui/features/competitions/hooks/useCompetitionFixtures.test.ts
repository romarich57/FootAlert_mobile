import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { mapFixturesDtoToFixtures } from '@data/mappers/competitionsMapper';
import { useCompetitionFixtures } from '@ui/features/competitions/hooks/useCompetitionFixtures';
import { loadCompetitionFullPayload } from '@ui/features/competitions/hooks/competitionFullQuery';

jest.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: jest.fn(),
  useQueryClient: jest.fn(),
}));
jest.mock('@data/mappers/competitionsMapper', () => ({
  mapFixturesDtoToFixtures: jest.fn((items: unknown[]) => items),
}));
jest.mock('@data/config/env', () => ({
  appEnv: {
    mobileEnableBffCompetitionFull: false,
  },
}));
jest.mock('@ui/features/competitions/hooks/competitionFullQuery', () => ({
  loadCompetitionFullPayload: jest.fn(),
}));

const mockedUseInfiniteQuery = jest.mocked(useInfiniteQuery);
const mockedUseQueryClient = jest.mocked(useQueryClient);
const mockedMapFixturesDtoToFixtures = jest.mocked(mapFixturesDtoToFixtures);
const mockedLoadCompetitionFullPayload = jest.mocked(loadCompetitionFullPayload);

describe('useCompetitionFixtures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appEnv.mobileEnableBffCompetitionFull = false;
    mockedUseQueryClient.mockReturnValue({} as never);
    mockedUseInfiniteQuery.mockReturnValue({} as never);
    mockedLoadCompetitionFullPayload.mockResolvedValue(null);
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
        staleTime: 5 * 60_000,
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

  it('queryFn utilise competitions.full comme source unique quand le flag est actif', async () => {
    appEnv.mobileEnableBffCompetitionFull = true;
    mockedLoadCompetitionFullPayload.mockResolvedValue({
      matches: [{ fixture: { id: 88 } }],
    } as never);
    mockedMapFixturesDtoToFixtures.mockReturnValue([{ id: 88 }] as never);

    useCompetitionFixtures(61, 2025);
    const config = mockedUseInfiniteQuery.mock.calls[0]?.[0];
    const queryFn = config?.queryFn as (ctx: {
      pageParam: unknown;
      signal: AbortSignal | undefined;
    }) => Promise<unknown>;
    const result = await queryFn({ pageParam: undefined, signal: undefined });

    expect(mockedLoadCompetitionFullPayload).toHaveBeenCalled();
    expect(result).toEqual({
      items: [{ id: 88 }],
      hasMore: false,
      nextCursor: null,
      hasPrevious: false,
      previousCursor: null,
    });
  });

  it('returns an empty page when the full payload has no fixtures instead of falling back to a legacy endpoint', async () => {
    appEnv.mobileEnableBffCompetitionFull = true;
    mockedLoadCompetitionFullPayload.mockResolvedValue({
      matches: [],
    } as never);
    mockedMapFixturesDtoToFixtures.mockReturnValue([]);

    useCompetitionFixtures(61, 2025);
    const config = mockedUseInfiniteQuery.mock.calls[0]?.[0];
    const queryFn = config?.queryFn as (ctx: {
      pageParam: unknown;
      signal: AbortSignal | undefined;
    }) => Promise<unknown>;
    const result = await queryFn({ pageParam: undefined, signal: undefined });

    expect(mockedLoadCompetitionFullPayload).toHaveBeenCalled();
    expect(result).toEqual({
      items: [],
      hasMore: false,
      nextCursor: null,
      hasPrevious: false,
      previousCursor: null,
    });
  });
});
