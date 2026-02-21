import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { FollowsSearchScreen } from '@ui/features/follows/screens/FollowsSearchScreen';
import { useFollowsActions } from '@ui/features/follows/hooks/useFollowsActions';
import { useFollowsSearch } from '@ui/features/follows/hooks/useFollowsSearch';
import i18n from '@ui/shared/i18n';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(),
    useRoute: jest.fn(),
  };
});

jest.mock('@ui/features/follows/hooks/useFollowsActions');
jest.mock('@ui/features/follows/hooks/useFollowsSearch');
jest.mock('@ui/app/providers/ThemeProvider', () => ({
  useAppTheme: () => ({
    colors: {
      background: '#000',
      surface: '#111',
      surfaceElevated: '#222',
      border: '#333',
      text: '#fff',
      textMuted: '#aaa',
      primary: '#14E15C',
      primaryContrast: '#000',
      success: '#14E15C',
      warning: '#F59E0B',
      danger: '#F87171',
      overlay: 'rgba(0,0,0,0.7)',
      skeleton: '#444',
      cardBackground: '#111',
      cardBorder: '#333',
      chipBackground: '#222',
      chipBorder: '#444',
      adGradientStart: '#111',
      adGradientEnd: '#000',
    },
  }),
}));

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseRoute = jest.mocked(useRoute);
const mockedUseFollowsActions = jest.mocked(useFollowsActions);
const mockedUseFollowsSearch = jest.mocked(useFollowsSearch);

const goBackMock = jest.fn();
const navigateMock = jest.fn();
const toggleTeamFollowMock = jest.fn(async () => ({ ids: [], changed: true }));

function renderScreen() {
  return render(<FollowsSearchScreen />);
}

describe('FollowsSearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseNavigation.mockReturnValue({
      goBack: goBackMock,
      navigate: navigateMock,
    } as never);

    mockedUseRoute.mockReturnValue({
      key: 'FollowsSearch-key',
      name: 'FollowsSearch',
      params: {
        initialTab: 'teams',
      },
    } as never);

    mockedUseFollowsActions.mockReturnValue({
      followedTeamIds: [],
      followedPlayerIds: [],
      toggleTeamFollow: toggleTeamFollowMock,
      togglePlayerFollow: jest.fn(async () => ({ ids: [], changed: true })),
    } as never);

    mockedUseFollowsSearch.mockReturnValue({
      hasEnoughChars: true,
      isLoading: false,
      results: [
        {
          teamId: '529',
          teamName: 'Barcelona',
          teamLogo: 'barca.png',
          country: 'Spain',
        },
      ],
    } as never);
  });

  it('renders search title and rows', () => {
    renderScreen();

    expect(screen.getByText(i18n.t('follows.search.title'))).toBeTruthy();
    expect(screen.getByText('Barcelona')).toBeTruthy();
  });

  it('goes back when pressing back button', () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText(i18n.t('follows.search.back')));
    expect(goBackMock).toHaveBeenCalled();
  });

  it('toggles follow from search result row', () => {
    renderScreen();

    fireEvent.press(screen.getByText(i18n.t('follows.actions.follow')));
    expect(toggleTeamFollowMock).toHaveBeenCalledWith('529');
  });

  it('opens team details when pressing a team row', () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText('Barcelona'));
    expect(navigateMock).toHaveBeenCalledWith('TeamDetails', { teamId: '529' });
  });

  it('opens player details when pressing a player row', () => {
    mockedUseRoute.mockReturnValueOnce({
      key: 'FollowsSearch-key',
      name: 'FollowsSearch',
      params: {
        initialTab: 'players',
      },
    } as never);

    mockedUseFollowsSearch.mockReturnValueOnce({
      hasEnoughChars: true,
      isLoading: false,
      results: [
        {
          playerId: '278',
          playerName: 'Kylian Mbappé',
          playerPhoto: 'mbappe.png',
          position: 'FW',
          teamName: 'PSG',
          teamLogo: 'psg.png',
          leagueName: 'Ligue 1',
        },
      ],
    } as never);

    renderScreen();

    fireEvent.press(screen.getByLabelText('Kylian Mbappé'));
    expect(navigateMock).toHaveBeenCalledWith('PlayerDetails', { playerId: '278' });
  });
});
