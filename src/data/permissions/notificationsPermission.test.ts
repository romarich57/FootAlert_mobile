import {
  RESULTS,
  checkNotifications,
  openSettings,
  requestNotifications,
} from 'react-native-permissions';

import {
  getNotificationsPermissionStatus,
  isNotificationsPermissionGranted,
  openNotificationsSettings,
  requestNotificationsPermission,
} from '@data/permissions/notificationsPermission';

jest.mock('react-native-permissions', () => ({
  RESULTS: {
    UNAVAILABLE: 'unavailable',
    BLOCKED: 'blocked',
    DENIED: 'denied',
    GRANTED: 'granted',
    LIMITED: 'limited',
  },
  checkNotifications: jest.fn(async () => ({ status: 'granted', settings: {} })),
  requestNotifications: jest.fn(async () => ({ status: 'granted', settings: {} })),
  openSettings: jest.fn(async () => undefined),
}));

const mockedCheckNotifications = jest.mocked(checkNotifications);
const mockedRequestNotifications = jest.mocked(requestNotifications);
const mockedOpenSettings = jest.mocked(openSettings);

describe('notificationsPermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps notification status from checkNotifications', async () => {
    mockedCheckNotifications.mockResolvedValueOnce({
      status: RESULTS.DENIED,
      settings: {},
    });

    await expect(getNotificationsPermissionStatus()).resolves.toBe(RESULTS.DENIED);
  });

  it('requests notification permissions', async () => {
    mockedRequestNotifications.mockResolvedValueOnce({
      status: RESULTS.GRANTED,
      settings: {},
    });

    await expect(requestNotificationsPermission()).resolves.toBe(RESULTS.GRANTED);
  });

  it('opens notification settings with fallback', async () => {
    mockedOpenSettings.mockRejectedValueOnce(new Error('not-supported'));
    mockedOpenSettings.mockResolvedValueOnce();

    await openNotificationsSettings();

    expect(mockedOpenSettings).toHaveBeenNthCalledWith(1, 'notifications');
    expect(mockedOpenSettings).toHaveBeenNthCalledWith(2, 'application');
  });

  it('checks granted status helper', () => {
    expect(isNotificationsPermissionGranted(RESULTS.GRANTED)).toBe(true);
    expect(isNotificationsPermissionGranted(RESULTS.BLOCKED)).toBe(false);
  });
});
