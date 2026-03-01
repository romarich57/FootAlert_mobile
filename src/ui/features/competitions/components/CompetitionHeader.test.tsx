import React from 'react';
import { StyleSheet } from 'react-native';
import { screen } from '@testing-library/react-native';

import { CompetitionHeader } from '@ui/features/competitions/components/CompetitionHeader';
import type { Competition } from '@ui/features/competitions/types/competitions.types';
import i18n from '@ui/shared/i18n';
import { MIN_TOUCH_TARGET } from '@ui/shared/theme/theme';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

const competition: Competition = {
  id: '61',
  name: 'Ligue 1',
  logo: '',
  type: 'League',
  countryName: 'France',
};

describe('CompetitionHeader', () => {
  it('enforces touch target on season selector with button semantics', () => {
    renderWithAppProviders(
      <CompetitionHeader
        competition={competition}
        currentSeason={2025}
        availableSeasons={[2025, 2024]}
        isFollowed={false}
        onBack={jest.fn()}
        onToggleFollow={jest.fn()}
        onOpenSeasonPicker={jest.fn()}
      />,
    );

    const label = i18n.t('competitionDetails.labels.season', { start: 2025, end: 2026 });
    const seasonTrigger = screen.getByLabelText(label);
    const triggerStyle = StyleSheet.flatten(seasonTrigger.props.style);

    expect(seasonTrigger.props.accessibilityRole).toBe('button');
    expect(triggerStyle.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });
});
