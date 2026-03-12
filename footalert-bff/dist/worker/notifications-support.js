import { incrementNotificationMetric, setNotificationGauge, } from '../lib/notifications/metrics.js';
import { buildDeferredPromotionJobId, buildSendJobId, } from '../lib/notifications/queue.js';
import { chunkForMulticast } from '../lib/notifications/workerPolicies.js';
import { buildPushData, buildRedactedEventContext, logWorker, } from './shared.js';
export async function enqueuePendingSendJobsForEvent(options) {
    let enqueuedDeliveries = 0;
    let cursor = null;
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
            await options.sendQueue.add('send', {
                eventId: options.eventId,
                alertType: options.alertType,
                deliveryIds: deliveryChunk.map(delivery => delivery.id),
                title: options.title,
                body: options.body,
                data: options.data,
            }, { jobId: buildSendJobId(options.eventId) });
            enqueuedDeliveries += deliveryChunk.length;
        }
        cursor = page.nextCursor;
    } while (cursor);
    return enqueuedDeliveries;
}
export async function markEventStatusBasedOnBacklog(options) {
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
export function createNotificationFailureHandlers(input) {
    async function handleDispatchFailed(job, error) {
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
    async function handleDeferredPromotionFailed(job, error) {
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
    async function handleSendFailed(job, error) {
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
export function buildDispatchData(payload, eventId) {
    return buildPushData(payload, eventId);
}
export function buildDeferredPromotionRequeue(payload, delay) {
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
export function trackDeferredDeliveries(count) {
    if (count > 0) {
        incrementNotificationMetric('notifications_deliveries_deferred_total', count);
    }
}
export function trackDeferredPromotions(count) {
    if (count > 0) {
        incrementNotificationMetric('notifications_deferred_promotions_total', count);
    }
}
