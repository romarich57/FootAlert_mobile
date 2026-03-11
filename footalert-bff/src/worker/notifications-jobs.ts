import { setNotificationGauge } from '../lib/notifications/metrics.js';
import type { NotificationsStore } from '../lib/notifications/store.js';
import {
  buildSendJobId,
  buildDeferredPromotionJobId,
  type DeferredPromotionJobPayload,
  type DispatchJobPayload,
} from '../lib/notifications/queue.js';
import {
  chunkForMulticast,
  sortRecipientsForFanout,
  splitImmediateAndDeferred,
} from '../lib/notifications/workerPolicies.js';
import {
  buildRedactedEventContext,
  type JobLike,
  logWorker,
  type QueueLike,
  toCountBucket,
} from './shared.js';
import {
  buildDeferredPromotionRequeue,
  buildDispatchData,
  createNotificationFailureHandlers,
  enqueuePendingSendJobsForEvent,
  markEventStatusBasedOnBacklog,
  trackDeferredDeliveries,
  trackDeferredPromotions,
  type FirebaseSenderLike,
} from './notifications-support.js';
import { createHandleSendJob } from './notifications-send.js';

export function createNotificationJobRuntime(input: {
  notificationsStore: NotificationsStore;
  sendQueue: QueueLike;
  deferredPromotionQueue: QueueLike;
  dlqQueue: QueueLike;
  firebaseSender: FirebaseSenderLike;
  env: {
    notificationsFanoutMaxPerEvent: number;
    notificationsDeferredDelayMs: number;
    notificationsDeferredPromotionBatch: number;
    pushTokenEncryptionKey: string;
  };
}) {
  const failureHandlers = createNotificationFailureHandlers({
    notificationsStore: input.notificationsStore,
    dlqQueue: input.dlqQueue,
  });

  async function handleDispatchJob(job: JobLike<DispatchJobPayload>): Promise<void> {
    const enqueuedAt = Date.parse(job.data.enqueuedAt);
    if (Number.isFinite(enqueuedAt)) {
      setNotificationGauge('notifications_queue_lag_ms', Math.max(Date.now() - enqueuedAt, 0));
    }

    const { event } = await input.notificationsStore.insertEventIfAbsent(job.data.payload);
    const eligibleDevices = sortRecipientsForFanout(
      await input.notificationsStore.findEligibleDevicesForEvent(event),
    );
    const fanoutPartition = splitImmediateAndDeferred(
      eligibleDevices,
      input.env.notificationsFanoutMaxPerEvent,
    );
    const immediateDeviceIds = fanoutPartition.immediate.map(device => device.id);
    const deferredDeviceIds = fanoutPartition.deferred.map(device => device.id);

    await input.notificationsStore.createDeliveries({
      eventId: event.id,
      alertType: event.alertType,
      deviceIds: immediateDeviceIds,
      initialStatus: 'pending',
    });
    await input.notificationsStore.createDeliveries({
      eventId: event.id,
      alertType: event.alertType,
      deviceIds: deferredDeviceIds,
      initialStatus: 'deferred',
    });
    trackDeferredDeliveries(deferredDeviceIds.length);

    const data = buildDispatchData(job.data.payload, event.id);
    setNotificationGauge(
      'notifications_deferred_backlog',
      await input.notificationsStore.countDeferredDeliveries({ eventId: event.id }),
    );

    logWorker('info', 'dispatch_resolved_recipients', {
      jobId: job.id,
      recipientCountBucket: toCountBucket(eligibleDevices.length),
      immediateCountBucket: toCountBucket(immediateDeviceIds.length),
      deferredCountBucket: toCountBucket(deferredDeviceIds.length),
      ...buildRedactedEventContext({ eventId: event.id, alertType: event.alertType }),
    });

    if (immediateDeviceIds.length > 0) {
      await enqueuePendingSendJobsForEvent({
        sendQueue: input.sendQueue,
        notificationsStore: input.notificationsStore,
        eventId: event.id,
        alertType: event.alertType,
        title: event.title,
        body: event.body,
        data,
      });
    }

    if (deferredDeviceIds.length > 0) {
      await input.deferredPromotionQueue.add(
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
          delay: input.env.notificationsDeferredDelayMs,
        },
      );
    }

    await markEventStatusBasedOnBacklog({
      notificationsStore: input.notificationsStore,
      eventId: event.id,
    });
  }

  async function handleDeferredPromotionJob(
    job: JobLike<DeferredPromotionJobPayload>,
  ): Promise<void> {
    const enqueuedAt = Date.parse(job.data.enqueuedAt);
    if (Number.isFinite(enqueuedAt)) {
      setNotificationGauge('notifications_queue_lag_ms', Math.max(Date.now() - enqueuedAt, 0));
    }

    const promotedDeliveryIds = await input.notificationsStore.promoteDeferredDeliveries({
      eventId: job.data.eventId,
      limit: input.env.notificationsDeferredPromotionBatch,
    });
    trackDeferredPromotions(promotedDeliveryIds.length);

    for (const deliveryIds of chunkForMulticast(promotedDeliveryIds, 500)) {
      if (deliveryIds.length === 0) {
        continue;
      }

      await input.sendQueue.add(
        'send',
        {
          eventId: job.data.eventId,
          alertType: job.data.alertType,
          deliveryIds,
          title: job.data.title,
          body: job.data.body,
          data: job.data.data,
        },
        { jobId: buildSendJobId(job.data.eventId) },
      );
    }

    const deferredBacklog = await input.notificationsStore.countDeferredDeliveries({
      eventId: job.data.eventId,
    });
    setNotificationGauge('notifications_deferred_backlog', deferredBacklog);

    if (deferredBacklog > 0) {
      const requeue = buildDeferredPromotionRequeue(
        job.data,
        input.env.notificationsDeferredDelayMs,
      );
      await input.deferredPromotionQueue.add(
        'promote_deferred',
        requeue.data,
        requeue.options,
      );
    }

    await markEventStatusBasedOnBacklog({
      notificationsStore: input.notificationsStore,
      eventId: job.data.eventId,
    });
  }

  return {
    handleDeferredPromotionFailed: failureHandlers.handleDeferredPromotionFailed,
    handleDeferredPromotionJob,
    handleDispatchFailed: failureHandlers.handleDispatchFailed,
    handleDispatchJob,
    handleSendFailed: failureHandlers.handleSendFailed,
    handleSendJob: createHandleSendJob({
      notificationsStore: input.notificationsStore,
      firebaseSender: input.firebaseSender,
      pushTokenEncryptionKey: input.env.pushTokenEncryptionKey,
      markEventStatusBasedOnBacklog,
    }),
  };
}
