import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { CompetitionDetailsScreen } from '@ui/features/competitions/screens/CompetitionDetailsScreen';
import { useCompetitionSeasons } from '@ui/features/competitions/hooks/useCompetitionSeasons';
import { useCompetitionTotw } from '@ui/features/competitions/hooks/useCompetitionTotw';
import { useCompetitionBracket } from '@ui/features/competitions/hooks/useCompetitionBracket';
import { useFollowedCompetitions } from '@ui/features/competitions/hooks/useFollowedCompetitions';
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

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: jest.fn(),
  };
});

jest.mock('@ui/features/competitions/hooks/useFollowedCompetitions');
jest.mock('@ui/features/competitions/hooks/useCompetitionSeasons');
jest.mock('@ui/features/competitions/hooks/useCompetitionTotw');
jest.mock('@ui/features/competitions/hooks/useCompetitionBracket');

jest.mock('@ui/features/competitions/components/CompetitionStandingsTab', () => {
  const ReactLib = require('react');
  const { Text } = require('react-native');
  return { CompetitionStandingsTab: () => ReactLib.createElement(Text, null, 'standings-content') };
});
jest.mock('@ui/features/competitions/components/CompetitionMatchesTab', () => {
  const ReactLib = require('react');
  const { Text } = require('react-native');
  return { CompetitionMatchesTab: () => ReactLib.createElement(Text, null, 'matches-content') };
});
jest.mock('@ui/features/competitions/components/CompetitionPlayerStatsTab', () => {
  const ReactLib = require('react');
  const { Text } = require('react-native');
  return { CompetitionPlayerStatsTab: () => ReactLib.createElement(Text, null, 'players-content') };
});
jest.mock('@ui/features/competitions/components/CompetitionTeamStatsTab', () => {
  const ReactLib = require('react');
  const { Text } = require('react-native');
  return { CompetitionTeamStatsTab: () => ReactLib.createElement(Text, null, 'teams-content') };
});
jest.mock('@ui/features/competitions/components/CompetitionTransfersTab', () => {
  const ReactLib = require('react');
  const { Text } = require('react-native');
  return { CompetitionTransfersTab: () => ReactLib.createElement(Text, null, 'transfers-content') };
});
jest.mock('@ui/features/competitions/components/CompetitionTotwTab', () => {
  const ReactLib = require('react');
  const { Text } = require('react-native');
  return { CompetitionTotwTab: () => ReactLib.createElement(Text, null, 'totw-content') };
});

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseRoute = jest.mocked(useRoute);
const mockedUseQuery = jest.mocked(useQuery);
const mockedUseFollowedCompetitions = jest.mocked(useFollowedCompetitions);
const mockedUseCompetitionSeasons = jest.mocked(useCompetitionSeasons);
const mockedUseCompetitionTotw = jest.mocked(useCompetitionTotw);
const mockedUseCompetitionBracket = jest.mocked(useCompetitionBracket);

const goBackMock = jest.fn();

const completeTotw = {
  formation: '4-3-3',
  season: 2025,
  averageRating: 8.1,
  players: Array.from({ length: 11 }, (_, index) => ({
    playerId: index + 1,
    playerName: `Player ${index + 1}`,
    playerPhoto: '',
    teamId: index + 100,
    teamName: `Team ${index + 1}`,
    teamLogo: '',
    position: 'ST',
    role: index === 10 ? 'GK' : index < 4 ? 'DEF' : index < 7 ? 'MID' : 'ATT',
    rating: 8.1,
    gridX: 10 + index,
    gridY: 10 + index,
  })),
};

function renderScreen() {
  return renderWithAppProviders(<CompetitionDetailsScreen />);
}

describe('CompetitionDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseNavigation.mockReturnValue({ goBack: goBackMock } as never);
    mockedUseRoute.mockReturnValue({
      key: 'CompetitionDetails-key',
      name: 'CompetitionDetails',
      params: {
        competitionId: '61',
        competition: {
          id: '61',
          name: 'Ligue 1',
          logo: '',
          type: 'League',
          countryName: 'France',
        },
      },
    } as never);
    mockedUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
    } as never);
    mockedUseFollowedCompetitions.mockReturnValue({
      followedIds: [],
      toggleFollow: jest.fn(),
    } as never);
    mockedUseCompetitionSeasons.mockReturnValue({
      data: [
        { year: 2025, current: true },
        { year: 2024, current: false },
      ],
      isLoading: false,
    } as never);
    mockedUseCompetitionTotw.mockReturnValue({
      data: null,
    } as never);
    mockedUseCompetitionBracket.mockReturnValue({
      data: { competitionKind: 'league', bracket: null },
    } as never);
  });

  it('does not render seasons tab', () => {
    renderScreen();

    expect(screen.queryByText(i18n.t('competitionDetails.tabs.seasons'))).toBeNull();
  });

  it('opens season modal from header and updates selected season', async () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('competition-season-trigger'));
    expect(screen.getByTestId('competition-season-option-2024')).toBeTruthy();

    fireEvent.press(screen.getByTestId('competition-season-option-2024'));

    await waitFor(() => {
      expect(screen.getByText('Saison 2024/2025')).toBeTruthy();
    });
  });

  it('shows TOTW tab for league competitions without eager loading the data', () => {
    renderScreen();

    expect(screen.getByText(i18n.t('competitionDetails.tabs.totw'))).toBeTruthy();
    expect(mockedUseCompetitionTotw).not.toHaveBeenCalled();
  });

  it('loads TOTW only when the user opens the tab', async () => {
    mockedUseCompetitionTotw.mockReturnValue({
      data: completeTotw,
    } as never);

    renderScreen();

    expect(mockedUseCompetitionTotw).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText(i18n.t('competitionDetails.tabs.totw')));

    await waitFor(() => {
      expect(mockedUseCompetitionTotw).toHaveBeenLastCalledWith(61, 2025);
      expect(screen.getByText('totw-content')).toBeTruthy();
    });
  });

  it('keeps visited tabs mounted when switching back and forth', async () => {
    renderScreen();

    fireEvent.press(screen.getByText(i18n.t('competitionDetails.tabs.matches')));
    await waitFor(() => {
      expect(screen.getByText('matches-content')).toBeTruthy();
    });

    fireEvent.press(screen.getByText(i18n.t('competitionDetails.tabs.standings')));

    await waitFor(() => {
      expect(screen.getByText('standings-content')).toBeTruthy();
    });
    expect(screen.getByText('matches-content', { includeHiddenElements: true })).toBeTruthy();
  });

  it('renames standings tab to bracket and hides team stats for cup-only competitions', () => {
    mockedUseCompetitionBracket.mockReturnValue({
      data: {
        competitionKind: 'cup',
        bracket: [{ name: 'Final', order: 10, matches: [] }],
      },
    } as never);

    renderScreen();

    expect(screen.getByText(i18n.t('competitionDetails.tabs.bracket'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('competitionDetails.tabs.standings'))).toBeNull();
    expect(screen.queryByText(i18n.t('competitionDetails.tabs.teamStats'))).toBeNull();
  });
});
