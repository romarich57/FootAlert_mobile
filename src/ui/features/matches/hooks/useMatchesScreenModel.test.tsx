import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePowerState } from 'react-native-device-info';

import type { CompetitionsApiLeagueDto } from '@domain/contracts/competitions.types';
import { useFollowedTeamIdsQuery } from '@ui/features/follows/hooks/useFollowedTeamIdsQuery';
import { useHiddenCompetitions } from '@ui/features/matches/hooks/useHiddenCompetitions';
import { useMatchesQuery } from '@ui/features/matches/hooks/useMatchesQuery';
import { useMatchesRefresh } from '@ui/features/matches/hooks/useMatchesRefresh';
import { useMatchesScreenModel } from '@ui/features/matches/hooks/useMatchesScreenModel';
import '@ui/shared/i18n';
import { queryKeys } from '@ui/shared/query/queryKeys';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useIsFocused: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(),
}));

jest.mock('react-native-device-info', () => ({
  usePowerState: jest.fn(),
  getVersion: () => '0.0.1',
  getBuildNumber: () => '1',
}));

jest.mock('@ui/features/matches/hooks/useMatchesQuery', () => ({
  useMatchesQuery: jest.fn(),
}));

jest.mock('@ui/features/follows/hooks/useFollowedTeamIdsQuery', () => ({
  useFollowedTeamIdsQuery: jest.fn(),
}));

jest.mock('@ui/features/matches/hooks/useHiddenCompetitions', () => ({
  useHiddenCompetitions: jest.fn(),
}));

jest.mock('@ui/features/matches/hooks/useMatchesRefresh', () => ({
  useMatchesRefresh: jest.fn(),
}));

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseIsFocused = jest.mocked(useIsFocused);
const mockedUseNetInfo = jest.mocked(useNetInfo);
const mockedUsePowerState = jest.mocked(usePowerState);
const mockedUseMatchesQuery = jest.mocked(useMatchesQuery);
const mockedUseFollowedTeamIdsQuery = jest.mocked(useFollowedTeamIdsQuery);
const mockedUseHiddenCompetitions = jest.mocked(useHiddenCompetitions);
const mockedUseMatchesRefresh = jest.mocked(useMatchesRefresh);

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });
}

describe('useMatchesScreenModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseNavigation.mockReturnValue({
      navigate: jest.fn(),
    } as never);
    mockedUseIsFocused.mockReturnValue(true);
    mockedUseNetInfo.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      details: null,
    } as ReturnType<typeof useNetInfo>);
    mockedUsePowerState.mockReturnValue({
      lowPowerMode: false,
    } as ReturnType<typeof usePowerState>);
    mockedUseFollowedTeamIdsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    mockedUseHiddenCompetitions.mockReturnValue({
      hiddenIds: [],
      hideCompetition: jest.fn(async () => undefined),
      unhideCompetition: jest.fn(async () => undefined),
    });
    mockedUseMatchesQuery.mockReturnValue({
      data: {
        sections: [],
        requestDurationMs: 50,
        fetchedAt: '2026-02-26T00:00:00.000Z',
        hasLiveMatches: false,
      },
      isLoading: false,
      isError: false,
      isRefetching: false,
      isSlowNetwork: false,
      refetch: jest.fn(async () => ({ isError: false })),
    } as never);
  });

  it('passes batteryLiteMode=true to refresh hook when low power mode is enabled', () => {
    mockedUsePowerState.mockReturnValue({
      lowPowerMode: true,
    } as ReturnType<typeof usePowerState>);
    const queryClient = createTestQueryClient();

    const { unmount } = renderHook(() => useMatchesScreenModel(), {
      wrapper: createWrapper(queryClient),
    });

    expect(mockedUseMatchesRefresh).toHaveBeenCalledWith(
      expect.objectContaining({
        batteryLiteMode: true,
      }),
    );

    unmount();
    queryClient.clear();
  });

  it('passes batteryLiteMode=false to refresh hook when low power mode is disabled', () => {
    mockedUsePowerState.mockReturnValue({
      lowPowerMode: false,
    } as ReturnType<typeof usePowerState>);
    const queryClient = createTestQueryClient();

    const { unmount } = renderHook(() => useMatchesScreenModel(), {
      wrapper: createWrapper(queryClient),
    });

    expect(mockedUseMatchesRefresh).toHaveBeenCalledWith(
      expect.objectContaining({
        batteryLiteMode: false,
      }),
    );

    unmount();
    queryClient.clear();
  });

  it('ignores malformed competition catalog entries when enriching sections', () => {
    const queryClient = createTestQueryClient();
    const malformedCatalog: Array<CompetitionsApiLeagueDto | undefined> = [
      undefined,
      {
        league: {
          id: 39,
          name: 'Ligue 1 Uber Eats',
          type: 'League',
          logo: 'catalog-logo',
        },
        country: {
          name: 'France',
          code: 'FR',
          flag: null,
        },
        seasons: [],
      },
    ];

    queryClient.setQueryData(queryKeys.competitions.catalog(), malformedCatalog);
    mockedUseMatchesQuery.mockReturnValue({
      data: {
        sections: [
          {
            id: '39',
            name: 'Ligue 1',
            logo: 'initial-logo',
            country: 'France',
            matches: [
              {
                fixtureId: 'fixture-1',
                competitionId: '39',
                competitionName: 'Ligue 1',
                competitionLogo: 'initial-logo',
                competitionCountry: 'France',
                startDate: '2026-03-11T18:00:00.000Z',
                minute: null,
                venue: 'Parc des Princes',
                status: 'upcoming',
                statusLabel: 'NS',
                homeTeamId: '85',
                homeTeamName: 'Paris Saint-Germain',
                homeTeamLogo: 'psg-logo',
                awayTeamId: '81',
                awayTeamName: 'Olympique de Marseille',
                awayTeamLogo: 'om-logo',
                homeGoals: null,
                awayGoals: null,
                hasBroadcast: false,
              },
            ],
          },
        ],
        requestDurationMs: 50,
        fetchedAt: '2026-02-26T00:00:00.000Z',
        hasLiveMatches: false,
      },
      isLoading: false,
      isError: false,
      isRefetching: false,
      isSlowNetwork: false,
      refetch: jest.fn(async () => ({ isError: false })),
    } as never);

    const { result, unmount } = renderHook(() => useMatchesScreenModel(), {
      wrapper: createWrapper(queryClient),
    });

    const ligue1Section = result.current.listData.find(
      item => item.type === 'section' && item.section.id === '39',
    );

    expect(ligue1Section).toEqual(
      expect.objectContaining({
        type: 'section',
        section: expect.objectContaining({
          name: 'Ligue 1 Uber Eats',
          country: 'France',
          logo: 'catalog-logo',
          matches: [
            expect.objectContaining({
              competitionName: 'Ligue 1 Uber Eats',
              competitionCountry: 'France',
              competitionLogo: 'catalog-logo',
            }),
          ],
        }),
      }),
    );

    unmount();
    queryClient.clear();
  });

  it('keeps explicit followed matches before followed-team matches in the follows section', () => {
    const queryClient = createTestQueryClient();

    queryClient.setQueryData(queryKeys.followedMatchIds(), [
      'fixture-starred-late',
      'fixture-starred-early',
    ]);
    mockedUseFollowedTeamIdsQuery.mockReturnValue({
      data: ['100'],
      isLoading: false,
    } as never);
    mockedUseMatchesQuery.mockReturnValue({
      data: {
        sections: [
          {
            id: '39',
            name: 'Ligue 1',
            logo: 'league-logo',
            country: 'France',
            matches: [
              {
                fixtureId: 'fixture-starred-late',
                competitionId: '39',
                competitionName: 'Ligue 1',
                competitionLogo: 'league-logo',
                competitionCountry: 'France',
                startDate: '2026-03-11T21:00:00.000Z',
                minute: null,
                venue: 'Parc des Princes',
                status: 'upcoming',
                statusLabel: 'NS',
                homeTeamId: '85',
                homeTeamName: 'Paris Saint-Germain',
                homeTeamLogo: 'psg-logo',
                awayTeamId: '81',
                awayTeamName: 'Olympique de Marseille',
                awayTeamLogo: 'om-logo',
                homeGoals: null,
                awayGoals: null,
                hasBroadcast: false,
              },
              {
                fixtureId: 'fixture-team-early',
                competitionId: '39',
                competitionName: 'Ligue 1',
                competitionLogo: 'league-logo',
                competitionCountry: 'France',
                startDate: '2026-03-11T18:00:00.000Z',
                minute: null,
                venue: 'Parc des Princes',
                status: 'upcoming',
                statusLabel: 'NS',
                homeTeamId: '100',
                homeTeamName: 'AS Monaco',
                homeTeamLogo: 'monaco-logo',
                awayTeamId: '81',
                awayTeamName: 'Olympique de Marseille',
                awayTeamLogo: 'om-logo',
                homeGoals: null,
                awayGoals: null,
                hasBroadcast: false,
              },
              {
                fixtureId: 'fixture-starred-early',
                competitionId: '39',
                competitionName: 'Ligue 1',
                competitionLogo: 'league-logo',
                competitionCountry: 'France',
                startDate: '2026-03-11T19:00:00.000Z',
                minute: null,
                venue: 'Parc des Princes',
                status: 'upcoming',
                statusLabel: 'NS',
                homeTeamId: '85',
                homeTeamName: 'Paris Saint-Germain',
                homeTeamLogo: 'psg-logo',
                awayTeamId: '200',
                awayTeamName: 'OGC Nice',
                awayTeamLogo: 'nice-logo',
                homeGoals: null,
                awayGoals: null,
                hasBroadcast: false,
              },
            ],
          },
        ],
        requestDurationMs: 50,
        fetchedAt: '2026-02-26T00:00:00.000Z',
        hasLiveMatches: false,
      },
      isLoading: false,
      isError: false,
      isRefetching: false,
      isSlowNetwork: false,
      refetch: jest.fn(async () => ({ isError: false })),
    } as never);

    const { result, unmount } = renderHook(() => useMatchesScreenModel(), {
      wrapper: createWrapper(queryClient),
    });

    const followsSection = result.current.listData.find(
      item => item.type === 'section' && item.section.id === 'follows',
    );

    expect(followsSection).toEqual(
      expect.objectContaining({
        type: 'section',
        section: expect.objectContaining({
          id: 'follows',
          matches: [
            expect.objectContaining({ fixtureId: 'fixture-starred-early' }),
            expect.objectContaining({ fixtureId: 'fixture-starred-late' }),
            expect.objectContaining({ fixtureId: 'fixture-team-early' }),
          ],
        }),
      }),
    );

    unmount();
    queryClient.clear();
  });
});
