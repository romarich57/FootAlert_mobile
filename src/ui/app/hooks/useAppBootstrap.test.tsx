import { renderHook, waitFor } from '@testing-library/react-native';

import { useAppBootstrap } from '@ui/app/hooks/useAppBootstrap';
import { appEnv } from '@data/config/env';

const mockRegisterBackgroundRefresh = jest.fn(async () => undefined);
const mockRequestMobileConsentIfNeeded = jest.fn(async () => ({
  status: 'granted',
  source: 'stored',
}));
const mockRequestInAppReviewWithFallback = jest.fn(async () => 'unavailable');
const mockEvaluateDeviceIntegrity = jest.fn(async () => ({
  compromised: false,
  integrity: 'device',
  reasons: [],
  checkedAtMs: 0,
}));
const mockIncrementAppLaunchCount = jest.fn(async () => ({
  launchCount: 1,
  lastPromptedAppVersion: null,
}));
const mockIsReviewPromptEligible = jest.fn(() => false);
const mockMarkReviewPrompted = jest.fn(async () => undefined);
const mockTelemetry = {
  addBreadcrumb: jest.fn(),
  flush: jest.fn(async () => undefined),
  setUserContext: jest.fn(),
  trackBatch: jest.fn(),
  trackError: jest.fn(),
  trackEvent: jest.fn(),
};
const mockUseAppPreferences = jest.fn(() => ({
  isHydrated: true,
}));

jest.mock('@data/background/backgroundRefresh', () => ({
  registerBackgroundRefresh: mockRegisterBackgroundRefresh,
}));

jest.mock('@data/config/appMeta', () => ({
  getAppVersion: () => '1.0.0',
}));

jest.mock('@data/privacy/mobileConsent', () => ({
  requestMobileConsentIfNeeded: mockRequestMobileConsentIfNeeded,
}));

jest.mock('@data/reviews/inAppReview', () => ({
  requestInAppReviewWithFallback: mockRequestInAppReviewWithFallback,
}));

jest.mock('@data/security/deviceIntegrity', () => ({
  evaluateDeviceIntegrity: mockEvaluateDeviceIntegrity,
}));

jest.mock('@data/storage/reviewPromptStorage', () => ({
  incrementAppLaunchCount: mockIncrementAppLaunchCount,
  isReviewPromptEligible: mockIsReviewPromptEligible,
  markReviewPrompted: mockMarkReviewPrompted,
}));

jest.mock('@data/telemetry/mobileTelemetry', () => ({
  getMobileTelemetry: () => mockTelemetry,
}));

jest.mock('@ui/app/providers/AppPreferencesProvider', () => ({
  useAppPreferences: () => mockUseAppPreferences(),
}));

describe('useAppBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appEnv.mobileValidationMode = 'off';
  });

  it('skips deferred and opportunistic side effects in perf validation mode', async () => {
    appEnv.mobileValidationMode = 'perf';

    const { result } = renderHook(() => useAppBootstrap());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.bootError).toBeNull();
    expect(mockRequestMobileConsentIfNeeded).not.toHaveBeenCalled();
    expect(mockRegisterBackgroundRefresh).not.toHaveBeenCalled();
    expect(mockEvaluateDeviceIntegrity).not.toHaveBeenCalled();
    expect(mockIncrementAppLaunchCount).not.toHaveBeenCalled();
    expect(mockRequestInAppReviewWithFallback).not.toHaveBeenCalled();
    expect(mockTelemetry.addBreadcrumb).toHaveBeenCalledWith(
      'bootstrap.validation_mode_skipped',
      expect.objectContaining({
        mode: 'perf',
      }),
    );
  });
});
