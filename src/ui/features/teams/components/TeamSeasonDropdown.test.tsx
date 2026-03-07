import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';

import { TeamSeasonDropdown } from '@ui/features/teams/components/TeamSeasonDropdown';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

describe('TeamSeasonDropdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('closes the modal before applying the new season', () => {
    const onSelectSeason = jest.fn();

    renderWithAppProviders(
      <TeamSeasonDropdown
        seasons={[2025, 2024]}
        selectedSeason={2025}
        onSelectSeason={onSelectSeason}
        label="Season"
      />,
    );

    fireEvent.press(screen.getByText('2025/2026'));
    fireEvent.press(screen.getByText('2024/2025'));

    expect(onSelectSeason).not.toHaveBeenCalled();

    act(() => {
      jest.runAllTimers();
    });

    expect(onSelectSeason).toHaveBeenCalledWith(2024);
  });
});
