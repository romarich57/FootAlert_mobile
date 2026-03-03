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

describe('MatchLineupsTab', () => {
  it('renders lineups, substitutes and absences blocks', () => {
    renderWithAppProviders(
      <MatchDetailsTabContent
        activeTab="lineups"
        lifecycleState="finished"
        fixture={fixture}
        events={[]}
        statistics={[]}
        lineupTeams={[
          {
            teamId: '1',
            teamName: 'Home',
            teamLogo: '',
            coach: 'Coach A',
            formation: '4-3-3',
            startingXI: [
              { id: '10', name: 'Starter One', number: 9, position: 'F', grid: '1:1' },
            ],
            substitutes: [
              { id: '11', name: 'Sub One', number: 14, position: 'M', grid: '0:0' },
            ],
            reserves: [],
            absences: ['Injured One'],
          },
        ]}
        predictions={null}
        winPercent={{ home: '40%', draw: '30%', away: '30%' }}
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
        headToHead={[]}
        isLiveRefreshing={false}
      />,
    );

    expect(screen.getByText(/Coach A/)).toBeTruthy();
    expect(screen.getByText(i18n.t('matchDetails.lineups.substitutes'))).toBeTruthy();
    expect(screen.getByText(i18n.t('matchDetails.lineups.absencesDetailedTitle'))).toBeTruthy();
    expect(screen.getByText(/Injured One/)).toBeTruthy();
  });

  it('localizes absence reason/status labels in french', async () => {
    await act(async () => {
      await i18n.changeLanguage('fr');
    });
    try {
      renderWithAppProviders(
        <MatchDetailsTabContent
          activeTab="lineups"
          lifecycleState="finished"
          fixture={fixture}
          events={[]}
          statistics={[]}
          lineupTeams={[
            {
              teamId: '1',
              teamName: 'Home',
              teamLogo: '',
              coach: 'Coach A',
              formation: '4-3-3',
              startingXI: [
                { id: '10', name: 'Starter One', number: 9, position: 'F', grid: '1:1' },
              ],
              substitutes: [],
              reserves: [],
              absences: [
                {
                  id: '99',
                  name: 'Player Absent',
                  photo: null,
                  reason: 'Knee Injury',
                  status: 'Suspended',
                  type: null,
                },
              ],
            },
          ]}
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

      expect(screen.getByText('Player Absent')).toBeTruthy();
      expect(screen.getAllByText(i18n.t('matchDetails.lineups.absenceTags.injured')).length).toBeGreaterThan(0);
      expect(screen.getByText(i18n.t('matchDetails.lineups.absenceTags.suspended'))).toBeTruthy();
      expect(screen.queryByText('Knee Injury')).toBeNull();
      expect(screen.queryByText('Suspended')).toBeNull();
    } finally {
      await act(async () => {
        await i18n.changeLanguage('en');
      });
    }
  });

  it('does not display raw i18n keys or technical placeholder strings in absences', () => {
    renderWithAppProviders(
      <MatchDetailsTabContent
        activeTab="lineups"
        lifecycleState="finished"
        fixture={fixture}
        events={[]}
        statistics={[]}
        lineupTeams={[
          {
            teamId: '1',
            teamName: 'Home',
            teamLogo: '',
            coach: 'Coach A',
            formation: '4-3-3',
            startingXI: [{ id: '10', name: 'Starter One', number: 9, position: 'F', grid: '1:1' }],
            substitutes: [],
            reserves: [],
            absences: [
              {
                id: '99',
                name: 'Player Absent',
                photo: null,
                reason: 'matchsDetails.lineups.absenceTags.injured',
                status: 'Missing fixture',
                type: null,
              },
            ],
          },
        ]}
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

    expect(screen.getByText('Player Absent')).toBeTruthy();
    expect(screen.getAllByText(i18n.t('matchDetails.lineups.absenceTags.injured')).length).toBeGreaterThan(0);
    expect(screen.queryByText('matchsDetails.lineups.absenceTags.injured')).toBeNull();
    expect(screen.queryByText('Missing fixture')).toBeNull();
  });

  it('shows retry action on finished state when lineups are unavailable', () => {
    const onRefreshLineups = jest.fn();
    renderWithAppProviders(
      <MatchDetailsTabContent
        activeTab="lineups"
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
        headToHead={[]}
        isLiveRefreshing={false}
        onRefreshLineups={onRefreshLineups}
        isLineupsRefetching={false}
      />,
    );

    const retryLabel = i18n.t('actions.retry');
    const retryAction = screen.getByText(retryLabel);
    fireEvent.press(retryAction);
    expect(onRefreshLineups).toHaveBeenCalledTimes(1);
  });

  it('shows explicit lineups error when lineup dataset failed', () => {
    renderWithAppProviders(
      <MatchDetailsTabContent
        activeTab="lineups"
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
        headToHead={[]}
        isLiveRefreshing={false}
        datasetErrors={{ lineups: true }}
      />,
    );

    expect(screen.getByText(i18n.t('matchDetails.states.datasetErrors.lineups'))).toBeTruthy();
  });

  it('shows endpoint-unavailable lineups message when lineups endpoint returns 404', () => {
    renderWithAppProviders(
      <MatchDetailsTabContent
        activeTab="lineups"
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
        headToHead={[]}
        isLiveRefreshing={false}
        datasetErrors={{ lineups: true }}
        datasetErrorReasons={{ lineups: 'endpoint_not_available' }}
      />,
    );

    expect(screen.getByText(i18n.t('matchDetails.states.datasetErrorsUnsupported.lineups'))).toBeTruthy();
  });

  it('shows fallback source note when lineups are built from fixture payload', () => {
    renderWithAppProviders(
      <MatchDetailsTabContent
        activeTab="lineups"
        lifecycleState="finished"
        fixture={fixture}
        events={[]}
        statistics={[]}
        lineupTeams={[
          {
            teamId: '1',
            teamName: 'Home',
            teamLogo: '',
            coach: 'Coach A',
            formation: '4-3-3',
            startingXI: [{ id: '10', name: 'Starter One', number: 9, position: 'F', grid: '1:1' }],
            substitutes: [],
            reserves: [],
            absences: [],
          },
        ]}
        predictions={null}
        winPercent={{ home: '40%', draw: '30%', away: '30%' }}
        homePlayersStats={[]}
        awayPlayersStats={[]}
        standings={null}
        homeTeamId="1"
        awayTeamId="2"
        headToHead={[]}
        isLiveRefreshing={false}
        dataSources={{ lineups: 'fixture_fallback' }}
      />,
    );

    expect(screen.getByText(i18n.t('matchDetails.states.fallbackSource'))).toBeTruthy();
  });

  it('hides absences section and error note when absences data is unavailable', () => {
    renderWithAppProviders(
      <MatchDetailsTabContent
        activeTab="lineups"
        lifecycleState="finished"
        fixture={fixture}
        events={[]}
        statistics={[]}
        lineupTeams={[
          {
            teamId: '1',
            teamName: 'Home',
            teamLogo: '',
            coach: 'Coach A',
            formation: '4-3-3',
            startingXI: [{ id: '10', name: 'Starter One', number: 9, position: 'F', grid: '1:1' }],
            substitutes: [],
            reserves: [],
            absences: [],
          },
        ]}
        predictions={null}
        winPercent={{ home: '40%', draw: '30%', away: '30%' }}
        homePlayersStats={[]}
        awayPlayersStats={[]}
        standings={null}
        homeTeamId="1"
        awayTeamId="2"
        headToHead={[]}
        isLiveRefreshing={false}
        datasetErrors={{ absences: true }}
        datasetErrorReasons={{ absences: 'endpoint_not_available' }}
      />,
    );

    expect(screen.queryByText(i18n.t('matchDetails.lineups.absencesDetailedTitle'))).toBeNull();
    expect(screen.queryByText(i18n.t('matchDetails.states.datasetErrorsUnsupported.absences'))).toBeNull();
  });
});
