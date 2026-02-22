import { Linking, Platform } from 'react-native';

import {
  openStoreReviewPage,
  requestInAppReviewWithFallback,
} from '@data/reviews/inAppReview';

jest.mock('react-native-in-app-review', () => ({
  isAvailable: jest.fn(() => true),
  RequestInAppReview: jest.fn(() => true),
}), { virtual: true });

const mockedLinking = Linking as jest.Mocked<typeof Linking>;
const mockedInAppReview = require('react-native-in-app-review') as {
  isAvailable: jest.Mock;
  RequestInAppReview: jest.Mock;
};

describe('inAppReview', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedLinking.canOpenURL = jest.fn(async (_url: string) => true);
    mockedLinking.openURL = jest.fn(async (_url: string) => undefined);
    mockedInAppReview.isAvailable.mockReturnValue(true);
    mockedInAppReview.RequestInAppReview.mockReturnValue(true);
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatform,
    });
  });

  it('opens app store URL on iOS', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    });

    const result = await openStoreReviewPage({
      appStoreUrl: 'https://apps.apple.com/app/id123',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.footalert.app',
    });

    expect(result).toBe(true);
    expect(mockedLinking.openURL).toHaveBeenCalledWith('https://apps.apple.com/app/id123');
  });

  it('opens play store URL on Android', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });

    const result = await openStoreReviewPage({
      appStoreUrl: 'https://apps.apple.com/app/id123',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.footalert.app',
    });

    expect(result).toBe(true);
    expect(mockedLinking.openURL).toHaveBeenCalledWith(
      'https://play.google.com/store/apps/details?id=com.footalert.app',
    );
  });

  it('returns prompted when native review is available', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    });

    const result = await requestInAppReviewWithFallback({
      appStoreUrl: 'https://apps.apple.com/app/id123',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.footalert.app',
    });

    expect(result).toBe('prompted');
  });

  it('falls back to store URL when native review is not available', async () => {
    mockedInAppReview.isAvailable.mockReturnValue(false);

    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    });

    const result = await requestInAppReviewWithFallback({
      appStoreUrl: 'https://apps.apple.com/app/id123',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.footalert.app',
    });

    expect(result).toBe('fallback_store');
  });
});
