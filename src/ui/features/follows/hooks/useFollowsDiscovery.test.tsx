import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  fetchDiscoveryPlayers,
  fetchDiscoveryTeams,
} from '@data/endpoints/followsApi';
import { useFollowsDiscovery } from '@ui/features/follows/hooks/useFollowsDiscovery';

jest.mock('@data/endpoints/followsApi', () => ({
  fetchDiscoveryTeams: jest.fn(async () => ({
    items: [],
    meta: {
      source: 'dynamic',
    },
  })),
  fetchDiscoveryPlayers: jest.fn(async () => ({
    items: [],
    meta: {
      source: 'dynamic',
    },
  })),
}));

const mockedFetchDiscoveryTeams = jest.mocked(fetchDiscoveryTeams);
const mockedFetchDiscoveryPlayers = jest.mocked(fetchDiscoveryPlayers);

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

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe('useFollowsDiscovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders static seed data immediately before replacing it with the remote payload', async () => {
    const deferred = createDeferred<Awaited<ReturnType<typeof fetchDiscoveryTeams>>>();
    mockedFetchDiscoveryTeams.mockImplementationOnce(() => deferred.promise);

    const { result } = renderHook(
      () => useFollowsDiscovery({ tab: 'teams', limit: 2 }),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({
        items: [
          {
            teamId: '529',
            teamName: 'Barcelona',
            teamLogo: 'https://media.api-sports.io/football/teams/529.png',
            country: 'Spain',
            activeFollowersCount: 0,
            recentNet30d: 0,
            totalFollowAdds: 0,
          },
          {
            teamId: '541',
            teamName: 'Real Madrid',
            teamLogo: 'https://media.api-sports.io/football/teams/541.png',
            country: 'Spain',
            activeFollowersCount: 0,
            recentNet30d: 0,
            totalFollowAdds: 0,
          },
        ],
        meta: {
          source: 'static_seed',
        },
      });
    });

    act(() => {
      deferred.resolve({
        items: [
          {
            teamId: '50',
            teamName: 'Manchester City',
            teamLogo: 'city.png',
            country: 'England',
            activeFollowersCount: 12,
            recentNet30d: 4,
            totalFollowAdds: 40,
          },
        ],
        meta: {
          source: 'dynamic',
        },
      });
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        items: [
          {
            teamId: '50',
            teamName: 'Manchester City',
            teamLogo: 'city.png',
            country: 'England',
            activeFollowersCount: 12,
            recentNet30d: 4,
            totalFollowAdds: 40,
          },
        ],
        meta: {
          source: 'dynamic',
        },
      });
    });
  });

  it('does not reuse team discovery data when switching to player discovery', async () => {
    mockedFetchDiscoveryTeams.mockResolvedValueOnce({
      items: [
        {
          teamId: '50',
          teamName: 'Manchester City',
          teamLogo: 'city.png',
          country: 'England',
          activeFollowersCount: 12,
          recentNet30d: 4,
          totalFollowAdds: 40,
        },
      ],
      meta: {
        source: 'dynamic',
      },
    });
    const deferred = createDeferred<Awaited<ReturnType<typeof fetchDiscoveryPlayers>>>();
    mockedFetchDiscoveryPlayers.mockImplementationOnce(() => deferred.promise);

    const { result, rerender } = renderHook(
      ({ tab }: { tab: 'teams' | 'players' }) =>
        useFollowsDiscovery({ tab, limit: 2 }),
      {
        initialProps: { tab: 'teams' as const },
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({
        items: [
          {
            teamId: '50',
            teamName: 'Manchester City',
            teamLogo: 'city.png',
            country: 'England',
            activeFollowersCount: 12,
            recentNet30d: 4,
            totalFollowAdds: 40,
          },
        ],
        meta: {
          source: 'dynamic',
        },
      });
    });

    act(() => {
      rerender({ tab: 'players' });
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        items: [
          {
            playerId: '278',
            playerName: 'Kylian Mbappe',
            playerPhoto: '',
            position: 'Attacker',
            teamName: 'Real Madrid',
            teamLogo: 'https://media.api-sports.io/football/teams/541.png',
            leagueName: 'La Liga',
            activeFollowersCount: 0,
            recentNet30d: 0,
            totalFollowAdds: 0,
          },
          {
            playerId: '154',
            playerName: 'Cristiano Ronaldo',
            playerPhoto: '',
            position: 'Attacker',
            teamName: 'Al-Nassr',
            teamLogo: 'https://media.api-sports.io/football/teams/541.png',
            leagueName: 'Saudi Pro League',
            activeFollowersCount: 0,
            recentNet30d: 0,
            totalFollowAdds: 0,
          },
        ],
        meta: {
          source: 'static_seed',
        },
      });
    });
  });
});
