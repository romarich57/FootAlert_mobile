import { useQuery } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';

import { fetchTeamTransfers } from '@data/endpoints/teamsApi';
import { mapTransfersToTeamTransfers } from '@data/mappers/teamsMapper';
import { useTeamTransfers } from '@ui/features/teams/hooks/useTeamTransfers';
import type { TeamTransfersData } from '@ui/features/teams/types/teams.types';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('@data/endpoints/teamsApi', () => ({
  fetchTeamTransfers: jest.fn(),
}));

jest.mock('@data/mappers/teamsMapper', () => ({
  mapTransfersToTeamTransfers: jest.fn(),
}));

const mockedUseQuery = jest.mocked(useQuery);
const mockedFetchTeamTransfers = jest.mocked(fetchTeamTransfers);
const mockedMapTransfersToTeamTransfers = jest.mocked(mapTransfersToTeamTransfers);

type CapturedQueryConfig = {
  enabled?: boolean;
  queryKey?: readonly unknown[];
  placeholderData?: (previousData: TeamTransfersData | undefined) => TeamTransfersData | undefined;
  queryFn?: (context: { signal?: AbortSignal }) => Promise<TeamTransfersData>;
};

describe('useTeamTransfers', () => {
  let capturedQueryConfig: CapturedQueryConfig | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedQueryConfig = null;

    mockedUseQuery.mockImplementation(config => {
      capturedQueryConfig = config as CapturedQueryConfig;
      return {} as never;
    });

    mockedFetchTeamTransfers.mockResolvedValue([]);
    mockedMapTransfersToTeamTransfers.mockReturnValue({
      arrivals: [],
      departures: [],
    });
  });

  it('passes the selected season to the endpoint and keeps previous query data as placeholder', async () => {
    renderHook(() =>
      useTeamTransfers({
        teamId: '529',
        season: 2025,
      }),
    );

    expect(capturedQueryConfig?.queryKey).toEqual(['team_transfers', '529', 2025]);
    expect(capturedQueryConfig?.enabled).toBe(true);

    const previousData: TeamTransfersData = {
      arrivals: [
        {
          id: 'arrival-1',
          direction: 'arrival',
          playerId: '10',
          playerName: 'Player',
          playerPhoto: null,
          position: null,
          date: '2025-08-01',
          type: 'Transfer',
          amount: null,
          fromTeamId: '1',
          fromTeamName: 'From',
          fromTeamLogo: null,
          toTeamId: '529',
          toTeamName: 'Barcelona',
          toTeamLogo: null,
        },
      ],
      departures: [],
    };

    expect(capturedQueryConfig?.placeholderData?.(previousData)).toBe(previousData);

    await capturedQueryConfig?.queryFn?.({ signal: undefined });

    expect(mockedFetchTeamTransfers).toHaveBeenCalledWith('529', 2025, undefined);
    expect(mockedMapTransfersToTeamTransfers).toHaveBeenCalledWith([], '529', 2025);
  });
});
