import React from 'react';
import { screen } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useNetInfo } from '@react-native-community/netinfo';

import { CompetitionsScreen } from '@ui/features/competitions/screens/CompetitionsScreen';
import { useCompetitions } from '@ui/features/competitions/hooks/useCompetitions';
import { useFollowedCompetitions } from '@ui/features/competitions/hooks/useFollowedCompetitions';
import i18n from '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(),
  };
});

jest.mock('@ui/features/competitions/hooks/useCompetitions');
jest.mock('@ui/features/competitions/hooks/useFollowedCompetitions');

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseNetInfo = jest.mocked(useNetInfo);
const mockedUseCompetitions = jest.mocked(useCompetitions);
const mockedUseFollowedCompetitions = jest.mocked(useFollowedCompetitions);

describe('CompetitionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseNavigation.mockReturnValue({
      navigate: jest.fn(),
    } as never);
    mockedUseCompetitions.mockReturnValue({
      countries: [],
      suggestedCompetitions: [],
      searchResults: [],
      isSearching: false,
      isLoading: false,
      lastUpdatedAt: null,
      searchLeagues: jest.fn(),
      refresh: jest.fn(async () => undefined),
    } as never);
    mockedUseFollowedCompetitions.mockReturnValue({
      followedIds: [],
      followedCompetitions: [],
      isLoading: false,
      toggleFollow: jest.fn(async () => ({ ids: [], changed: false })),
      refreshDelay: jest.fn(async () => undefined),
    } as never);
  });

  it('renders offline no-cache state when offline and no cached competitions data', () => {
    mockedUseNetInfo.mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
    } as ReturnType<typeof useNetInfo>);

    renderWithAppProviders(<CompetitionsScreen />);

    expect(screen.getByText(i18n.t('matches.states.offline.title'))).toBeTruthy();
  });
});
