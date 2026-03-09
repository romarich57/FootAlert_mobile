import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CompetitionTeamStatsTab } from '@ui/features/competitions/components/CompetitionTeamStatsTab';
import { useCompetitionTeamStats } from '@ui/features/competitions/hooks/useCompetitionTeamStats';
import i18n from '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

jest.mock('@ui/features/competitions/hooks/useCompetitionTeamStats');

const mockedUseCompetitionTeamStats = jest.mocked(useCompetitionTeamStats);

function createHookResult(overrides: Record<string, unknown> = {}) {
  const summary = {
    metrics: [
      'pointsPerMatch',
      'winRate',
      'goalsScoredPerMatch',
      'goalsConcededPerMatch',
      'goalDiffPerMatch',
      'formIndex',
      'formPointsPerMatch',
    ] as const,
    leaderboards: {
      pointsPerMatch: {
        metric: 'pointsPerMatch' as const,
        sortOrder: 'desc' as const,
        items: [
          { teamId: 1, teamName: 'Alpha', teamLogo: 'a.png', value: 2.1 },
          { teamId: 2, teamName: 'Beta', teamLogo: 'b.png', value: 1.9 },
        ],
      },
      winRate: {
        metric: 'winRate' as const,
        sortOrder: 'desc' as const,
        items: [
          { teamId: 1, teamName: 'Alpha', teamLogo: 'a.png', value: 68 },
          { teamId: 2, teamName: 'Beta', teamLogo: 'b.png', value: 63 },
        ],
      },
      goalsScoredPerMatch: {
        metric: 'goalsScoredPerMatch' as const,
        sortOrder: 'desc' as const,
        items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'a.png', value: 2.2 }],
      },
      goalsConcededPerMatch: {
        metric: 'goalsConcededPerMatch' as const,
        sortOrder: 'asc' as const,
        items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'a.png', value: 0.8 }],
      },
      goalDiffPerMatch: {
        metric: 'goalDiffPerMatch' as const,
        sortOrder: 'desc' as const,
        items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'a.png', value: 1.4 }],
      },
      formIndex: {
        metric: 'formIndex' as const,
        sortOrder: 'desc' as const,
        items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'a.png', value: 11 }],
      },
      formPointsPerMatch: {
        metric: 'formPointsPerMatch' as const,
        sortOrder: 'desc' as const,
        items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'a.png', value: 2.2 }],
      },
    },
  };

  const homeAway = {
    metrics: [
      'homePPG',
      'awayPPG',
      'homeGoalsFor',
      'awayGoalsFor',
      'homeGoalsAgainst',
      'awayGoalsAgainst',
      'deltaHomeAwayPPG',
      'deltaHomeAwayGoalsFor',
      'deltaHomeAwayGoalsAgainst',
    ] as const,
    leaderboards: {
      homePPG: {
        metric: 'homePPG' as const,
        sortOrder: 'desc' as const,
        items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'a.png', value: 2.7 }],
      },
      awayPPG: {
        metric: 'awayPPG' as const,
        sortOrder: 'desc' as const,
        items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'a.png', value: 1.6 }],
      },
      homeGoalsFor: {
        metric: 'homeGoalsFor' as const,
        sortOrder: 'desc' as const,
        items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'a.png', value: 28 }],
      },
      awayGoalsFor: {
        metric: 'awayGoalsFor' as const,
        sortOrder: 'desc' as const,
        items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'a.png', value: 19 }],
      },
      homeGoalsAgainst: {
        metric: 'homeGoalsAgainst' as const,
        sortOrder: 'asc' as const,
        items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'a.png', value: 8 }],
      },
      awayGoalsAgainst: {
        metric: 'awayGoalsAgainst' as const,
        sortOrder: 'asc' as const,
        items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'a.png', value: 12 }],
      },
      deltaHomeAwayPPG: {
        metric: 'deltaHomeAwayPPG' as const,
        sortOrder: 'desc' as const,
        items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'a.png', value: 1.1 }],
      },
      deltaHomeAwayGoalsFor: {
        metric: 'deltaHomeAwayGoalsFor' as const,
        sortOrder: 'desc' as const,
        items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'a.png', value: 9 }],
      },
      deltaHomeAwayGoalsAgainst: {
        metric: 'deltaHomeAwayGoalsAgainst' as const,
        sortOrder: 'desc' as const,
        items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'a.png', value: 4 }],
      },
    },
  };

  const advanced = {
    metrics: [
      'cleanSheets',
      'failedToScore',
      'xGPerMatch',
      'possession',
      'shotsPerMatch',
      'shotsOnTargetPerMatch',
    ] as const,
    rows: [
      {
        teamId: 1,
        teamName: 'Alpha',
        teamLogo: 'a.png',
        cleanSheets: 12,
        failedToScore: 3,
        xGPerMatch: 2.11,
        possession: 58.2,
        shotsPerMatch: 15.3,
        shotsOnTargetPerMatch: 5.4,
        goalMinuteBreakdown: [],
      },
    ],
    top10TeamIds: [1],
    unavailableMetrics: [] as Array<
      'cleanSheets' | 'failedToScore' | 'xGPerMatch' | 'possession' | 'shotsPerMatch' | 'shotsOnTargetPerMatch'
    >,
    state: 'available' as const,
    reason: null,
    leaderboards: {
      cleanSheets: {
        metric: 'cleanSheets' as const,
        sortOrder: 'desc' as const,
        items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'a.png', value: 12 }],
      },
      failedToScore: {
        metric: 'failedToScore' as const,
        sortOrder: 'asc' as const,
        items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'a.png', value: 3 }],
      },
      xGPerMatch: {
        metric: 'xGPerMatch' as const,
        sortOrder: 'desc' as const,
        items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'a.png', value: 2.11 }],
      },
      possession: {
        metric: 'possession' as const,
        sortOrder: 'desc' as const,
        items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'a.png', value: 58.2 }],
      },
      shotsPerMatch: {
        metric: 'shotsPerMatch' as const,
        sortOrder: 'desc' as const,
        items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'a.png', value: 15.3 }],
      },
      shotsOnTargetPerMatch: {
        metric: 'shotsOnTargetPerMatch' as const,
        sortOrder: 'desc' as const,
        items: [{ teamId: 1, teamName: 'Alpha', teamLogo: 'a.png', value: 5.4 }],
      },
    },
  };

  return {
    summary,
    homeAway,
    advanced,
    isBaseLoading: false,
    isAdvancedLoading: false,
    advancedProgress: 100,
    baseError: null,
    advancedError: null,
    hasAdvancedData: true,
    shouldRenderAdvancedSection: true,
    ...overrides,
  };
}

describe('CompetitionTeamStatsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseCompetitionTeamStats.mockReturnValue(createHookResult() as never);
  });

  it('renders the 3 dashboard sections when advanced is available', () => {
    renderWithAppProviders(<CompetitionTeamStatsTab competitionId={61} season={2025} />);

    expect(screen.getByTestId('competition-team-stats-section-summary')).toBeTruthy();
    expect(screen.getByTestId('competition-team-stats-section-home-away')).toBeTruthy();
    expect(screen.getByTestId('competition-team-stats-section-advanced')).toBeTruthy();
  });

  it('switches summary metric chips', () => {
    renderWithAppProviders(<CompetitionTeamStatsTab competitionId={61} season={2025} />);

    fireEvent.press(screen.getByTestId('competition-team-stats-chip-summary-winRate'));

    expect(screen.getAllByText(i18n.t('competitionDetails.teamStats.metrics.winRate')).length).toBeGreaterThan(0);
  });

  it('switches home/away metric chips', () => {
    renderWithAppProviders(<CompetitionTeamStatsTab competitionId={61} season={2025} />);

    fireEvent.press(screen.getByTestId('competition-team-stats-chip-home-away-awayPPG'));

    expect(screen.getAllByText(i18n.t('competitionDetails.teamStats.metrics.awayPPG')).length).toBeGreaterThan(0);
  });

  it('activates advanced loading from CTA', async () => {
    mockedUseCompetitionTeamStats.mockImplementation(
      ({ advancedEnabled }) =>
        createHookResult({
          hasAdvancedData: advancedEnabled,
        }) as never,
    );

    renderWithAppProviders(<CompetitionTeamStatsTab competitionId={61} season={2025} />);

    fireEvent.press(screen.getByTestId('competition-team-stats-advanced-load'));

    await waitFor(() => {
      expect(mockedUseCompetitionTeamStats).toHaveBeenLastCalledWith(
        expect.objectContaining({
          leagueId: 61,
          season: 2025,
          advancedEnabled: true,
        }),
      );
    });
  });

  it('shows advanced loading state after activation', async () => {
    mockedUseCompetitionTeamStats.mockImplementation(
      ({ advancedEnabled }) =>
        createHookResult({
          isAdvancedLoading: advancedEnabled,
          hasAdvancedData: !advancedEnabled,
        }) as never,
    );

    renderWithAppProviders(<CompetitionTeamStatsTab competitionId={61} season={2025} />);

    fireEvent.press(screen.getByTestId('competition-team-stats-advanced-load'));

    expect(await screen.findByTestId('competition-team-stats-advanced-loading')).toBeTruthy();
  });

  it('keeps advanced visible with a network-lite warning after activation', async () => {
    mockedUseCompetitionTeamStats.mockImplementation(
      ({ advancedEnabled, networkLiteMode: _networkLiteMode }) =>
        createHookResult({
          hasAdvancedData: advancedEnabled,
          isAdvancedLoading: advancedEnabled,
          advancedProgress: advancedEnabled ? 45 : 0,
        }) as never,
    );

    renderWithAppProviders(<CompetitionTeamStatsTab competitionId={61} season={2025} />);

    fireEvent.press(screen.getByTestId('competition-team-stats-advanced-load'));

    expect(await screen.findByTestId('competition-team-stats-advanced-loading')).toBeTruthy();
    expect(screen.getByText(i18n.t('competitionDetails.teamStats.advanced.networkLite'))).toBeTruthy();

    expect(mockedUseCompetitionTeamStats).toHaveBeenLastCalledWith(
      expect.objectContaining({
        advancedEnabled: true,
        networkLiteMode: expect.any(Boolean),
      }),
    );
  });

  it('shows partial advanced copy when backend marks the section partial', async () => {
    mockedUseCompetitionTeamStats.mockImplementation(
      ({ advancedEnabled }) =>
        createHookResult({
          hasAdvancedData: advancedEnabled,
          advanced: {
            ...createHookResult().advanced,
            state: 'partial',
            reason: 'provider_missing',
            unavailableMetrics: advancedEnabled ? ['xGPerMatch'] : [],
            leaderboards: {
              ...createHookResult().advanced.leaderboards,
              xGPerMatch: {
                metric: 'xGPerMatch',
                sortOrder: 'desc',
                items: [],
              },
            },
          },
        }) as never,
    );

    renderWithAppProviders(<CompetitionTeamStatsTab competitionId={61} season={2025} />);

    fireEvent.press(screen.getByTestId('competition-team-stats-advanced-load'));

    expect(await screen.findByText(i18n.t('competitionDetails.teamStats.advanced.partial'))).toBeTruthy();
  });

  it('hides the advanced section entirely when backend reports it unavailable', () => {
    mockedUseCompetitionTeamStats.mockReturnValue(
      createHookResult({
        hasAdvancedData: false,
        shouldRenderAdvancedSection: false,
        advanced: {
          ...createHookResult().advanced,
          rows: [],
          top10TeamIds: [],
          state: 'unavailable',
          reason: 'grouped_competition',
        },
      }) as never,
    );

    renderWithAppProviders(<CompetitionTeamStatsTab competitionId={61} season={2025} />);

    expect(screen.queryByTestId('competition-team-stats-section-advanced')).toBeNull();
  });

  it('keeps chart rendering with expected testIDs and values', () => {
    renderWithAppProviders(<CompetitionTeamStatsTab competitionId={61} season={2025} />);

    expect(screen.getByTestId('competition-team-stats-chip-summary-pointsPerMatch')).toBeTruthy();
    expect(screen.getByTestId('competition-team-stats-chip-home-away-homePPG')).toBeTruthy();
    expect(screen.getByText('2.10')).toBeTruthy();
  });
});
