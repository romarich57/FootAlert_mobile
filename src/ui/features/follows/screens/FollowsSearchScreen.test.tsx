import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AppThemeProvider } from '@ui/app/providers/ThemeProvider';
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

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseRoute = jest.mocked(useRoute);
const mockedUseFollowsActions = jest.mocked(useFollowsActions);
const mockedUseFollowsSearch = jest.mocked(useFollowsSearch);

const goBackMock = jest.fn();
const toggleTeamFollowMock = jest.fn(async () => ({ ids: [], changed: true }));

function renderScreen() {
  return render(
    <AppThemeProvider>
      <FollowsSearchScreen />
    </AppThemeProvider>,
  );
}

describe('FollowsSearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseNavigation.mockReturnValue({
      goBack: goBackMock,
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
});
