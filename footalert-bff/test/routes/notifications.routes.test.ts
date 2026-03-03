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

test('POST+GET /v1/notifications/subscriptions upserts and hydrates preferences', async t => {
  installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  await app.inject({
    method: 'POST',
    url: '/v1/notifications/tokens',
    headers: buildMobileSessionAuthorizationHeader({
      subject: 'device-subscriptions-1',
      scope: ['notifications:write'],
      integrity: 'strong',
    }),
    payload: {
      token: 'token-subscriptions',
      deviceId: 'device-subscriptions',
      platform: 'android',
      provider: 'fcm',
      appVersion: '1.0.0',
      locale: 'fr',
      timezone: 'Europe/Paris',
    },
  });

  const upsertResponse = await app.inject({
    method: 'POST',
    url: '/v1/notifications/subscriptions',
    headers: buildMobileSessionAuthorizationHeader({
      subject: 'device-subscriptions-1',
      scope: ['notifications:write'],
      integrity: 'strong',
    }),
    payload: {
      deviceId: 'device-subscriptions',
      scopeKind: 'competition',
      scopeId: '39',
      subscriptions: [
        { alertType: 'goal', enabled: true },
        { alertType: 'match_start', enabled: false },
      ],
    },
  });

  assert.equal(upsertResponse.statusCode, 200);
  assert.equal(upsertResponse.json().status, 'ok');
  assert.equal(upsertResponse.json().subscriptions.length, 2);

  const getResponse = await app.inject({
    method: 'GET',
    url: '/v1/notifications/subscriptions?deviceId=device-subscriptions&scopeKind=competition&scopeId=39',
    headers: buildMobileSessionAuthorizationHeader({
      subject: 'device-subscriptions-1',
      scope: ['notifications:write'],
      integrity: 'strong',
    }),
  });

  assert.equal(getResponse.statusCode, 200);
  const payload = getResponse.json();
  assert.equal(payload.subscriptions.length, 2);
  assert.equal(
    payload.subscriptions.some(
      (entry: { alertType: string; enabled: boolean }) =>
        entry.alertType === 'goal' && entry.enabled === true,
    ),
    true,
  );
});

test('POST /v1/notifications/subscriptions validates payload', async t => {
  installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'POST',
    url: '/v1/notifications/subscriptions',
    headers: buildMobileSessionAuthorizationHeader({
      scope: ['notifications:write'],
      integrity: 'strong',
    }),
    payload: {
      deviceId: 'device-subscriptions',
      scopeKind: 'competition',
      scopeId: '39',
      subscriptions: [{ alertType: 'unsupported_type', enabled: true }],
    },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'VALIDATION_ERROR');
});

test('POST /v1/notifications/events enforces internal bearer auth', async t => {
  installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const unauthorized = await app.inject({
    method: 'POST',
    url: '/v1/notifications/events',
    payload: {
      source: 'fixtures-api',
      externalEventId: 'evt-1',
      alertType: 'goal',
      title: 'Goal',
      body: 'A goal was scored',
      payload: {},
    },
  });

  assert.equal(unauthorized.statusCode, 401);
  assert.equal(unauthorized.json().error, 'UNAUTHORIZED_INGEST_TOKEN');
});

test('POST /v1/notifications/events is idempotent on source+externalEventId', async t => {
  installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const basePayload = {
    source: 'fixtures-api',
    externalEventId: 'evt-idempotent-1',
    alertType: 'goal',
    fixtureId: '1001',
    competitionId: '39',
    teamIds: ['50'],
    playerIds: ['10'],
    title: 'Goal',
    body: 'A goal was scored',
    payload: {
      fixtureId: '1001',
    },
  } as const;

  const headers = {
    authorization: 'Bearer test-notifications-ingest-token',
  };

  const first = await app.inject({
    method: 'POST',
    url: '/v1/notifications/events',
    headers,
    payload: basePayload,
  });
  assert.equal(first.statusCode, 200);
  assert.equal(first.json().deduplicated, false);

  const second = await app.inject({
    method: 'POST',
    url: '/v1/notifications/events',
    headers,
    payload: basePayload,
  });

  assert.equal(second.statusCode, 200);
  assert.equal(second.json().deduplicated, true);
  assert.equal(second.json().eventId, first.json().eventId);
});

test('POST /v1/notifications/opened accepts authenticated tracking payload', async t => {
  installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'POST',
    url: '/v1/notifications/opened',
    headers: buildMobileSessionAuthorizationHeader({
      subject: 'opened-device-subject',
      scope: ['notifications:write'],
      integrity: 'strong',
    }),
    payload: {
      eventId: 'event-unknown',
      deviceId: 'opened-device',
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().status, 'ok');
  assert.equal(response.json().openedCount, 0);
});

test('GET /v1/notifications/metrics returns counters and gauges', async t => {
  installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'GET',
    url: '/v1/notifications/metrics',
    headers: buildMobileSessionAuthorizationHeader({
      scope: ['api:read'],
      integrity: 'device',
    }),
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    counters: {},
    gauges: {},
  });
});
