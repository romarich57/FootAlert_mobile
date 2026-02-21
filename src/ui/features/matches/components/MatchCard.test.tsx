import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { AppThemeProvider } from '@ui/app/providers/ThemeProvider';
import { MatchCard } from '@ui/features/matches/components/MatchCard';
import type { MatchItem } from '@ui/features/matches/types/matches.types';
import '@ui/shared/i18n';

const baseMatch: MatchItem = {
  fixtureId: '10',
  competitionId: '61',
  competitionName: 'Ligue 1',
  competitionLogo: '',
  competitionCountry: 'France',
  startDate: '2026-02-19T20:00:00+00:00',
  minute: 74,
  venue: 'Stade Velodrome',
  status: 'live',
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
};

function renderCard(match: MatchItem) {
  return render(
    <AppThemeProvider>
      <MatchCard match={match} onPress={jest.fn()} onPressNotification={jest.fn()} />
    </AppThemeProvider>,
  );
}

describe('MatchCard', () => {
  it('shows fallback logos when team logos are missing', () => {
    renderCard({
      ...baseMatch,
      homeTeamLogo: '',
      awayTeamLogo: '',
    });

    expect(screen.getByTestId('match-team-logo-fallback-home-10')).toBeTruthy();
    expect(screen.getByTestId('match-team-logo-fallback-away-10')).toBeTruthy();
  });

  it('renders score values for live matches', () => {
    renderCard(baseMatch);

    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
  });
});
