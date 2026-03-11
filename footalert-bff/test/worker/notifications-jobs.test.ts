import assert from 'node:assert/strict';
import test from 'node:test';

import { encryptPushToken } from '../../src/lib/notifications/crypto.ts';
import type { NotificationsStore } from '../../src/lib/notifications/store.ts';
import { createNotificationJobRuntime } from '../../src/worker/notifications-jobs.ts';
import type { JobLike, QueueLike } from '../../src/worker/shared.ts';

function createQueue(): QueueLike & { adds: Array<Record<string, unknown>> } {
  const queue = {
    adds: [],
    add: async (_name, data, options) => {
      queue.adds.push({ data, options });
    },
    close: async () => undefined,
  };

  return queue as QueueLike & { adds: Array<Record<string, unknown>> };
}

function createNotificationEvent() {
  return {
    id: 'evt-1',
    source: 'api-football',
    externalEventId: 'ext-1',
    alertType: 'goal' as const,
    occurredAt: '2026-03-11T08:00:00.000Z',
    fixtureId: '101',
    competitionId: '39',
    teamIds: ['40'],
    playerIds: ['9'],
    title: 'Goal',
    body: 'But',
    payload: { fixtureId: '101' },
    status: 'received' as const,
    createdAt: '2026-03-11T08:00:00.000Z',
    updatedAt: '2026-03-11T08:00:00.000Z',
  };
}

test('dispatch handler fans out immediate and deferred deliveries using explicit queues', async () => {
  const sendQueue = createQueue();
  const deferredPromotionQueue = createQueue();
  const dlqQueue = createQueue();
  const createDeliveriesCalls: Array<{ initialStatus?: string; deviceIds: string[] }> = [];
  const event = createNotificationEvent();
  const notificationsStore = {
    insertEventIfAbsent: async () => ({ event, created: true }),
    findEligibleDevicesForEvent: async () => [
      { id: 'device-1', deviceId: 'a', lastSeenAt: '2026-03-11T08:02:00.000Z', tokenCiphertext: 'x' },
      { id: 'device-2', deviceId: 'b', lastSeenAt: '2026-03-11T08:01:00.000Z', tokenCiphertext: 'y' },
      { id: 'device-3', deviceId: 'c', lastSeenAt: '2026-03-11T08:00:00.000Z', tokenCiphertext: 'z' },
    ],
    createDeliveries: async input => {
      createDeliveriesCalls.push({
        initialStatus: input.initialStatus,
        deviceIds: input.deviceIds,
      });
    },
    countDeferredDeliveries: async () => 1,
    listPendingDeliveriesPage: async ({ limit }) => ({
      items: limit === 500
        ? [
            {
              id: 'delivery-1',
              eventId: event.id,
              deviceId: 'device-1',
              alertType: event.alertType,
              status: 'pending',
              attempts: 0,
              providerMessageId: null,
              errorCode: null,
              errorMessage: null,
              sentAt: null,
              openedAt: null,
              createdAt: '2026-03-11T08:00:00.000Z',
              updatedAt: '2026-03-11T08:00:00.000Z',
              tokenCiphertext: 'cipher-1',
            },
            {
              id: 'delivery-2',
              eventId: event.id,
              deviceId: 'device-2',
              alertType: event.alertType,
              status: 'pending',
              attempts: 0,
              providerMessageId: null,
              errorCode: null,
              errorMessage: null,
              sentAt: null,
              openedAt: null,
              createdAt: '2026-03-11T08:00:00.000Z',
              updatedAt: '2026-03-11T08:00:00.000Z',
              tokenCiphertext: 'cipher-2',
            },
          ]
        : [
            {
              id: 'delivery-1',
              eventId: event.id,
              deviceId: 'device-1',
              alertType: event.alertType,
              status: 'pending',
              attempts: 0,
              providerMessageId: null,
              errorCode: null,
              errorMessage: null,
              sentAt: null,
              openedAt: null,
              createdAt: '2026-03-11T08:00:00.000Z',
              updatedAt: '2026-03-11T08:00:00.000Z',
              tokenCiphertext: 'cipher-1',
            },
          ],
      nextCursor: null,
    }),
    markEventStatus: async () => undefined,
  } as unknown as NotificationsStore;

  const runtime = createNotificationJobRuntime({
    notificationsStore,
    sendQueue,
    deferredPromotionQueue,
    dlqQueue,
    firebaseSender: {
      sendMulticast: async () => ({
        successCount: 0,
        failureCount: 0,
        responses: [],
      }),
    },
    env: {
      notificationsFanoutMaxPerEvent: 2,
      notificationsDeferredDelayMs: 15_000,
      notificationsDeferredPromotionBatch: 500,
      pushTokenEncryptionKey: 'test-notifications-encryption-key',
    },
  });

  const job = {
    id: 'dispatch-1',
    name: 'dispatch',
    attemptsMade: 0,
    opts: {},
    data: {
      payload: event,
      enqueuedAt: '2026-03-11T08:00:00.000Z',
    },
  } satisfies JobLike<{ payload: typeof event; enqueuedAt: string }>;

  await runtime.handleDispatchJob(job);

  assert.equal(createDeliveriesCalls.length, 2);
  assert.deepEqual(createDeliveriesCalls[0], {
    initialStatus: 'pending',
    deviceIds: ['device-1', 'device-2'],
  });
  assert.deepEqual(createDeliveriesCalls[1], {
    initialStatus: 'deferred',
    deviceIds: ['device-3'],
  });
  assert.equal(sendQueue.adds.length, 1);
  assert.equal(deferredPromotionQueue.adds.length, 1);
  assert.equal(dlqQueue.adds.length, 0);
});

test('deferred promotion and send handlers keep backlog moving and normalize delivery results', async () => {
  const sendQueue = createQueue();
  const deferredPromotionQueue = createQueue();
  const dlqQueue = createQueue();
  const encryptionKey = 'test-notifications-encryption-key';
  const deliveryCipher = encryptPushToken('push-token-1', encryptionKey);
  const markDeliveryStatusCalls: Array<{ deliveryId: string; status: string }> = [];
  const notificationsStore = {
    promoteDeferredDeliveries: async () => ['delivery-3'],
    countDeferredDeliveries: async () => 1,
    listPendingDeliveriesPage: async () => ({
      items: [],
      nextCursor: null,
    }),
    markEventStatus: async () => undefined,
    listPendingDeliveries: async () => [
      {
        id: 'delivery-3',
        eventId: 'evt-1',
        deviceId: 'device-3',
        alertType: 'goal',
        status: 'pending',
        attempts: 0,
        providerMessageId: null,
        errorCode: null,
        errorMessage: null,
        sentAt: null,
        openedAt: null,
        createdAt: '2026-03-11T08:00:00.000Z',
        updatedAt: '2026-03-11T08:00:00.000Z',
        tokenCiphertext: deliveryCipher,
      },
    ],
    markDeliveryStatus: async input => {
      markDeliveryStatusCalls.push({
        deliveryId: input.deliveryId,
        status: input.status,
      });
    },
    markDeviceInvalid: async () => undefined,
  } as unknown as NotificationsStore;

  const runtime = createNotificationJobRuntime({
    notificationsStore,
    sendQueue,
    deferredPromotionQueue,
    dlqQueue,
    firebaseSender: {
      sendMulticast: async () => ({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true, messageId: 'firebase-1' }],
      }),
    },
    env: {
      notificationsFanoutMaxPerEvent: 2,
      notificationsDeferredDelayMs: 15_000,
      notificationsDeferredPromotionBatch: 500,
      pushTokenEncryptionKey: encryptionKey,
    },
  });

  await runtime.handleDeferredPromotionJob({
    id: 'promote-1',
    name: 'promote_deferred',
    attemptsMade: 0,
    opts: {},
    data: {
      eventId: 'evt-1',
      alertType: 'goal',
      title: 'Goal',
      body: 'But',
      data: { fixtureId: '101' },
      enqueuedAt: '2026-03-11T08:00:00.000Z',
    },
  });
  await runtime.handleSendJob({
    id: 'send-1',
    name: 'send',
    attemptsMade: 0,
    opts: {},
    data: {
      eventId: 'evt-1',
      alertType: 'goal',
      deliveryIds: ['delivery-3'],
      title: 'Goal',
      body: 'But',
      data: { fixtureId: '101' },
    },
  });

  assert.equal(sendQueue.adds.length, 1);
  assert.equal(deferredPromotionQueue.adds.length, 1);
  assert.deepEqual(markDeliveryStatusCalls, [
    { deliveryId: 'delivery-3', status: 'sent' },
  ]);
  assert.equal(dlqQueue.adds.length, 0);
});
