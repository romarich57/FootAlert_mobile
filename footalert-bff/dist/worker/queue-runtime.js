import { NOTIFICATIONS_DEFERRED_PROMOTION_QUEUE, NOTIFICATIONS_DLQ_QUEUE, NOTIFICATIONS_SEND_QUEUE, } from '../lib/notifications/queue.js';
function createRetryingQueueOptions(connection) {
    return {
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
    };
}
export async function importBullMq() {
    const imported = await import('bullmq');
    return imported;
}
export function createNotificationQueues(input) {
    return {
        sendQueue: new input.QueueConstructor(NOTIFICATIONS_SEND_QUEUE, createRetryingQueueOptions(input.connection)),
        deferredPromotionQueue: new input.QueueConstructor(NOTIFICATIONS_DEFERRED_PROMOTION_QUEUE, createRetryingQueueOptions(input.connection)),
        dlqQueue: new input.QueueConstructor(NOTIFICATIONS_DLQ_QUEUE, {
            connection: input.connection,
            defaultJobOptions: {
                removeOnComplete: false,
                removeOnFail: false,
            },
        }),
    };
}
