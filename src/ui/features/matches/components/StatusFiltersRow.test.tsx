import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { StatusFiltersRow } from '@ui/features/matches/components/StatusFiltersRow';
import { renderWithAppProviders } from '@ui/shared/testing/renderWithAppProviders';
import i18n from '@ui/shared/i18n';
import {
  DEFAULT_HIT_SLOP,
  MIN_TOUCH_TARGET,
} from '@ui/shared/theme/theme';

describe('StatusFiltersRow', () => {
  it('applies minimum touch target and selected accessibility state', () => {
    const onFilterChange = jest.fn();

    renderWithAppProviders(
      <StatusFiltersRow filter="all" onFilterChange={onFilterChange} />,
    );

    const allChip = screen.getByLabelText(i18n.t('matches.filters.all'));
    const flattenedStyle = StyleSheet.flatten(allChip.props.style);

    expect(allChip.props.accessibilityRole).toBe('button');
    expect(allChip.props.hitSlop).toBe(DEFAULT_HIT_SLOP);
    expect(allChip.props.accessibilityState).toEqual({ selected: true });
    expect(flattenedStyle.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });

  it('triggers filter change when pressing a chip', () => {
    const onFilterChange = jest.fn();

    renderWithAppProviders(
      <StatusFiltersRow filter="all" onFilterChange={onFilterChange} />,
    );

    fireEvent.press(screen.getByLabelText(i18n.t('matches.filters.live')));
    expect(onFilterChange).toHaveBeenCalledWith('live');
  });
});
