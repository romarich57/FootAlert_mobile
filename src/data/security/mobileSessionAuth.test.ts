jest.mock('@data/config/env', () => ({
  appEnv: {
    mobileApiBaseUrl: 'https://api.footalert.test/v1',
    mobileAuthAttestationMode: 'mock',
    mobileAttestationStrategy: 'disabled',
  },
}));

jest.mock('@data/config/appMeta', () => ({
  getAppVersion: () => '1.0.0',
}));

jest.mock('@data/security/deviceIntegrity', () => ({
  assertSensitiveDeviceIntegrity: jest.fn(async () => ({
    compromised: false,
    integrity: 'device',
    reasons: [],
    checkedAtMs: 1,
  })),
}));

jest.mock('@data/storage/pushTokenStorage', () => ({
  getOrCreatePushDeviceId: jest.fn(async () => 'device-1'),
  clearPushDeviceId: jest.fn(async () => undefined),
  clearPushRegistrationSnapshot: jest.fn(async () => undefined),
}));

const mockSecureStore = new Map<string, string>();

jest.mock('@data/storage/secureStorage', () => ({
  getSecureString: jest.fn(async (key: string) => mockSecureStore.get(key) ?? null),
  setSecureString: jest.fn(async (key: string, value: string) => {
    mockSecureStore.set(key, value);
  }),
  removeSecureString: jest.fn(async (key: string) => {
    mockSecureStore.delete(key);
  }),
}));

jest.mock('@data/telemetry/mobileTelemetry', () => ({
  getMobileTelemetry: () => ({
    addBreadcrumb: jest.fn(),
    trackError: jest.fn(),
  }),
}));

jest.mock('react-native-device-info', () => ({
  getBuildNumber: () => '42',
}));

import { appEnv } from '@data/config/env';
import * as pushTokenStorage from '@data/storage/pushTokenStorage';
import {
  buildSensitiveMobileAuthHeaders,
  clearMobileSessionTokenForTests,
  eraseMobilePrivacyData,
  resetMobileSessionAuthStateForTests,
  verifyMobileAttestationStartupHealth,
} from '@data/security/mobileSessionAuth';

const mockedPushTokenStorage = jest.mocked(pushTokenStorage);

describe('mobileSessionAuth', () => {
  beforeEach(async () => {
    mockSecureStore.clear();
    jest.clearAllMocks();
    await clearMobileSessionTokenForTests();
    resetMobileSessionAuthStateForTests();
    appEnv.mobileAuthAttestationMode = 'mock';
    appEnv.mobileAttestationStrategy = 'disabled';
    delete globalThis.__FOOTALERT_MOBILE_ATTESTATION_PROVIDER__;

    const jsonResponse = (status: number, payload: unknown): Response =>
      ({
        ok: status >= 200 && status < 300,
        status,
        json: async () => payload,
      } as Response);

    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/mobile/session/challenge')) {
        return jsonResponse(200, {
            challengeId: 'challenge-1',
            challenge: 'challenge-value',
            expiresAtMs: Date.now() + 120_000,
          });
      }

      if (url.endsWith('/mobile/session/attest')) {
        return jsonResponse(200, {
            accessToken: 'session-token-1',
            expiresAtMs: Date.now() + 600_000,
            refreshToken: 'refresh-token-1',
            refreshExpiresAtMs: Date.now() + 2_592_000_000,
            integrity: 'device',
          });
      }

      if (url.endsWith('/mobile/session/refresh')) {
        return jsonResponse(200, {
          accessToken: 'session-token-refresh-1',
          expiresAtMs: Date.now() + 600_000,
          refreshToken: 'refresh-token-2',
          refreshExpiresAtMs: Date.now() + 2_592_000_000,
          integrity: 'device',
        });
      }

      if (url.endsWith('/mobile/privacy/erase')) {
        return jsonResponse(200, {
          status: 'erased',
          requestId: 'erase-request-1',
          erasedAtMs: Date.now(),
        });
      }

      return jsonResponse(404, {});
    });

    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    delete globalThis.__FOOTALERT_MOBILE_ATTESTATION_PROVIDER__;
  });

  it('builds bearer authorization header from attested session token', async () => {
    const headers = await buildSensitiveMobileAuthHeaders({
      method: 'POST',
      url: 'https://api.footalert.test/v1/telemetry/events',
      body: { name: 'test.event' },
      scope: 'telemetry:write',
    });

    expect(headers).toEqual({
      Authorization: 'Bearer session-token-1',
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('reuses cached token without reattesting until expiry window', async () => {
    await buildSensitiveMobileAuthHeaders({
      method: 'POST',
      url: 'https://api.footalert.test/v1/telemetry/events',
      body: { name: 'test.event' },
      scope: 'telemetry:write',
    });

    await buildSensitiveMobileAuthHeaders({
      method: 'POST',
      url: 'https://api.footalert.test/v1/telemetry/events',
      body: { name: 'test.event.2' },
      scope: 'telemetry:write',
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('uses provider attestation adapter when provider mode is enabled', async () => {
    appEnv.mobileAuthAttestationMode = 'provider';
    appEnv.mobileAttestationStrategy = 'strict';
    globalThis.__FOOTALERT_MOBILE_ATTESTATION_PROVIDER__ = {
      getAttestationToken: jest.fn(async () => 'provider-attestation-token'),
    };

    await buildSensitiveMobileAuthHeaders({
      method: 'POST',
      url: 'https://api.footalert.test/v1/telemetry/events',
      body: { name: 'test.provider.mode' },
      scope: 'telemetry:write',
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const attestCall = (global.fetch as jest.Mock).mock.calls.find((call: unknown[]) =>
      String(call[0]).endsWith('/mobile/session/attest'),
    );
    expect(attestCall).toBeDefined();
    const requestInit = attestCall?.[1] as RequestInit;
    expect(typeof requestInit.body).toBe('string');
    const parsedBody = JSON.parse(requestInit.body as string) as {
      attestation: { token: string };
    };
    expect(parsedBody.attestation.token).toBe('provider-attestation-token');
  });

  it('does not fallback to mock token in best-effort mode when provider is unavailable', async () => {
    appEnv.mobileAuthAttestationMode = 'provider';
    appEnv.mobileAttestationStrategy = 'best-effort';
    delete globalThis.__FOOTALERT_MOBILE_ATTESTATION_PROVIDER__;

    await expect(
      buildSensitiveMobileAuthHeaders({
        method: 'POST',
        url: 'https://api.footalert.test/v1/telemetry/events',
        body: { name: 'test.best_effort.mode' },
        scope: 'telemetry:write',
      }),
    ).rejects.toThrow('Native mobile attestation provider is unavailable.');

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('fails startup health check in strict provider mode when provider bridge is unavailable', () => {
    appEnv.mobileAuthAttestationMode = 'provider';
    appEnv.mobileAttestationStrategy = 'strict';
    delete globalThis.__FOOTALERT_MOBILE_ATTESTATION_PROVIDER__;

    expect(() => verifyMobileAttestationStartupHealth()).toThrow(
      'Native mobile attestation provider is unavailable.',
    );
  });

  it('uses refresh token before re-attestation when access token is expired', async () => {
    mockSecureStore.set(
      'mobile_session_auth_v1',
      JSON.stringify({
        accessToken: 'expired-access-token',
        expiresAtMs: Date.now() - 5_000,
        refreshToken: 'refresh-token-1',
        refreshExpiresAtMs: Date.now() + 60_000,
        integrity: 'device',
        obtainedAtMs: Date.now() - 10_000,
      }),
    );

    const headers = await buildSensitiveMobileAuthHeaders({
      method: 'GET',
      url: 'https://api.footalert.test/v1/competitions',
      scope: 'api:read',
    });

    expect(headers).toEqual({
      Authorization: 'Bearer session-token-refresh-1',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as jest.Mock).mock.calls[0]?.[0]).toContain('/mobile/session/refresh');
  });

  it('erases remote and local mobile privacy data', async () => {
    const result = await eraseMobilePrivacyData();

    expect(result.status).toBe('erased');
    expect(result.requestId).toBe('erase-request-1');
    expect(mockedPushTokenStorage.clearPushRegistrationSnapshot).toHaveBeenCalledTimes(1);
    expect(mockedPushTokenStorage.clearPushDeviceId).toHaveBeenCalledTimes(1);

    const calledUrls = (global.fetch as jest.Mock).mock.calls.map(call => String(call[0]));
    expect(calledUrls.filter(url => url.endsWith('/mobile/session/challenge')).length).toBe(2);
    expect(calledUrls.some(url => url.endsWith('/mobile/privacy/erase'))).toBe(true);
  });
});
