import {
  incrementNotificationMetric,
  setNotificationGauge,
} from '../lib/notifications/metrics.js';
import type { NotificationAlertType } from '../lib/notifications/contracts.js';
import type { NotificationsStore } from '../lib/notifications/store.js';
import {
  buildDeferredPromotionJobId,
  buildSendJobId,
  type DeferredPromotionJobPayload,
  type DispatchJobPayload,
  type SendJobPayload,
} from '../lib/notifications/queue.js';
import { chunkForMulticast } from '../lib/notifications/workerPolicies.js';
import {
  buildPushData,
  buildRedactedEventContext,
  type JobLike,
  logWorker,
  type QueueLike,
} from './shared.js';

export type FirebaseSendResponse = {
  successCount: number;
  failureCount: number;
  responses: Array<{
    success: boolean;
    messageId?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
  }>;
};

export type FirebaseSenderLike = {
  sendMulticast: (input: {
    tokens: string[];
    title: string;
    body: string;
    data: Record<string, string>;
  }) => Promise<FirebaseSendResponse>;
};

export async function enqueuePendingSendJobsForEvent(options: {
  sendQueue: QueueLike;
  notificationsStore: NotificationsStore;
  eventId: string;
  alertType: NotificationAlertType;
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
        { jobId: buildSendJobId(options.eventId) },
      );
      enqueuedDeliveries += deliveryChunk.length;
    }

    cursor = page.nextCursor;
  } while (cursor);

  return enqueuedDeliveries;
}

export async function markEventStatusBasedOnBacklog(options: {
  notificationsStore: NotificationsStore;
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

  await options.notificationsStore.markEventStatus({
    eventId: options.eventId,
    status: pendingPage.items.length === 0 && deferredCount === 0 ? 'processed' : 'queued',
  });
}

export function createNotificationFailureHandlers(input: {
  notificationsStore: NotificationsStore;
  dlqQueue: QueueLike;
}) {
  async function handleDispatchFailed(
    job: JobLike<DispatchJobPayload> | undefined,
    error: unknown,
  ): Promise<void> {
    logWorker('error', 'dispatch_job_failed', {
      jobId: job?.id,
      attemptsMade: job?.attemptsMade,
      errorMessage: String(error),
    });

    if (job?.data?.eventId) {
      await input.notificationsStore.markEventStatus({
        eventId: job.data.eventId,
        status: 'failed',
      });
      await input.dlqQueue.add('dispatch_failed', {
        jobId: job.id,
        payload: job.data,
        error: String(error),
      });
    }
  }

  async function handleDeferredPromotionFailed(
    job: JobLike<DeferredPromotionJobPayload> | undefined,
    error: unknown,
  ): Promise<void> {
    logWorker('error', 'deferred_promotion_job_failed', {
      jobId: job?.id,
      attemptsMade: job?.attemptsMade,
      errorMessage: String(error),
      ...buildRedactedEventContext({ eventId: job?.data?.eventId ?? undefined }),
    });

    if (job?.data?.eventId) {
      await input.dlqQueue.add('deferred_promotion_failed', {
        jobId: job.id,
        payload: job.data,
        error: String(error),
      });
    }
  }

  async function handleSendFailed(job: JobLike<SendJobPayload> | undefined, error: unknown): Promise<void> {
    logWorker('error', 'send_job_failed', {
      jobId: job?.id,
      attemptsMade: job?.attemptsMade,
      attempts: job?.opts?.attempts,
      errorMessage: String(error),
      ...buildRedactedEventContext({ eventId: job?.data?.eventId ?? undefined }),
    });

    const attemptsAllowed = job?.opts?.attempts ?? 1;
    if (job && job.attemptsMade >= attemptsAllowed) {
      await input.dlqQueue.add('send_failed', {
        jobId: job.id,
        payload: job.data,
        error: String(error),
      });
    }
  }

  return {
    handleDeferredPromotionFailed,
    handleDispatchFailed,
    handleSendFailed,
  };
}

export function buildDispatchData(payload: DispatchJobPayload['payload'], eventId: string) {
  return buildPushData(payload, eventId);
}

export function buildDeferredPromotionRequeue(
  payload: DeferredPromotionJobPayload,
  delay: number,
): {
  data: DeferredPromotionJobPayload;
  options: {
    jobId: string;
    delay: number;
  };
} {
  return {
    data: {
      ...payload,
      enqueuedAt: new Date().toISOString(),
    },
    options: {
      jobId: buildDeferredPromotionJobId(payload.eventId),
      delay,
    },
  };
}

export function trackDeferredDeliveries(count: number): void {
  if (count > 0) {
    incrementNotificationMetric('notifications_deliveries_deferred_total', count);
  }
}

export function trackDeferredPromotions(count: number): void {
  if (count > 0) {
    incrementNotificationMetric('notifications_deferred_promotions_total', count);
  }
}
