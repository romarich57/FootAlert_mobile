import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';

import { MatchDetailsTabContent } from '@ui/features/matches/details/components/MatchDetailsTabContent';
import type { ApiFootballFixtureDto } from '@ui/features/matches/types/matches.types';
import i18n from '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

const fixture: ApiFootballFixtureDto = {
  fixture: {
    id: 101,
    date: '2026-02-26T20:00:00.000Z',
    status: {
      short: 'FT',
      long: 'Match Finished',
      elapsed: 90,
    },
    venue: {
      name: 'Parc',
      city: 'Paris',
    },
  },
  league: {
    id: 61,
    name: 'League',
    country: 'FR',
    logo: '',
  },
  teams: {
    home: {
      id: 1,
      name: 'Home',
      logo: '',
    },
    away: {
      id: 2,
      name: 'Away',
      logo: '',
    },
  },
  goals: {
    home: 2,
    away: 1,
  },
};

const baseProps: React.ComponentProps<typeof MatchDetailsTabContent> = {
  activeTab: 'stats',
  lifecycleState: 'finished',
  fixture,
  events: [],
  statistics: [],
  lineupTeams: [],
  predictions: null,
  winPercent: { home: '40%', draw: '30%', away: '30%' },
  homePlayersStats: [],
  awayPlayersStats: [],
  standings: null,
  homeTeamId: '1',
  awayTeamId: '2',
  headToHead: [],
  isLiveRefreshing: false,
};

describe('MatchStatsTab and faceOff placeholder', () => {
  it('renders empty state for stats tab when statistics are unavailable', () => {
    renderWithAppProviders(<MatchDetailsTabContent {...baseProps} activeTab="stats" statistics={[]} />);

    expect(screen.getByText(i18n.t('matchDetails.values.unavailable'))).toBeTruthy();
  });

  it('renders stat rows for stats tab when statistics exist', () => {
    renderWithAppProviders(
      <MatchDetailsTabContent
        {...baseProps}
        activeTab="stats"
        statistics={[
          {
            statistics: [{ type: 'Shots on Goal', value: 10 }],
          },
          {
            statistics: [{ type: 'Shots on Goal', value: 5 }],
          },
        ]}
      />,
    );

    expect(screen.getByText(i18n.t('matchDetails.stats.labels.shotsOnGoal'))).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('shows only available period chips and switches between period datasets', () => {
    renderWithAppProviders(
      <MatchDetailsTabContent
        {...baseProps}
        activeTab="stats"
        statistics={[]}
        statsRowsByPeriod={{
          all: [
            {
              key: 'total_shots',
              metricKey: 'total_shots',
              section: 'shots',
              label: 'Total Shots',
              labelKey: 'matchDetails.stats.labels.totalShots',
              homeValue: '10',
              awayValue: '8',
              homePercent: 55.5,
              awayPercent: 44.5,
            },
          ],
          first: [
            {
              key: 'total_shots',
              metricKey: 'total_shots',
              section: 'shots',
              label: 'Total Shots',
              labelKey: 'matchDetails.stats.labels.totalShots',
              homeValue: '6',
              awayValue: '5',
              homePercent: 54.5,
              awayPercent: 45.5,
            },
          ],
          second: [],
        }}
        statsAvailablePeriods={['all', 'first']}
      />,
    );

    expect(screen.getByText(i18n.t('matchDetails.stats.period.all'))).toBeTruthy();
    expect(screen.getByText(i18n.t('matchDetails.stats.period.firstHalf'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('matchDetails.stats.period.secondHalf'))).toBeNull();

    fireEvent.press(screen.getByText(i18n.t('matchDetails.stats.period.firstHalf')));
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('renders french labels without english fallback when locale is fr', async () => {
    await act(async () => {
      await i18n.changeLanguage('fr');
    });
    try {
      renderWithAppProviders(
        <MatchDetailsTabContent
          {...baseProps}
          activeTab="stats"
          statistics={[
            {
              statistics: [{ type: 'Shots on Goal', value: 9 }],
            },
            {
              statistics: [{ type: 'Shots on Goal', value: 4 }],
            },
          ]}
        />,
      );

      expect(screen.getByText(i18n.t('matchDetails.stats.labels.shotsOnGoal'))).toBeTruthy();
      expect(screen.queryByText('Shots on Goal')).toBeNull();
    } finally {
      await act(async () => {
        await i18n.changeLanguage('en');
      });
    }
  });

  it('renders face-off tab with no-data message when head-to-head is empty', () => {
    renderWithAppProviders(<MatchDetailsTabContent {...baseProps} activeTab="faceOff" headToHead={[]} />);

    expect(screen.getByText(i18n.t('matchDetails.faceOff.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('matchDetails.faceOff.noData'))).toBeTruthy();
  });

  it('renders explicit stats error message when dataset request failed', () => {
    renderWithAppProviders(
      <MatchDetailsTabContent
        {...baseProps}
        activeTab="stats"
        statistics={[]}
        datasetErrors={{ statistics: true }}
      />,
    );

    expect(screen.getByText(i18n.t('matchDetails.states.datasetErrors.statistics'))).toBeTruthy();
  });

  it('renders explicit face-off error message when dataset request failed', () => {
    renderWithAppProviders(
      <MatchDetailsTabContent
        {...baseProps}
        activeTab="faceOff"
        headToHead={[]}
        datasetErrors={{ faceOff: true }}
      />,
    );

    expect(screen.getByText(i18n.t('matchDetails.states.datasetErrors.faceOff'))).toBeTruthy();
  });

  it('resets league filter when face-off data changes between matches', () => {
    const { rerender } = renderWithAppProviders(
      <MatchDetailsTabContent
        {...baseProps}
        activeTab="faceOff"
        headToHead={[
          {
            fixture: { id: 1, date: '2026-02-10T20:00:00Z' },
            league: { id: 10, name: 'League A' },
            teams: {
              home: { id: 1, name: 'Home', logo: '' },
              away: { id: 2, name: 'Away', logo: '' },
            },
            goals: { home: 1, away: 0 },
          },
          {
            fixture: { id: 2, date: '2026-01-10T20:00:00Z' },
            league: { id: 20, name: 'League B' },
            teams: {
              home: { id: 2, name: 'Away', logo: '' },
              away: { id: 1, name: 'Home', logo: '' },
            },
            goals: { home: 1, away: 2 },
          },
        ]}
      />,
    );

    fireEvent.press(screen.getAllByText('League B')[0]);

    rerender(
      <MatchDetailsTabContent
        {...baseProps}
        activeTab="faceOff"
        headToHead={[
          {
            fixture: { id: 3, date: '2026-03-10T20:00:00Z' },
            league: { id: 30, name: 'League C' },
            teams: {
              home: { id: 1, name: 'Home', logo: '' },
              away: { id: 2, name: 'Away', logo: '' },
            },
            goals: { home: 3, away: 1 },
          },
        ]}
      />,
    );

    expect(screen.getByText('League C')).toBeTruthy();
    expect(screen.queryByText(i18n.t('matchDetails.faceOff.noData'))).toBeNull();
  });
});
