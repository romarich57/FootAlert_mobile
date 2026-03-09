import React from 'react';
import { act, render } from '@testing-library/react-native';

import { SplashScreen } from '@ui/features/onboarding/screens/SplashScreen';
import type { MobileValidationMode } from '@data/config/env';

const mockAppEnv = {
  mobileValidationMode: 'off' as MobileValidationMode,
};

const mockIsOnboardingCompleted = jest.fn(async () => false);

jest.mock('@data/config/env', () => ({
  isMobileValidationMode: (mode: Exclude<MobileValidationMode, 'off'>) =>
    mockAppEnv.mobileValidationMode === mode,
}));

jest.mock('@data/storage/onboardingStorage', () => ({
  isOnboardingCompleted: () => mockIsOnboardingCompleted(),
}));

jest.mock('@ui/app/providers/ThemeProvider', () => ({
  useAppTheme: () => ({
    colors: {
      background: '#000000',
      primary: '#00ff00',
      text: '#ffffff',
      textMuted: '#999999',
    },
  }),
}));

describe('SplashScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockAppEnv.mobileValidationMode = 'off';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('bypasses onboarding in maestro validation mode', async () => {
    mockAppEnv.mobileValidationMode = 'maestro';
    const navigation = {
      replace: jest.fn(),
      isFocused: jest.fn(() => true),
    };

    render(
      <SplashScreen
        navigation={navigation as never}
        route={{ key: 'Splash', name: 'Splash' } as never}
      />,
    );

    await act(async () => {
      jest.runAllTimers();
      await Promise.resolve();
    });

    expect(navigation.replace).toHaveBeenCalledWith('MainTabs', {
      screen: 'Matches',
    });
    expect(mockIsOnboardingCompleted).not.toHaveBeenCalled();
  });

  it('does not override a deeplink flow once splash is no longer focused', async () => {
    mockAppEnv.mobileValidationMode = 'maestro';
    const navigation = {
      replace: jest.fn(),
      isFocused: jest.fn(() => false),
    };

    render(
      <SplashScreen
        navigation={navigation as never}
        route={{ key: 'Splash', name: 'Splash' } as never}
      />,
    );

    await act(async () => {
      jest.runAllTimers();
      await Promise.resolve();
    });

    expect(navigation.replace).not.toHaveBeenCalled();
    expect(mockIsOnboardingCompleted).not.toHaveBeenCalled();
  });
});
