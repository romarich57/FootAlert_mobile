jest.mock('react-native-device-info', () => ({
  isEmulator: jest.fn(async () => false),
}));

jest.mock('@data/telemetry/mobileTelemetry', () => ({
  getMobileTelemetry: () => ({
    addBreadcrumb: jest.fn(),
    trackError: jest.fn(),
  }),
}));

import DeviceInfo from 'react-native-device-info';

import {
  assertSensitiveDeviceIntegrity,
  evaluateDeviceIntegrity,
  resetDeviceIntegritySnapshotForTests,
} from '@data/security/deviceIntegrity';

describe('deviceIntegrity', () => {
  beforeEach(() => {
    resetDeviceIntegritySnapshotForTests();
    (DeviceInfo.isEmulator as jest.Mock).mockResolvedValue(false);
  });

  it('returns device integrity when runtime is clean', async () => {
    const snapshot = await evaluateDeviceIntegrity(true);

    expect(snapshot.compromised).toBe(false);
    expect(snapshot.integrity).toBe('device');
    expect(snapshot.reasons).toEqual([]);
  });

  it('downgrades integrity to basic on emulator environment', async () => {
    (DeviceInfo.isEmulator as jest.Mock).mockResolvedValue(true);

    const snapshot = await evaluateDeviceIntegrity(true);

    expect(snapshot.compromised).toBe(false);
    expect(snapshot.integrity).toBe('basic');
    expect(snapshot.reasons).toContain('emulator_environment');
  });

  it('does not block sensitive actions on client-side device signals', async () => {
    (DeviceInfo.isEmulator as jest.Mock).mockResolvedValue(true);

    await expect(assertSensitiveDeviceIntegrity()).resolves.toEqual(
      expect.objectContaining({
        integrity: 'basic',
      }),
    );
  });
});
