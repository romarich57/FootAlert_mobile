import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';

import { appEnv } from '@data/config/env';
import { searchPlayersByName, searchTeamsByName } from '@data/endpoints/followsApi';
import { SearchScreen } from '@ui/features/search/screens/SearchScreen';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(),
  };
});

jest.mock('@data/endpoints/followsApi', () => ({
  searchTeamsByName: jest.fn(async () => []),
  searchPlayersByName: jest.fn(async () => []),
}));

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedSearchTeamsByName = jest.mocked(searchTeamsByName);
const mockedSearchPlayersByName = jest.mocked(searchPlayersByName);

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
    mockedSearchTeamsByName.mockResolvedValueOnce([
      {
        team: {
          id: 529,
          name: 'Barcelona',
          logo: 'barca.png',
          country: 'Spain',
        },
      },
    ]);

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
    mockedSearchPlayersByName.mockResolvedValueOnce([
      {
        player: {
          id: 154,
          name: 'Cristiano Ronaldo',
          photo: 'cr7.png',
        },
        statistics: [
          {
            team: {
              name: 'Al-Nassr',
              logo: 'nassr.png',
            },
            league: {
              name: 'Saudi Pro League',
              season: 2025,
            },
            games: {
              position: 'Attacker',
            },
          },
        ],
      },
    ]);

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
