import { useQuery } from '@tanstack/react-query';

import { useCompetitionTransfers } from '@ui/features/competitions/hooks/useCompetitionTransfers';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

const mockedUseQuery = jest.mocked(useQuery);

describe('useCompetitionTransfers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseQuery.mockReturnValue({} as never);
  });

  it('disables query when league or season is missing', () => {
    useCompetitionTransfers(undefined, 2025);
    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );

    mockedUseQuery.mockClear();

    useCompetitionTransfers(61, undefined);
    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('uses expected key and enables query when parameters are present', () => {
    useCompetitionTransfers(61, 2025);

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['competition_transfers', 61, 2025],
        enabled: true,
        staleTime: 60 * 60 * 1000,
      }),
    );
  });
});
