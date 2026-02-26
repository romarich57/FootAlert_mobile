import { renderHook } from '@testing-library/react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { usePowerState } from 'react-native-device-info';

import { useFollowedTeamIdsQuery } from '@ui/features/follows/hooks/useFollowedTeamIdsQuery';
import { useMatchesQuery } from '@ui/features/matches/hooks/useMatchesQuery';
import { useMatchesRefresh } from '@ui/features/matches/hooks/useMatchesRefresh';
import { useMatchesScreenModel } from '@ui/features/matches/hooks/useMatchesScreenModel';

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

jest.mock('@ui/features/matches/hooks/useMatchesRefresh', () => ({
  useMatchesRefresh: jest.fn(),
}));

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseIsFocused = jest.mocked(useIsFocused);
const mockedUseNetInfo = jest.mocked(useNetInfo);
const mockedUsePowerState = jest.mocked(usePowerState);
const mockedUseMatchesQuery = jest.mocked(useMatchesQuery);
const mockedUseFollowedTeamIdsQuery = jest.mocked(useFollowedTeamIdsQuery);
const mockedUseMatchesRefresh = jest.mocked(useMatchesRefresh);

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

    renderHook(() => useMatchesScreenModel());

    expect(mockedUseMatchesRefresh).toHaveBeenCalledWith(
      expect.objectContaining({
        batteryLiteMode: true,
      }),
    );
  });

  it('passes batteryLiteMode=false to refresh hook when low power mode is disabled', () => {
    mockedUsePowerState.mockReturnValue({
      lowPowerMode: false,
    } as ReturnType<typeof usePowerState>);

    renderHook(() => useMatchesScreenModel());

    expect(mockedUseMatchesRefresh).toHaveBeenCalledWith(
      expect.objectContaining({
        batteryLiteMode: false,
      }),
    );
  });
});
