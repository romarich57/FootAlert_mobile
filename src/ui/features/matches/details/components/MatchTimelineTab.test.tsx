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
      short: '2H',
      long: 'Second Half',
      elapsed: 76,
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

describe('MatchTimelineTab', () => {
  it('renders timeline events with tap hint during live state', () => {
    renderWithAppProviders(
      <MatchDetailsTabContent
        activeTab="timeline"
        lifecycleState="live"
        fixture={fixture}
        events={[
          {
            time: { elapsed: 78, extra: null },
            team: { id: 1 },
            player: { name: 'Kylian Mbappe' },
            assist: { name: 'O. Dembele' },
            type: 'Goal',
            detail: 'Left footed shot',
          },
        ]}
        statistics={[]}
        lineupTeams={[]}
        predictions={null}
        winPercent={{ home: '40%', draw: '30%', away: '30%' }}
        homePlayersStats={[]}
        awayPlayersStats={[]}
        standings={null}
        homeTeamId="1"
        awayTeamId="2"
        headToHead={[]}
        isLiveRefreshing={false}
      />,
    );

    expect(screen.getByText("78'")).toBeTruthy();
    expect(screen.getByText(/Goal · Kylian Mbappe/)).toBeTruthy();
    expect(screen.getByText(i18n.t('matchDetails.timeline.tapHint'))).toBeTruthy();
  });
});
