import {
  bffDelete,
  bffGetSensitive,
  bffPost,
} from '@data/endpoints/bffClient';
import { getOrCreatePushDeviceId } from '@data/storage/pushTokenStorage';
import {
  getNotificationSubscriptions,
  registerPushToken,
  revokePushToken,
  trackNotificationOpened,
  upsertNotificationSubscriptions,
  type PushTokenPayload,
} from '@data/endpoints/notificationsApi';

jest.mock('@data/endpoints/bffClient', () => ({
  bffPost: jest.fn(async () => ({ status: 'registered', token: 'token-1' })),
  bffGetSensitive: jest.fn(async () => ({ subscriptions: [] })),
  bffDelete: jest.fn(async () => undefined),
}));

jest.mock('@data/storage/pushTokenStorage', () => ({
  getOrCreatePushDeviceId: jest.fn(async () => 'device-abc'),
}));

const mockedBffPost = jest.mocked(bffPost);
const mockedBffGetSensitive = jest.mocked(bffGetSensitive);
const mockedBffDelete = jest.mocked(bffDelete);
const mockedGetOrCreatePushDeviceId = jest.mocked(getOrCreatePushDeviceId);

describe('notificationsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetOrCreatePushDeviceId.mockResolvedValue('device-abc');
  });

  it('registers push token with the BFF contract payload', async () => {
    const payload: PushTokenPayload = {
      token: 'token-1',
      deviceId: 'device-abc',
      platform: 'ios',
      provider: 'apns',
      appVersion: '1.0.0',
      locale: 'fr',
      timezone: 'Europe/Paris',
    };

    await registerPushToken(payload);

    expect(mockedBffPost).toHaveBeenCalledWith('/notifications/tokens', payload);
  });

  it('revokes push token by encoded token identifier', async () => {
    await revokePushToken('token/with/slash');

    expect(mockedBffDelete).toHaveBeenCalledWith(
      '/notifications/tokens/token%2Fwith%2Fslash',
    );
  });

  it('upserts scope subscriptions using resolved device id', async () => {
    mockedBffPost.mockResolvedValueOnce({
      status: 'ok',
      subscriptions: [],
    });

    await upsertNotificationSubscriptions({
      scopeKind: 'team',
      scopeId: '33',
      subscriptions: [
        { alertType: 'goal', enabled: true },
        { alertType: 'match_start', enabled: false },
      ],
    });

    expect(mockedBffPost).toHaveBeenCalledWith('/notifications/subscriptions', {
      deviceId: 'device-abc',
      scopeKind: 'team',
      scopeId: '33',
      subscriptions: [
        { alertType: 'goal', enabled: true },
        { alertType: 'match_start', enabled: false },
      ],
    });
  });

  it('loads scope subscriptions with sensitive mobile auth', async () => {
    mockedBffGetSensitive.mockResolvedValueOnce({
      subscriptions: [{ alertType: 'goal', enabled: true }],
    });

    const subscriptions = await getNotificationSubscriptions({
      scopeKind: 'competition',
      scopeId: '39',
    });

    expect(subscriptions).toEqual([{ alertType: 'goal', enabled: true }]);
    expect(mockedBffGetSensitive).toHaveBeenCalledWith(
      '/notifications/subscriptions',
      {
        deviceId: 'device-abc',
        scopeKind: 'competition',
        scopeId: '39',
      },
      {
        scope: 'notifications:write',
      },
    );
  });

  it('tracks opened notifications for the active device', async () => {
    mockedBffPost.mockResolvedValueOnce({
      status: 'ok',
      openedCount: 2,
    });

    const openedCount = await trackNotificationOpened({
      eventId: 'event-1',
    });

    expect(openedCount).toBe(2);
    expect(mockedBffPost).toHaveBeenCalledWith('/notifications/opened', {
      eventId: 'event-1',
      deviceId: 'device-abc',
    });
  });
});
