import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useNetInfo } from '@react-native-community/netinfo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { FollowsScreen } from '@ui/features/follows/screens/FollowsScreen';
import { useFollowedPlayersCards } from '@ui/features/follows/hooks/useFollowedPlayersCards';
import { useFollowedTeamsCards } from '@ui/features/follows/hooks/useFollowedTeamsCards';
import { useFollowsActions } from '@ui/features/follows/hooks/useFollowsActions';
import { useFollowsTrends } from '@ui/features/follows/hooks/useFollowsTrends';
import { fetchPlayerAvailabilitySnapshot } from '@ui/features/players/hooks/usePlayerAvailability';
import { fetchTeamAvailabilitySnapshot } from '@ui/features/teams/hooks/useTeamAvailability';
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
jest.mock('@ui/features/teams/hooks/useTeamAvailability', () => ({
  fetchTeamAvailabilitySnapshot: jest.fn(async () => ({
    entityId: '529',
    state: 'available',
    tabs: [{ key: 'overview', state: 'available' }],
    hasAnyTab: true,
    checkedAt: Date.now(),
  })),
}));
jest.mock('@ui/features/players/hooks/usePlayerAvailability', () => ({
  fetchPlayerAvailabilitySnapshot: jest.fn(async () => ({
    entityId: '278',
    state: 'available',
    tabs: [{ key: 'profil', state: 'available' }],
    hasAnyTab: true,
    checkedAt: Date.now(),
  })),
}));
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
const mockedUseNetInfo = jest.mocked(useNetInfo);
const mockedUseFollowsActions = jest.mocked(useFollowsActions);
const mockedUseFollowedTeamsCards = jest.mocked(useFollowedTeamsCards);
const mockedUseFollowedPlayersCards = jest.mocked(useFollowedPlayersCards);
const mockedUseFollowsTrends = jest.mocked(useFollowsTrends);
const mockedFetchTeamAvailabilitySnapshot = jest.mocked(fetchTeamAvailabilitySnapshot);
const mockedFetchPlayerAvailabilitySnapshot = jest.mocked(fetchPlayerAvailabilitySnapshot);

const navigateMock = jest.fn();

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <FollowsScreen />
    </QueryClientProvider>,
  );
}

describe('FollowsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseNetInfo.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
    } as ReturnType<typeof useNetInfo>);
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
      data: [
        {
          playerId: '278',
          playerName: 'Kylian Mbappé',
          playerPhoto: 'mbappe.png',
          position: 'FW',
          teamId: '85',
          teamName: 'PSG',
          teamLogo: 'psg.png',
          leagueName: 'Ligue 1',
          goals: 21,
          assists: 7,
        },
      ],
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

    mockedFetchTeamAvailabilitySnapshot.mockResolvedValue({
      entityId: '529',
      state: 'available',
      tabs: [{ key: 'overview', state: 'available' }],
      hasAnyTab: true,
      checkedAt: Date.now(),
    } as never);
    mockedFetchPlayerAvailabilitySnapshot.mockResolvedValue({
      entityId: '278',
      state: 'available',
      tabs: [{ key: 'profil', state: 'available' }],
      hasAnyTab: true,
      checkedAt: Date.now(),
    } as never);
  });

  it('renders follows title and trends', () => {
    renderScreen();

    expect(screen.getByText(i18n.t('follows.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('follows.trends.title'))).toBeTruthy();
    expect(screen.getByText('Man City')).toBeTruthy();
  });

  it('renders follows tabs', () => {
    renderScreen();

    expect(screen.getByText(i18n.t('follows.tabs.teams'))).toBeTruthy();
    expect(screen.getByText(i18n.t('follows.tabs.players'))).toBeTruthy();
  });

  it('opens player details when pressing a followed player card', async () => {
    renderScreen();

    fireEvent.press(screen.getByText(i18n.t('follows.tabs.players')));
    await waitFor(() => {
      expect(mockedFetchPlayerAvailabilitySnapshot).toHaveBeenCalled();
      expect(screen.getByLabelText('Kylian Mbappé').props.accessibilityState?.disabled).toBeFalsy();
    });
    fireEvent.press(screen.getByLabelText('Kylian Mbappé'));

    expect(navigateMock).toHaveBeenCalledWith('PlayerDetails', {
      playerId: '278',
    });
  });

  it('opens team details from followed team card', async () => {
    renderScreen();

    await waitFor(() => {
      expect(mockedFetchTeamAvailabilitySnapshot).toHaveBeenCalled();
      expect(screen.getByLabelText('Barcelona').props.accessibilityState?.disabled).toBeFalsy();
    });
    fireEvent.press(screen.getByLabelText('Barcelona'));

    expect(navigateMock).toHaveBeenCalledWith('TeamDetails', { teamId: '529' });
  });

  it('opens team details from team trends row', () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText('Man City'));

    expect(navigateMock).toHaveBeenCalledWith('TeamDetails', { teamId: '50' });
  });

  it('renders offline no-cache state when offline and without trends data', () => {
    mockedUseNetInfo.mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
    } as ReturnType<typeof useNetInfo>);
    mockedUseFollowedTeamsCards.mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    mockedUseFollowedPlayersCards.mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    mockedUseFollowsTrends.mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    renderScreen();

    expect(screen.getByText(i18n.t('matches.states.offline.title'))).toBeTruthy();
  });
});
