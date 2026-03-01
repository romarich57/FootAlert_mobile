import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { CompetitionTabs } from '@ui/features/competitions/components/CompetitionTabs';
import i18n from '@ui/shared/i18n';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

describe('CompetitionTabs', () => {
  it('uses tablist/tab accessibility semantics and keeps selected state', () => {
    const onTabChange = jest.fn();

    renderWithAppProviders(
      <CompetitionTabs
        activeTab="standings"
        tabs={['standings', 'matches']}
        onTabChange={onTabChange}
      />,
    );

    const tablist = screen.getByTestId('competition-tabs-tablist');
    const standingsTab = screen.getByLabelText(i18n.t('competitionDetails.tabs.standings'));
    const matchesTab = screen.getByLabelText(i18n.t('competitionDetails.tabs.matches'));

    expect(tablist.props.accessibilityRole).toBe('tablist');
    expect(standingsTab.props.accessibilityRole).toBe('tab');
    expect(standingsTab.props.accessibilityState).toEqual({ selected: true });
    expect(matchesTab.props.accessibilityState).toEqual({ selected: false });

    fireEvent.press(matchesTab);
    expect(onTabChange).toHaveBeenCalledWith('matches');
  });
});
