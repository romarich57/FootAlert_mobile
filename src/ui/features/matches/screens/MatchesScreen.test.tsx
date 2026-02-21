import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import {
  useIsFocused,
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';

import { AppThemeProvider } from '@ui/app/providers/ThemeProvider';
import { MatchesScreen } from '@ui/features/matches/screens/MatchesScreen';
import { useMatchesOfflineCache } from '@ui/features/matches/hooks/useMatchesOfflineCache';
import { useMatchesQuery } from '@ui/features/matches/hooks/useMatchesQuery';
import { appEnv } from '@data/config/env';
import i18n from '@ui/shared/i18n';

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(),
    useIsFocused: jest.fn(),
  };
});

jest.mock('@ui/features/matches/hooks/useMatchesQuery');
jest.mock('@ui/features/matches/hooks/useMatchesOfflineCache');
jest.mock('@ui/features/matches/hooks/useMatchesRefresh', () => ({
  useMatchesRefresh: jest.fn(),
}));
jest.mock('@data/storage/asyncStorage', () => ({
  getJsonValue: jest.fn(() => new Promise(() => {})),
  setJsonValue: jest.fn(async () => undefined),
  removeValue: jest.fn(async () => undefined),
}));
jest.mock('@data/storage/matchPreferencesStorage', () => ({
  DEFAULT_MATCH_NOTIFICATION_PREFS: {
    goal: true,
    redCard: true,
    start: true,
    end: true,
  },
  loadMatchNotificationPrefs: jest.fn(async () => ({
    goal: true,
    redCard: true,
    start: true,
    end: true,
  })),
  saveMatchNotificationPrefs: jest.fn(async () => undefined),
}));

const mockedUseMatchesQuery = jest.mocked(useMatchesQuery);
const mockedUseMatchesOfflineCache = jest.mocked(useMatchesOfflineCache);
const mockedUseNetInfo = jest.mocked(useNetInfo);
const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseIsFocused = jest.mocked(useIsFocused);

const navigateMock = jest.fn();
const refetchMock = jest.fn(async () => ({ isError: false }));
const saveCacheMock = jest.fn(async () => undefined);

const sectionFixture = {
  id: '61',
  name: 'Ligue 1',
  isTopCompetition: true,
  logo: '',
  country: 'France',
  matches: [
    {
      fixtureId: '10',
      competitionId: '61',
      competitionName: 'Ligue 1',
      competitionLogo: '',
      competitionCountry: 'France',
      startDate: '2026-02-19T20:00:00+00:00',
      minute: 74,
      venue: 'Stade Velodrome',
      status: 'live' as const,
      statusLabel: "74'",
      homeTeamId: '85',
      homeTeamName: 'Paris SG',
      homeTeamLogo: 'https://example.com/psg.png',
      awayTeamId: '81',
      awayTeamName: 'Marseille',
      awayTeamLogo: 'https://example.com/om.png',
      homeGoals: 2,
      awayGoals: 1,
      hasBroadcast: false,
    },
  ],
};

const nonTopSectionFixture = {
  id: '999',
  name: 'Zeta League',
  isTopCompetition: false,
  logo: '',
  country: 'Country',
  matches: [
    {
      fixtureId: '11',
      competitionId: '999',
      competitionName: 'Zeta League',
      competitionLogo: '',
      competitionCountry: 'Country',
      startDate: '2026-02-19T21:00:00+00:00',
      minute: null,
      venue: 'Arena',
      status: 'upcoming' as const,
      statusLabel: 'A venir',
      homeTeamId: '1',
      homeTeamName: 'Club A',
      homeTeamLogo: 'https://example.com/a.png',
      awayTeamId: '2',
      awayTeamName: 'Club B',
      awayTeamLogo: 'https://example.com/b.png',
      homeGoals: null,
      awayGoals: null,
      hasBroadcast: false,
    },
  ],
};

function renderScreen() {
  return render(
    <AppThemeProvider>
      <MatchesScreen />
    </AppThemeProvider>,
  );
}

describe('MatchesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appEnv.apiFootballKey = 'test_key';
    appEnv.matchesDemoMode = false;
    mockedUseNavigation.mockReturnValue({
      navigate: navigateMock,
    } as unknown as NavigationProp<ParamListBase>);
    mockedUseIsFocused.mockReturnValue(true);
    mockedUseNetInfo.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
    } as ReturnType<typeof useNetInfo>);
    mockedUseMatchesOfflineCache.mockReturnValue({
      cacheKey: 'matches_cache',
      cachedPayload: null,
      isLoadingCache: false,
      lastUpdatedAt: null,
      saveCache: saveCacheMock,
    });
    mockedUseMatchesQuery.mockReturnValue({
      data: {
        sections: [sectionFixture],
        requestDurationMs: 320,
        fetchedAt: '2026-02-19T20:00:00.000Z',
        hasLiveMatches: true,
      },
      isLoading: false,
      isError: false,
      isRefetching: false,
      isSlowNetwork: false,
      refetch: refetchMock,
    } as unknown as ReturnType<typeof useMatchesQuery>);
  });

  it('renders loading state', () => {
    mockedUseMatchesQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      isRefetching: false,
      isSlowNetwork: false,
      refetch: refetchMock,
    } as unknown as ReturnType<typeof useMatchesQuery>);

    renderScreen();
    expect(screen.getByText(i18n.t('matches.states.loading.title'))).toBeTruthy();
  });

  it('renders empty state', () => {
    mockedUseMatchesQuery.mockReturnValue({
      data: {
        sections: [],
        requestDurationMs: 140,
        fetchedAt: '2026-02-19T20:00:00.000Z',
        hasLiveMatches: false,
      },
      isLoading: false,
      isError: false,
      isRefetching: false,
      isSlowNetwork: false,
      refetch: refetchMock,
    } as unknown as ReturnType<typeof useMatchesQuery>);

    renderScreen();
    expect(screen.getByText(i18n.t('matches.states.empty.title'))).toBeTruthy();
  });

  it('renders offline state with cache timestamp', () => {
    mockedUseNetInfo.mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
    } as ReturnType<typeof useNetInfo>);
    mockedUseMatchesOfflineCache.mockReturnValue({
      cacheKey: 'matches_cache',
      cachedPayload: {
        sections: [sectionFixture],
        lastUpdatedAt: '2026-02-19T18:00:00.000Z',
      },
      isLoadingCache: false,
      lastUpdatedAt: '2026-02-19T18:00:00.000Z',
      saveCache: saveCacheMock,
    });
    mockedUseMatchesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      isRefetching: false,
      isSlowNetwork: false,
      refetch: refetchMock,
    } as unknown as ReturnType<typeof useMatchesQuery>);

    renderScreen();
    expect(screen.getByText(i18n.t('matches.states.offline.title'))).toBeTruthy();
    const lastUpdateLabel = i18n.t('matches.states.offline.lastUpdate', { value: '' }).trim();
    const escapedLastUpdateLabel = lastUpdateLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    expect(screen.getByText(new RegExp(escapedLastUpdateLabel))).toBeTruthy();
  });

  it('renders error state and retry action', () => {
    mockedUseMatchesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isRefetching: false,
      isSlowNetwork: false,
      refetch: refetchMock,
    } as unknown as ReturnType<typeof useMatchesQuery>);

    renderScreen();
    expect(screen.getByText(i18n.t('matches.states.error.title'))).toBeTruthy();
    fireEvent.press(screen.getByText(i18n.t('actions.retry')));
    expect(refetchMock).toHaveBeenCalled();
  });

  it('shows demo fallback matches when API key is missing', () => {
    mockedUseMatchesQuery.mockReturnValue({
      data: undefined,
      error: new Error(
        'Missing API_FOOTBALL_KEY. Set it in your .env file before calling API-Football.',
      ),
      isLoading: false,
      isError: true,
      isRefetching: false,
      isSlowNetwork: false,
      refetch: refetchMock,
    } as unknown as ReturnType<typeof useMatchesQuery>);

    renderScreen();

    expect(screen.getByText(i18n.t('matches.demoFallback.title'))).toBeTruthy();
    expect(screen.getByText('Paris SG')).toBeTruthy();
    expect(screen.getByText('Real Madrid')).toBeTruthy();
    expect(screen.queryByText(i18n.t('matches.states.error.title'))).toBeNull();
  });

  it('shows demo fallback instantly when demo mode is enabled', () => {
    appEnv.matchesDemoMode = true;
    mockedUseMatchesQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      isRefetching: false,
      isSlowNetwork: false,
      refetch: refetchMock,
    } as unknown as ReturnType<typeof useMatchesQuery>);

    renderScreen();

    expect(screen.getByText(i18n.t('matches.demoFallback.title'))).toBeTruthy();
    expect(screen.getByText('Paris SG')).toBeTruthy();
    expect(screen.queryByText(i18n.t('matches.states.loading.title'))).toBeNull();
  });

  it('navigates to match details when pressing a match card', () => {
    renderScreen();

    fireEvent.press(screen.getByText('Paris SG'));
    expect(navigateMock).toHaveBeenCalledWith('MatchDetails', { matchId: '10' });
  });

  it('opens notification modal when pressing card notification button', async () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('match-notification-button-10'));

    await waitFor(() => {
      expect(screen.getByText(i18n.t('notifications.match.title'))).toBeTruthy();
    });
  });

  it('routes to search and in-progress section navigation', () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('matches-header-search-button'));
    expect(navigateMock).toHaveBeenCalledWith('SearchPlaceholder');

    fireEvent.press(screen.getByTestId('matches-header-notifications-button'));
    expect(navigateMock).toHaveBeenCalledWith('MainTabs', { screen: 'More' });
  });

  it('keeps followed section first, then top competitions, then others', () => {
    mockedUseMatchesQuery.mockReturnValue({
      data: {
        sections: [sectionFixture, nonTopSectionFixture],
        requestDurationMs: 180,
        fetchedAt: '2026-02-19T20:00:00.000Z',
        hasLiveMatches: true,
      },
      isLoading: false,
      isError: false,
      isRefetching: false,
      isSlowNetwork: false,
      refetch: refetchMock,
    } as unknown as ReturnType<typeof useMatchesQuery>);

    const rendered = renderScreen();
    const renderedTexts = rendered
      .UNSAFE_getAllByType(Text)
      .map(node => {
        const { children } = node.props;
        if (typeof children === 'string') {
          return children;
        }
        if (Array.isArray(children)) {
          return children.join('');
        }
        return '';
      })
      .join('|');

    const followsIndex = renderedTexts.indexOf(i18n.t('matches.followsSectionTitle'));
    const ligue1Index = renderedTexts.indexOf('Ligue 1');
    const zetaLeagueIndex = renderedTexts.indexOf('Zeta League');

    expect(followsIndex).toBeGreaterThan(-1);
    expect(ligue1Index).toBeGreaterThan(-1);
    expect(zetaLeagueIndex).toBeGreaterThan(-1);
    expect(followsIndex).toBeLessThan(ligue1Index);
    expect(ligue1Index).toBeLessThan(zetaLeagueIndex);
  });
});
