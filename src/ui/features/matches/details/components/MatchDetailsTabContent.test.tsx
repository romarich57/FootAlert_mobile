import React from 'react';

import { MatchDetailsTabContent } from '@ui/features/matches/details/components/MatchDetailsTabContent';
import type {
  ApiFootballFixtureDto,
  MatchDetailsTabKey,
} from '@ui/features/matches/types/matches.types';
import type { CompetitionsApiStandingDto } from '@ui/features/competitions/types/competitions.types';
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

const standings: CompetitionsApiStandingDto = {
  league: {
    id: 61,
    name: 'League',
    country: 'FR',
    logo: '',
    flag: null,
    season: 2026,
    standings: [
      [
        {
          rank: 1,
          team: {
            id: 1,
            name: 'Home',
            logo: '',
          },
          points: 70,
          goalsDiff: 30,
          group: 'Group A',
          form: 'WWWDW',
          status: 'same',
          description: null,
          all: {
            played: 30,
            win: 22,
            draw: 4,
            lose: 4,
            goals: {
              for: 60,
              against: 30,
            },
          },
          home: {
            played: 15,
            win: 12,
            draw: 2,
            lose: 1,
            goals: {
              for: 35,
              against: 12,
            },
          },
          away: {
            played: 15,
            win: 10,
            draw: 2,
            lose: 3,
            goals: {
              for: 25,
              against: 18,
            },
          },
          update: '2026-02-26T20:00:00.000Z',
        },
      ],
    ],
  },
};

const baseProps: React.ComponentProps<typeof MatchDetailsTabContent> = {
  activeTab: 'primary',
  lifecycleState: 'finished',
  fixture,
  events: [
    {
      time: { elapsed: 78, extra: null },
      team: { id: 1 },
      player: { name: 'Kylian Mbappe' },
      assist: { name: 'O. Dembele' },
      type: 'Goal',
      detail: 'Left footed shot',
    },
  ],
  statistics: [
    {
      statistics: [{ type: 'Shots on Goal', value: 10 }],
    },
    {
      statistics: [{ type: 'Shots on Goal', value: 5 }],
    },
  ],
  lineupTeams: [],
  predictions: null,
  winPercent: { home: '40%', draw: '30%', away: '30%' },
  homePlayersStats: [],
  awayPlayersStats: [],
  standings,
  homeTeamId: '1',
  awayTeamId: '2',
  headToHead: [],
  isLiveRefreshing: false,
};

describe('MatchDetailsTabContent router', () => {
  it.each<MatchDetailsTabKey>(['primary', 'timeline', 'lineups', 'standings', 'stats', 'faceOff'])(
    'renders %s tab without crashing',
    tabKey => {
      expect(() => {
        renderWithAppProviders(<MatchDetailsTabContent {...baseProps} activeTab={tabKey} />);
      }).not.toThrow();
    },
  );

  it('renders only available pre-match sections on primary tab', () => {
    const { getByText, queryByText } = renderWithAppProviders(
      <MatchDetailsTabContent
        {...baseProps}
        lifecycleState="pre_match"
        activeTab="primary"
        preMatchTab={{
          isLoading: false,
          hasAnySection: true,
          sectionsOrdered: [
            {
              id: 'winProbability',
              order: 1,
              isAvailable: true,
              payload: {
                homeTeamName: 'Home',
                awayTeamName: 'Away',
                home: '44%',
                draw: '30%',
                away: '26%',
              },
            },
            {
              id: 'standings',
              order: 5,
              isAvailable: false,
              payload: null,
            },
          ],
        }}
      />,
    );

    expect(getByText(i18n.t('matchDetails.preMatch.winProbability.title'))).toBeTruthy();
    expect(queryByText(i18n.t('matchDetails.preMatch.standings.title'))).toBeNull();
  });
});
