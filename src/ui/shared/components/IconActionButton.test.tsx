import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { IconActionButton } from '@ui/shared/components/IconActionButton';
import { MIN_TOUCH_TARGET } from '@ui/shared/theme/theme';

describe('IconActionButton', () => {
  it('enforces button role and minimum touch target size', () => {
    render(
      <IconActionButton accessibilityLabel="Back action" size={32}>
        <Text>Icon</Text>
      </IconActionButton>,
    );

    const button = screen.getByLabelText('Back action');
    const flattenedStyle = StyleSheet.flatten(button.props.style);

    expect(button.props.accessibilityRole).toBe('button');
    expect(flattenedStyle.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(flattenedStyle.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });
});
