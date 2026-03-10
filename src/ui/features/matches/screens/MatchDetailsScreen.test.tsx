import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { MatchDetailsScreen } from '@ui/features/matches/screens/MatchDetailsScreen';
import { useMatchDetailsScreenModel } from '@ui/features/matches/details/hooks/useMatchDetailsScreenModel';
import i18n from '@ui/shared/i18n';
import { useOfflineUiState } from '@ui/shared/hooks';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useFocusEffect: jest.fn(),
  };
});

jest.mock('@ui/features/matches/details/hooks/useMatchDetailsScreenModel', () => ({
  useMatchDetailsScreenModel: jest.fn(),
}));

jest.mock('@ui/shared/hooks', () => ({
  useOfflineUiState: jest.fn(),
}));

jest.mock('@ui/features/matches/details/components/MatchDetailsHeader', () => ({
  MatchDetailsHeader: () => {
    const ReactModule = require('react');
    const { Text } = require('react-native');
    return ReactModule.createElement(Text, { testID: 'match-details-header' }, 'header');
  },
}));

jest.mock('@ui/features/matches/details/components/MatchDetailsTabs', () => ({
  MatchDetailsTabs: () => {
    const ReactModule = require('react');
    const { Text } = require('react-native');
    return ReactModule.createElement(Text, { testID: 'match-details-tabs' }, 'tabs');
  },
}));

jest.mock('@ui/features/matches/details/components/MatchDetailsTabContent', () => ({
  MatchDetailsTabContent: () => {
    const ReactModule = require('react');
    const { Text } = require('react-native');
    return ReactModule.createElement(Text, { testID: 'match-details-content' }, 'content');
  },
}));

const mockedUseMatchDetailsScreenModel = jest.mocked(useMatchDetailsScreenModel);
const mockedUseOfflineUiState = jest.mocked(useOfflineUiState);

function createModelOverrides(overrides: Record<string, unknown> = {}) {
  return {
    safeMatchId: '101',
    navigation: {
      goBack: jest.fn(),
    },
    activeTab: 'primary',
    setActiveTab: jest.fn(),
    tabs: [{ key: 'primary', label: 'Summary' }],
    fixture: {
      fixture: {
        id: 101,
        date: '2026-02-26T20:00:00.000Z',
        status: {
          short: 'NS',
          long: 'Not started',
          elapsed: null,
        },
        venue: {
          name: 'Stadium',
          city: 'Paris',
        },
      },
      league: {
        id: 61,
        name: 'League',
        country: 'FR',
        logo: '',
      },
      teams: {
        home: {
          id: 1,
          name: 'Home',
          logo: '',
        },
        away: {
          id: 2,
          name: 'Away',
          logo: '',
        },
      },
      goals: {
        home: null,
        away: null,
      },
    },
    lifecycleState: 'pre_match',
    timezone: 'Europe/Paris',
    statusLabel: 'Upcoming',
    kickoffLabel: '26/02 20:00',
    countdownLabel: '2 h',
    isInitialLoading: false,
    isInitialError: false,
    lastUpdatedAt: null,
    onRetryAll: jest.fn(),
    onRefreshLineups: jest.fn(),
    isLineupsRefetching: false,
    queryPolicy: {
      enableEvents: true,
      enableHeadToHead: true,
      enableLineups: true,
      enablePredictions: true,
    },
    queryContext: {
      leagueId: 61,
      season: 2026,
    },
    events: [],
    statistics: [],
    lineups: [],
    lineupTeams: [],
    predictions: null,
    winPercent: {
      home: '40%',
      draw: '30%',
      away: '30%',
    },
    absences: [],
    homePlayersStats: [],
    awayPlayersStats: [],
    standings: null,
    headToHead: [],
    datasetErrors: {},
    datasetErrorReasons: {},
    dataSources: {},
    statsRowsByPeriod: [],
    statsAvailablePeriods: [],
    preMatchTab: 'overview',
    postMatchTab: 'summary',
    homeTeamId: '1',
    awayTeamId: '2',
    isLiveRefreshing: false,
    handlePressMatch: jest.fn(),
    handlePressTeam: jest.fn(),
    handlePressPlayer: jest.fn(),
    handlePressCompetition: jest.fn(),
    ...overrides,
  };
}

describe('MatchDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseOfflineUiState.mockReturnValue({
      isOffline: false,
      showOfflineBanner: false,
      showOfflineNoCache: false,
      lastUpdatedAt: null,
    });
  });

  it('renders loading state while initial fixture query is pending', () => {
    mockedUseMatchDetailsScreenModel.mockReturnValue(
      createModelOverrides({
        fixture: null,
        isInitialLoading: true,
      }) as never,
    );

    renderWithAppProviders(<MatchDetailsScreen />);

    // Le skeleton remplace l'ActivityIndicator + texte de chargement
    expect(screen.getByTestId('match-details-loading')).toBeTruthy();
  });

  it('renders error state and retry action when fixture load fails', () => {
    const onRetryAll = jest.fn();
    mockedUseMatchDetailsScreenModel.mockReturnValue(
      createModelOverrides({
        fixture: null,
        isInitialError: true,
        onRetryAll,
      }) as never,
    );

    renderWithAppProviders(<MatchDetailsScreen />);

    expect(screen.getByTestId('match-details-error')).toBeTruthy();
    fireEvent.press(screen.getByTestId('match-details-retry'));
    expect(onRetryAll).toHaveBeenCalled();
  });

  it('renders shell with header, tabs and tab content when fixture is available', () => {
    mockedUseMatchDetailsScreenModel.mockReturnValue(
      createModelOverrides() as never,
    );

    renderWithAppProviders(<MatchDetailsScreen />);

    expect(screen.getByTestId('match-details-header')).toBeTruthy();
    expect(screen.getByTestId('match-details-tabs')).toBeTruthy();
    expect(screen.getByTestId('match-details-content')).toBeTruthy();
  });

  it('renders offline no-cache state when offline and no fixture data exists', () => {
    mockedUseOfflineUiState.mockReturnValue({
      isOffline: true,
      showOfflineBanner: false,
      showOfflineNoCache: true,
      lastUpdatedAt: null,
    });
    mockedUseMatchDetailsScreenModel.mockReturnValue(
      createModelOverrides({
        fixture: null,
        isInitialError: true,
      }) as never,
    );

    renderWithAppProviders(<MatchDetailsScreen />);

    expect(screen.getByTestId('match-details-offline-no-cache')).toBeTruthy();
    expect(screen.getByText(i18n.t('matches.states.offline.title'))).toBeTruthy();
  });

  it('renders offline banner when cached fixture data is available', () => {
    mockedUseOfflineUiState.mockReturnValue({
      isOffline: true,
      showOfflineBanner: true,
      showOfflineNoCache: false,
      lastUpdatedAt: 1730000000000,
    });
    mockedUseMatchDetailsScreenModel.mockReturnValue(
      createModelOverrides({
        lastUpdatedAt: 1730000000000,
      }) as never,
    );

    renderWithAppProviders(<MatchDetailsScreen />);

    expect(screen.getByText(i18n.t('matches.states.offline.title'))).toBeTruthy();
  });
});
