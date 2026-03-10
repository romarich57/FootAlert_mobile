import { createNotificationsStore } from './store.js';
import { createNotificationsQueueClient } from './queue.js';
let storePromise = null;
let queueClientPromise = null;
export async function getNotificationsStore(options) {
    if (!storePromise) {
        storePromise = createNotificationsStore(options);
    }
    return storePromise;
}
export async function getNotificationsQueueClient(options) {
    if (!queueClientPromise) {
        queueClientPromise = createNotificationsQueueClient(options);
    }
    return queueClientPromise;
}
export async function resetNotificationsRuntimeForTests() {
    if (storePromise) {
        const store = await storePromise;
        await store.close();
    }
    if (queueClientPromise) {
        const queueClient = await queueClientPromise;
        await queueClient.close();
    }
    storePromise = null;
    queueClientPromise = null;
}
