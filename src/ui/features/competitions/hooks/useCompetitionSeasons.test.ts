import { useQuery } from '@tanstack/react-query';

import { useCompetitionSeasons } from '@ui/features/competitions/hooks/useCompetitionSeasons';
import { queryKeys } from '@ui/shared/query/queryKeys';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

const mockedUseQuery = jest.mocked(useQuery);

describe('useCompetitionSeasons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as never);
  });

  it('uses a dedicated competition seasons query key', () => {
    useCompetitionSeasons(61);

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryKeys.competitions.seasons(61),
      }),
    );
  });
});
