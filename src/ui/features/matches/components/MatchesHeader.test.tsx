import React from 'react';
import { StyleSheet } from 'react-native';
import { screen } from '@testing-library/react-native';

import { MatchesHeader } from '@ui/features/matches/components/MatchesHeader';
import i18n from '@ui/shared/i18n';
import { MIN_TOUCH_TARGET } from '@ui/shared/theme/theme';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';

describe('MatchesHeader', () => {
  it('keeps action buttons at or above the minimum touch target', () => {
    renderWithAppProviders(
      <MatchesHeader
        onPressCalendar={jest.fn()}
        onPressSearch={jest.fn()}
        onPressNotifications={jest.fn()}
        onPressManageHidden={jest.fn()}
      />,
    );

    const calendarButton = screen.getByTestId('matches-header-calendar-button');
    const style = StyleSheet.flatten(calendarButton.props.style);

    expect(style.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(style.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(screen.getByLabelText(i18n.t('matches.actions.openCalendar'))).toBeTruthy();
    expect(screen.getByLabelText(i18n.t('matches.actions.openSearch'))).toBeTruthy();
    expect(screen.getByLabelText(i18n.t('matches.actions.openNotifications'))).toBeTruthy();
  });
});
