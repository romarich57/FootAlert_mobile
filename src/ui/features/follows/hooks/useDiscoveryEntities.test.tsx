import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { fetchDiscoveryPlayers } from '@data/endpoints/followsApi';
import { useDiscoveryEntities } from '@ui/features/follows/hooks/useDiscoveryEntities';

jest.mock('@data/endpoints/followsApi', () => ({
  fetchDiscoveryTeams: jest.fn(async () => ({
    items: [],
    meta: {
      source: 'dynamic',
      complete: true,
      seedCount: 0,
      generatedAt: '2026-03-07T00:00:00.000Z',
      refreshAfterMs: null,
    },
  })),
  fetchDiscoveryPlayers: jest.fn(async () => ({
    items: [],
    meta: {
      source: 'dynamic',
      complete: true,
      seedCount: 0,
      generatedAt: '2026-03-07T00:00:00.000Z',
      refreshAfterMs: null,
    },
  })),
}));

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

describe('useDiscoveryEntities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps static player seeds visible and suppresses the empty/error state when the first fetch fails', async () => {
    mockedFetchDiscoveryPlayers.mockRejectedValueOnce(new Error('network failed'));

    const { result } = renderHook(
      () =>
        useDiscoveryEntities({
          tab: 'players',
          surface: 'follows',
          limit: 2,
        }),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.resolvedItems).toHaveLength(2);
    });

    expect(result.current.resolvedItems[0]).toMatchObject({
      playerId: '278',
      playerName: 'Kylian Mbappe',
      playerPhoto: 'https://media.api-sports.io/football/players/278.png',
    });
    expect(result.current.meta).toMatchObject({
      source: 'static_seed',
      complete: false,
      seedCount: 2,
      refreshAfterMs: 1500,
    });
    expect(result.current.meta.generatedAt).toEqual(expect.any(String));
    expect(result.current.isError).toBe(false);
    expect(result.current.hasRemoteData).toBe(false);
  });

  it('keeps the last good player discovery snapshot during a failing refetch', async () => {
    mockedFetchDiscoveryPlayers
      .mockResolvedValueOnce({
        items: [
          {
            playerId: '9999',
            playerName: 'Dynamic Player',
            playerPhoto: 'dynamic.png',
            position: 'Attacker',
            teamName: 'Dynamic FC',
            teamLogo: 'dynamic-team.png',
            leagueName: 'Dynamic League',
            activeFollowersCount: 4,
            recentNet30d: 2,
            totalFollowAdds: 7,
          },
        ],
        meta: {
          source: 'dynamic',
          complete: true,
          seedCount: 0,
          generatedAt: '2026-03-07T00:00:00.000Z',
          refreshAfterMs: null,
        },
      })
      .mockRejectedValueOnce(new Error('refresh failed'));

    const { result } = renderHook(
      () =>
        useDiscoveryEntities({
          tab: 'players',
          surface: 'follows',
          limit: 2,
        }),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.resolvedItems).toEqual([
        {
          playerId: '9999',
          playerName: 'Dynamic Player',
          playerPhoto: 'dynamic.png',
          position: 'Attacker',
          teamName: 'Dynamic FC',
          teamLogo: 'dynamic-team.png',
          leagueName: 'Dynamic League',
          activeFollowersCount: 4,
          recentNet30d: 2,
          totalFollowAdds: 7,
        },
      ]);
    });

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.resolvedItems).toEqual([
        {
          playerId: '9999',
          playerName: 'Dynamic Player',
          playerPhoto: 'dynamic.png',
          position: 'Attacker',
          teamName: 'Dynamic FC',
          teamLogo: 'dynamic-team.png',
          leagueName: 'Dynamic League',
          activeFollowersCount: 4,
          recentNet30d: 2,
          totalFollowAdds: 7,
        },
      ]);
    });

    expect(result.current.isError).toBe(false);
    expect(result.current.meta).toMatchObject({
      source: 'dynamic',
      complete: true,
      seedCount: 0,
      refreshAfterMs: null,
    });
  });

  it('schedules a short refetch when the remote response is still incomplete', async () => {
    jest.useFakeTimers();
    mockedFetchDiscoveryPlayers
      .mockResolvedValueOnce({
        items: [
          {
            playerId: '278',
            playerName: 'Kylian Mbappe',
            playerPhoto: 'seed-remote.png',
            position: 'Attacker',
            teamName: 'Real Madrid',
            teamLogo: 'realmadrid.png',
            leagueName: 'La Liga',
            activeFollowersCount: 0,
            recentNet30d: 0,
            totalFollowAdds: 0,
          },
        ],
        meta: {
          source: 'static_seed',
          complete: false,
          seedCount: 1,
          generatedAt: '2026-03-07T00:00:00.000Z',
          refreshAfterMs: 1500,
        },
      })
      .mockResolvedValueOnce({
        items: [
          {
            playerId: '9999',
            playerName: 'Dynamic Player',
            playerPhoto: 'dynamic.png',
            position: 'Attacker',
            teamName: 'Dynamic FC',
            teamLogo: 'dynamic-team.png',
            leagueName: 'Dynamic League',
            activeFollowersCount: 4,
            recentNet30d: 2,
            totalFollowAdds: 7,
          },
        ],
        meta: {
          source: 'dynamic',
          complete: true,
          seedCount: 0,
          generatedAt: '2026-03-07T00:00:01.500Z',
          refreshAfterMs: null,
        },
      });

    const { result } = renderHook(
      () =>
        useDiscoveryEntities({
          tab: 'players',
          surface: 'follows',
          limit: 2,
        }),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.meta).toMatchObject({
        source: 'static_seed',
        complete: false,
        seedCount: 1,
        refreshAfterMs: 1500,
      });
    });

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    await waitFor(() => {
      expect(mockedFetchDiscoveryPlayers).toHaveBeenCalledTimes(2);
      expect(result.current.resolvedItems).toEqual([
        {
          playerId: '9999',
          playerName: 'Dynamic Player',
          playerPhoto: 'dynamic.png',
          position: 'Attacker',
          teamName: 'Dynamic FC',
          teamLogo: 'dynamic-team.png',
          leagueName: 'Dynamic League',
          activeFollowersCount: 4,
          recentNet30d: 2,
          totalFollowAdds: 7,
        },
      ]);
    });
  });
});
