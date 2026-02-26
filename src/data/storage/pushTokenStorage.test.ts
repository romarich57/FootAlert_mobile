import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearPushRegistrationSnapshot,
  getOrCreatePushDeviceId,
  getPushRegistrationSnapshot,
  savePushRegistrationSnapshot,
} from '@data/storage/pushTokenStorage';
import {
  getSecureString,
  removeSecureString,
  resetSecureStorageFallbackForTests,
  setSecureString,
} from '@data/storage/secureStorage';

jest.mock('@data/storage/secureStorage', () => {
  const memoryStore = new Map<string, string>();

  return {
    getSecureString: jest.fn(async (key: string) => memoryStore.get(key) ?? null),
    setSecureString: jest.fn(async (key: string, value: string) => {
      memoryStore.set(key, value);
    }),
    removeSecureString: jest.fn(async (key: string) => {
      memoryStore.delete(key);
    }),
    resetSecureStorageFallbackForTests: () => {
      memoryStore.clear();
    },
  };
});

const mockedSetSecureString = jest.mocked(setSecureString);
const mockedGetSecureString = jest.mocked(getSecureString);
const mockedRemoveSecureString = jest.mocked(removeSecureString);

describe('pushTokenStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetSecureStorageFallbackForTests();
    jest.clearAllMocks();
  });

  it('persists and loads push registration snapshots in secure storage only', async () => {
    await savePushRegistrationSnapshot({
      token: 'token-1',
      deviceId: 'device-1',
      platform: 'ios',
      provider: 'apns',
      locale: 'fr',
      timezone: 'Europe/Paris',
      appVersion: '1.0.0',
    });

    const snapshot = await getPushRegistrationSnapshot();
    expect(snapshot?.token).toBe('token-1');
    expect(snapshot?.deviceId).toBe('device-1');
    expect(snapshot?.updatedAt).toBeDefined();
    expect(mockedSetSecureString).toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('creates a stable device id once and reuses it from secure storage', async () => {
    const first = await getOrCreatePushDeviceId();
    const second = await getOrCreatePushDeviceId();

    expect(first).toBeTruthy();
    expect(second).toBe(first);
    expect(mockedSetSecureString).toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('clears existing push registration snapshots', async () => {
    await savePushRegistrationSnapshot({
      token: 'token-1',
      deviceId: 'device-1',
      platform: 'android',
      provider: 'fcm',
      locale: 'en',
      timezone: 'America/New_York',
      appVersion: '1.0.0',
    });

    await clearPushRegistrationSnapshot();
    await expect(getPushRegistrationSnapshot()).resolves.toBeNull();
    expect(mockedRemoveSecureString).toHaveBeenCalled();
  });

  it('migrates legacy async storage snapshot to secure storage', async () => {
    await AsyncStorage.setItem(
      'push_registration_v1',
      JSON.stringify({
        token: 'legacy-token',
        deviceId: 'legacy-device',
        platform: 'android',
        provider: 'fcm',
        locale: 'en',
        timezone: 'UTC',
        appVersion: '1.0.0',
        updatedAt: '2026-02-25T00:00:00.000Z',
      }),
    );

    const snapshot = await getPushRegistrationSnapshot();

    expect(snapshot?.token).toBe('legacy-token');
    expect(snapshot?.deviceId).toBe('legacy-device');
    expect(mockedSetSecureString).toHaveBeenCalled();
    expect(await AsyncStorage.getItem('push_registration_v1')).toBeNull();
  });

  it('migrates legacy async storage device id to secure storage', async () => {
    await AsyncStorage.setItem('push_device_id_v1', JSON.stringify('legacy-device-id'));

    const deviceId = await getOrCreatePushDeviceId();

    expect(deviceId).toBe('legacy-device-id');
    expect(mockedGetSecureString).toHaveBeenCalled();
    expect(mockedSetSecureString).toHaveBeenCalled();
    expect(await AsyncStorage.getItem('push_device_id_v1')).toBeNull();
  });
});
