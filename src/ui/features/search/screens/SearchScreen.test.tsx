import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';

import { appEnv } from '@data/config/env';
import { searchGlobal } from '@data/endpoints/searchApi';
import { SearchScreen } from '@ui/features/search/screens/SearchScreen';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(),
  };
});

jest.mock('@data/endpoints/searchApi', () => ({
  searchGlobal: jest.fn(async () => ({
    teams: [],
    players: [],
    competitions: [],
    matches: [],
    meta: {
      partial: false,
      degradedSources: [],
    },
  })),
}));

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedSearchGlobal = jest.mocked(searchGlobal);

const navigateMock = jest.fn();

function renderScreen() {
  return renderWithAppProviders(<SearchScreen />);
}

describe('SearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockedUseNavigation.mockReturnValue({
      navigate: navigateMock,
    } as unknown as NavigationProp<ParamListBase>);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('navigates to team details from a team result', async () => {
    mockedSearchGlobal.mockResolvedValueOnce({
      teams: [{ id: '529', name: 'Barcelona', logo: 'barca.png', country: 'Spain' }],
      players: [],
      competitions: [],
      matches: [],
      meta: {
        partial: false,
        degradedSources: [],
      },
    });

    renderScreen();

    fireEvent.changeText(screen.getByTestId('search-screen-input'), 'Barcelona');
    act(() => {
      jest.advanceTimersByTime(appEnv.followsSearchDebounceMs + 10);
    });

    await waitFor(() => {
      expect(screen.getByTestId('search-result-team-529')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('search-result-team-529'));

    expect(navigateMock).toHaveBeenCalledWith('TeamDetails', { teamId: '529' });
  });

  it('navigates to player details from a player result', async () => {
    mockedSearchGlobal.mockResolvedValueOnce({
      teams: [],
      players: [
        {
          id: '154',
          name: 'Cristiano Ronaldo',
          photo: 'cr7.png',
          position: 'Attacker',
          teamName: 'Al-Nassr',
          teamLogo: 'nassr.png',
          leagueName: 'Saudi Pro League',
        },
      ],
      competitions: [],
      matches: [],
      meta: {
        partial: false,
        degradedSources: [],
      },
    });

    renderScreen();

    fireEvent.press(screen.getByTestId('search-screen-tab-players'));
    fireEvent.changeText(screen.getByTestId('search-screen-input'), 'Ronaldo');
    act(() => {
      jest.advanceTimersByTime(appEnv.followsSearchDebounceMs + 10);
    });

    await waitFor(() => {
      expect(screen.getByTestId('search-result-player-154')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('search-result-player-154'));

    expect(navigateMock).toHaveBeenCalledWith('PlayerDetails', { playerId: '154' });
  });
});
