import React from 'react';
import { screen } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useNetInfo } from '@react-native-community/netinfo';

import { PlayerDetailsScreen } from '@ui/features/players/screens/PlayerDetailsScreen';
import { usePlayerDetailsScreenModel } from '@ui/features/players/hooks/usePlayerDetailsScreenModel';
import i18n from '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(),
    useRoute: jest.fn(),
  };
});

jest.mock('@ui/features/players/hooks/usePlayerDetailsScreenModel');

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseRoute = jest.mocked(useRoute);
const mockedUseNetInfo = jest.mocked(useNetInfo);
const mockedUsePlayerDetailsScreenModel = jest.mocked(usePlayerDetailsScreenModel);

describe('PlayerDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseNavigation.mockReturnValue({
      goBack: jest.fn(),
      navigate: jest.fn(),
    } as never);
    mockedUseRoute.mockReturnValue({
      key: 'PlayerDetails-key',
      name: 'PlayerDetails',
      params: {
        playerId: '278',
      },
    } as never);
    mockedUsePlayerDetailsScreenModel.mockReturnValue({
      selectedSeason: 2025,
      availableSeasons: [2025],
      profile: null,
      characteristics: null,
      basicSeasonStats: null,
      isProfileLoading: false,
      isProfileError: false,
      matches: [],
      isMatchesLoading: false,
      stats: null,
      isStatsLoading: false,
      careerSeasons: [],
      careerTeams: [],
      isCareerLoading: false,
      hasCachedData: false,
      lastUpdatedAt: null,
      setSeason: jest.fn(),
    } as never);
  });

  it('renders offline no-cache state when offline and no cached player data', () => {
    mockedUseNetInfo.mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
    } as ReturnType<typeof useNetInfo>);

    renderWithAppProviders(<PlayerDetailsScreen />);

    expect(screen.getByText(i18n.t('matches.states.offline.title'))).toBeTruthy();
  });
});
