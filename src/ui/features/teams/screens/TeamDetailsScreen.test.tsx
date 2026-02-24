import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useNetInfo } from '@react-native-community/netinfo';

import { TeamDetailsScreen } from '@ui/features/teams/screens/TeamDetailsScreen';
import { useFollowsActions } from '@ui/features/follows/hooks/useFollowsActions';
import { useTeamContext } from '@ui/features/teams/hooks/useTeamContext';
import { useTeamMatches } from '@ui/features/teams/hooks/useTeamMatches';
import { useTeamOverview } from '@ui/features/teams/hooks/useTeamOverview';
import { useTeamSquad } from '@ui/features/teams/hooks/useTeamSquad';
import { useTeamStandings } from '@ui/features/teams/hooks/useTeamStandings';
import { useTeamStats } from '@ui/features/teams/hooks/useTeamStats';
import { useTeamTrophies } from '@ui/features/teams/hooks/useTeamTrophies';
import { useTeamTransfers } from '@ui/features/teams/hooks/useTeamTransfers';
import '@ui/shared/i18n';
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

jest.mock('@ui/features/follows/hooks/useFollowsActions');
jest.mock('@ui/features/teams/hooks/useTeamContext');
jest.mock('@ui/features/teams/hooks/useTeamOverview');
jest.mock('@ui/features/teams/hooks/useTeamMatches');
jest.mock('@ui/features/teams/hooks/useTeamStandings');
jest.mock('@ui/features/teams/hooks/useTeamStats');
jest.mock('@ui/features/teams/hooks/useTeamTransfers');
jest.mock('@ui/features/teams/hooks/useTeamSquad');
jest.mock('@ui/features/teams/hooks/useTeamTrophies');

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseRoute = jest.mocked(useRoute);
const mockedUseNetInfo = jest.mocked(useNetInfo);
const mockedUseFollowsActions = jest.mocked(useFollowsActions);
const mockedUseTeamContext = jest.mocked(useTeamContext);
const mockedUseTeamOverview = jest.mocked(useTeamOverview);
const mockedUseTeamMatches = jest.mocked(useTeamMatches);
const mockedUseTeamStandings = jest.mocked(useTeamStandings);
const mockedUseTeamStats = jest.mocked(useTeamStats);
const mockedUseTeamTransfers = jest.mocked(useTeamTransfers);
const mockedUseTeamSquad = jest.mocked(useTeamSquad);
const mockedUseTeamTrophies = jest.mocked(useTeamTrophies);

const navigateMock = jest.fn();
const pushMock = jest.fn();
const goBackMock = jest.fn();

function renderScreen() {
  return renderWithAppProviders(<TeamDetailsScreen />);
}

describe('TeamDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseNavigation.mockReturnValue({
      navigate: navigateMock,
      push: pushMock,
      goBack: goBackMock,
    } as never);
    mockedUseNetInfo.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
    } as ReturnType<typeof useNetInfo>);

    mockedUseRoute.mockReturnValue({
      key: 'TeamDetails-key',
      name: 'TeamDetails',
      params: {
        teamId: '529',
      },
    } as never);

    mockedUseFollowsActions.mockReturnValue({
      followedTeamIds: ['529'],
      toggleTeamFollow: jest.fn(async () => ({ ids: [], changed: true })),
    } as never);

    mockedUseTeamContext.mockReturnValue({
      team: {
        id: '529',
        name: 'Barcelona',
        logo: null,
        country: 'Espagne',
        founded: null,
        venueName: 'Camp Nou',
        venueCity: 'Barcelona',
        venueCapacity: 99354,
        venueImage: null,
      },
      timezone: 'Europe/Paris',
      competitions: [
        {
          leagueId: '140',
          leagueName: 'LaLiga',
          leagueLogo: null,
          country: 'Spain',
          seasons: [2025, 2024],
          currentSeason: 2025,
        },
      ],
      selectedLeagueId: '140',
      selectedSeason: 2025,
      seasonsForSelectedLeague: [2025, 2024],
      setLeague: jest.fn(),
      setSeason: jest.fn(),
      isLoading: false,
      isError: false,
      lastUpdatedAt: 1_771_000_000_000,
      hasCachedData: true,
      refetch: jest.fn(),
    } as never);

    mockedUseTeamOverview.mockReturnValue({
      data: {
        nextMatch: null,
        recentForm: [],
        rank: 2,
        points: 58,
        played: 24,
        goalDiff: 39,
        wins: 18,
        draws: 4,
        losses: 2,
        scored: 64,
        conceded: 25,
        trophiesCount: 12,
        trophyWinsCount: 9,
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(async () => undefined),
    } as never);

    mockedUseTeamMatches.mockReturnValue({
      data: {
        all: [],
        upcoming: [],
        live: [],
        past: [],
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(async () => undefined),
    } as never);

    mockedUseTeamStandings.mockReturnValue({
      data: { groups: [] },
      isLoading: false,
      isError: false,
      refetch: jest.fn(async () => undefined),
    } as never);

    mockedUseTeamStats.mockReturnValue({
      data: {
        rank: 2,
        points: 58,
        played: 24,
        wins: 18,
        draws: 4,
        losses: 2,
        goalsFor: 64,
        goalsAgainst: 25,
        homePlayed: 11,
        homeWins: 11,
        homeDraws: 0,
        homeLosses: 0,
        awayPlayed: 13,
        awayWins: 8,
        awayDraws: 1,
        awayLosses: 4,
        expectedGoalsFor: 61.6,
        goalBreakdown: [],
        topPlayers: [],
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(async () => undefined),
    } as never);

    mockedUseTeamTransfers.mockReturnValue({
      data: { arrivals: [], departures: [] },
      isLoading: false,
      isError: false,
      refetch: jest.fn(async () => undefined),
    } as never);

    mockedUseTeamSquad.mockReturnValue({
      data: { coach: null, players: [] },
      isLoading: false,
      isError: false,
      refetch: jest.fn(async () => undefined),
    } as never);

    mockedUseTeamTrophies.mockReturnValue({
      data: { groups: [], total: 0, totalWins: 0 },
      isLoading: false,
      isError: false,
      refetch: jest.fn(async () => undefined),
    } as never);
  });

  it('renders team header and tabs', () => {
    renderScreen();

    expect(screen.getAllByText('Barcelona').length).toBeGreaterThan(0);
    expect(screen.getByText(i18n.t('teamDetails.tabs.overview'))).toBeTruthy();
    expect(screen.getByText(i18n.t('teamDetails.tabs.matches'))).toBeTruthy();
  });

  it('enables matches query after opening matches tab', () => {
    renderScreen();

    fireEvent.press(screen.getByText(i18n.t('teamDetails.tabs.matches')));

    expect(mockedUseTeamMatches).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: true,
      }),
    );
  });

  it('keeps competition and season picker available on standings tab', () => {
    renderScreen();

    fireEvent.press(screen.getByText(i18n.t('teamDetails.tabs.standings')));

    expect(screen.getByText(i18n.t('teamDetails.filters.competition'))).toBeTruthy();
    expect(screen.getByText(i18n.t('teamDetails.filters.season'))).toBeTruthy();
  });

  it('navigates back when pressing back button', () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText(i18n.t('teamDetails.actions.back')));

    expect(goBackMock).toHaveBeenCalled();
  });

  it('renders offline no-cache state when offline and no cached team data', () => {
    mockedUseNetInfo.mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
    } as ReturnType<typeof useNetInfo>);
    mockedUseTeamContext.mockReturnValue({
      team: {
        id: '529',
        name: null,
        logo: null,
        country: null,
        founded: null,
        venueName: null,
        venueCity: null,
        venueCapacity: null,
        venueImage: null,
      },
      timezone: 'Europe/Paris',
      competitions: [],
      selectedLeagueId: null,
      selectedSeason: null,
      seasonsForSelectedLeague: [],
      setLeague: jest.fn(),
      setSeason: jest.fn(),
      isLoading: false,
      isError: false,
      lastUpdatedAt: null,
      hasCachedData: false,
      refetch: jest.fn(),
    } as never);

    renderScreen();

    expect(screen.getByText(i18n.t('matches.states.offline.title'))).toBeTruthy();
  });
});
