import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { FollowToggleButton } from '@ui/features/follows/components/FollowToggleButton';
import {
  DEFAULT_HIT_SLOP,
  MIN_TOUCH_TARGET,
} from '@ui/shared/theme/theme';

jest.mock('@ui/app/providers/ThemeProvider', () => ({
  useAppTheme: () => ({
    colors: {
      background: '#000000',
      surface: '#050505',
      surfaceElevated: '#101010',
      border: '#333333',
      text: '#ffffff',
      textMuted: '#9ca3af',
      primary: '#15F86A',
      primaryContrast: '#001008',
      success: '#15F86A',
      warning: '#F59E0B',
      danger: '#F87171',
      overlay: 'rgba(0,0,0,0.72)',
      skeleton: '#111111',
      cardBackground: '#070707',
      cardBorder: '#1E4D2F',
      chipBackground: '#07110A',
      chipBorder: '#1D6A3B',
      adGradientStart: '#0C8A44',
      adGradientEnd: '#020303',
    },
  }),
}));

describe('FollowToggleButton', () => {
  it('enforces minimum touch target and hit slop', () => {
    render(
      <FollowToggleButton
        isFollowing={false}
        onPress={() => undefined}
        followLabel="Follow"
        unfollowLabel="Following"
        accessibilityLabel="toggle follow"
      />,
    );

    const button = screen.getByLabelText('toggle follow');
    const flattenedStyle = StyleSheet.flatten(button.props.style);

    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.hitSlop).toBe(DEFAULT_HIT_SLOP);
    expect(flattenedStyle.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(flattenedStyle.minWidth).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });

  it('calls onPress and renders followed label', () => {
    const onPress = jest.fn();

    render(
      <FollowToggleButton
        isFollowing={true}
        onPress={onPress}
        followLabel="Follow"
        unfollowLabel="Following"
        accessibilityLabel="toggle follow"
      />,
    );

    fireEvent.press(screen.getByLabelText('toggle follow'));

    expect(screen.getByText('Following')).toBeTruthy();
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
