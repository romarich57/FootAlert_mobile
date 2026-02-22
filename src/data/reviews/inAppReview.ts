import { Linking, Platform } from 'react-native';

type NativeInAppReviewModule = {
  isAvailable?: () => boolean | Promise<boolean>;
  RequestInAppReview?: () => boolean | Promise<boolean>;
};

type StoreUrls = {
  appStoreUrl?: string;
  playStoreUrl?: string;
};

export type ReviewRequestResult = 'prompted' | 'fallback_store' | 'unavailable';

function getNativeInAppReviewModule(): NativeInAppReviewModule | null {
  try {
    const module = require('react-native-in-app-review');
    return (module?.default ?? module) as NativeInAppReviewModule;
  } catch {
    return null;
  }
}

function resolveStoreUrl(urls: StoreUrls): string | undefined {
  if (Platform.OS === 'ios') {
    return urls.appStoreUrl;
  }

  if (Platform.OS === 'android') {
    return urls.playStoreUrl;
  }

  return undefined;
}

export async function openStoreReviewPage(urls: StoreUrls): Promise<boolean> {
  const storeUrl = resolveStoreUrl(urls);
  if (!storeUrl) {
    return false;
  }

  const canOpen = await Linking.canOpenURL(storeUrl);
  if (!canOpen) {
    return false;
  }

  await Linking.openURL(storeUrl);
  return true;
}

export async function requestInAppReviewWithFallback(urls: StoreUrls): Promise<ReviewRequestResult> {
  const module = getNativeInAppReviewModule();
  if (module?.isAvailable && module?.RequestInAppReview) {
    try {
      const isAvailable = await Promise.resolve(module.isAvailable());
      if (isAvailable) {
        const promptResult = await Promise.resolve(module.RequestInAppReview());
        if (promptResult !== false) {
          return 'prompted';
        }
      }
    } catch {
      // Fallback handled below.
    }
  }

  const didOpenStore = await openStoreReviewPage(urls);
  if (didOpenStore) {
    return 'fallback_store';
  }

  return 'unavailable';
}

