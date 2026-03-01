import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

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
      long: 'Full Time',
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
      name: 'Home Team',
      logo: '',
    },
    away: {
      id: 2,
      name: 'Away Team',
      logo: '',
    },
  },
  goals: {
    home: 2,
    away: 1,
  },
};

function buildHeadToHeadFixtures(count: number) {
  return Array.from({ length: count }).map((_, index) => {
    const rank = index + 1;
    const day = String(rank).padStart(2, '0');

    return {
      fixture: {
        id: rank,
        date: `2026-01-${day}T20:00:00.000Z`,
      },
      league: {
        id: 61,
        name: 'League',
      },
      teams: {
        home: {
          id: 1,
          name: `Home ${rank}`,
          logo: '',
        },
        away: {
          id: 2,
          name: `Away ${rank}`,
          logo: '',
        },
      },
      goals: {
        home: 1,
        away: 0,
      },
    };
  });
}

describe('MatchFaceOffTab', () => {
  it('keeps initial slice and loads more fixtures on demand', () => {
    renderWithAppProviders(
      <MatchDetailsTabContent
        activeTab="faceOff"
        lifecycleState="finished"
        fixture={fixture}
        events={[]}
        statistics={[]}
        lineupTeams={[]}
        predictions={null}
        winPercent={{ home: '40%', draw: '30%', away: '30%' }}
        homePlayersStats={[]}
        awayPlayersStats={[]}
        standings={null}
        homeTeamId="1"
        awayTeamId="2"
        headToHead={buildHeadToHeadFixtures(12)}
        isLiveRefreshing={false}
      />,
    );

    expect(screen.queryByText('Home 1')).toBeNull();

    fireEvent.press(screen.getByLabelText(i18n.t('matchDetails.faceOff.loadMore')));

    expect(screen.getByText('Home 1')).toBeTruthy();
  });
});
