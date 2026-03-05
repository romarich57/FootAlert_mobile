import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { fetchLeagueById } from '@data/endpoints/competitionsApi';
import { mapLeagueDtoToCompetition } from '@data/mappers/competitionsMapper';
import { useFollowedCompetitions } from '@ui/features/competitions/hooks/useFollowedCompetitions';

jest.mock('@data/endpoints/competitionsApi', () => ({
  fetchLeagueById: jest.fn(async () => null),
}));

jest.mock('@data/mappers/competitionsMapper', () => ({
  mapLeagueDtoToCompetition: jest.fn(dto => dto),
}));

jest.mock('@data/storage/followsStorage', () => ({
  loadFollowedLeagueIds: jest.fn(async () => ['39', '61']),
  toggleFollowedLeague: jest.fn(async () => ({ ids: [], changed: true })),
}));

jest.mock('@data/storage/reviewPromptStorage', () => ({
  incrementPositiveEventCount: jest.fn(async () => undefined),
}));

const mockedFetchLeagueById = jest.mocked(fetchLeagueById);
const mockedMapLeagueDtoToCompetition = jest.mocked(mapLeagueDtoToCompetition);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useFollowedCompetitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns fulfilled competitions when one fetch fails', async () => {
    mockedFetchLeagueById.mockImplementation(async leagueId => {
      if (leagueId === '39') {
        return {
          id: '39',
          name: 'Premier League',
        } as never;
      }

      throw new Error('upstream failure');
    });

    mockedMapLeagueDtoToCompetition.mockImplementation(dto => dto as never);

    const { result } = renderHook(() => useFollowedCompetitions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.followedCompetitions).toHaveLength(1);
    });

    expect(result.current.followedCompetitions[0]).toMatchObject({
      id: '39',
      name: 'Premier League',
    });
  });
});
