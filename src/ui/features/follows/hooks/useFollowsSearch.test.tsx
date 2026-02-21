import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useFollowsSearch } from '@ui/features/follows/hooks/useFollowsSearch';
import { searchPlayersByName, searchTeamsByName } from '@data/endpoints/followsApi';

jest.mock('@data/endpoints/followsApi', () => ({
  searchTeamsByName: jest.fn(async () => []),
  searchPlayersByName: jest.fn(async () => []),
}));

const mockedSearchTeamsByName = jest.mocked(searchTeamsByName);
const mockedSearchPlayersByName = jest.mocked(searchPlayersByName);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useFollowsSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not query API when below minimum chars', () => {
    const { result } = renderHook(
      () =>
        useFollowsSearch({
          tab: 'teams',
          query: 'a',
        }),
      {
        wrapper: createWrapper(),
      },
    );

    expect(result.current.hasEnoughChars).toBe(false);
    expect(result.current.results).toEqual([]);
    expect(mockedSearchTeamsByName).not.toHaveBeenCalled();
  });

  it('queries teams API when enough chars', async () => {
    mockedSearchTeamsByName.mockResolvedValueOnce([
      {
        team: {
          id: 529,
          name: 'Barcelona',
          logo: 'barca.png',
          country: 'Spain',
        },
      },
    ]);

    const { result } = renderHook(
      () =>
        useFollowsSearch({
          tab: 'teams',
          query: 'Barca',
        }),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1);
    });

    expect(result.current.results[0]).toMatchObject({
      teamId: '529',
      teamName: 'Barcelona',
    });
  });

  it('queries players API when players tab is selected', async () => {
    mockedSearchPlayersByName.mockResolvedValueOnce([
      {
        player: {
          id: 154,
          name: 'Cristiano Ronaldo',
          photo: 'cr7.png',
        },
        statistics: [
          {
            team: {
              name: 'Al-Nassr',
              logo: 'nassr.png',
            },
            league: {
              name: 'Saudi League',
              season: 2025,
            },
            games: {
              position: 'Attacker',
            },
          },
        ],
      },
    ]);

    const { result } = renderHook(
      () =>
        useFollowsSearch({
          tab: 'players',
          query: 'Ronaldo',
        }),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1);
    });

    expect(result.current.results[0]).toMatchObject({
      playerId: '154',
      playerName: 'Cristiano Ronaldo',
    });
  });
});
