import { appEnv } from '@data/config/env';
import {
  getNotificationSubscriptions,
  upsertNotificationSubscriptions,
} from '@data/endpoints/notificationsApi';
import {
  DEFAULT_MATCH_NOTIFICATION_PREFS,
  loadMatchNotificationPrefs,
  saveMatchNotificationPrefs,
} from '@data/storage/matchPreferencesStorage';

jest.mock('@data/endpoints/notificationsApi', () => ({
  getNotificationSubscriptions: jest.fn(async () => []),
  upsertNotificationSubscriptions: jest.fn(async () => []),
}));

const mockedGetNotificationSubscriptions = jest.mocked(getNotificationSubscriptions);
const mockedUpsertNotificationSubscriptions = jest.mocked(upsertNotificationSubscriptions);

describe('matchPreferencesStorage', () => {
  const initialNotificationsMatchBackendEnabled = appEnv.notificationsMatchBackendEnabled;

  beforeEach(() => {
    jest.clearAllMocks();
    appEnv.notificationsMatchBackendEnabled = initialNotificationsMatchBackendEnabled;
  });

  afterAll(() => {
    appEnv.notificationsMatchBackendEnabled = initialNotificationsMatchBackendEnabled;
  });

  it('returns default preferences when no value exists', async () => {
    mockedGetNotificationSubscriptions.mockRejectedValueOnce(new Error('offline'));

    const prefs = await loadMatchNotificationPrefs('fixture-1');
    expect(prefs).toEqual(DEFAULT_MATCH_NOTIFICATION_PREFS);
  });

  it('saves and loads preferences for a fixture', async () => {
    mockedGetNotificationSubscriptions.mockRejectedValueOnce(new Error('offline'));

    const payload = {
      goal: false,
      redCard: true,
      start: true,
      end: false,
    };

    await saveMatchNotificationPrefs('fixture-2', payload);
    const loaded = await loadMatchNotificationPrefs('fixture-2');
    expect(loaded).toEqual(payload);
    expect(mockedUpsertNotificationSubscriptions).toHaveBeenCalledWith({
      scopeKind: 'match',
      scopeId: 'fixture-2',
      subscriptions: [
        { alertType: 'match_start', enabled: true },
        { alertType: 'match_end', enabled: false },
        { alertType: 'goal', enabled: false },
        { alertType: 'red_card', enabled: true },
      ],
    });
  });

  it('keeps local-only behavior when match backend notifications are disabled', async () => {
    appEnv.notificationsMatchBackendEnabled = false;
    const payload = {
      goal: false,
      redCard: false,
      start: true,
      end: true,
    };

    await saveMatchNotificationPrefs('fixture-3', payload);
    const loaded = await loadMatchNotificationPrefs('fixture-3');

    expect(loaded).toEqual(payload);
    expect(mockedUpsertNotificationSubscriptions).not.toHaveBeenCalled();
    expect(mockedGetNotificationSubscriptions).not.toHaveBeenCalled();
  });
});
