import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { fetchLeagueById } from '@data/endpoints/competitionsApi';
import { mapLeagueDtoToCompetition } from '@data/mappers/competitionsMapper';
import { useFollowedCompetitions } from '@ui/features/competitions/hooks/useFollowedCompetitions';
import { queryKeys } from '@ui/shared/query/queryKeys';

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
        gcTime: Infinity,
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  return {
    queryClient,
    Wrapper,
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
      wrapper: createWrapper().Wrapper,
    });

    await waitFor(() => {
      expect(result.current.followedCompetitions).toHaveLength(1);
    });

    expect(result.current.followedCompetitions[0]).toMatchObject({
      id: '39',
      name: 'Premier League',
    });
  });

  it('falls back to the shared follows cache key and catalog data when detail fetch fails', async () => {
    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(queryKeys.follows.followedLeagueIds(), ['39']);
    queryClient.setQueryData(queryKeys.competitions.catalog(), [
      {
        league: {
          id: 39,
          name: 'Premier League',
          type: 'League',
          logo: 'https://media.api-sports.io/football/leagues/39.png',
        },
        country: {
          name: 'England',
          code: 'GB',
          flag: 'https://flagcdn.com/gb.png',
        },
        seasons: [],
      },
    ]);
    mockedFetchLeagueById.mockRejectedValue(new Error('upstream failure'));
    mockedMapLeagueDtoToCompetition.mockImplementation(dto => {
      if (!dto || !('league' in dto) || !dto.league) {
        return dto as never;
      }

      return {
        id: String(dto.league.id),
        name: dto.league.name,
        logo: dto.league.logo,
        type: dto.league.type,
        countryName: dto.country.name,
      } as never;
    });

    const { result } = renderHook(() => useFollowedCompetitions(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.followedIds).toEqual(['39']);
      expect(result.current.followedCompetitions).toEqual([
        {
          id: '39',
          name: 'Premier League',
          logo: 'https://media.api-sports.io/football/leagues/39.png',
          type: 'League',
          countryName: 'England',
        },
      ]);
    });
  });
});
