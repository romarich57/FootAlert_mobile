import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApp, installFetchMock, jsonResponse } from '../helpers/appTestHarness.ts';

function buildMockAttestationToken(input: {
  type: 'play_integrity' | 'app_attest';
  integrity: 'strong' | 'device' | 'basic' | 'unknown';
  challengeId: string;
  deviceIdHash: string;
  challenge: string;
}): string {
  return `mock.${input.type}.${input.integrity}.${input.challengeId}.${input.deviceIdHash}.${input.challenge}`;
}

test('POST /v1/mobile/session/challenge returns challenge payload', async t => {
  installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const payload = {
    platform: 'android',
    deviceIdHash: 'device-hash-abc',
    appVersion: '1.0.0',
    buildNumber: '100',
  } as const;

  const response = await app.inject({
    method: 'POST',
    url: '/v1/mobile/session/challenge',
    payload,
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    challengeId: string;
    challenge: string;
    expiresAtMs: number;
  };
  assert.equal(typeof body.challengeId, 'string');
  assert.equal(typeof body.challenge, 'string');
  assert.equal(typeof body.expiresAtMs, 'number');
  assert.ok(body.expiresAtMs > Date.now());
});

test('POST /v1/mobile/session/attest issues bearer token for valid mock attestation', async t => {
  installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t, {
    MOBILE_ATTESTATION_ACCEPT_MOCK: 'true',
  });

  const challengeResponse = await app.inject({
    method: 'POST',
    url: '/v1/mobile/session/challenge',
    payload: {
      platform: 'android',
      deviceIdHash: 'device-hash-abc',
      appVersion: '1.0.0',
      buildNumber: '100',
    },
  });
  assert.equal(challengeResponse.statusCode, 200);

  const challengeBody = challengeResponse.json() as {
    challengeId: string;
    challenge: string;
    expiresAtMs: number;
  };
  const attestationToken = buildMockAttestationToken({
    type: 'play_integrity',
    integrity: 'device',
    challengeId: challengeBody.challengeId,
    deviceIdHash: 'device-hash-abc',
    challenge: challengeBody.challenge,
  });

  const attestResponse = await app.inject({
    method: 'POST',
    url: '/v1/mobile/session/attest',
    payload: {
      challengeId: challengeBody.challengeId,
      platform: 'android',
      deviceIdHash: 'device-hash-abc',
      attestation: {
        type: 'play_integrity',
        token: attestationToken,
      },
    },
  });

  assert.equal(attestResponse.statusCode, 200);
  const body = attestResponse.json() as {
    accessToken: string;
    expiresAtMs: number;
    integrity: string;
  };
  assert.equal(typeof body.accessToken, 'string');
  assert.equal(body.integrity, 'device');
  assert.ok(body.expiresAtMs > Date.now());
});

test('POST /v1/mobile/session/attest rejects replayed challenge', async t => {
  installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t, {
    MOBILE_ATTESTATION_ACCEPT_MOCK: 'true',
  });

  const challengeResponse = await app.inject({
    method: 'POST',
    url: '/v1/mobile/session/challenge',
    payload: {
      platform: 'android',
      deviceIdHash: 'device-hash-abc',
      appVersion: '1.0.0',
      buildNumber: '100',
    },
  });
  const challengeBody = challengeResponse.json() as {
    challengeId: string;
    challenge: string;
  };

  const attestationToken = buildMockAttestationToken({
    type: 'play_integrity',
    integrity: 'strong',
    challengeId: challengeBody.challengeId,
    deviceIdHash: 'device-hash-abc',
    challenge: challengeBody.challenge,
  });

  const requestPayload = {
    challengeId: challengeBody.challengeId,
    platform: 'android',
    deviceIdHash: 'device-hash-abc',
    attestation: {
      type: 'play_integrity',
      token: attestationToken,
    },
  };

  const first = await app.inject({
    method: 'POST',
    url: '/v1/mobile/session/attest',
    payload: requestPayload,
  });
  const second = await app.inject({
    method: 'POST',
    url: '/v1/mobile/session/attest',
    payload: requestPayload,
  });

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 401);
  assert.equal(second.json().error, 'MOBILE_ATTESTATION_INVALID');
});

test('POST /v1/mobile/session/attest rejects malformed mock attestation token', async t => {
  installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t, {
    MOBILE_ATTESTATION_ACCEPT_MOCK: 'true',
  });

  const challengeResponse = await app.inject({
    method: 'POST',
    url: '/v1/mobile/session/challenge',
    payload: {
      platform: 'ios',
      deviceIdHash: 'device-hash-ios',
      appVersion: '1.0.0',
      buildNumber: '100',
    },
  });
  const challengeBody = challengeResponse.json() as {
    challengeId: string;
  };

  const response = await app.inject({
    method: 'POST',
    url: '/v1/mobile/session/attest',
    payload: {
      challengeId: challengeBody.challengeId,
      platform: 'ios',
      deviceIdHash: 'device-hash-ios',
      attestation: {
        type: 'app_attest',
        token: 'mock.app_attest.invalid',
      },
    },
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error, 'MOBILE_ATTESTATION_INVALID');
});
