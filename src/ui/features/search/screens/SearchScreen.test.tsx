import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';

import { appEnv } from '@data/config/env';
import {
  fetchDiscoveryPlayers,
  fetchDiscoveryTeams,
  searchPlayersByName,
  searchTeamsByName,
} from '@data/endpoints/followsApi';
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

jest.mock('@data/endpoints/followsApi', () => ({
  fetchDiscoveryPlayers: jest.fn(async () => ({
    items: [],
    meta: {
      source: 'dynamic',
      complete: true,
      seedCount: 0,
      generatedAt: '2026-03-07T00:00:00.000Z',
      refreshAfterMs: null,
    },
  })),
  fetchDiscoveryTeams: jest.fn(async () => ({
    items: [],
    meta: {
      source: 'dynamic',
      complete: true,
      seedCount: 0,
      generatedAt: '2026-03-07T00:00:00.000Z',
      refreshAfterMs: null,
    },
  })),
  searchPlayersByName: jest.fn(async () => []),
  searchTeamsByName: jest.fn(async () => []),
}));

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedSearchGlobal = jest.mocked(searchGlobal);
const mockedFetchDiscoveryPlayers = jest.mocked(fetchDiscoveryPlayers);
const mockedFetchDiscoveryTeams = jest.mocked(fetchDiscoveryTeams);
const mockedSearchPlayersByName = jest.mocked(searchPlayersByName);
const mockedSearchTeamsByName = jest.mocked(searchTeamsByName);

const navigateMock = jest.fn();

function renderScreen() {
  return renderWithAppProviders(<SearchScreen />);
}

describe('SearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockedFetchDiscoveryPlayers.mockResolvedValue({
      items: [],
      meta: {
        source: 'dynamic',
        complete: true,
        seedCount: 0,
        generatedAt: '2026-03-07T00:00:00.000Z',
        refreshAfterMs: null,
      },
    });
    mockedFetchDiscoveryTeams.mockResolvedValue({
      items: [],
      meta: {
        source: 'dynamic',
        complete: true,
        seedCount: 0,
        generatedAt: '2026-03-07T00:00:00.000Z',
        refreshAfterMs: null,
      },
    });
    mockedSearchTeamsByName.mockResolvedValue([]);
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

    expect(navigateMock).toHaveBeenCalledWith('TeamDetails', {
      teamId: '529',
      followSource: 'search_tab',
    });
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
      jest.advanceTimersByTime(260);
    });

    await waitFor(() => {
      expect(screen.getByTestId('search-result-player-154')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('search-result-player-154'));

    expect(navigateMock).toHaveBeenCalledWith('PlayerDetails', {
      playerId: '154',
      followSource: 'search_tab',
    });
  });
});
