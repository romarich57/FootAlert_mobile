import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { fetchAllLeagues, searchLeaguesByName } from '@data/endpoints/competitionsApi';
import { fetchCompetitionTrends } from '@data/endpoints/followsApi';
import { useCompetitions } from '@ui/features/competitions/hooks/useCompetitions';

jest.mock('@data/endpoints/competitionsApi', () => ({
  fetchAllLeagues: jest.fn(async () => []),
  searchLeaguesByName: jest.fn(async () => []),
}));

jest.mock('@data/endpoints/followsApi', () => ({
  fetchCompetitionTrends: jest.fn(async () => []),
}));

const mockedFetchAllLeagues = jest.mocked(fetchAllLeagues);
const mockedSearchLeaguesByName = jest.mocked(searchLeaguesByName);
const mockedFetchCompetitionTrends = jest.mocked(fetchCompetitionTrends);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Infinity,
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useCompetitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSearchLeaguesByName.mockResolvedValue([]);
  });

  it('uses the trends endpoint to populate suggested competitions', async () => {
    mockedFetchAllLeagues.mockResolvedValue([
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
      {
        league: {
          id: 253,
          name: 'MLS',
          type: 'League',
          logo: 'https://media.api-sports.io/football/leagues/253.png',
        },
        country: {
          name: 'USA',
          code: 'US',
          flag: 'https://flagcdn.com/us.png',
        },
        seasons: [],
      },
    ]);
    mockedFetchCompetitionTrends.mockResolvedValue([
      {
        competitionId: '253',
        competitionName: 'MLS',
        competitionLogo: 'https://media.api-sports.io/football/leagues/253.png',
        country: 'USA',
        type: 'League',
      },
    ]);

    const { result } = renderHook(() => useCompetitions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.suggestedCompetitions).toEqual([
        {
          id: '253',
          name: 'MLS',
          logo: 'https://media.api-sports.io/football/leagues/253.png',
          type: 'League',
          countryName: 'USA',
        },
      ]);
    });
  });

  it('falls back to the catalog shortlist when the trends endpoint is empty', async () => {
    mockedFetchAllLeagues.mockResolvedValue([
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
      {
        league: {
          id: 61,
          name: 'Ligue 1',
          type: 'League',
          logo: 'https://media.api-sports.io/football/leagues/61.png',
        },
        country: {
          name: 'France',
          code: 'FR',
          flag: 'https://flagcdn.com/fr.png',
        },
        seasons: [],
      },
      {
        league: {
          id: 253,
          name: 'MLS',
          type: 'League',
          logo: 'https://media.api-sports.io/football/leagues/253.png',
        },
        country: {
          name: 'USA',
          code: 'US',
          flag: 'https://flagcdn.com/us.png',
        },
        seasons: [],
      },
    ]);
    mockedFetchCompetitionTrends.mockResolvedValue([]);

    const { result } = renderHook(() => useCompetitions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.suggestedCompetitions).toEqual([
        {
          id: '39',
          name: 'Premier League',
          logo: 'https://media.api-sports.io/football/leagues/39.png',
          type: 'League',
          countryName: 'England',
        },
        {
          id: '61',
          name: 'Ligue 1',
          logo: 'https://media.api-sports.io/football/leagues/61.png',
          type: 'League',
          countryName: 'France',
        },
      ]);
    });
  });
});
