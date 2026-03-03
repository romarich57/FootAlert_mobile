import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildApp,
  buildMobileSessionAuthorizationHeader,
  installFetchMock,
  jsonResponse,
} from '../helpers/appTestHarness.ts';

function buildMockAttestationToken(input: {
  type: 'play_integrity' | 'app_attest';
  integrity: 'strong' | 'device' | 'basic' | 'unknown';
  challengeId: string;
  deviceIdHash: string;
  challenge: string;
}): string {
  return `mock.${input.type}.${input.integrity}.${input.challengeId}.${input.deviceIdHash}.${input.challenge}`;
}

async function issueSession(app: Awaited<ReturnType<typeof buildApp>>) {
  const deviceIdHash = 'device-hash-erase';
  const challengeResponse = await app.inject({
    method: 'POST',
    url: '/v1/mobile/session/challenge',
    payload: {
      platform: 'android',
      deviceIdHash,
      appVersion: '1.0.0',
      buildNumber: '100',
    },
  });
  assert.equal(challengeResponse.statusCode, 200);
  const challengeBody = challengeResponse.json() as {
    challengeId: string;
    challenge: string;
  };

  const attestationToken = buildMockAttestationToken({
    type: 'play_integrity',
    integrity: 'strong',
    challengeId: challengeBody.challengeId,
    deviceIdHash,
    challenge: challengeBody.challenge,
  });

  const attestResponse = await app.inject({
    method: 'POST',
    url: '/v1/mobile/session/attest',
    payload: {
      challengeId: challengeBody.challengeId,
      platform: 'android',
      deviceIdHash,
      attestation: {
        type: 'play_integrity',
        token: attestationToken,
      },
    },
  });
  assert.equal(attestResponse.statusCode, 200);
  return attestResponse.json() as {
    accessToken: string;
    refreshToken: string;
  };
}

async function issueEraseChallenge(app: Awaited<ReturnType<typeof buildApp>>) {
  const challengeResponse = await app.inject({
    method: 'POST',
    url: '/v1/mobile/session/challenge',
    payload: {
      platform: 'android',
      deviceIdHash: 'device-hash-erase',
      appVersion: '1.0.0',
      buildNumber: '100',
    },
  });
  assert.equal(challengeResponse.statusCode, 200);
  return challengeResponse.json() as {
    challengeId: string;
    challenge: string;
  };
}

test('POST /v1/mobile/privacy/erase rejects missing bearer token', async t => {
  installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t, {
    MOBILE_ATTESTATION_ACCEPT_MOCK: 'true',
  });
  const challenge = await issueEraseChallenge(app);
  const attestationToken = buildMockAttestationToken({
    type: 'play_integrity',
    integrity: 'strong',
    challengeId: challenge.challengeId,
    deviceIdHash: 'device-hash-erase',
    challenge: challenge.challenge,
  });

  const response = await app.inject({
    method: 'POST',
    url: '/v1/mobile/privacy/erase',
    payload: {
      challengeId: challenge.challengeId,
      platform: 'android',
      deviceIdHash: 'device-hash-erase',
      attestation: {
        type: 'play_integrity',
        token: attestationToken,
      },
    },
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error, 'MOBILE_ATTESTATION_REQUIRED');
});

test('POST /v1/mobile/privacy/erase rejects token without privacy scope', async t => {
  installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t, {
    MOBILE_ATTESTATION_ACCEPT_MOCK: 'true',
  });
  const challenge = await issueEraseChallenge(app);
  const attestationToken = buildMockAttestationToken({
    type: 'play_integrity',
    integrity: 'strong',
    challengeId: challenge.challengeId,
    deviceIdHash: 'device-hash-erase',
    challenge: challenge.challenge,
  });

  const response = await app.inject({
    method: 'POST',
    url: '/v1/mobile/privacy/erase',
    headers: buildMobileSessionAuthorizationHeader({
      subject: 'device-hash-erase',
      scope: ['api:read'],
    }),
    payload: {
      challengeId: challenge.challengeId,
      platform: 'android',
      deviceIdHash: 'device-hash-erase',
      attestation: {
        type: 'play_integrity',
        token: attestationToken,
      },
    },
  });

  assert.equal(response.statusCode, 403);
  assert.equal(response.json().error, 'MOBILE_SESSION_TOKEN_INVALID');
});

test('POST /v1/mobile/privacy/erase rejects invalid fresh attestation token', async t => {
  installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t, {
    MOBILE_ATTESTATION_ACCEPT_MOCK: 'true',
  });
  const session = await issueSession(app);
  const challenge = await issueEraseChallenge(app);

  const response = await app.inject({
    method: 'POST',
    url: '/v1/mobile/privacy/erase',
    headers: {
      authorization: `Bearer ${session.accessToken}`,
    },
    payload: {
      challengeId: challenge.challengeId,
      platform: 'android',
      deviceIdHash: 'device-hash-erase',
      attestation: {
        type: 'play_integrity',
        token: 'mock.play_integrity.invalid',
      },
    },
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error, 'MOBILE_ATTESTATION_INVALID');
});

test('POST /v1/mobile/privacy/erase erases subject-bound data and is idempotent with fresh challenge', async t => {
  installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t, {
    MOBILE_ATTESTATION_ACCEPT_MOCK: 'true',
  });

  const session = await issueSession(app);

  const registerTokenResponse = await app.inject({
    method: 'POST',
    url: '/v1/notifications/tokens',
    headers: {
      authorization: `Bearer ${session.accessToken}`,
    },
    payload: {
      token: 'push-token-erase',
      deviceId: 'device-id-erase',
      platform: 'android',
      provider: 'fcm',
      appVersion: '1.0.0',
      locale: 'fr',
      timezone: 'Europe/Paris',
    },
  });
  assert.equal(registerTokenResponse.statusCode, 200);

  const firstChallenge = await issueEraseChallenge(app);
  const firstAttestation = buildMockAttestationToken({
    type: 'play_integrity',
    integrity: 'strong',
    challengeId: firstChallenge.challengeId,
    deviceIdHash: 'device-hash-erase',
    challenge: firstChallenge.challenge,
  });

  const firstErase = await app.inject({
    method: 'POST',
    url: '/v1/mobile/privacy/erase',
    headers: {
      authorization: `Bearer ${session.accessToken}`,
    },
    payload: {
      challengeId: firstChallenge.challengeId,
      platform: 'android',
      deviceIdHash: 'device-hash-erase',
      attestation: {
        type: 'play_integrity',
        token: firstAttestation,
      },
    },
  });
  assert.equal(firstErase.statusCode, 200);
  const firstBody = firstErase.json() as {
    status: string;
    requestId: string;
    erasedAtMs: number;
  };
  assert.equal(firstBody.status, 'erased');
  assert.equal(typeof firstBody.requestId, 'string');
  assert.equal(typeof firstBody.erasedAtMs, 'number');

  const refreshAfterErase = await app.inject({
    method: 'POST',
    url: '/v1/mobile/session/refresh',
    payload: {
      refreshToken: session.refreshToken,
    },
  });
  assert.equal(refreshAfterErase.statusCode, 401);
  assert.equal(refreshAfterErase.json().error, 'MOBILE_SESSION_TOKEN_INVALID');

  const secondChallenge = await issueEraseChallenge(app);
  const secondAttestation = buildMockAttestationToken({
    type: 'play_integrity',
    integrity: 'strong',
    challengeId: secondChallenge.challengeId,
    deviceIdHash: 'device-hash-erase',
    challenge: secondChallenge.challenge,
  });
  const secondErase = await app.inject({
    method: 'POST',
    url: '/v1/mobile/privacy/erase',
    headers: {
      authorization: `Bearer ${session.accessToken}`,
    },
    payload: {
      challengeId: secondChallenge.challengeId,
      platform: 'android',
      deviceIdHash: 'device-hash-erase',
      attestation: {
        type: 'play_integrity',
        token: secondAttestation,
      },
    },
  });
  assert.equal(secondErase.statusCode, 200);
  assert.equal(secondErase.json().status, 'erased');
});

test('POST /v1/mobile/privacy/erase rejects replayed challenge', async t => {
  installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t, {
    MOBILE_ATTESTATION_ACCEPT_MOCK: 'true',
  });
  const session = await issueSession(app);
  const challenge = await issueEraseChallenge(app);
  const attestationToken = buildMockAttestationToken({
    type: 'play_integrity',
    integrity: 'strong',
    challengeId: challenge.challengeId,
    deviceIdHash: 'device-hash-erase',
    challenge: challenge.challenge,
  });

  const payload = {
    challengeId: challenge.challengeId,
    platform: 'android',
    deviceIdHash: 'device-hash-erase',
    attestation: {
      type: 'play_integrity',
      token: attestationToken,
    },
  } as const;

  const first = await app.inject({
    method: 'POST',
    url: '/v1/mobile/privacy/erase',
    headers: {
      authorization: `Bearer ${session.accessToken}`,
    },
    payload,
  });
  const second = await app.inject({
    method: 'POST',
    url: '/v1/mobile/privacy/erase',
    headers: {
      authorization: `Bearer ${session.accessToken}`,
    },
    payload,
  });

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 401);
  assert.equal(second.json().error, 'MOBILE_ATTESTATION_INVALID');
});
