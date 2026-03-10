import { createFollowsDiscoveryStore } from './discoveryStore.js';
let discoveryStorePromise = null;
export async function getFollowsDiscoveryStore(options) {
    if (!discoveryStorePromise) {
        discoveryStorePromise = createFollowsDiscoveryStore(options);
    }
    return discoveryStorePromise;
}
export async function resetFollowsDiscoveryRuntimeForTests() {
    if (discoveryStorePromise) {
        const store = await discoveryStorePromise;
        await store.close();
    }
    discoveryStorePromise = null;
}
