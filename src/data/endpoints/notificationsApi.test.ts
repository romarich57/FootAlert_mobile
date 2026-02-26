import { bffDelete, bffPost } from '@data/endpoints/bffClient';
import {
  registerPushToken,
  revokePushToken,
  type PushTokenPayload,
} from '@data/endpoints/notificationsApi';

jest.mock('@data/endpoints/bffClient', () => ({
  bffPost: jest.fn(async () => ({ status: 'registered', token: 'token-1' })),
  bffDelete: jest.fn(async () => undefined),
}));

const mockedBffPost = jest.mocked(bffPost);
const mockedBffDelete = jest.mocked(bffDelete);

describe('notificationsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
