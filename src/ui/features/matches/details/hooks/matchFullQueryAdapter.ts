import type { UseQueryResult } from '@tanstack/react-query';

import type { ApiFootballMatchFullResponse } from '@data/endpoints/matchesApi';

export type MatchFullQuerySlice<TData = unknown> = Pick<
  UseQueryResult<TData, unknown>,
  'data' | 'error' | 'isError' | 'isLoading' | 'isFetching'
>;

type MatchFullSharedQuery = Pick<
  UseQueryResult<ApiFootballMatchFullResponse, unknown>,
  'data' | 'error' | 'isError' | 'isLoading' | 'isFetching' | 'refetch'
>;

export type MatchFullQuerySliceResult<TData = unknown> = MatchFullQuerySlice<TData> & {
  refetch: MatchFullSharedQuery['refetch'];
};

export function buildMatchFullQuerySlice<TData>(
  fullQuery: MatchFullSharedQuery,
  selector: (payload: ApiFootballMatchFullResponse | null) => TData,
): MatchFullQuerySliceResult<TData> {
  const payload = fullQuery.data ?? null;

  return {
    data: selector(payload),
    error: fullQuery.error,
    isError: fullQuery.isError,
    isLoading: fullQuery.isLoading,
    isFetching: fullQuery.isFetching,
    refetch: fullQuery.refetch,
  };
}
