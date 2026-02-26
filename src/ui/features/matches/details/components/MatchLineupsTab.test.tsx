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

describe('MatchLineupsTab', () => {
  it('renders lineups, substitutes and absences blocks', () => {
    renderWithAppProviders(
      <MatchDetailsTabContent
        activeTab="lineups"
        lifecycleState="finished"
        fixture={fixture}
        events={[]}
        statistics={[]}
        lineups={[
          {
            team: { id: 1, name: 'Home', logo: '' },
            coach: { name: 'Coach A' },
            formation: '4-3-3',
            startXI: [
              { player: { id: 10, name: 'Starter One', number: 9, pos: 'F', grid: '1:1' } },
            ],
            substitutes: [
              { player: { id: 11, name: 'Sub One', number: 14, pos: 'M', grid: '0:0' } },
            ],
          },
        ]}
        h2h={[]}
        predictions={null}
        winPercent={{ home: '40%', draw: '30%', away: '30%' }}
        absences={[
          {
            teamId: 1,
            response: [{ player: { name: 'Injured One' } }],
          },
        ]}
        homePlayersStats={[
          {
            players: [
              {
                player: { id: 11 },
                statistics: [
                  {
                    games: { rating: '7.1' },
                    goals: { total: 0, assists: 1 },
                    cards: { yellow: 1, red: 0 },
                    substitutes: { in: 72, out: null },
                  },
                ],
              },
            ],
          },
        ]}
        awayPlayersStats={[]}
        standings={null}
        homeTeamId="1"
        awayTeamId="2"
        isLiveRefreshing={false}
      />,
    );

    expect(screen.getByText(/Coach A/)).toBeTruthy();
    expect(screen.getByText(i18n.t('matchDetails.lineups.substitutes'))).toBeTruthy();
    expect(screen.getByText(i18n.t('matchDetails.lineups.reserves'))).toBeTruthy();
    expect(screen.getByText(/Injured One/)).toBeTruthy();
  });
});
