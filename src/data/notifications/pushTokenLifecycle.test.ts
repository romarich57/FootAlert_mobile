import {
  syncPushTokenRegistration,
  revokeRegisteredPushToken,
  isConfiguredPushTokenAllowed,
} from '@data/notifications/pushTokenLifecycle';
import {
  registerPushToken,
  revokePushToken,
} from '@data/endpoints/notificationsApi';
import {
  clearPushRegistrationSnapshot,
  getOrCreatePushDeviceId,
  getPushRegistrationSnapshot,
  savePushRegistrationSnapshot,
} from '@data/storage/pushTokenStorage';
import { SecureStorageUnavailableError } from '@data/storage/secureStorage';

jest.mock('@data/endpoints/notificationsApi', () => ({
  registerPushToken: jest.fn(async () => undefined),
  revokePushToken: jest.fn(async () => undefined),
}));

jest.mock('@data/storage/pushTokenStorage', () => ({
  clearPushRegistrationSnapshot: jest.fn(async () => undefined),
  getOrCreatePushDeviceId: jest.fn(async () => 'device-abc'),
  getPushRegistrationSnapshot: jest.fn(async () => null),
  savePushRegistrationSnapshot: jest.fn(async payload => ({
    ...payload,
    updatedAt: '2026-02-25T00:00:00.000Z',
  })),
}));

jest.mock('@data/config/appMeta', () => ({
  getAppVersion: jest.fn(() => '1.2.3'),
}));

jest.mock('@data/telemetry/mobileTelemetry', () => ({
  getMobileTelemetry: () => ({
    trackEvent: jest.fn(),
    trackError: jest.fn(),
    setUserContext: jest.fn(),
    addBreadcrumb: jest.fn(),
    trackBatch: jest.fn(),
    flush: jest.fn(async () => undefined),
  }),
}));

const mockedRegisterPushToken = jest.mocked(registerPushToken);
const mockedRevokePushToken = jest.mocked(revokePushToken);
const mockedGetPushRegistrationSnapshot = jest.mocked(getPushRegistrationSnapshot);
const mockedGetOrCreatePushDeviceId = jest.mocked(getOrCreatePushDeviceId);
const mockedSavePushRegistrationSnapshot = jest.mocked(savePushRegistrationSnapshot);
const mockedClearPushRegistrationSnapshot = jest.mocked(clearPushRegistrationSnapshot);

describe('pushTokenLifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetPushRegistrationSnapshot.mockResolvedValue(null);
    mockedGetOrCreatePushDeviceId.mockResolvedValue('device-abc');
  });

  it('registers push tokens when notifications are enabled', async () => {
    await syncPushTokenRegistration({
      notificationsEnabled: true,
      locale: 'fr',
    });

    expect(mockedRegisterPushToken).toHaveBeenCalledTimes(1);
    expect(mockedRegisterPushToken).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'footalert-ios-device-abc',
        deviceId: 'device-abc',
        locale: 'fr',
        appVersion: '1.2.3',
      }),
    );
    expect(mockedSavePushRegistrationSnapshot).toHaveBeenCalledTimes(1);
  });

  it('revokes and clears existing tokens when notifications are disabled', async () => {
    mockedGetPushRegistrationSnapshot.mockResolvedValue({
      token: 'token-registered',
      deviceId: 'device-abc',
      platform: 'ios',
      provider: 'apns',
      locale: 'fr',
      timezone: 'Europe/Paris',
      appVersion: '1.2.3',
      updatedAt: '2026-02-25T00:00:00.000Z',
    });

    await syncPushTokenRegistration({
      notificationsEnabled: false,
      locale: 'fr',
    });

    expect(mockedRevokePushToken).toHaveBeenCalledWith('token-registered');
    expect(mockedClearPushRegistrationSnapshot).toHaveBeenCalledTimes(1);
  });

  it('skips registration when snapshot is already up to date', async () => {
    mockedGetPushRegistrationSnapshot.mockResolvedValue({
      token: 'footalert-ios-device-abc',
      deviceId: 'device-abc',
      platform: 'ios',
      provider: 'apns',
      locale: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      appVersion: '1.2.3',
      updatedAt: '2026-02-25T00:00:00.000Z',
    });

    await syncPushTokenRegistration({
      notificationsEnabled: true,
      locale: 'en',
    });

    expect(mockedRegisterPushToken).not.toHaveBeenCalled();
    expect(mockedSavePushRegistrationSnapshot).not.toHaveBeenCalled();
  });

  it('revokes registered token explicitly', async () => {
    mockedGetPushRegistrationSnapshot.mockResolvedValue({
      token: 'token-registered',
      deviceId: 'device-abc',
      platform: 'ios',
      provider: 'apns',
      locale: 'fr',
      timezone: 'Europe/Paris',
      appVersion: '1.2.3',
      updatedAt: '2026-02-25T00:00:00.000Z',
    });

    await revokeRegisteredPushToken();

    expect(mockedRevokePushToken).toHaveBeenCalledWith('token-registered');
    expect(mockedClearPushRegistrationSnapshot).toHaveBeenCalledTimes(1);
  });

  it('allows configured push token in staging/qa runtimes', () => {
    expect(isConfiguredPushTokenAllowed('staging', false)).toBe(true);
    expect(isConfiguredPushTokenAllowed('qa', false)).toBe(true);
  });

  it('rejects configured push token in production-like runtimes', () => {
    expect(isConfiguredPushTokenAllowed('production', false)).toBe(false);
    expect(isConfiguredPushTokenAllowed('prod', false)).toBe(false);
    expect(isConfiguredPushTokenAllowed('review', false)).toBe(false);
  });

  it('disables push sync gracefully when secure storage is unavailable', async () => {
    mockedGetPushRegistrationSnapshot.mockRejectedValueOnce(
      new SecureStorageUnavailableError(),
    );

    await expect(
      syncPushTokenRegistration({
        notificationsEnabled: true,
        locale: 'fr',
      }),
    ).resolves.toBeUndefined();

    expect(mockedRegisterPushToken).not.toHaveBeenCalled();
    expect(mockedSavePushRegistrationSnapshot).not.toHaveBeenCalled();
  });
});
