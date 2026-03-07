import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { fetchDiscoveryTeams } from '@data/endpoints/followsApi';
import { useOnboardingTrends } from '@ui/features/onboarding/hooks/useOnboardingTrends';

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

jest.mock('@data/endpoints/bffClient', () => ({
  bffGet: jest.fn(async () => ({ competitions: [] })),
}));

const mockedFetchDiscoveryTeams = jest.mocked(fetchDiscoveryTeams);

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

describe('useOnboardingTrends', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns team seeds immediately on first launch before the remote discovery resolves', async () => {
    const deferred = createDeferred<Awaited<ReturnType<typeof fetchDiscoveryTeams>>>();
    mockedFetchDiscoveryTeams.mockImplementationOnce(() => deferred.promise);

    const { result } = renderHook(() => useOnboardingTrends('teams'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([
        {
          id: '529',
          name: 'Barcelona',
          logo: 'https://media.api-sports.io/football/teams/529.png',
          subtitle: 'Spain',
          kind: 'team',
          country: 'Spain',
        },
        {
          id: '541',
          name: 'Real Madrid',
          logo: 'https://media.api-sports.io/football/teams/541.png',
          subtitle: 'Spain',
          kind: 'team',
          country: 'Spain',
        },
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
      ]);
    });

    act(() => {
      deferred.resolve({
        items: [
          {
            teamId: '50',
            teamName: 'Manchester City',
            teamLogo: 'city.png',
            country: 'England',
            activeFollowersCount: 8,
            recentNet30d: 3,
            totalFollowAdds: 21,
          },
        ],
        meta: {
          source: 'dynamic',
        },
      });
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([
        {
          id: '50',
          name: 'Manchester City',
          logo: 'city.png',
          subtitle: 'England',
          kind: 'team',
          country: 'England',
        },
      ]);
    });
  });
});
