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
  const totw = {
    formation: '4-3-3',
    season: 2025,
    averageRating: 8.2,
    state: 'complete',
    placeholderSlots: [],
    players: createPlayers(),
  } as CompetitionTotwData & {
    state: 'complete' | 'partial' | 'unavailable';
    placeholderSlots: Array<{ role: CompetitionTotwRole; gridX: number; gridY: number; label: string }>;
  };

  const partialTotw = {
    formation: '4-3-3',
    season: 2025,
    averageRating: 7.9,
    state: 'partial',
    players: createPlayers().slice(0, 7),
    placeholderSlots: [
      { role: 'MID' as const, gridX: 74, gridY: 44, label: 'MIL' },
      { role: 'DEF' as const, gridX: 16, gridY: 68, label: 'DEF' },
      { role: 'DEF' as const, gridX: 38, gridY: 72, label: 'DEF' },
      { role: 'GK' as const, gridX: 50, gridY: 88, label: 'GB' },
    ],
  } as CompetitionTotwData & {
    state: 'complete' | 'partial' | 'unavailable';
    placeholderSlots: Array<{ role: CompetitionTotwRole; gridX: number; gridY: number; label: string }>;
  };

  const unavailableTotw = {
    formation: '4-3-3',
    season: 2025,
    averageRating: 0,
    state: 'unavailable',
    players: [],
    placeholderSlots: [],
  } as CompetitionTotwData & {
    state: 'complete' | 'partial' | 'unavailable';
    placeholderSlots: Array<{ role: CompetitionTotwRole; gridX: number; gridY: number; label: string }>;
  };

  it('renders title, formation and average rating', () => {
    renderWithAppProviders(<CompetitionTotwTab totw={totw} />);

    expect(screen.getByText(i18n.t('competitionDetails.totw.title'))).toBeTruthy();
    expect(screen.getByText('4-3-3')).toBeTruthy();
    expect(
      screen.getByText(i18n.t('competitionDetails.totw.averageRating', { value: '8.2' })),
    ).toBeTruthy();
  });

  it('renders 11 players with rating badges', () => {
    renderWithAppProviders(<CompetitionTotwTab totw={totw} />);

    expect(screen.getAllByTestId('competition-totw-player-node')).toHaveLength(11);
    expect(screen.getAllByTestId('competition-totw-rating-badge')).toHaveLength(11);
    expect(screen.queryByTestId('competition-totw-team-logo')).toBeNull();
  });

  it('does not display fallback unavailable content', () => {
    renderWithAppProviders(<CompetitionTotwTab totw={totw} />);

    expect(screen.queryByText(i18n.t('competitionDetails.totw.unavailable'))).toBeNull();
  });

  it('renders placeholder slots and partial badge when the TOTW is incomplete', () => {
    renderWithAppProviders(<CompetitionTotwTab totw={partialTotw} />);

    expect(screen.getAllByTestId('competition-totw-player-node')).toHaveLength(7);
    expect(screen.getAllByTestId('competition-totw-placeholder-node')).toHaveLength(4);
    expect(screen.getByText(i18n.t('competitionDetails.totw.partialBadge'))).toBeTruthy();
  });

  it('renders unavailable state when no exploitable TOTW exists', () => {
    renderWithAppProviders(<CompetitionTotwTab totw={unavailableTotw} />);

    expect(screen.getByText(i18n.t('competitionDetails.totw.unavailable'))).toBeTruthy();
    expect(screen.queryByTestId('competition-totw-player-node')).toBeNull();
  });
});
