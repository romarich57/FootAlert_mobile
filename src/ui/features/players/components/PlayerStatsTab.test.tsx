import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PlayerStatsTab } from '@ui/features/players/components/PlayerStatsTab';
import type { PlayerSeasonStats } from '@ui/features/players/types/players.types';
import type { TeamCompetitionOption } from '@ui/features/teams/types/teams.types';
import '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

jest.mock('@ui/features/players/components/StatBar', () => ({
  StatBar: () => null,
}));

const emptyStats: PlayerSeasonStats = {
  matches: null,
  starts: null,
  minutes: null,
  goals: null,
  assists: null,
  rating: null,
  shots: null,
  shotsOnTarget: null,
  penaltyGoals: null,
  passes: null,
  passesAccuracy: null,
  keyPasses: null,
  dribblesAttempts: null,
  dribblesSuccess: null,
  tackles: null,
  interceptions: null,
  blocks: null,
  duelsTotal: null,
  duelsWon: null,
  foulsCommitted: null,
  foulsDrawn: null,
  yellowCards: null,
  redCards: null,
  dribblesBeaten: null,
  saves: null,
  goalsConceded: null,
  penaltiesWon: null,
  penaltiesMissed: null,
  penaltiesCommitted: null,
};

const competitions: TeamCompetitionOption[] = [
  {
    leagueId: '39',
    leagueName: 'Premier League',
    leagueLogo: 'https://example.com/premier-league.png',
    type: 'League',
    country: 'England',
    seasons: [2025, 2024],
    currentSeason: 2025,
  },
  {
    leagueId: '2',
    leagueName: 'UEFA Champions League',
    leagueLogo: 'https://example.com/ucl.png',
    type: 'Cup',
    country: null,
    seasons: [2024],
    currentSeason: 2024,
  },
];

describe('PlayerStatsTab', () => {
  it('renders competition season selector and forwards selected option', async () => {
    const onSelectLeagueSeason = jest.fn();

    renderWithAppProviders(
      <PlayerStatsTab
        stats={emptyStats}
        leagueName="Premier League"
        competitions={competitions}
        selectedSeason={2025}
        selectedLeagueId="39"
        onSelectLeagueSeason={onSelectLeagueSeason}
      />,
    );

    expect(screen.getByTestId('team-competition-season-trigger')).toBeTruthy();

    fireEvent.press(screen.getByTestId('team-competition-season-trigger'));
    fireEvent.press(screen.getByTestId('team-competition-season-option-39-2024'));

    await waitFor(() => {
      expect(onSelectLeagueSeason).toHaveBeenCalledWith('39', 2024);
    });
  });
});
