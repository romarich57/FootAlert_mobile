import { randomUUID } from 'node:crypto';
import { incrementNotificationMetric } from './metrics.js';
export const NOTIFICATIONS_DISPATCH_QUEUE = 'notifications.dispatch';
export const NOTIFICATIONS_SEND_QUEUE = 'notifications.send';
export const NOTIFICATIONS_DEFERRED_PROMOTION_QUEUE = 'notifications.deferred-promotion';
export const NOTIFICATIONS_DLQ_QUEUE = 'notifications.dlq';
function resolveRedisConfig(redisUrl) {
    const parsed = new URL(redisUrl);
    const secure = parsed.protocol === 'rediss:';
    const port = parsed.port ? Number.parseInt(parsed.port, 10) : 6379;
    return {
        host: parsed.hostname,
        port,
        username: parsed.username || undefined,
        password: parsed.password || undefined,
        db: parsed.pathname ? Number.parseInt(parsed.pathname.replace('/', ''), 10) || 0 : 0,
        tls: secure ? {} : undefined,
    };
}
function createNoopQueueClient() {
    return {
        enqueueDispatch: async () => undefined,
        close: async () => undefined,
    };
}
export async function createNotificationsQueueClient(options) {
    if (!options.enabled || !options.redisUrl) {
        return createNoopQueueClient();
    }
    const moduleName = 'bullmq';
    const importedModule = await import(moduleName).catch(error => {
        console.warn('[notifications.queue] BullMQ unavailable, disabling queue client.', error);
        return null;
    });
    if (!importedModule) {
        return createNoopQueueClient();
    }
    const QueueConstructor = importedModule.Queue;
    if (typeof QueueConstructor !== 'function') {
        return createNoopQueueClient();
    }
    const redisConnection = resolveRedisConfig(options.redisUrl);
    const queueInstance = new QueueConstructor(NOTIFICATIONS_DISPATCH_QUEUE, {
        connection: redisConnection,
        defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: 2000,
            attempts: 5,
            backoff: {
                type: 'exponential',
                delay: 1000,
                jitter: 0.2,
            },
        },
    });
    return {
        enqueueDispatch: async ({ eventId, payload }) => {
            await queueInstance.add('dispatch', {
                eventId,
                payload,
                enqueuedAt: new Date().toISOString(),
            }, {
                jobId: `event:${eventId}`,
            });
            incrementNotificationMetric('notifications_jobs_enqueued_total');
        },
        close: async () => {
            await queueInstance.close();
        },
    };
}
export function buildSendJobId(eventId) {
    return `send:${eventId}:${randomUUID()}`;
}
export function buildDeferredPromotionJobId(eventId) {
    return `deferred:${eventId}:${randomUUID()}`;
}
