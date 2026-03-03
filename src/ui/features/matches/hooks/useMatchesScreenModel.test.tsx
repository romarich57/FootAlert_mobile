import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePowerState } from 'react-native-device-info';

import { useFollowedTeamIdsQuery } from '@ui/features/follows/hooks/useFollowedTeamIdsQuery';
import { useHiddenCompetitions } from '@ui/features/matches/hooks/useHiddenCompetitions';
import { useMatchesQuery } from '@ui/features/matches/hooks/useMatchesQuery';
import { useMatchesRefresh } from '@ui/features/matches/hooks/useMatchesRefresh';
import { useMatchesScreenModel } from '@ui/features/matches/hooks/useMatchesScreenModel';
import '@ui/shared/i18n';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useIsFocused: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(),
}));

jest.mock('react-native-device-info', () => ({
  usePowerState: jest.fn(),
  getVersion: () => '0.0.1',
  getBuildNumber: () => '1',
}));

jest.mock('@ui/features/matches/hooks/useMatchesQuery', () => ({
  useMatchesQuery: jest.fn(),
}));

jest.mock('@ui/features/follows/hooks/useFollowedTeamIdsQuery', () => ({
  useFollowedTeamIdsQuery: jest.fn(),
}));

jest.mock('@ui/features/matches/hooks/useHiddenCompetitions', () => ({
  useHiddenCompetitions: jest.fn(),
}));

jest.mock('@ui/features/matches/hooks/useMatchesRefresh', () => ({
  useMatchesRefresh: jest.fn(),
}));

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseIsFocused = jest.mocked(useIsFocused);
const mockedUseNetInfo = jest.mocked(useNetInfo);
const mockedUsePowerState = jest.mocked(usePowerState);
const mockedUseMatchesQuery = jest.mocked(useMatchesQuery);
const mockedUseFollowedTeamIdsQuery = jest.mocked(useFollowedTeamIdsQuery);
const mockedUseHiddenCompetitions = jest.mocked(useHiddenCompetitions);
const mockedUseMatchesRefresh = jest.mocked(useMatchesRefresh);

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });
}

describe('useMatchesScreenModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseNavigation.mockReturnValue({
      navigate: jest.fn(),
    } as never);
    mockedUseIsFocused.mockReturnValue(true);
    mockedUseNetInfo.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      details: null,
    } as ReturnType<typeof useNetInfo>);
    mockedUseFollowedTeamIdsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    mockedUseHiddenCompetitions.mockReturnValue({
      hiddenIds: [],
      hideCompetition: jest.fn(async () => undefined),
      unhideCompetition: jest.fn(async () => undefined),
    });
    mockedUseMatchesQuery.mockReturnValue({
      data: {
        sections: [],
        requestDurationMs: 50,
        fetchedAt: '2026-02-26T00:00:00.000Z',
        hasLiveMatches: false,
      },
      isLoading: false,
      isError: false,
      isRefetching: false,
      isSlowNetwork: false,
      refetch: jest.fn(async () => ({ isError: false })),
    } as never);
  });

  it('passes batteryLiteMode=true to refresh hook when low power mode is enabled', () => {
    mockedUsePowerState.mockReturnValue({
      lowPowerMode: true,
    } as ReturnType<typeof usePowerState>);
    const queryClient = createTestQueryClient();

    const { unmount } = renderHook(() => useMatchesScreenModel(), {
      wrapper: createWrapper(queryClient),
    });

    expect(mockedUseMatchesRefresh).toHaveBeenCalledWith(
      expect.objectContaining({
        batteryLiteMode: true,
      }),
    );

    unmount();
    queryClient.clear();
  });

  it('passes batteryLiteMode=false to refresh hook when low power mode is disabled', () => {
    mockedUsePowerState.mockReturnValue({
      lowPowerMode: false,
    } as ReturnType<typeof usePowerState>);
    const queryClient = createTestQueryClient();

    const { unmount } = renderHook(() => useMatchesScreenModel(), {
      wrapper: createWrapper(queryClient),
    });

    expect(mockedUseMatchesRefresh).toHaveBeenCalledWith(
      expect.objectContaining({
        batteryLiteMode: false,
      }),
    );

    unmount();
    queryClient.clear();
  });
});
