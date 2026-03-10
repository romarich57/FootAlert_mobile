import { createMobileSessionRefreshStore } from './mobileSessionRefreshStore.js';
let refreshStorePromise = null;
export async function getMobileSessionRefreshStore(options) {
    if (!refreshStorePromise) {
        refreshStorePromise = createMobileSessionRefreshStore(options);
    }
    return refreshStorePromise;
}
export async function resetMobileSessionRefreshRuntimeForTests() {
    if (refreshStorePromise) {
        const store = await refreshStorePromise;
        await store.close();
    }
    refreshStorePromise = null;
}
