const mockInitializeSslPinning = jest.fn(async () => undefined);
const mockIsSslPinningAvailable = jest.fn(() => true);

jest.mock('@data/telemetry/mobileTelemetry', () => ({
  getMobileTelemetry: () => ({
    addBreadcrumb: jest.fn(),
    trackError: jest.fn(),
  }),
}));

jest.mock('@data/config/env', () => ({
  appEnv: {
    mobilePinningEnabled: true,
    mobilePinningHost: 'api.footalert.test',
    mobilePinningSpkiPrimary: 'sha256/primary_pin',
    mobilePinningSpkiBackup: 'sha256/backup_pin',
    mobilePinningKillSwitchAllow: false,
  },
}));

import { appEnv } from '@data/config/env';
import { ensureSslPinning, resetSslPinningStateForTests } from '@data/security/networkPinning';

describe('networkPinning', () => {
  beforeEach(() => {
    globalThis.__FOOTALERT_SSL_PINNING_MODULE__ = {
      initializeSslPinning: mockInitializeSslPinning,
      isSslPinningAvailable: mockIsSslPinningAvailable,
    };
    resetSslPinningStateForTests();
    mockInitializeSslPinning.mockClear();
    mockIsSslPinningAvailable.mockClear();
    mockIsSslPinningAvailable.mockReturnValue(true);

    appEnv.mobilePinningEnabled = true;
    appEnv.mobilePinningHost = 'api.footalert.test';
    appEnv.mobilePinningSpkiPrimary = 'sha256/primary_pin';
    appEnv.mobilePinningSpkiBackup = 'sha256/backup_pin';
    appEnv.mobilePinningKillSwitchAllow = false;
  });

  afterEach(() => {
    delete globalThis.__FOOTALERT_SSL_PINNING_MODULE__;
  });

  it('initializes SSL pinning once for protected host', async () => {
    await ensureSslPinning('https://api.footalert.test/v1/telemetry/events');
    await ensureSslPinning('https://api.footalert.test/v1/telemetry/errors');

    expect(mockInitializeSslPinning).toHaveBeenCalledTimes(1);
    expect(mockInitializeSslPinning).toHaveBeenCalledWith({
      'api.footalert.test': {
        includeSubdomains: false,
        publicKeyHashes: ['primary_pin', 'backup_pin'],
      },
    });
  });

  it('skips pinning when disabled', async () => {
    appEnv.mobilePinningEnabled = false;

    await ensureSslPinning('https://api.footalert.test/v1/telemetry/events');

    expect(mockInitializeSslPinning).not.toHaveBeenCalled();
  });

  it('skips non-target hosts', async () => {
    await ensureSslPinning('https://other-host.test/v1/telemetry/events');

    expect(mockInitializeSslPinning).not.toHaveBeenCalled();
  });

  it('skips pinning when emergency kill switch is active', async () => {
    appEnv.mobilePinningKillSwitchAllow = true;

    await ensureSslPinning('https://api.footalert.test/v1/telemetry/events');

    expect(mockInitializeSslPinning).not.toHaveBeenCalled();
  });
});
