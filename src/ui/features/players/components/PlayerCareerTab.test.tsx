import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { PlayerCareerTab } from '@ui/features/players/components/PlayerCareerTab';
import type {
  PlayerCareerSeason,
  PlayerCareerTeam,
} from '@ui/features/players/types/players.types';
import i18n from '@ui/shared/i18n';
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

    expect(screen.getByText(i18n.t('playerDetails.career.labels.professionalCareer'))).toBeTruthy();
    expect(screen.getByText('2025/2026')).toBeTruthy();
    expect(screen.getByText(/7[,.]8/)).toBeTruthy();

    fireEvent.press(screen.getByText(i18n.t('playerDetails.career.tabs.team')));

    expect(screen.getByText(i18n.t('playerDetails.career.labels.nationalTeam'))).toBeTruthy();
    expect(screen.getByText('2023 - 2025')).toBeTruthy();
    expect(screen.getByText('2003 - 2025')).toBeTruthy();
    expect(screen.getByText(i18n.t('playerDetails.career.labels.matchesPlayed'))).toBeTruthy();
    expect(screen.getByText(i18n.t('playerDetails.career.labels.goals'))).toBeTruthy();

    fireEvent.press(screen.getByText(i18n.t('playerDetails.career.tabs.season')));
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

  it('sorts teams by latest career period end year (not period start)', () => {
    const { toJSON } = renderWithAppProviders(
      <PlayerCareerTab
        seasons={seasons}
        teams={[
          {
            team: {
              id: '100',
              name: 'Long Cycle FC',
              logo: null,
            },
            period: '2020 - 2025',
            matches: 30,
            goals: 12,
            assists: 4,
          },
          {
            team: {
              id: '101',
              name: 'Short Cycle FC',
              logo: null,
            },
            period: '2024 - 2024',
            matches: 42,
            goals: 25,
            assists: 7,
          },
        ]}
      />,
    );

    fireEvent.press(screen.getByText(i18n.t('playerDetails.career.tabs.team')));

    const renderedTree = JSON.stringify(toJSON());
    const longCycleIndex = renderedTree.indexOf('Long Cycle FC');
    const shortCycleIndex = renderedTree.indexOf('Short Cycle FC');

    expect(longCycleIndex).toBeGreaterThanOrEqual(0);
    expect(shortCycleIndex).toBeGreaterThanOrEqual(0);
    expect(longCycleIndex).toBeLessThan(shortCycleIndex);
  });
});
