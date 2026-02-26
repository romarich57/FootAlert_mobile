import React from 'react';
import { screen } from '@testing-library/react-native';

import { CompetitionTotwTab } from '@ui/features/competitions/components/CompetitionTotwTab';
import type { CompetitionTotwData, CompetitionTotwRole } from '@ui/features/competitions/types/competitions.types';
import i18n from '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

function createPlayers() {
  const roles: CompetitionTotwRole[] = [
    'ATT', 'ATT', 'ATT',
    'MID', 'MID', 'MID',
    'DEF', 'DEF', 'DEF', 'DEF',
    'GK',
  ];

  return roles.map((role, index) => ({
    playerId: index + 1,
    playerName: `Player ${index + 1}`,
    playerPhoto: `https://img/${index + 1}.png`,
    teamId: index + 100,
    teamName: `Team ${index + 1}`,
    teamLogo: `https://logo/${index + 1}.png`,
    position: role,
    role,
    rating: 8.2,
    gridX: 10 + index,
    gridY: 10 + index,
  }));
}

describe('CompetitionTotwTab', () => {
  const totw: CompetitionTotwData = {
    formation: '4-3-3',
    season: 2025,
    averageRating: 8.2,
    players: createPlayers(),
  };

  it('renders title, formation and average rating', () => {
    renderWithAppProviders(<CompetitionTotwTab totw={totw} />);

    expect(screen.getByText(i18n.t('competitionDetails.totw.title'))).toBeTruthy();
    expect(screen.getByText('4-3-3')).toBeTruthy();
    expect(
      screen.getByText(i18n.t('competitionDetails.totw.averageRating', { value: '8.2' })),
    ).toBeTruthy();
  });

  it('renders 11 players with rating badges and team logos', () => {
    renderWithAppProviders(<CompetitionTotwTab totw={totw} />);

    expect(screen.getAllByTestId('competition-totw-player-node')).toHaveLength(11);
    expect(screen.getAllByTestId('competition-totw-rating-badge')).toHaveLength(11);
    expect(screen.getAllByTestId('competition-totw-team-logo')).toHaveLength(11);
  });

  it('does not display fallback unavailable content', () => {
    renderWithAppProviders(<CompetitionTotwTab totw={totw} />);

    expect(screen.queryByText(i18n.t('competitionDetails.totw.unavailable'))).toBeNull();
  });
});
