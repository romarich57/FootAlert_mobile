import React from 'react';
import { screen } from '@testing-library/react-native';

import { CompetitionSection } from '@ui/features/matches/components/CompetitionSection';
import type { CompetitionSection as CompetitionSectionType } from '@ui/features/matches/types/matches.types';
import '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

const baseSection: CompetitionSectionType = {
  id: '61',
  name: 'Ligue 1',
  logo: '',
  country: 'France',
  matches: [],
};

function renderSection(section: CompetitionSectionType) {
  return renderWithAppProviders(
    <CompetitionSection
      section={section}
      collapsed
      onToggle={jest.fn()}
      onPressMatch={jest.fn()}
      onToggleMatchFollow={jest.fn()}
      isMatchFollowed={() => false}
      onPressNotification={jest.fn()}
    />,
  );
}

describe('CompetitionSection', () => {
  it('displays the competition title correctly', () => {
    renderSection({
      ...baseSection,
      country: 'France',
      name: 'Ligue 1',
    });

    // Translation fallback to country name
    expect(screen.getByText('France - Ligue 1')).toBeTruthy();
  });
});
