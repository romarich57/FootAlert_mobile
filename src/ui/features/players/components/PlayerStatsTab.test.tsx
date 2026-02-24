import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { PlayerStatsTab } from '@ui/features/players/components/PlayerStatsTab';
import type { PlayerSeasonStats } from '@ui/features/players/types/players.types';
import '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

jest.mock('@ui/features/players/components/ShotMap', () => ({
  ShotMap: () => null,
}));

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

describe('PlayerStatsTab', () => {
  it('renders league logo and allows selecting another season from the dropdown', () => {
    const onSelectSeason = jest.fn();

    renderWithAppProviders(
      <PlayerStatsTab
        stats={emptyStats}
        leagueName="Premier League"
        leagueLogo="https://example.com/premier-league.png"
        seasonText="2025/2026"
        seasons={[2025, 2024, 2023]}
        selectedSeason={2025}
        onSelectSeason={onSelectSeason}
      />,
    );

    expect(screen.getByTestId('player-stats-league-logo')).toBeTruthy();
    expect(screen.getByText('Premier League 2025/2026')).toBeTruthy();

    fireEvent.press(screen.getByTestId('player-stats-season-dropdown'));
    fireEvent.press(screen.getByTestId('player-stats-season-option-2024'));

    expect(onSelectSeason).toHaveBeenCalledWith(2024);
  });
});
