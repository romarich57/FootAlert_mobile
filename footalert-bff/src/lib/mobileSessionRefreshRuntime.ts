import type { MobileSessionRefreshStore } from './mobileSessionRefreshStore.js';
import { createMobileSessionRefreshStore } from './mobileSessionRefreshStore.js';

let refreshStorePromise: Promise<MobileSessionRefreshStore> | null = null;

export async function getMobileSessionRefreshStore(options: {
  backend: 'memory' | 'postgres';
  databaseUrl: string | null;
}): Promise<MobileSessionRefreshStore> {
  if (!refreshStorePromise) {
    refreshStorePromise = createMobileSessionRefreshStore(options);
  }

  return refreshStorePromise;
}

export async function resetMobileSessionRefreshRuntimeForTests(): Promise<void> {
  if (refreshStorePromise) {
    const store = await refreshStorePromise;
    await store.close();
  }

  refreshStorePromise = null;
}
