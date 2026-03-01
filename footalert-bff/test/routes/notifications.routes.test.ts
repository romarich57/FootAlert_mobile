import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildApp,
  buildMobileSessionAuthorizationHeader,
  installFetchMock,
  jsonResponse,
} from '../helpers/appTestHarness.ts';
test('POST /v1/notifications/tokens stores a push token payload', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);
  const payload = {
    token: 'token-1',
    deviceId: 'device-abc',
    platform: 'ios',
    provider: 'apns',
    appVersion: '1.0.0',
    locale: 'fr',
    timezone: 'Europe/Paris',
  } as const;

  const response = await app.inject({
    method: 'POST',
    url: '/v1/notifications/tokens',
    headers: buildMobileSessionAuthorizationHeader({
      scope: ['notifications:write'],
      integrity: 'strong',
    }),
    payload,
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: 'registered',
    token: 'token-1',
  });
  assert.equal(calls.length, 0);
});

test('POST /v1/notifications/tokens rejects invalid payload', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);
  const payload = {
    token: 'token-1',
    deviceId: 'device-abc',
    platform: 'ios',
    provider: 'apns',
    appVersion: '1.0.0',
    locale: 'de',
    timezone: 'Europe/Paris',
  } as const;

  const response = await app.inject({
    method: 'POST',
    url: '/v1/notifications/tokens',
    headers: buildMobileSessionAuthorizationHeader({
      scope: ['notifications:write'],
      integrity: 'strong',
    }),
    payload,
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'VALIDATION_ERROR');
  assert.equal(calls.length, 0);
});

test('DELETE /v1/notifications/tokens/:token revokes token', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);
  const registrationPayload = {
    token: 'token-delete',
    deviceId: 'device-1',
    platform: 'android',
    provider: 'fcm',
    appVersion: '1.0.0',
    locale: 'en',
    timezone: 'America/New_York',
  } as const;

  await app.inject({
    method: 'POST',
    url: '/v1/notifications/tokens',
    headers: buildMobileSessionAuthorizationHeader({
      scope: ['notifications:write'],
      integrity: 'strong',
    }),
    payload: registrationPayload,
  });

  const deleteResponse = await app.inject({
    method: 'DELETE',
    url: '/v1/notifications/tokens/token-delete',
    headers: buildMobileSessionAuthorizationHeader({
      scope: ['notifications:write'],
      integrity: 'strong',
    }),
  });

  assert.equal(deleteResponse.statusCode, 204);
  assert.equal(calls.length, 0);
});

test('POST /v1/notifications/tokens rejects unsigned technical requests', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'POST',
    url: '/v1/notifications/tokens',
    payload: {
      token: 'token-1',
      deviceId: 'device-abc',
      platform: 'ios',
      provider: 'apns',
      appVersion: '1.0.0',
      locale: 'fr',
      timezone: 'Europe/Paris',
    },
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error, 'MOBILE_ATTESTATION_REQUIRED');
  assert.equal(calls.length, 0);
});

test('DELETE /v1/notifications/tokens/:token rejects unsigned requests', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'DELETE',
    url: '/v1/notifications/tokens/token-delete',
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error, 'MOBILE_ATTESTATION_REQUIRED');
  assert.equal(calls.length, 0);
});

test('POST /v1/notifications/tokens accepts bearer session token auth', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const payload = {
    token: 'token-bearer-1',
    deviceId: 'device-abc',
    platform: 'ios',
    provider: 'apns',
    appVersion: '1.0.0',
    locale: 'fr',
    timezone: 'Europe/Paris',
  } as const;

  const response = await app.inject({
    method: 'POST',
    url: '/v1/notifications/tokens',
    headers: buildMobileSessionAuthorizationHeader({
      scope: ['notifications:write', 'telemetry:write'],
      integrity: 'strong',
    }),
    payload,
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().status, 'registered');
  assert.equal(calls.length, 0);
});

test('POST /v1/notifications/tokens requires attestation token when legacy auth is disabled', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'POST',
    url: '/v1/notifications/tokens',
    payload: {
      token: 'token-1',
      deviceId: 'device-abc',
      platform: 'ios',
      provider: 'apns',
      appVersion: '1.0.0',
      locale: 'fr',
      timezone: 'Europe/Paris',
    },
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error, 'MOBILE_ATTESTATION_REQUIRED');
  assert.equal(calls.length, 0);
});
