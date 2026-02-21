import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { AppThemeProvider } from '@ui/app/providers/ThemeProvider';
import { CompetitionSection } from '@ui/features/matches/components/CompetitionSection';
import type { CompetitionSection as CompetitionSectionType } from '@ui/features/matches/types/matches.types';
import '@ui/shared/i18n';

const baseSection: CompetitionSectionType = {
  id: '61',
  name: 'Ligue 1',
  logo: '',
  country: 'France',
  matches: [],
};

function renderSection(section: CompetitionSectionType) {
  return render(
    <AppThemeProvider>
      <CompetitionSection
        section={section}
        collapsed
        onToggle={jest.fn()}
        onPressMatch={jest.fn()}
        onPressNotification={jest.fn()}
      />
    </AppThemeProvider>,
  );
}

describe('CompetitionSection', () => {
  it('shows the TOP badge only for top competitions', () => {
    renderSection({
      ...baseSection,
      isTopCompetition: true,
    });

    expect(screen.getByText('TOP')).toBeTruthy();
  });

  it('does not show TOP badge for non-top competitions', () => {
    renderSection({
      ...baseSection,
      id: '999',
      name: 'National League',
      isTopCompetition: false,
    });

    expect(screen.queryByText('TOP')).toBeNull();
  });
});
