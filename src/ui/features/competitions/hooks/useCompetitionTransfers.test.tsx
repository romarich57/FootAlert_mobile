import { useQuery, useQueryClient } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { mapTransfersDtoToCompetitionTransfers } from '@data/mappers/competitionsMapper';
import { loadCompetitionFullPayload } from '@ui/features/competitions/hooks/competitionFullQuery';
import { useCompetitionTransfers } from '@ui/features/competitions/hooks/useCompetitionTransfers';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useQueryClient: jest.fn(),
}));
jest.mock('@data/config/env', () => ({
  appEnv: {
    mobileEnableBffCompetitionFull: false,
  },
}));
jest.mock('@data/mappers/competitionsMapper', () => ({
  mapTransfersDtoToCompetitionTransfers: jest.fn(),
}));
jest.mock('@ui/features/competitions/hooks/competitionFullQuery', () => ({
  loadCompetitionFullPayload: jest.fn(),
}));

const mockedUseQuery = jest.mocked(useQuery);
const mockedUseQueryClient = jest.mocked(useQueryClient);
const mockedMapTransfersDtoToCompetitionTransfers = jest.mocked(mapTransfersDtoToCompetitionTransfers);
const mockedLoadCompetitionFullPayload = jest.mocked(loadCompetitionFullPayload);

describe('useCompetitionTransfers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appEnv.mobileEnableBffCompetitionFull = false;
    mockedUseQueryClient.mockReturnValue({} as never);
    mockedUseQuery.mockReturnValue({} as never);
    mockedMapTransfersDtoToCompetitionTransfers.mockReturnValue([] as never);
    mockedLoadCompetitionFullPayload.mockResolvedValue(null);
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
        staleTime: 24 * 60 * 60 * 1000,
      }),
    );
  });

  it('uses competitions.full when available and skips the legacy transfers route', async () => {
    appEnv.mobileEnableBffCompetitionFull = true;
    mockedLoadCompetitionFullPayload.mockResolvedValue({
      transfers: [{ transferId: 1 }],
    } as never);
    mockedMapTransfersDtoToCompetitionTransfers.mockReturnValue([{ id: '1' }] as never);

    useCompetitionTransfers(61, 2025);
    const queryConfig = mockedUseQuery.mock.calls[0]?.[0];
    const queryFn = queryConfig?.queryFn as (context: { signal: AbortSignal | undefined }) => Promise<unknown>;
    const result = await queryFn({ signal: undefined });

    expect(mockedLoadCompetitionFullPayload).toHaveBeenCalled();
    expect(result).toEqual([{ id: '1' }]);
  });

  it('returns an empty transfers list when competitions.full has no transfers instead of calling a legacy route', async () => {
    appEnv.mobileEnableBffCompetitionFull = true;
    mockedLoadCompetitionFullPayload.mockResolvedValue({
      transfers: [],
    } as never);
    mockedMapTransfersDtoToCompetitionTransfers.mockReturnValue([]);

    useCompetitionTransfers(61, 2025);
    const queryConfig = mockedUseQuery.mock.calls[0]?.[0];
    const queryFn = queryConfig?.queryFn as (context: { signal: AbortSignal | undefined }) => Promise<unknown>;
    const result = await queryFn({ signal: undefined });

    expect(mockedLoadCompetitionFullPayload).toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
