import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { PlayerCareerTab } from '@ui/features/players/components/PlayerCareerTab';
import type {
  PlayerCareerSeason,
  PlayerCareerTeam,
} from '@ui/features/players/types/players.types';
import '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

const seasons: PlayerCareerSeason[] = [
  {
    season: '2025',
    team: {
      id: '10',
      name: 'Al Nassr FC',
      logo: 'https://example.com/alnassr.png',
    },
    matches: 24,
    goals: 21,
    assists: 3,
    rating: '7.84',
  },
  {
    season: '2024',
    team: {
      id: '11',
      name: 'Man United',
      logo: 'https://example.com/manutd.png',
    },
    matches: 16,
    goals: 3,
    assists: null,
    rating: null,
  },
];

const teams: PlayerCareerTeam[] = [
  {
    team: {
      id: '10',
      name: 'Al Nassr FC',
      logo: 'https://example.com/alnassr.png',
    },
    period: '2023 - 2025',
    matches: 116,
    goals: 85,
    assists: 19,
  },
  {
    team: {
      id: '999',
      name: 'Portugal',
      logo: 'https://example.com/portugal.png',
    },
    period: '2003 - 2025',
    matches: 226,
    goals: 143,
    assists: 44,
  },
];

describe('PlayerCareerTab', () => {
  it('switches between season and team views and renders proper sections', () => {
    renderWithAppProviders(
      <PlayerCareerTab
        seasons={seasons}
        teams={teams}
        nationality="Portugal"
      />,
    );

    expect(screen.getByText('Carrière professionnelle')).toBeTruthy();
    expect(screen.getByText('2025/2026')).toBeTruthy();
    expect(screen.getByText(/7[,.]8/)).toBeTruthy();

    fireEvent.press(screen.getByText('Équipe'));

    expect(screen.getByText('Équipe nationale')).toBeTruthy();
    expect(screen.getByText('2023 - 2025')).toBeTruthy();
    expect(screen.getByText('2003 - 2025')).toBeTruthy();
    expect(screen.getByText('MATCHS JOUÉS')).toBeTruthy();
    expect(screen.getByText('BUTS')).toBeTruthy();

    fireEvent.press(screen.getByText('Saison'));
    expect(screen.getByText('2025/2026')).toBeTruthy();
  });

  it('does not render placeholder fallback values when data is missing', () => {
    renderWithAppProviders(
      <PlayerCareerTab
        seasons={seasons}
        teams={teams}
      />,
    );

    expect(screen.queryByText('-')).toBeNull();
  });
});
