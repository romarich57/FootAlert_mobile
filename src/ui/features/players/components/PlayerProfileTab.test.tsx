import React from 'react';
import { screen } from '@testing-library/react-native';

import { PlayerProfileTab } from '@ui/features/players/components/PlayerProfileTab';
import type {
  PlayerPositionsData,
  PlayerProfile,
  PlayerProfileCompetitionStats,
  PlayerTrophiesByClub,
} from '@ui/features/players/types/players.types';
import '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

const baseProfile: PlayerProfile = {
  id: '278',
  name: 'Vinicius Junior',
  photo: 'https://example.com/vini.png',
  position: 'Attacker',
  age: 25,
  height: '177 cm',
  weight: '73 kg',
  nationality: 'Brazil',
  dateOfBirth: '2000-07-12',
  number: 7,
  foot: null,
  transferValue: null,
  team: {
    id: '541',
    name: 'Real Madrid',
    logo: 'https://example.com/realmadrid.png',
  },
  league: {
    id: '140',
    name: 'LaLiga',
    logo: 'https://example.com/laliga.png',
    season: 2025,
  },
};

const competitionStats: PlayerProfileCompetitionStats = {
  leagueId: '140',
  leagueName: 'LaLiga',
  leagueLogo: 'https://example.com/laliga.png',
  season: 2025,
  matches: 24,
  goals: 9,
  assists: 5,
  rating: '7.65',
};

const positions: PlayerPositionsData = {
  primary: {
    id: 'lw',
    code: 'LW',
    shortLabel: 'AG',
    label: 'Left Winger',
    x: 20,
    y: 26,
    appearances: 20,
    minutes: 1500,
    score: 21500,
    isPrimary: true,
  },
  others: [
    {
      id: 'att',
      code: 'ATT',
      shortLabel: 'ATT',
      label: 'Attacker',
      x: 50,
      y: 12,
      appearances: 12,
      minutes: 820,
      score: 12820,
      isPrimary: false,
    },
  ],
  all: [
    {
      id: 'lw',
      code: 'LW',
      shortLabel: 'AG',
      label: 'Left Winger',
      x: 20,
      y: 26,
      appearances: 20,
      minutes: 1500,
      score: 21500,
      isPrimary: true,
    },
    {
      id: 'att',
      code: 'ATT',
      shortLabel: 'ATT',
      label: 'Attacker',
      x: 50,
      y: 12,
      appearances: 12,
      minutes: 820,
      score: 12820,
      isPrimary: false,
    },
  ],
};

const trophiesByClub: PlayerTrophiesByClub = [
  {
    clubId: '541',
    clubName: 'Real Madrid',
    clubLogo: 'https://example.com/realmadrid.png',
    total: 3,
    competitions: [
      {
        competition: 'LaLiga',
        country: 'Spain',
        count: 2,
        seasons: ['2023/24', '2021/22'],
      },
      {
        competition: 'UEFA Champions League',
        country: 'Europe',
        count: 1,
        seasons: ['2023/24'],
      },
    ],
  },
  {
    clubId: '127',
    clubName: 'Flamengo',
    clubLogo: 'https://example.com/flamengo.png',
    total: 1,
    competitions: [
      {
        competition: 'Carioca',
        country: 'Brazil',
        count: 1,
        seasons: ['2017'],
      },
    ],
  },
];

describe('PlayerProfileTab', () => {
  it('hides dominant foot and market value tiles when values are missing', () => {
    renderWithAppProviders(
      <PlayerProfileTab
        profile={baseProfile}
        competitionStats={competitionStats}
        characteristics={null}
        positions={positions}
        trophiesByClub={trophiesByClub}
      />,
    );

    expect(screen.getByTestId('player-profile-info-height')).toBeTruthy();
    expect(screen.getByTestId('player-profile-info-age')).toBeTruthy();
    expect(screen.getByTestId('player-profile-info-country')).toBeTruthy();
    expect(screen.getByTestId('player-profile-flag-country').props.source.uri).toContain('/br.png');
    expect(screen.getByTestId('player-profile-info-number')).toBeTruthy();
    expect(screen.queryByTestId('player-profile-info-dominantFoot')).toBeNull();
    expect(screen.queryByTestId('player-profile-info-marketValue')).toBeNull();
  });

  it('renders competition stats block with matches, goals, assists and rating', () => {
    renderWithAppProviders(
      <PlayerProfileTab
        profile={baseProfile}
        competitionStats={competitionStats}
        characteristics={null}
        positions={positions}
        trophiesByClub={trophiesByClub}
      />,
    );

    expect(screen.getByTestId('player-profile-competition-stats')).toBeTruthy();
    expect(screen.getByTestId('player-profile-competition-matches-value').props.children).toBe('24');
    expect(screen.getByTestId('player-profile-competition-goals-value').props.children).toBe('9');
    expect(screen.getByTestId('player-profile-competition-assists-value').props.children).toBe('5');
    expect(screen.getByTestId('player-profile-competition-rating-value').props.children).toBe('7.65');
  });

  it('shows or hides position section depending on data availability', () => {
    const { rerender } = renderWithAppProviders(
      <PlayerProfileTab
        profile={baseProfile}
        competitionStats={competitionStats}
        characteristics={null}
        positions={positions}
        trophiesByClub={trophiesByClub}
      />,
    );

    expect(screen.getByTestId('player-profile-position-section')).toBeTruthy();

    rerender(
      <PlayerProfileTab
        profile={baseProfile}
        competitionStats={competitionStats}
        characteristics={null}
        positions={null}
        trophiesByClub={trophiesByClub}
      />,
    );

    expect(screen.queryByTestId('player-profile-position-section')).toBeNull();
  });

  it('renders trophies grouped by club', () => {
    renderWithAppProviders(
      <PlayerProfileTab
        profile={baseProfile}
        competitionStats={competitionStats}
        characteristics={null}
        positions={positions}
        trophiesByClub={trophiesByClub}
      />,
    );

    expect(screen.getByTestId('player-profile-trophies-section')).toBeTruthy();
    expect(screen.getByText('Real Madrid')).toBeTruthy();
    expect(screen.getByText('Flamengo')).toBeTruthy();
    expect(screen.getAllByText('LaLiga').length).toBeGreaterThan(0);
    expect(screen.getByText('UEFA Champions League')).toBeTruthy();
    expect(screen.getByText('Carioca')).toBeTruthy();
  });
});
