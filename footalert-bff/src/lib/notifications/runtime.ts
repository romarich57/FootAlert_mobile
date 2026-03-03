import type { NotificationsStore } from './store.js';
import { createNotificationsStore } from './store.js';
import type { NotificationsQueueClient } from './queue.js';
import { createNotificationsQueueClient } from './queue.js';

let storePromise: Promise<NotificationsStore> | null = null;
let queueClientPromise: Promise<NotificationsQueueClient> | null = null;

export async function getNotificationsStore(options: {
  backend: 'memory' | 'postgres';
  databaseUrl: string | null;
}): Promise<NotificationsStore> {
  if (!storePromise) {
    storePromise = createNotificationsStore(options);
  }

  return storePromise;
}

export async function getNotificationsQueueClient(options: {
  redisUrl: string | null;
  enabled: boolean;
}): Promise<NotificationsQueueClient> {
  if (!queueClientPromise) {
    queueClientPromise = createNotificationsQueueClient(options);
  }

  return queueClientPromise;
}

export async function resetNotificationsRuntimeForTests(): Promise<void> {
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
