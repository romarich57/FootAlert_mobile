import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildApp,
  buildMobileSessionAuthorizationHeader,
  installFetchMock,
  jsonResponse,
} from '../helpers/appTestHarness.ts';

test('POST /v1/telemetry/events accepts structured mobile events', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);
  const payload = {
    name: 'navigation.route_change',
    attributes: {
      from: 'Matches',
      to: 'TeamDetails',
    },
    userContext: {
      language: 'fr',
    },
    timestamp: '2026-02-25T10:00:00.000Z',
  } as const;

  const response = await app.inject({
    method: 'POST',
    url: '/v1/telemetry/events',
    headers: buildMobileSessionAuthorizationHeader({
      scope: ['telemetry:write'],
      integrity: 'device',
    }),
    payload,
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: 'accepted',
    type: 'event',
  });
  assert.equal(calls.length, 0);
});

test('POST /v1/telemetry/events/batch accepts structured mobile event arrays', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);
  const payload = [
    {
      name: 'navigation.route_change',
      attributes: {
        from: 'Matches',
        to: 'TeamDetails',
      },
      userContext: {
        language: 'fr',
      },
      timestamp: '2026-02-25T10:00:00.000Z',
    },
    {
      name: 'navigation.route_change',
      attributes: {
        from: 'TeamDetails',
        to: 'More',
      },
      userContext: {
        language: 'fr',
      },
      timestamp: '2026-02-25T10:00:01.000Z',
    },
  ] as const;

  const response = await app.inject({
    method: 'POST',
    url: '/v1/telemetry/events/batch',
    headers: buildMobileSessionAuthorizationHeader({
      scope: ['telemetry:write'],
      integrity: 'device',
    }),
    payload,
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: 'accepted',
    type: 'event_batch',
    count: 2,
  });
  assert.equal(calls.length, 0);
});

test('POST /v1/telemetry/errors rejects malformed payloads', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);
  const payload = {
    name: '',
    message: '',
  } as const;

  const response = await app.inject({
    method: 'POST',
    url: '/v1/telemetry/errors',
    headers: buildMobileSessionAuthorizationHeader({
      scope: ['telemetry:write'],
      integrity: 'device',
    }),
    payload,
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'VALIDATION_ERROR');
  assert.equal(calls.length, 0);
});

test('POST /v1/telemetry/errors/batch rejects malformed payload arrays', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);
  const payload = [
    {
      name: '',
      message: '',
    },
  ] as const;

  const response = await app.inject({
    method: 'POST',
    url: '/v1/telemetry/errors/batch',
    headers: buildMobileSessionAuthorizationHeader({
      scope: ['telemetry:write'],
      integrity: 'device',
    }),
    payload,
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'VALIDATION_ERROR');
  assert.equal(calls.length, 0);
});

test('POST /v1/telemetry/events rejects malformed bearer token', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'POST',
    url: '/v1/telemetry/events',
    headers: {
      authorization: 'Bearer malformed',
    },
    payload: {
      name: 'navigation.route_change',
      attributes: {
        from: 'Matches',
        to: 'More',
      },
    },
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error, 'MOBILE_SESSION_TOKEN_INVALID');
  assert.equal(calls.length, 0);
});

test('POST /v1/telemetry/breadcrumbs accepts structured breadcrumb payload', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);
  const payload = {
    name: 'navigation.opened_match_details',
    attributes: {
      category: 'navigation',
      message: 'Opened match details',
      level: 'info',
    },
  } as const;

  const response = await app.inject({
    method: 'POST',
    url: '/v1/telemetry/breadcrumbs',
    headers: buildMobileSessionAuthorizationHeader({
      scope: ['telemetry:write'],
      integrity: 'device',
    }),
    payload,
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: 'accepted',
    type: 'breadcrumb',
  });
  assert.equal(calls.length, 0);
});

test('POST /v1/telemetry/breadcrumbs/batch accepts breadcrumb arrays', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);
  const payload = [
    {
      name: 'navigation.opened_match_details',
      attributes: {
        category: 'navigation',
        message: 'Opened match details',
        level: 'info',
      },
    },
    {
      name: 'network.loaded_standings',
      attributes: {
        category: 'network',
        message: 'Loaded standings',
        level: 'debug',
      },
    },
  ] as const;

  const response = await app.inject({
    method: 'POST',
    url: '/v1/telemetry/breadcrumbs/batch',
    headers: buildMobileSessionAuthorizationHeader({
      scope: ['telemetry:write'],
      integrity: 'device',
    }),
    payload,
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: 'accepted',
    type: 'breadcrumb_batch',
    count: 2,
  });
  assert.equal(calls.length, 0);
});

test('POST /v1/telemetry/errors rejects unsigned requests', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'POST',
    url: '/v1/telemetry/errors',
    payload: {
      name: 'network.failure',
      message: 'request failed',
    },
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error, 'MOBILE_ATTESTATION_REQUIRED');
  assert.equal(calls.length, 0);
});

test('POST /v1/telemetry/breadcrumbs rejects unsigned requests', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'POST',
    url: '/v1/telemetry/breadcrumbs',
    payload: {
      name: 'navigation.missing_signature',
    },
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error, 'MOBILE_ATTESTATION_REQUIRED');
  assert.equal(calls.length, 0);
});

test('POST /v1/telemetry/events accepts bearer session token auth', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const payload = {
    name: 'navigation.route_change',
    attributes: {
      from: 'Matches',
      to: 'More',
    },
  };

  const response = await app.inject({
    method: 'POST',
    url: '/v1/telemetry/events',
    headers: buildMobileSessionAuthorizationHeader({
      scope: ['telemetry:write'],
      integrity: 'device',
    }),
    payload,
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().status, 'accepted');
  assert.equal(calls.length, 0);
});

test('POST /v1/telemetry/events rejects bearer tokens with insufficient integrity', async t => {
  const calls = installFetchMock(async () => jsonResponse({ response: [] }));
  const app = await buildApp(t);

  const response = await app.inject({
    method: 'POST',
    url: '/v1/telemetry/events',
    headers: buildMobileSessionAuthorizationHeader({
      scope: ['telemetry:write'],
      integrity: 'basic',
    }),
    payload: {
      name: 'network.loaded_data',
    },
  });

  assert.equal(response.statusCode, 403);
  assert.equal(response.json().error, 'DEVICE_INTEGRITY_FAILED');
  assert.equal(calls.length, 0);
});
