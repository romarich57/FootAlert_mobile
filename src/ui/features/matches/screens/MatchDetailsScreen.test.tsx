import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { MatchDetailsScreen } from '@ui/features/matches/screens/MatchDetailsScreen';
import { useMatchDetailsScreenModel } from '@ui/features/matches/details/hooks/useMatchDetailsScreenModel';
import i18n from '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

jest.mock('@ui/features/matches/details/hooks/useMatchDetailsScreenModel', () => ({
  useMatchDetailsScreenModel: jest.fn(),
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
    statusLabel: 'Upcoming',
    kickoffLabel: '26/02 20:00',
    countdownLabel: '2 h',
    isInitialLoading: false,
    isInitialError: false,
    onRetryAll: jest.fn(),
    events: [],
    statistics: [],
    lineups: [],
    h2h: [],
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
    homeTeamId: '1',
    awayTeamId: '2',
    isLiveRefreshing: false,
    ...overrides,
  };
}

describe('MatchDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state while initial fixture query is pending', () => {
    mockedUseMatchDetailsScreenModel.mockReturnValue(
      createModelOverrides({
        fixture: null,
        isInitialLoading: true,
      }) as never,
    );

    renderWithAppProviders(<MatchDetailsScreen />);

    expect(screen.getByText(i18n.t('matchDetails.states.loading'))).toBeTruthy();
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

    fireEvent.press(screen.getByText(i18n.t('actions.retry')));
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
});
