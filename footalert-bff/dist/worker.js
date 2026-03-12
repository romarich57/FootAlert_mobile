import { env } from './config/env.js';
import { createFirebaseNotificationsSender } from './lib/notifications/firebaseSender.js';
import { NOTIFICATIONS_DEFERRED_PROMOTION_QUEUE, NOTIFICATIONS_DISPATCH_QUEUE, NOTIFICATIONS_SEND_QUEUE, } from './lib/notifications/queue.js';
import { getNotificationsStore } from './lib/notifications/runtime.js';
import { closeReadStoreRuntime, getReadStore } from './lib/readStore/runtime.js';
import { runReadStoreMaintenanceLoop } from './worker/maintenance.js';
import { createNotificationJobRuntime } from './worker/notifications-jobs.js';
import { createReadStoreRefreshRuntime, } from './worker/read-store-refresh.js';
import { createNotificationQueues, importBullMq } from './worker/queue-runtime.js';
import { createWorkerServiceLogger, logWorker, resolveRedisConnection, } from './worker/shared.js';
async function startWorker() {
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
    const readStore = await getReadStore({
        databaseUrl: env.databaseUrl,
    });
    const readStoreRefreshRuntime = createReadStoreRefreshRuntime({
        readStore,
        logger: createWorkerServiceLogger(),
        cacheTtl: env.cacheTtl,
    });
    const firebaseSender = await createFirebaseNotificationsSender({
        projectId: env.firebaseProjectId,
        clientEmail: env.firebaseClientEmail,
        privateKey: env.firebasePrivateKey,
    });
    const { Queue: QueueConstructor, Worker: WorkerConstructor } = await importBullMq();
    const connection = resolveRedisConnection(env.redisUrl);
    const { sendQueue, deferredPromotionQueue, dlqQueue } = createNotificationQueues({
        QueueConstructor,
        connection,
    });
    const notificationJobRuntime = createNotificationJobRuntime({
        notificationsStore,
        sendQueue,
        deferredPromotionQueue,
        dlqQueue,
        firebaseSender,
        env: {
            notificationsFanoutMaxPerEvent: env.notificationsFanoutMaxPerEvent,
            notificationsDeferredDelayMs: env.notificationsDeferredDelayMs,
            notificationsDeferredPromotionBatch: env.notificationsDeferredPromotionBatch,
            pushTokenEncryptionKey: env.pushTokenEncryptionKey,
        },
    });
    const dispatchWorker = new WorkerConstructor(NOTIFICATIONS_DISPATCH_QUEUE, notificationJobRuntime.handleDispatchJob, { connection, concurrency: 5 });
    const deferredPromotionWorker = new WorkerConstructor(NOTIFICATIONS_DEFERRED_PROMOTION_QUEUE, notificationJobRuntime.handleDeferredPromotionJob, { connection, concurrency: 2 });
    const sendWorker = new WorkerConstructor(NOTIFICATIONS_SEND_QUEUE, notificationJobRuntime.handleSendJob, { connection, concurrency: 10 });
    dispatchWorker.on('failed', (job, error) => notificationJobRuntime.handleDispatchFailed(job, error));
    deferredPromotionWorker.on('failed', (job, error) => notificationJobRuntime.handleDeferredPromotionFailed(job, error));
    sendWorker.on('failed', (job, error) => notificationJobRuntime.handleSendFailed(job, error));
    const close = async () => {
        await dispatchWorker.close();
        await deferredPromotionWorker.close();
        await sendWorker.close();
        await deferredPromotionQueue.close();
        await sendQueue.close();
        await dlqQueue.close();
        await notificationsStore.close();
        await closeReadStoreRuntime();
    };
    let isShuttingDown = false;
    const gracefulShutdown = async (signal) => {
        if (isShuttingDown) {
            return;
        }
        isShuttingDown = true;
        logWorker('info', 'graceful_shutdown_start', { signal });
        const forceExitTimer = setTimeout(() => {
            logWorker('error', 'graceful_shutdown_timeout', { signal });
            process.exit(1);
        }, 30_000);
        forceExitTimer.unref();
        await close().catch(error => {
            logWorker('error', 'graceful_shutdown_error', {
                error: error instanceof Error ? error.message : String(error),
            });
        });
        logWorker('info', 'graceful_shutdown_complete', { signal });
        process.exit(0);
    };
    process.once('SIGINT', () => {
        gracefulShutdown('SIGINT').catch(() => process.exit(1));
    });
    process.once('SIGTERM', () => {
        gracefulShutdown('SIGTERM').catch(() => process.exit(1));
    });
    try {
        await readStoreRefreshRuntime.warmHotset();
    }
    catch (error) {
        logWorker('error', 'hotset_warm_fatal', {
            error: error instanceof Error ? error.message : String(error),
        });
    }
    await runReadStoreMaintenanceLoop({
        readStore,
        readStoreRefreshRuntime,
        isShuttingDown: () => isShuttingDown,
    });
}
startWorker().catch(error => {
    console.error('[notifications.worker] fatal error', error);
    process.exit(1);
});
