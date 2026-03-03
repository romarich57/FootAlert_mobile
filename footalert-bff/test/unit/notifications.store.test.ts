import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createNotificationsStore,
  type NotificationsStore,
} from '../../src/lib/notifications/store.js';

async function createMemoryStore(): Promise<NotificationsStore> {
  return createNotificationsStore({
    backend: 'memory',
    databaseUrl: null,
  });
}

test('insertEventIfAbsent is idempotent on source + externalEventId', async () => {
  const store = await createMemoryStore();
  try {
    const payload = {
      source: 'fixture-feed',
      externalEventId: 'evt-1',
      alertType: 'goal' as const,
      occurredAt: new Date().toISOString(),
      fixtureId: 'f-1',
      competitionId: 'c-1',
      teamIds: ['t-1'],
      playerIds: ['p-1'],
      title: 'Goal',
      body: 'Scored',
      payload: {},
    };

    const firstInsert = await store.insertEventIfAbsent(payload);
    const secondInsert = await store.insertEventIfAbsent(payload);

    assert.equal(firstInsert.created, true);
    assert.equal(secondInsert.created, false);
    assert.equal(firstInsert.event.id, secondInsert.event.id);
  } finally {
    await store.close();
  }
});

test('createDeliveries deduplicates by (event, device, alertType)', async () => {
  const store = await createMemoryStore();
  try {
    const device = await store.registerDevice({
      authSubject: 'user:1',
      deviceId: 'device-a',
      tokenHash: 'hash-a',
      tokenCiphertext: 'cipher-a',
      platform: 'android',
      provider: 'fcm',
      appVersion: '1.0.0',
      locale: 'fr',
      timezone: 'UTC',
    });

    const event = await store.insertEventIfAbsent({
      source: 'fixture-feed',
      externalEventId: 'evt-2',
      alertType: 'goal',
      occurredAt: new Date().toISOString(),
      fixtureId: 'f-2',
      competitionId: 'c-2',
      teamIds: ['t-1'],
      playerIds: [],
      title: 'Goal',
      body: 'Scored',
      payload: {},
    });

    await store.createDeliveries({
      eventId: event.event.id,
      alertType: 'goal',
      deviceIds: [device.id],
    });
    await store.createDeliveries({
      eventId: event.event.id,
      alertType: 'goal',
      deviceIds: [device.id],
    });

    const deliveries = await store.listPendingDeliveries({ eventId: event.event.id });
    assert.equal(deliveries.length, 1);
  } finally {
    await store.close();
  }
});

test('markDeliveryOpenedByEventAndDevice updates only matching authSubject + deviceId', async () => {
  const store = await createMemoryStore();
  try {
    const device = await store.registerDevice({
      authSubject: 'user:2',
      deviceId: 'device-b',
      tokenHash: 'hash-b',
      tokenCiphertext: 'cipher-b',
      platform: 'ios',
      provider: 'apns',
      appVersion: '1.0.1',
      locale: 'en',
      timezone: 'UTC',
    });

    const event = await store.insertEventIfAbsent({
      source: 'fixture-feed',
      externalEventId: 'evt-3',
      alertType: 'match_end',
      occurredAt: new Date().toISOString(),
      fixtureId: 'f-3',
      competitionId: 'c-3',
      teamIds: ['t-2'],
      playerIds: [],
      title: 'FT',
      body: 'Finished',
      payload: {},
    });

    await store.createDeliveries({
      eventId: event.event.id,
      alertType: 'match_end',
      deviceIds: [device.id],
    });

    const openedWrongSubject = await store.markDeliveryOpenedByEventAndDevice({
      eventId: event.event.id,
      authSubject: 'user:other',
      deviceId: 'device-b',
    });
    assert.equal(openedWrongSubject, 0);

    const opened = await store.markDeliveryOpenedByEventAndDevice({
      eventId: event.event.id,
      authSubject: 'user:2',
      deviceId: 'device-b',
    });
    assert.equal(opened, 1);

    const pendingAfterOpen = await store.listPendingDeliveries({ eventId: event.event.id });
    assert.equal(pendingAfterOpen.length, 0);
  } finally {
    await store.close();
  }
});

test('listPendingDeliveriesPage paginates deterministically with cursor', async () => {
  const store = await createMemoryStore();
  try {
    const registeredDevices = await Promise.all([
      store.registerDevice({
        authSubject: 'user:pagination',
        deviceId: 'device-1',
        tokenHash: 'hash-1',
        tokenCiphertext: 'cipher-1',
        platform: 'android',
        provider: 'fcm',
        appVersion: '1.0.0',
        locale: 'fr',
        timezone: 'UTC',
      }),
      store.registerDevice({
        authSubject: 'user:pagination',
        deviceId: 'device-2',
        tokenHash: 'hash-2',
        tokenCiphertext: 'cipher-2',
        platform: 'android',
        provider: 'fcm',
        appVersion: '1.0.0',
        locale: 'fr',
        timezone: 'UTC',
      }),
      store.registerDevice({
        authSubject: 'user:pagination',
        deviceId: 'device-3',
        tokenHash: 'hash-3',
        tokenCiphertext: 'cipher-3',
        platform: 'android',
        provider: 'fcm',
        appVersion: '1.0.0',
        locale: 'fr',
        timezone: 'UTC',
      }),
    ]);

    const event = await store.insertEventIfAbsent({
      source: 'fixture-feed',
      externalEventId: 'evt-paginated',
      alertType: 'goal',
      occurredAt: new Date().toISOString(),
      fixtureId: 'f-paginated',
      competitionId: 'c-paginated',
      teamIds: ['t-1'],
      playerIds: [],
      title: 'Goal',
      body: 'Scored',
      payload: {},
    });

    await store.createDeliveries({
      eventId: event.event.id,
      alertType: 'goal',
      deviceIds: registeredDevices.map(device => device.id),
    });

    const firstPage = await store.listPendingDeliveriesPage({
      eventId: event.event.id,
      limit: 2,
      cursor: null,
    });
    assert.equal(firstPage.items.length, 2);
    assert.notEqual(firstPage.nextCursor, null);

    const secondPage = await store.listPendingDeliveriesPage({
      eventId: event.event.id,
      limit: 2,
      cursor: firstPage.nextCursor,
    });
    assert.equal(secondPage.items.length, 1);
    assert.equal(secondPage.nextCursor, null);

    const allIds = [...firstPage.items, ...secondPage.items].map(item => item.id);
    assert.equal(new Set(allIds).size, 3);
  } finally {
    await store.close();
  }
});

test('promoteDeferredDeliveries moves deferred entries to pending in batches', async () => {
  const store = await createMemoryStore();
  try {
    const registeredDevices = await Promise.all([
      store.registerDevice({
        authSubject: 'user:deferred',
        deviceId: 'device-a',
        tokenHash: 'hash-da',
        tokenCiphertext: 'cipher-da',
        platform: 'ios',
        provider: 'apns',
        appVersion: '1.0.0',
        locale: 'en',
        timezone: 'UTC',
      }),
      store.registerDevice({
        authSubject: 'user:deferred',
        deviceId: 'device-b',
        tokenHash: 'hash-db',
        tokenCiphertext: 'cipher-db',
        platform: 'ios',
        provider: 'apns',
        appVersion: '1.0.0',
        locale: 'en',
        timezone: 'UTC',
      }),
      store.registerDevice({
        authSubject: 'user:deferred',
        deviceId: 'device-c',
        tokenHash: 'hash-dc',
        tokenCiphertext: 'cipher-dc',
        platform: 'ios',
        provider: 'apns',
        appVersion: '1.0.0',
        locale: 'en',
        timezone: 'UTC',
      }),
    ]);

    const event = await store.insertEventIfAbsent({
      source: 'fixture-feed',
      externalEventId: 'evt-deferred',
      alertType: 'match_start',
      occurredAt: new Date().toISOString(),
      fixtureId: 'f-deferred',
      competitionId: 'c-deferred',
      teamIds: ['t-1'],
      playerIds: [],
      title: 'Kick-off',
      body: 'Match starts',
      payload: {},
    });

    await store.createDeliveries({
      eventId: event.event.id,
      alertType: 'match_start',
      deviceIds: registeredDevices.map(device => device.id),
      initialStatus: 'deferred',
    });
    assert.equal(await store.countDeferredDeliveries({ eventId: event.event.id }), 3);

    const promotedFirstBatch = await store.promoteDeferredDeliveries({
      eventId: event.event.id,
      limit: 2,
    });
    assert.equal(promotedFirstBatch.length, 2);
    assert.equal(await store.countDeferredDeliveries({ eventId: event.event.id }), 1);
    assert.equal((await store.listPendingDeliveries({ eventId: event.event.id })).length, 2);

    const promotedSecondBatch = await store.promoteDeferredDeliveries({
      eventId: event.event.id,
      limit: 5,
    });
    assert.equal(promotedSecondBatch.length, 1);
    assert.equal(await store.countDeferredDeliveries({ eventId: event.event.id }), 0);
    assert.equal((await store.listPendingDeliveries({ eventId: event.event.id })).length, 3);
  } finally {
    await store.close();
  }
});
