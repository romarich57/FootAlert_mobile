import { renderHook } from '@testing-library/react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { usePowerState } from 'react-native-device-info';

import { usePrefetchOnMount } from '@data/prefetch/usePrefetchOnMount';
import type { PrefetchStrategy } from '@data/prefetch/entityPrefetchOrchestrator';

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(),
}));

jest.mock('react-native-device-info', () => ({
  usePowerState: jest.fn(),
  getVersion: () => '0.0.1',
  getBuildNumber: () => '1',
}));

const mockedUseQueryClient = jest.mocked(useQueryClient);
const mockedUseNetInfo = jest.mocked(useNetInfo);
const mockedUsePowerState = jest.mocked(usePowerState);
let queryClient: {
  prefetchQuery: jest.Mock;
  prefetchInfiniteQuery: jest.Mock;
};

describe('usePrefetchOnMount', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    queryClient = {
      prefetchQuery: jest.fn(async () => undefined),
      prefetchInfiniteQuery: jest.fn(async () => undefined),
    };
    mockedUseQueryClient.mockReturnValue(queryClient as never);
    mockedUseNetInfo.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      details: {
        isConnectionExpensive: false,
      },
    } as ReturnType<typeof useNetInfo>);
    mockedUsePowerState.mockReturnValue({
      lowPowerMode: false,
    } as ReturnType<typeof usePowerState>);
    (globalThis as typeof globalThis & {
      requestIdleCallback?: (callback: () => void) => number;
      cancelIdleCallback?: (handle: number) => void;
    }).requestIdleCallback = callback => {
      const handle = setTimeout(callback, 0) as unknown as number;
      return handle;
    };
    (globalThis as typeof globalThis & {
      cancelIdleCallback?: (handle: number) => void;
    }).cancelIdleCallback = handle => {
      clearTimeout(handle);
    };
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    delete (globalThis as { requestIdleCallback?: unknown }).requestIdleCallback;
    delete (globalThis as { cancelIdleCallback?: unknown }).cancelIdleCallback;
  });

  it('runs immediate strategies eagerly and idle strategies when the device allows it', () => {
    const strategies: PrefetchStrategy[] = [
      {
        kind: 'query',
        queryKey: ['teams', 'details', '529'],
        queryFn: async () => ({ id: '529' }),
        queryOptions: { staleTime: 60_000 },
      },
      {
        kind: 'query',
        queryKey: ['competition_fixtures', 39, 2025],
        queryFn: async () => ({ items: [] }),
        queryOptions: { staleTime: 60_000 },
        priority: 'idle',
      },
    ];

    renderHook(() => usePrefetchOnMount(strategies));

    expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(1);
    jest.runAllTimers();
    expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(2);
  });

  it('skips all prefetch work while offline', () => {
    mockedUseNetInfo.mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
      details: {
        isConnectionExpensive: false,
      },
    } as ReturnType<typeof useNetInfo>);
    queryClient = {
      prefetchQuery: jest.fn(async () => undefined),
      prefetchInfiniteQuery: jest.fn(async () => undefined),
    };
    mockedUseQueryClient.mockReturnValue(queryClient as never);

    renderHook(() =>
      usePrefetchOnMount([
        {
          kind: 'query',
          queryKey: ['match_details', '101', 'Europe/Paris'],
          queryFn: async () => ({ fixture: { id: '101' } }),
          queryOptions: { staleTime: 60_000 },
        },
      ]),
    );

    jest.runAllTimers();
    expect(queryClient.prefetchQuery).not.toHaveBeenCalled();
    expect(queryClient.prefetchInfiniteQuery).not.toHaveBeenCalled();
  });

  it('never runs live-only idle strategies', () => {
    const strategies: PrefetchStrategy[] = [
      {
        kind: 'query',
        queryKey: ['match_details', '101', 'Europe/Paris'],
        queryFn: async () => ({ fixture: { id: '101' } }),
        queryOptions: { staleTime: 60_000 },
      },
      {
        kind: 'query',
        queryKey: ['match_details', '101', 'events'],
        queryFn: async () => [{ time: { elapsed: 12 } }],
        queryOptions: { staleTime: 15_000 },
        priority: 'idle',
      },
    ];

    renderHook(() => usePrefetchOnMount(strategies));

    expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(1);
    jest.runAllTimers();
    expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(1);
  });
});
