import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { AppPressable } from '@ui/shared/components/AppPressable';
import { DEFAULT_HIT_SLOP, MIN_TOUCH_TARGET } from '@ui/shared/theme/theme';

describe('AppPressable', () => {
  it('enforces accessibility contract and minimum touch target', () => {
    render(
      <AppPressable accessibilityRole="button" accessibilityLabel="Retry">
        <Text>Retry</Text>
      </AppPressable>,
    );

    const button = screen.getByLabelText('Retry');
    const flattenedStyle = StyleSheet.flatten(button.props.style);

    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.hitSlop).toBe(DEFAULT_HIT_SLOP);
    expect(flattenedStyle.minWidth).toBe(MIN_TOUCH_TARGET);
    expect(flattenedStyle.minHeight).toBe(MIN_TOUCH_TARGET);
  });
});
