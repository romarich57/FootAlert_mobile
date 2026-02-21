import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';

import { AppThemeProvider } from '@ui/app/providers/ThemeProvider';
import { FollowsScreen } from '@ui/features/follows/screens/FollowsScreen';
import { useFollowedPlayersCards } from '@ui/features/follows/hooks/useFollowedPlayersCards';
import { useFollowedTeamsCards } from '@ui/features/follows/hooks/useFollowedTeamsCards';
import { useFollowsActions } from '@ui/features/follows/hooks/useFollowsActions';
import { useFollowsTrends } from '@ui/features/follows/hooks/useFollowsTrends';
import i18n from '@ui/shared/i18n';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(),
  };
});

jest.mock('@ui/features/follows/hooks/useFollowsActions');
jest.mock('@ui/features/follows/hooks/useFollowedTeamsCards');
jest.mock('@ui/features/follows/hooks/useFollowedPlayersCards');
jest.mock('@ui/features/follows/hooks/useFollowsTrends');

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseFollowsActions = jest.mocked(useFollowsActions);
const mockedUseFollowedTeamsCards = jest.mocked(useFollowedTeamsCards);
const mockedUseFollowedPlayersCards = jest.mocked(useFollowedPlayersCards);
const mockedUseFollowsTrends = jest.mocked(useFollowsTrends);

const navigateMock = jest.fn();

function renderScreen() {
  return render(
    <AppThemeProvider>
      <FollowsScreen />
    </AppThemeProvider>,
  );
}

describe('FollowsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseNavigation.mockReturnValue({
      navigate: navigateMock,
    } as never);

    mockedUseFollowsActions.mockReturnValue({
      followedTeamIds: ['529'],
      followedPlayerIds: [],
      hideTrendsTeams: false,
      hideTrendsPlayers: false,
      isLoading: false,
      lastToggleError: null,
      clearToggleError: jest.fn(),
      toggleTeamFollow: jest.fn(async () => ({ ids: [], changed: true })),
      togglePlayerFollow: jest.fn(async () => ({ ids: [], changed: true })),
      updateHideTrends: jest.fn(async () => undefined),
    });

    mockedUseFollowedTeamsCards.mockReturnValue({
      data: [
        {
          teamId: '529',
          teamName: 'Barcelona',
          teamLogo: 'barca.png',
          nextMatch: {
            fixtureId: '1',
            opponentTeamName: 'Real Madrid',
            opponentTeamLogo: 'rm.png',
            startDate: '2026-03-20T20:00:00+00:00',
          },
        },
      ],
      isLoading: false,
    } as never);

    mockedUseFollowedPlayersCards.mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    mockedUseFollowsTrends.mockReturnValue({
      data: [
        {
          teamId: '50',
          teamName: 'Man City',
          teamLogo: 'city.png',
          leagueName: 'Premier League',
        },
      ],
      isLoading: false,
    } as never);
  });

  it('renders follows title and trends', () => {
    renderScreen();

    expect(screen.getByText(i18n.t('follows.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('follows.trends.title'))).toBeTruthy();
    expect(screen.getByText('Man City')).toBeTruthy();
  });

  it('opens follows search when pressing search button', () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText(i18n.t('follows.search.openSearch')));

    expect(navigateMock).toHaveBeenCalledWith('FollowsSearch', {
      initialTab: 'teams',
    });
  });
});
