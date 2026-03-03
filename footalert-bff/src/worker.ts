import { createHash } from 'node:crypto';
import { setTimeout as wait } from 'node:timers/promises';

import { env } from './config/env.js';
import { BffError } from './lib/errors.js';
import { decryptPushToken } from './lib/notifications/crypto.js';
import { createFirebaseNotificationsSender } from './lib/notifications/firebaseSender.js';
import {
  incrementNotificationMetric,
  setNotificationGauge,
} from './lib/notifications/metrics.js';
import {
  buildDeferredPromotionJobId,
  buildSendJobId,
  NOTIFICATIONS_DEFERRED_PROMOTION_QUEUE,
  NOTIFICATIONS_DISPATCH_QUEUE,
  NOTIFICATIONS_DLQ_QUEUE,
  NOTIFICATIONS_SEND_QUEUE,
  type DeferredPromotionJobPayload,
  type DispatchJobPayload,
  type SendJobPayload,
} from './lib/notifications/queue.js';
import { getNotificationsStore } from './lib/notifications/runtime.js';
import {
  chunkForMulticast,
  isInvalidTokenCode,
  isTransientErrorCode,
  sortRecipientsForFanout,
  splitImmediateAndDeferred,
} from './lib/notifications/workerPolicies.js';

type QueueLike = {
  add: (name: string, data: Record<string, unknown>, options?: Record<string, unknown>) => Promise<unknown>;
  close: () => Promise<void>;
};

type WorkerLike = {
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  close: () => Promise<void>;
};

type JobLike<TPayload> = {
  id?: string;
  name: string;
  data: TPayload;
  attemptsMade: number;
  opts: {
    attempts?: number;
  };
};

type WorkerLogLevel = 'info' | 'error';

function hashSensitiveValue(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function toCountBucket(value: number): string {
  if (value <= 0) {
    return '0';
  }
  if (value <= 10) {
    return '1-10';
  }
  if (value <= 100) {
    return '11-100';
  }
  if (value <= 500) {
    return '101-500';
  }

  return '500+';
}

function buildRedactedEventContext(input: { eventId?: string; alertType?: string }) {
  return {
    eventRef: input.eventId ? hashSensitiveValue(input.eventId) : undefined,
    alertTypeRef: input.alertType ? hashSensitiveValue(input.alertType) : undefined,
  };
}

function logWorker(level: WorkerLogLevel, eventName: string, payload: Record<string, unknown>): void {
  const logger = level === 'error' ? console.error : console.info;
  logger(`[notifications.worker] ${eventName}`, payload);
}

function resolveRedisConnection(redisUrl: string): {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: Record<string, unknown>;
} {
  const parsed = new URL(redisUrl);
  const secure = parsed.protocol === 'rediss:';

  return {
    host: parsed.hostname,
    port: parsed.port ? Number.parseInt(parsed.port, 10) : 6379,
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    db: parsed.pathname ? Number.parseInt(parsed.pathname.replace('/', ''), 10) || 0 : 0,
    tls: secure ? {} : undefined,
  };
}

function buildPushData(payload: DispatchJobPayload['payload'], eventId: string): Record<string, string> {
  return Object.entries(payload.payload).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key] = typeof value === 'string' ? value : JSON.stringify(value);
    return acc;
  }, {
    eventId,
    alertType: payload.alertType,
  });
}

async function enqueuePendingSendJobsForEvent(options: {
  sendQueue: QueueLike;
  notificationsStore: Awaited<ReturnType<typeof getNotificationsStore>>;
  eventId: string;
  alertType: SendJobPayload['alertType'];
  title: string;
  body: string;
  data: Record<string, string>;
}): Promise<number> {
  let enqueuedDeliveries = 0;
  let cursor: string | null = null;

  do {
    const page = await options.notificationsStore.listPendingDeliveriesPage({
      eventId: options.eventId,
      limit: 500,
      cursor,
    });

    for (const deliveryChunk of chunkForMulticast(page.items, 500)) {
      if (deliveryChunk.length === 0) {
        continue;
      }

      await options.sendQueue.add(
        'send',
        {
          eventId: options.eventId,
          alertType: options.alertType,
          deliveryIds: deliveryChunk.map(delivery => delivery.id),
          title: options.title,
          body: options.body,
          data: options.data,
        } satisfies SendJobPayload,
        {
          jobId: buildSendJobId(options.eventId),
        },
      );
      enqueuedDeliveries += deliveryChunk.length;
    }

    cursor = page.nextCursor;
  } while (cursor);

  return enqueuedDeliveries;
}

async function markEventStatusBasedOnBacklog(options: {
  notificationsStore: Awaited<ReturnType<typeof getNotificationsStore>>;
  eventId: string;
}): Promise<void> {
  const pendingPage = await options.notificationsStore.listPendingDeliveriesPage({
    eventId: options.eventId,
    limit: 1,
    cursor: null,
  });
  const deferredCount = await options.notificationsStore.countDeferredDeliveries({
    eventId: options.eventId,
  });
  setNotificationGauge('notifications_deferred_backlog', deferredCount);

  if (pendingPage.items.length === 0 && deferredCount === 0) {
    await options.notificationsStore.markEventStatus({
      eventId: options.eventId,
      status: 'processed',
    });
    return;
  }

  await options.notificationsStore.markEventStatus({
    eventId: options.eventId,
    status: 'queued',
  });
}

async function startWorker(): Promise<void> {
  if (!env.redisUrl) {
    throw new Error('REDIS_URL is required for notifications worker.');
  }

  if (!env.pushTokenEncryptionKey) {
    throw new Error('PUSH_TOKEN_ENCRYPTION_KEY is required for notifications worker.');
  }

  const notificationsStore = await getNotificationsStore({
    backend: env.notificationsPersistenceBackend,
    databaseUrl: env.databaseUrl,
  });

  const firebaseSender = await createFirebaseNotificationsSender({
    projectId: env.firebaseProjectId,
    clientEmail: env.firebaseClientEmail,
    privateKey: env.firebasePrivateKey,
  });

  const moduleName = 'bullmq';
  const imported = await import(moduleName);
  const QueueConstructor = (imported as { Queue: new (...args: unknown[]) => QueueLike }).Queue;
  const WorkerConstructor = (imported as { Worker: new (...args: unknown[]) => WorkerLike }).Worker;

  const connection = resolveRedisConnection(env.redisUrl);

  const sendQueue = new QueueConstructor(NOTIFICATIONS_SEND_QUEUE, {
    connection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: 5000,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000,
        jitter: 0.2,
      },
    },
  });

  const deferredPromotionQueue = new QueueConstructor(NOTIFICATIONS_DEFERRED_PROMOTION_QUEUE, {
    connection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: 5000,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000,
        jitter: 0.2,
      },
    },
  });

  const dlqQueue = new QueueConstructor(NOTIFICATIONS_DLQ_QUEUE, {
    connection,
    defaultJobOptions: {
      removeOnComplete: false,
      removeOnFail: false,
    },
  });

  const dispatchWorker = new WorkerConstructor(
    NOTIFICATIONS_DISPATCH_QUEUE,
    async (job: JobLike<DispatchJobPayload>) => {
      const enqueuedAt = Date.parse(job.data.enqueuedAt);
      if (Number.isFinite(enqueuedAt)) {
        setNotificationGauge('notifications_queue_lag_ms', Math.max(Date.now() - enqueuedAt, 0));
      }

      const { event } = await notificationsStore.insertEventIfAbsent(job.data.payload);
      const eligibleDevices = sortRecipientsForFanout(await notificationsStore.findEligibleDevicesForEvent(event));
      const fanoutPartition = splitImmediateAndDeferred(
        eligibleDevices,
        env.notificationsFanoutMaxPerEvent,
      );
      const immediateDevices = fanoutPartition.immediate;
      const deferredDevices = fanoutPartition.deferred;
      const immediateDeviceIds = immediateDevices.map(device => device.id);
      const deferredDeviceIds = deferredDevices.map(device => device.id);

      await notificationsStore.createDeliveries({
        eventId: event.id,
        alertType: event.alertType,
        deviceIds: immediateDeviceIds,
        initialStatus: 'pending',
      });
      await notificationsStore.createDeliveries({
        eventId: event.id,
        alertType: event.alertType,
        deviceIds: deferredDeviceIds,
        initialStatus: 'deferred',
      });

      if (deferredDeviceIds.length > 0) {
        incrementNotificationMetric('notifications_deliveries_deferred_total', deferredDeviceIds.length);
      }

      const data = buildPushData(job.data.payload, event.id);
      const deferredBacklog = await notificationsStore.countDeferredDeliveries({ eventId: event.id });
      setNotificationGauge('notifications_deferred_backlog', deferredBacklog);

      logWorker('info', 'dispatch_resolved_recipients', {
        jobId: job.id,
        recipientCountBucket: toCountBucket(eligibleDevices.length),
        immediateCountBucket: toCountBucket(immediateDeviceIds.length),
        deferredCountBucket: toCountBucket(deferredDeviceIds.length),
        ...buildRedactedEventContext({
          eventId: event.id,
          alertType: event.alertType,
        }),
      });

      if (immediateDeviceIds.length > 0) {
        await enqueuePendingSendJobsForEvent({
          sendQueue,
          notificationsStore,
          eventId: event.id,
          alertType: event.alertType,
          title: event.title,
          body: event.body,
          data,
        });
      }

      if (deferredDeviceIds.length > 0) {
        await deferredPromotionQueue.add(
          'promote_deferred',
          {
            eventId: event.id,
            alertType: event.alertType,
            title: event.title,
            body: event.body,
            data,
            enqueuedAt: new Date().toISOString(),
          } satisfies DeferredPromotionJobPayload,
          {
            jobId: buildDeferredPromotionJobId(event.id),
            delay: env.notificationsDeferredDelayMs,
          },
        );
      }

      await markEventStatusBasedOnBacklog({
        notificationsStore,
        eventId: event.id,
      });
    },
    {
      connection,
      concurrency: 5,
    },
  );

  const deferredPromotionWorker = new WorkerConstructor(
    NOTIFICATIONS_DEFERRED_PROMOTION_QUEUE,
    async (job: JobLike<DeferredPromotionJobPayload>) => {
      const enqueuedAt = Date.parse(job.data.enqueuedAt);
      if (Number.isFinite(enqueuedAt)) {
        setNotificationGauge('notifications_queue_lag_ms', Math.max(Date.now() - enqueuedAt, 0));
      }

      const promotedDeliveryIds = await notificationsStore.promoteDeferredDeliveries({
        eventId: job.data.eventId,
        limit: env.notificationsDeferredPromotionBatch,
      });
      if (promotedDeliveryIds.length > 0) {
        incrementNotificationMetric('notifications_deferred_promotions_total', promotedDeliveryIds.length);
      }

      for (const chunk of chunkForMulticast(promotedDeliveryIds, 500)) {
        if (chunk.length === 0) {
          continue;
        }

        await sendQueue.add(
          'send',
          {
            eventId: job.data.eventId,
            alertType: job.data.alertType,
            deliveryIds: chunk,
            title: job.data.title,
            body: job.data.body,
            data: job.data.data,
          } satisfies SendJobPayload,
          {
            jobId: buildSendJobId(job.data.eventId),
          },
        );
      }

      const deferredBacklog = await notificationsStore.countDeferredDeliveries({
        eventId: job.data.eventId,
      });
      setNotificationGauge('notifications_deferred_backlog', deferredBacklog);

      if (deferredBacklog > 0) {
        await deferredPromotionQueue.add(
          'promote_deferred',
          {
            ...job.data,
            enqueuedAt: new Date().toISOString(),
          } satisfies DeferredPromotionJobPayload,
          {
            jobId: buildDeferredPromotionJobId(job.data.eventId),
            delay: env.notificationsDeferredDelayMs,
          },
        );
      }

      await markEventStatusBasedOnBacklog({
        notificationsStore,
        eventId: job.data.eventId,
      });
    },
    {
      connection,
      concurrency: 2,
    },
  );

  const sendWorker = new WorkerConstructor(
    NOTIFICATIONS_SEND_QUEUE,
    async (job: JobLike<SendJobPayload>) => {
      const pendingDeliveries = await notificationsStore.listPendingDeliveries({
        eventId: job.data.eventId,
      });

      const deliveriesById = new Map(pendingDeliveries.map(delivery => [delivery.id, delivery]));
      const selectedDeliveries = job.data.deliveryIds
        .map(deliveryId => deliveriesById.get(deliveryId) ?? null)
        .filter((delivery): delivery is (typeof pendingDeliveries)[number] => Boolean(delivery));

      if (selectedDeliveries.length === 0) {
        await markEventStatusBasedOnBacklog({
          notificationsStore,
          eventId: job.data.eventId,
        });
        return;
      }

      const tokens = selectedDeliveries.map(delivery =>
        decryptPushToken(delivery.tokenCiphertext, env.pushTokenEncryptionKey as string));
      const sendResult = await firebaseSender.sendMulticast({
        tokens,
        title: job.data.title,
        body: job.data.body,
        data: job.data.data,
      });
      logWorker('info', 'send_batch_result', {
        jobId: job.id,
        deliveryCountBucket: toCountBucket(selectedDeliveries.length),
        successCountBucket: toCountBucket(sendResult.successCount),
        failureCountBucket: toCountBucket(sendResult.failureCount),
        ...buildRedactedEventContext({
          eventId: job.data.eventId,
          alertType: job.data.alertType,
        }),
      });

      setNotificationGauge(
        'notifications_delivery_latency_ms',
        Math.max(Date.now() - Date.parse(selectedDeliveries[0]?.createdAt ?? new Date().toISOString()), 0),
      );

      let shouldRetryTransientFailure = false;

      for (const [index, response] of sendResult.responses.entries()) {
        const delivery = selectedDeliveries[index];
        if (!delivery) {
          continue;
        }

        if (response.success) {
          await notificationsStore.markDeliveryStatus({
            deliveryId: delivery.id,
            status: 'sent',
            providerMessageId: response.messageId,
          });
          incrementNotificationMetric('notifications_deliveries_sent_total');
          continue;
        }

        if (isInvalidTokenCode(response.errorCode)) {
          await notificationsStore.markDeliveryStatus({
            deliveryId: delivery.id,
            status: 'invalid_token',
            errorCode: response.errorCode,
            errorMessage: response.errorMessage,
            incrementAttempts: true,
          });
          await notificationsStore.markDeviceInvalid({ deviceId: delivery.deviceId });
          incrementNotificationMetric('notifications_invalid_token_total');
          incrementNotificationMetric('notifications_deliveries_failed_total');
          continue;
        }

        if (isTransientErrorCode(response.errorCode)) {
          shouldRetryTransientFailure = true;
          await notificationsStore.markDeliveryStatus({
            deliveryId: delivery.id,
            status: 'pending',
            errorCode: response.errorCode,
            errorMessage: response.errorMessage,
            incrementAttempts: true,
          });
          continue;
        }

        await notificationsStore.markDeliveryStatus({
          deliveryId: delivery.id,
          status: 'failed',
          errorCode: response.errorCode,
          errorMessage: response.errorMessage,
          incrementAttempts: true,
        });
        incrementNotificationMetric('notifications_deliveries_failed_total');
      }

      if (shouldRetryTransientFailure) {
        throw new BffError(503, 'NOTIFICATIONS_TRANSIENT_SEND_FAILURE', 'Transient notifications delivery failure.');
      }

      await markEventStatusBasedOnBacklog({
        notificationsStore,
        eventId: job.data.eventId,
      });
    },
    {
      connection,
      concurrency: 10,
    },
  );

  dispatchWorker.on('failed', async (job, error) => {
    const failedJob = job as JobLike<DispatchJobPayload> | undefined;
    logWorker('error', 'dispatch_job_failed', {
      jobId: failedJob?.id,
      attemptsMade: failedJob?.attemptsMade,
      errorMessage: String(error),
    });

    if (failedJob?.data?.eventId) {
      await notificationsStore.markEventStatus({
        eventId: failedJob.data.eventId,
        status: 'failed',
      });
      await dlqQueue.add(
        'dispatch_failed',
        {
          jobId: failedJob.id,
          payload: failedJob.data,
          error: String(error),
        },
      );
    }
  });

  deferredPromotionWorker.on('failed', async (job, error) => {
    const failedJob = job as JobLike<DeferredPromotionJobPayload> | undefined;
    logWorker('error', 'deferred_promotion_job_failed', {
      jobId: failedJob?.id,
      attemptsMade: failedJob?.attemptsMade,
      errorMessage: String(error),
      ...buildRedactedEventContext({
        eventId: failedJob?.data?.eventId,
      }),
    });

    if (failedJob?.data?.eventId) {
      await dlqQueue.add(
        'deferred_promotion_failed',
        {
          jobId: failedJob.id,
          payload: failedJob.data,
          error: String(error),
        },
      );
    }
  });

  sendWorker.on('failed', async (job, error) => {
    const failedJob = job as JobLike<SendJobPayload> | undefined;
    logWorker('error', 'send_job_failed', {
      jobId: failedJob?.id,
      attemptsMade: failedJob?.attemptsMade,
      attempts: failedJob?.opts?.attempts,
      errorMessage: String(error),
      ...buildRedactedEventContext({
        eventId: failedJob?.data?.eventId,
      }),
    });

    const attemptsAllowed = failedJob?.opts?.attempts ?? 1;
    if (failedJob && failedJob.attemptsMade >= attemptsAllowed) {
      await dlqQueue.add(
        'send_failed',
        {
          jobId: failedJob.id,
          payload: failedJob.data,
          error: String(error),
        },
      );
    }
  });

  const close = async () => {
    await dispatchWorker.close();
    await deferredPromotionWorker.close();
    await sendWorker.close();
    await deferredPromotionQueue.close();
    await sendQueue.close();
    await dlqQueue.close();
    await notificationsStore.close();
  };

  process.once('SIGINT', () => {
    void close().finally(() => process.exit(0));
  });
  process.once('SIGTERM', () => {
    void close().finally(() => process.exit(0));
  });

  // Keep worker process alive.
  while (true) {
    await wait(60_000);
  }
}

startWorker().catch(error => {
  console.error('[notifications.worker] fatal error', error);
  process.exit(1);
});
