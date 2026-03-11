import { BffError } from '../lib/errors.js';
import { decryptPushToken } from '../lib/notifications/crypto.js';
import {
  incrementNotificationMetric,
  setNotificationGauge,
} from '../lib/notifications/metrics.js';
import type { NotificationsStore } from '../lib/notifications/store.js';
import type { SendJobPayload } from '../lib/notifications/queue.js';
import { isInvalidTokenCode, isTransientErrorCode } from '../lib/notifications/workerPolicies.js';
import {
  buildRedactedEventContext,
  type JobLike,
  logWorker,
  toCountBucket,
} from './shared.js';
import type { FirebaseSenderLike } from './notifications-support.js';

export function createHandleSendJob(input: {
  notificationsStore: NotificationsStore;
  firebaseSender: FirebaseSenderLike;
  pushTokenEncryptionKey: string;
  markEventStatusBasedOnBacklog: (input: {
    notificationsStore: NotificationsStore;
    eventId: string;
  }) => Promise<void>;
}) {
  return async (job: JobLike<SendJobPayload>): Promise<void> => {
    const pendingDeliveries = await input.notificationsStore.listPendingDeliveries({
      eventId: job.data.eventId,
    });
    const deliveriesById = new Map(pendingDeliveries.map(delivery => [delivery.id, delivery]));
    const selectedDeliveries = job.data.deliveryIds
      .map(deliveryId => deliveriesById.get(deliveryId) ?? null)
      .filter((delivery): delivery is (typeof pendingDeliveries)[number] => Boolean(delivery));

    if (selectedDeliveries.length === 0) {
      await input.markEventStatusBasedOnBacklog({
        notificationsStore: input.notificationsStore,
        eventId: job.data.eventId,
      });
      return;
    }

    const sendResult = await input.firebaseSender.sendMulticast({
      tokens: selectedDeliveries.map(delivery =>
        decryptPushToken(delivery.tokenCiphertext, input.pushTokenEncryptionKey)),
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
      Math.max(
        Date.now() - Date.parse(selectedDeliveries[0]?.createdAt ?? new Date().toISOString()),
        0,
      ),
    );

    let shouldRetryTransientFailure = false;

    for (const [index, response] of sendResult.responses.entries()) {
      const delivery = selectedDeliveries[index];
      if (!delivery) {
        continue;
      }

      if (response.success) {
        await input.notificationsStore.markDeliveryStatus({
          deliveryId: delivery.id,
          status: 'sent',
          providerMessageId: response.messageId,
        });
        incrementNotificationMetric('notifications_deliveries_sent_total');
        continue;
      }

      const errorCode = response.errorCode ?? null;
      if (isInvalidTokenCode(errorCode)) {
        await input.notificationsStore.markDeliveryStatus({
          deliveryId: delivery.id,
          status: 'invalid_token',
          errorCode,
          errorMessage: response.errorMessage,
          incrementAttempts: true,
        });
        await input.notificationsStore.markDeviceInvalid({ deviceId: delivery.deviceId });
        incrementNotificationMetric('notifications_invalid_token_total');
        incrementNotificationMetric('notifications_deliveries_failed_total');
        continue;
      }

      if (isTransientErrorCode(errorCode)) {
        shouldRetryTransientFailure = true;
        await input.notificationsStore.markDeliveryStatus({
          deliveryId: delivery.id,
          status: 'pending',
          errorCode,
          errorMessage: response.errorMessage,
          incrementAttempts: true,
        });
        continue;
      }

      await input.notificationsStore.markDeliveryStatus({
        deliveryId: delivery.id,
        status: 'failed',
        errorCode,
        errorMessage: response.errorMessage,
        incrementAttempts: true,
      });
      incrementNotificationMetric('notifications_deliveries_failed_total');
    }

    if (shouldRetryTransientFailure) {
      throw new BffError(
        503,
        'NOTIFICATIONS_TRANSIENT_SEND_FAILURE',
        'Transient notifications delivery failure.',
      );
    }

    await input.markEventStatusBasedOnBacklog({
      notificationsStore: input.notificationsStore,
      eventId: job.data.eventId,
    });
  };
}
