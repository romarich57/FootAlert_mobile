import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';

import { appEnv } from '@data/config/env';
import { searchPlayersByName, searchTeamsByName } from '@data/endpoints/followsApi';
import { useSearchScreenModel } from '@ui/features/search/hooks/useSearchScreenModel';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(),
  };
});

jest.mock('@data/endpoints/followsApi', () => ({
  searchTeamsByName: jest.fn(async () => []),
  searchPlayersByName: jest.fn(async () => []),
}));

const mockedUseNavigation = jest.mocked(useNavigation);
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

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe('useSearchScreenModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockedUseNavigation.mockReturnValue({
      navigate: jest.fn(),
    } as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces query and supports empty results', async () => {
    mockedSearchTeamsByName.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useSearchScreenModel(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setQuery('Barca');
    });

    expect(mockedSearchTeamsByName).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(appEnv.followsSearchDebounceMs + 10);
    });

    await waitFor(() => {
      expect(mockedSearchTeamsByName).toHaveBeenCalledWith('Barca', expect.anything());
    });

    await waitFor(() => {
      expect(result.current.hasEnoughChars).toBe(true);
      expect(result.current.teamResults).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
    });
  });

  it('exposes loading while request is pending', async () => {
    const deferred = createDeferred<Awaited<ReturnType<typeof searchTeamsByName>>>();
    mockedSearchTeamsByName.mockImplementationOnce(() => deferred.promise);

    const { result } = renderHook(() => useSearchScreenModel(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setQuery('Barcelona');
      jest.advanceTimersByTime(appEnv.followsSearchDebounceMs + 10);
    });

    await waitFor(() => {
      expect(mockedSearchTeamsByName).toHaveBeenCalledWith('Barcelona', expect.anything());
      expect(result.current.isLoading).toBe(true);
    });

    act(() => {
      deferred.resolve([
        {
          team: {
            id: 529,
            name: 'Barcelona',
            logo: 'barca.png',
            country: 'Spain',
          },
        },
      ]);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.teamResults).toHaveLength(1);
      expect(result.current.teamResults[0]).toMatchObject({
        teamId: '529',
        teamName: 'Barcelona',
      });
    });
  });

  it('exposes error state when API fails', async () => {
    mockedSearchPlayersByName.mockRejectedValueOnce(new Error('network'));

    const { result } = renderHook(() => useSearchScreenModel(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.handleSelectTab('players');
      result.current.setQuery('Mbappe');
      jest.advanceTimersByTime(appEnv.followsSearchDebounceMs + 10);
    });

    await waitFor(() => {
      expect(mockedSearchPlayersByName).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });
});
