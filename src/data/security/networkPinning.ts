import { appEnv } from '@data/config/env';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';

type SslPublicKeyPinningModule = {
  initializeSslPinning: (config: Record<string, {
    includeSubdomains?: boolean;
    publicKeyHashes: string[];
  }>) => Promise<void>;
  isSslPinningAvailable: () => boolean;
  addSslPinningErrorListener?: (
    callback: (error: { serverHostname?: string; message?: string }) => void,
  ) => { remove: () => void };
};

declare global {
  // Test hook to inject a mock module in Jest without loading the native bridge.
  var __FOOTALERT_SSL_PINNING_MODULE__: SslPublicKeyPinningModule | undefined;
}

export class SslPinningSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SslPinningSetupError';
  }
}

let pinningInitialized = false;
let pinningInitPromise: Promise<void> | null = null;
let pinningErrorSubscriptionInstalled = false;
let pinningKillSwitchLogged = false;

function normalizePublicKeyHash(value: string): string {
  return value.startsWith('sha256/') ? value.slice('sha256/'.length) : value;
}

async function loadPinningModule(): Promise<SslPublicKeyPinningModule | null> {
  if (globalThis.__FOOTALERT_SSL_PINNING_MODULE__) {
    return globalThis.__FOOTALERT_SSL_PINNING_MODULE__;
  }

  try {
    const module = (await import('react-native-ssl-public-key-pinning')) as SslPublicKeyPinningModule;
    return module;
  } catch {
    return null;
  }
}

function shouldSkipPinningForUrl(url: string): boolean {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') {
    return true;
  }

  return parsed.host !== appEnv.mobilePinningHost;
}

export async function ensureSslPinning(url: string): Promise<void> {
  if (appEnv.mobilePinningKillSwitchAllow) {
    if (!pinningKillSwitchLogged) {
      getMobileTelemetry().addBreadcrumb('security.ssl_pinning.kill_switch_active', {
        host: appEnv.mobilePinningHost,
      });
      pinningKillSwitchLogged = true;
    }
    return;
  }

  if (!appEnv.mobilePinningEnabled || shouldSkipPinningForUrl(url)) {
    return;
  }

  if (pinningInitialized) {
    return;
  }

  if (!pinningInitPromise) {
    pinningInitPromise = (async () => {
      if (!appEnv.mobilePinningSpkiPrimary || !appEnv.mobilePinningSpkiBackup) {
        throw new SslPinningSetupError(
          'SSL pinning is enabled but SPKI pins are missing.',
        );
      }

      const module = await loadPinningModule();
      if (!module || typeof module.initializeSslPinning !== 'function') {
        throw new SslPinningSetupError(
          'SSL pinning module is unavailable.',
        );
      }

      if (typeof module.isSslPinningAvailable === 'function' && !module.isSslPinningAvailable()) {
        throw new SslPinningSetupError(
          'SSL pinning module is not available in this build.',
        );
      }

      await module.initializeSslPinning({
        [appEnv.mobilePinningHost]: {
          includeSubdomains: false,
          publicKeyHashes: [
            normalizePublicKeyHash(appEnv.mobilePinningSpkiPrimary),
            normalizePublicKeyHash(appEnv.mobilePinningSpkiBackup),
          ],
        },
      });

      if (!pinningErrorSubscriptionInstalled && typeof module.addSslPinningErrorListener === 'function') {
        module.addSslPinningErrorListener(error => {
          getMobileTelemetry().trackError(
            new Error(error.message || 'SSL pinning mismatch detected.'),
            {
              feature: 'security.ssl_pinning',
              details: {
                host: error.serverHostname ?? 'unknown',
              },
            },
          );
        });
        pinningErrorSubscriptionInstalled = true;
      }

      pinningInitialized = true;
    })().finally(() => {
      pinningInitPromise = null;
    });
  }

  return pinningInitPromise;
}

export function resetSslPinningStateForTests(): void {
  pinningInitialized = false;
  pinningInitPromise = null;
  pinningErrorSubscriptionInstalled = false;
  pinningKillSwitchLogged = false;
}
