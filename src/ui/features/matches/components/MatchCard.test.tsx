import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { MatchCard } from '@ui/features/matches/components/MatchCard';
import type { MatchItem } from '@ui/features/matches/types/matches.types';
import '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

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
  const onPress = jest.fn();
  const onPressNotification = jest.fn();
  const onPressHomeTeam = jest.fn();
  const onPressAwayTeam = jest.fn();

  return renderWithAppProviders(
    <MatchCard
      match={match}
      onPress={onPress}
      onPressNotification={onPressNotification}
      onToggleFollow={jest.fn()}
      isFollowed={false}
      onPressHomeTeam={onPressHomeTeam}
      onPressAwayTeam={onPressAwayTeam}
    />,
  );
}

describe('MatchCard', () => {
  it('shows neutral logo placeholders when team logos are missing', () => {
    renderCard({
      ...baseMatch,
      homeTeamLogo: '',
      awayTeamLogo: '',
    });

    expect(screen.getByTestId('match-team-logo-placeholder-home-10')).toBeTruthy();
    expect(screen.getByTestId('match-team-logo-placeholder-away-10')).toBeTruthy();
  });

  it('renders score values for live matches', () => {
    renderCard(baseMatch);

    expect(screen.getByText('2 - 1')).toBeTruthy();
  });

  it('triggers dedicated team callbacks without opening match details', () => {
    const onPress = jest.fn();
    const onPressHomeTeam = jest.fn();
    const onPressAwayTeam = jest.fn();

    renderWithAppProviders(
      <MatchCard
        match={baseMatch}
        onPress={onPress}
        onPressNotification={jest.fn()}
        onToggleFollow={jest.fn()}
        isFollowed={false}
        onPressHomeTeam={onPressHomeTeam}
        onPressAwayTeam={onPressAwayTeam}
      />,
    );

    fireEvent.press(screen.getByText('Paris SG'));
    fireEvent.press(screen.getByText('Marseille'));

    expect(onPressHomeTeam).toHaveBeenCalledWith('85');
    expect(onPressAwayTeam).toHaveBeenCalledWith('81');
    expect(onPress).not.toHaveBeenCalled();
  });
});
