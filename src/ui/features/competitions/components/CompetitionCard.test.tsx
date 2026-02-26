import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { CompetitionCard } from '@ui/features/competitions/components/CompetitionCard';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

describe('CompetitionCard', () => {
  it('prevents press and shows lock reason when disabled', () => {
    const onPress = jest.fn();

    renderWithAppProviders(
      <CompetitionCard
        name="Ligue 1"
        logoUrl=""
        onPress={onPress}
        disabled
        disabledReason="No data"
      />,
    );

    expect(screen.getByText('No data')).toBeTruthy();
    fireEvent.press(screen.getByText('Ligue 1'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows checking indicator when availability is being resolved', () => {
    renderWithAppProviders(
      <CompetitionCard
        name="Ligue 1"
        logoUrl=""
        isCheckingAvailability
        disabledReason="Checking..."
      />,
    );

    expect(screen.getByText('Checking...')).toBeTruthy();
  });
});
