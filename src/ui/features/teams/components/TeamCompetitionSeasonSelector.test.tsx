import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';

import { TeamCompetitionSeasonSelector } from '@ui/features/teams/components/TeamCompetitionSeasonSelector';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

describe('TeamCompetitionSeasonSelector', () => {
  const competitions = [
    {
      leagueId: '39',
      leagueName: 'Premier League',
      leagueLogo: null,
      type: 'League',
      country: 'England',
      seasons: [2025, 2024],
      currentSeason: 2025,
    },
    {
      leagueId: '2',
      leagueName: 'Champions League',
      leagueLogo: null,
      type: 'Cup',
      country: 'Europe',
      seasons: [2025, 2024],
      currentSeason: 2025,
    },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders selected competition and season in trigger', () => {
    renderWithAppProviders(
      <TeamCompetitionSeasonSelector
        competitions={competitions}
        selectedLeagueId="39"
        selectedSeason={2025}
        onSelect={jest.fn()}
        modalTitle="Season selection"
        doneLabel="Done"
      />,
    );

    expect(screen.getByText('Premier League')).toBeTruthy();
    expect(screen.getByText('2025/2026')).toBeTruthy();
  });

  it('opens modal grouped by season', () => {
    renderWithAppProviders(
      <TeamCompetitionSeasonSelector
        competitions={competitions}
        selectedLeagueId="39"
        selectedSeason={2025}
        onSelect={jest.fn()}
        modalTitle="Season selection"
        doneLabel="Done"
      />,
    );

    fireEvent.press(screen.getByTestId('team-competition-season-trigger'));

    expect(screen.getByText('Season selection')).toBeTruthy();
    expect(screen.getAllByText('2025/2026').length).toBeGreaterThan(0);
    expect(screen.getByText('2024/2025')).toBeTruthy();
    expect(screen.getAllByText('Champions League').length).toBeGreaterThan(0);
  });

  it('selects competition and season together', () => {
    const onSelect = jest.fn();

    renderWithAppProviders(
      <TeamCompetitionSeasonSelector
        competitions={competitions}
        selectedLeagueId="39"
        selectedSeason={2025}
        onSelect={onSelect}
        modalTitle="Season selection"
        doneLabel="Done"
      />,
    );

    fireEvent.press(screen.getByTestId('team-competition-season-trigger'));
    fireEvent.press(screen.getByTestId('team-competition-season-option-2-2024'));
    act(() => {
      jest.runAllTimers();
    });

    expect(onSelect).toHaveBeenCalledWith('2', 2024);
  });
});
