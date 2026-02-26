import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'react-native-localize';

import {
  APP_PREFERENCES_STORAGE_KEY,
  loadAppPreferences,
  saveAppPreferences,
  updateAppPreferences,
} from '@data/storage/appPreferencesStorage';
import {
  getNotificationsPermissionStatus,
  isNotificationsPermissionGranted,
} from '@data/permissions/notificationsPermission';

jest.mock('@data/permissions/notificationsPermission', () => ({
  getNotificationsPermissionStatus: jest.fn(async () => 'granted'),
  isNotificationsPermissionGranted: jest.fn((status: string) => status === 'granted'),
}));

const mockedGetNotificationsPermissionStatus = jest.mocked(getNotificationsPermissionStatus);
const mockedIsNotificationsPermissionGranted = jest.mocked(isNotificationsPermissionGranted);
const mockedGetLocales = jest.mocked(getLocales);

describe('appPreferencesStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockedGetNotificationsPermissionStatus.mockResolvedValue('granted');
    mockedIsNotificationsPermissionGranted.mockImplementation(
      (status: string) => status === 'granted',
    );
    mockedGetLocales.mockReturnValue([
      {
        languageCode: 'en',
        languageTag: 'en-US',
        countryCode: 'US',
        isRTL: false,
      },
    ]);
  });

  it('returns defaults when no payload exists', async () => {
    const preferences = await loadAppPreferences();

    expect(preferences.theme).toBe('system');
    expect(preferences.language).toBe('en');
    expect(preferences.currencyCode).toBe('USD');
    expect(preferences.measurementSystem).toBe('imperial');
    expect(preferences.notificationsEnabled).toBe(true);
    expect(await AsyncStorage.getItem(APP_PREFERENCES_STORAGE_KEY)).not.toBeNull();
  });

  it('saves and loads preferences', async () => {
    await saveAppPreferences({
      theme: 'light',
      language: 'en',
      currencyCode: 'EUR',
      measurementSystem: 'metric',
      notificationsEnabled: false,
      updatedAt: '2020-01-01T00:00:00.000Z',
    });

    const loaded = await loadAppPreferences();
    expect(loaded.theme).toBe('light');
    expect(loaded.language).toBe('en');
    expect(loaded.currencyCode).toBe('EUR');
    expect(loaded.measurementSystem).toBe('metric');
    expect(loaded.notificationsEnabled).toBe(false);
  });

  it('sanitizes malformed payload values', async () => {
    await AsyncStorage.setItem(
      APP_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        theme: 'neon',
        language: 'de',
        currencyCode: 'INVALID',
        measurementSystem: 'other',
        notificationsEnabled: 'yes',
      }),
    );

    const loaded = await loadAppPreferences();

    expect(loaded.theme).toBe('system');
    expect(loaded.language).toBe('en');
    expect(loaded.currencyCode).toBe('EUR');
    expect(loaded.measurementSystem).toBe('imperial');
    expect(loaded.notificationsEnabled).toBe(true);
  });

  it('updates preferences partially', async () => {
    const updated = await updateAppPreferences({
      language: 'en',
      notificationsEnabled: false,
    });

    expect(updated.language).toBe('en');
    expect(updated.notificationsEnabled).toBe(false);

    const loaded = await loadAppPreferences();
    expect(loaded.language).toBe('en');
    expect(loaded.notificationsEnabled).toBe(false);
  });

  it('falls back to french when device locale is unsupported', async () => {
    mockedGetLocales.mockReturnValue([
      {
        languageCode: 'de',
        languageTag: 'de-DE',
        countryCode: 'DE',
        isRTL: false,
      },
    ]);

    const loaded = await loadAppPreferences();
    expect(loaded.language).toBe('fr');
  });
});
