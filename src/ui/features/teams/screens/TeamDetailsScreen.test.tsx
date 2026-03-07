import React from 'react';
import { QueryClient } from '@tanstack/react-query';
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
    useFocusEffect: jest.fn(),
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

const navigateMock = jest.fn();
const pushMock = jest.fn();
const goBackMock = jest.fn();
let prefetchQuerySpy: jest.SpyInstance;

function renderScreen() {
  return renderWithAppProviders(<TeamDetailsScreen />);
}

describe('TeamDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prefetchQuerySpy = jest
      .spyOn(QueryClient.prototype, 'prefetchQuery')
      .mockResolvedValue(undefined);

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
          leagueLogo: 'https://example.com/laliga.png',
          type: 'League',
          country: 'Spain',
          seasons: [2025, 2024],
          currentSeason: 2025,
        },
      ],
      selectedLeagueId: '140',
      selectedSeason: 2025,
      seasonsForSelectedLeague: [2025, 2024],
      setLeague: jest.fn(),
      setLeagueSeason: jest.fn(),
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
        seasonStats: {
          rank: 2,
          points: 58,
          played: 24,
          goalDiff: 39,
          wins: 18,
          draws: 4,
          losses: 2,
          scored: 64,
          conceded: 25,
        },
        seasonLineup: {
          formation: '4-3-3',
          estimated: true,
          goalkeeper: null,
          defenders: [],
          midfielders: [],
          attackers: [],
        },
        miniStanding: null,
        standingHistory: [],
        coachPerformance: null,
        playerLeaders: {
          ratings: [],
          scorers: [],
          assisters: [],
        },
        trophiesCount: 12,
        trophyWinsCount: 9,
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      isFetched: true,
      isFetchedAfterMount: true,
      refetch: jest.fn(async () => undefined),
    } as never);

    mockedUseTeamMatches.mockReturnValue({
      data: {
        all: [
          {
            fixtureId: '123456',
            leagueId: '140',
            leagueName: 'LaLiga',
            leagueLogo: null,
            date: '2026-02-01T20:00:00Z',
            round: 'Regular Season - 24',
            venue: null,
            status: 'upcoming',
            statusLabel: 'Not Started',
            minute: null,
            homeTeamId: '529',
            homeTeamName: 'Barcelona',
            homeTeamLogo: null,
            awayTeamId: '541',
            awayTeamName: 'Real Madrid',
            awayTeamLogo: null,
            homeGoals: null,
            awayGoals: null,
          },
        ],
        upcoming: [
          {
            fixtureId: '123456',
            leagueId: '140',
            leagueName: 'LaLiga',
            leagueLogo: null,
            date: '2026-02-01T20:00:00Z',
            round: 'Regular Season - 24',
            venue: null,
            status: 'upcoming',
            statusLabel: 'Not Started',
            minute: null,
            homeTeamId: '529',
            homeTeamName: 'Barcelona',
            homeTeamLogo: null,
            awayTeamId: '541',
            awayTeamName: 'Real Madrid',
            awayTeamLogo: null,
            homeGoals: null,
            awayGoals: null,
          },
        ],
        live: [],
        past: [],
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      isFetched: true,
      isFetchedAfterMount: true,
      refetch: jest.fn(async () => undefined),
    } as never);

    mockedUseTeamStandings.mockReturnValue({
      data: {
        groups: [
          {
            groupName: null,
            rows: [
              {
                rank: 2,
                teamId: '529',
                teamName: 'Barcelona',
                teamLogo: null,
                played: 24,
                goalDiff: 39,
                points: 58,
                isTargetTeam: true,
                form: 'WWDWW',
                update: null,
                all: { played: 24, win: 18, draw: 4, lose: 2, goalsFor: 64, goalsAgainst: 25 },
                home: { played: 12, win: 10, draw: 1, lose: 1, goalsFor: 35, goalsAgainst: 10 },
                away: { played: 12, win: 8, draw: 3, lose: 1, goalsFor: 29, goalsAgainst: 15 },
              },
            ],
          },
        ],
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      isFetched: true,
      isFetchedAfterMount: true,
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
        pointsByVenue: {
          home: null,
          away: null,
        },
        goalsForPerMatch: 2.7,
        goalsAgainstPerMatch: 1,
        cleanSheets: 8,
        failedToScore: 2,
        topPlayersByCategory: {
          ratings: [],
          scorers: [],
          assisters: [],
        },
        comparisonMetrics: [],
        goalBreakdown: [],
        topPlayers: [],
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      isFetched: true,
      isFetchedAfterMount: true,
      refetch: jest.fn(async () => undefined),
    } as never);

    mockedUseTeamTransfers.mockReturnValue({
      data: {
        arrivals: [
          {
            id: 'arrival-1',
            direction: 'arrival',
            playerId: '100',
            playerName: 'John Doe',
            playerPhoto: null,
            position: 'Midfielder',
            date: '2026-01-15',
            type: 'Transfer',
            amount: null,
            fromTeamId: '10',
            fromTeamName: 'Valencia',
            fromTeamLogo: null,
            toTeamId: '529',
            toTeamName: 'Barcelona',
            toTeamLogo: null,
          },
        ],
        departures: [],
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      isFetched: true,
      isFetchedAfterMount: true,
      refetch: jest.fn(async () => undefined),
    } as never);

    mockedUseTeamSquad.mockReturnValue({
      data: {
        coach: null,
        players: [
          {
            playerId: '200',
            name: 'Jane Player',
            photo: null,
            age: 25,
            number: 8,
            position: 'Midfielder',
            role: 'midfielders',
          },
        ],
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      isFetched: true,
      isFetchedAfterMount: true,
      refetch: jest.fn(async () => undefined),
    } as never);

  });

  afterEach(() => {
    prefetchQuerySpy.mockRestore();
  });

  it('renders team header and tabs', () => {
    renderScreen();

    expect(screen.getAllByText('Barcelona').length).toBeGreaterThan(0);
    expect(screen.getByText(i18n.t('teamDetails.tabs.overview'))).toBeTruthy();
    expect(screen.getByText(i18n.t('teamDetails.tabs.matches'))).toBeTruthy();
    expect(screen.getAllByText(i18n.t('teamDetails.tabs.standings')).length).toBeGreaterThan(0);
    expect(screen.getByText(i18n.t('teamDetails.tabs.stats'))).toBeTruthy();
    expect(screen.getByText(i18n.t('teamDetails.tabs.transfers'))).toBeTruthy();
    expect(screen.getByText(i18n.t('teamDetails.tabs.squad'))).toBeTruthy();
  });

  it('hides tabs whose datasets are fetched and empty', () => {
    mockedUseTeamMatches.mockReturnValue({
      data: { all: [], upcoming: [], live: [], past: [] },
      isLoading: false,
      isError: false,
      isFetching: false,
      isFetched: true,
      isFetchedAfterMount: true,
      refetch: jest.fn(async () => undefined),
    } as never);
    mockedUseTeamStandings.mockReturnValue({
      data: { groups: [] },
      isLoading: false,
      isError: false,
      isFetching: false,
      isFetched: true,
      isFetchedAfterMount: true,
      refetch: jest.fn(async () => undefined),
    } as never);
    mockedUseTeamStats.mockReturnValue({
      data: {
        rank: null,
        points: null,
        played: null,
        wins: null,
        draws: null,
        losses: null,
        goalsFor: null,
        goalsAgainst: null,
        homePlayed: null,
        homeWins: null,
        homeDraws: null,
        homeLosses: null,
        awayPlayed: null,
        awayWins: null,
        awayDraws: null,
        awayLosses: null,
        expectedGoalsFor: null,
        pointsByVenue: { home: null, away: null },
        goalsForPerMatch: null,
        goalsAgainstPerMatch: null,
        cleanSheets: null,
        failedToScore: null,
        topPlayersByCategory: { ratings: [], scorers: [], assisters: [] },
        comparisonMetrics: [],
        goalBreakdown: [],
        topPlayers: [],
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      isFetched: true,
      isFetchedAfterMount: true,
      refetch: jest.fn(async () => undefined),
    } as never);
    mockedUseTeamTransfers.mockReturnValue({
      data: { arrivals: [], departures: [] },
      isLoading: false,
      isError: false,
      isFetching: false,
      isFetched: true,
      isFetchedAfterMount: true,
      refetch: jest.fn(async () => undefined),
    } as never);
    mockedUseTeamSquad.mockReturnValue({
      data: { coach: null, players: [] },
      isLoading: false,
      isError: false,
      isFetching: false,
      isFetched: true,
      isFetchedAfterMount: true,
      refetch: jest.fn(async () => undefined),
    } as never);
    renderScreen();

    expect(screen.getByLabelText(i18n.t('teamDetails.tabs.overview'))).toBeTruthy();
    expect(screen.queryByLabelText(i18n.t('teamDetails.tabs.matches'))).toBeNull();
    expect(screen.queryByLabelText(i18n.t('teamDetails.tabs.standings'))).toBeNull();
    expect(screen.queryByLabelText(i18n.t('teamDetails.tabs.stats'))).toBeNull();
    expect(screen.queryByLabelText(i18n.t('teamDetails.tabs.transfers'))).toBeNull();
    expect(screen.queryByLabelText(i18n.t('teamDetails.tabs.squad'))).toBeNull();
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

  it('shows the dynamic competition-season selector only on league data tabs (not overview)', () => {
    renderScreen();

    expect(screen.queryByTestId('team-competition-season-trigger')).toBeNull();

    fireEvent.press(screen.getByText(i18n.t('teamDetails.tabs.matches')));
    expect(screen.getByTestId('team-competition-season-trigger')).toBeTruthy();

    fireEvent.press(screen.getByText(i18n.t('teamDetails.tabs.stats')));
    expect(screen.getByTestId('team-competition-season-trigger')).toBeTruthy();
  });

  it('keeps season-only selector on standings tab', () => {
    renderScreen();

    fireEvent.press(screen.getAllByText(i18n.t('teamDetails.tabs.standings'))[0]);

    expect(screen.queryByTestId('team-competition-season-trigger')).toBeNull();
    expect(screen.getByTestId('team-season-dropdown-logo')).toBeTruthy();
    expect(screen.getAllByText('2025/2026').length).toBeGreaterThan(0);
  });

  it('keeps season-only selector on transfers tab', () => {
    renderScreen();

    fireEvent.press(screen.getByText(i18n.t('teamDetails.tabs.transfers')));

    expect(screen.queryByTestId('team-competition-season-trigger')).toBeNull();
    expect(screen.getAllByText('2025/2026').length).toBeGreaterThan(0);
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
      setLeagueSeason: jest.fn(),
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
