import React from 'react';
import { screen } from '@testing-library/react-native';

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

    expect(screen.getByText('Shots on Goal')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('renders face-off tab with no-data message when head-to-head is empty', () => {
    renderWithAppProviders(<MatchDetailsTabContent {...baseProps} activeTab="faceOff" headToHead={[]} />);

    expect(screen.getByText(i18n.t('matchDetails.faceOff.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('matchDetails.faceOff.noData'))).toBeTruthy();
  });
});
