import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { MatchDetailsTabs } from '@ui/features/matches/details/components/MatchDetailsTabs';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

describe('MatchDetailsTabs', () => {
  it('exposes tablist/tab semantics and selected state', () => {
    const onChangeTab = jest.fn();

    renderWithAppProviders(
      <MatchDetailsTabs
        tabs={[
          { key: 'primary', label: 'Summary' },
          { key: 'timeline', label: 'Timeline' },
        ]}
        activeTab="primary"
        onChangeTab={onChangeTab}
      />,
    );

    const tablist = screen.getByTestId('match-details-tablist');
    const timelineTab = screen.getByTestId('match-details-tab-timeline');
    const primaryTab = screen.getByTestId('match-details-tab-primary');

    expect(tablist.props.accessibilityRole).toBe('tablist');
    expect(primaryTab.props.accessibilityRole).toBe('tab');
    expect(primaryTab.props.accessibilityState).toEqual({ selected: true });
    expect(timelineTab.props.accessibilityState).toEqual({ selected: false });

    fireEvent.press(timelineTab);
    expect(onChangeTab).toHaveBeenCalledWith('timeline');
  });
});
