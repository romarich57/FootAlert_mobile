jest.mock('jail-monkey', () => ({
  isJailBroken: jest.fn(() => false),
  hookDetected: jest.fn(() => false),
  isDebuggedMode: jest.fn(async () => false),
}));

jest.mock('react-native-device-info', () => ({
  isEmulator: jest.fn(async () => false),
}));

jest.mock('@data/telemetry/mobileTelemetry', () => ({
  getMobileTelemetry: () => ({
    addBreadcrumb: jest.fn(),
    trackError: jest.fn(),
  }),
}));

import JailMonkey from 'jail-monkey';
import DeviceInfo from 'react-native-device-info';

import {
  assertSensitiveDeviceIntegrity,
  evaluateDeviceIntegrity,
  resetDeviceIntegritySnapshotForTests,
} from '@data/security/deviceIntegrity';

describe('deviceIntegrity', () => {
  beforeEach(() => {
    resetDeviceIntegritySnapshotForTests();
    (JailMonkey.isJailBroken as jest.Mock).mockReturnValue(false);
    (JailMonkey.hookDetected as jest.Mock).mockReturnValue(false);
    (JailMonkey.isDebuggedMode as jest.Mock).mockResolvedValue(false);
    (DeviceInfo.isEmulator as jest.Mock).mockResolvedValue(false);
  });

  it('returns device integrity when runtime is clean', async () => {
    const snapshot = await evaluateDeviceIntegrity(true);

    expect(snapshot.compromised).toBe(false);
    expect(snapshot.integrity).toBe('device');
    expect(snapshot.reasons).toEqual([]);
  });

  it('flags compromised runtime when jailbreak is detected', async () => {
    (JailMonkey.isJailBroken as jest.Mock).mockReturnValue(true);

    const snapshot = await evaluateDeviceIntegrity(true);

    expect(snapshot.compromised).toBe(true);
    expect(snapshot.integrity).toBe('unknown');
    expect(snapshot.reasons).toContain('jailbreak_or_root_detected');
  });

  it('blocks sensitive actions on compromised device', async () => {
    (JailMonkey.hookDetected as jest.Mock).mockReturnValue(true);

    await expect(assertSensitiveDeviceIntegrity()).rejects.toThrow(
      'Sensitive action blocked because the device integrity check failed.',
    );
  });
});
