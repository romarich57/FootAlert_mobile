import type { FollowsDiscoveryStore } from './discoveryStore.js';
import { createFollowsDiscoveryStore } from './discoveryStore.js';

let discoveryStorePromise: Promise<FollowsDiscoveryStore> | null = null;

export async function getFollowsDiscoveryStore(options: {
  backend: 'memory' | 'postgres';
  databaseUrl: string | null;
}): Promise<FollowsDiscoveryStore> {
  if (!discoveryStorePromise) {
    discoveryStorePromise = createFollowsDiscoveryStore(options);
  }

  return discoveryStorePromise;
}

export async function resetFollowsDiscoveryRuntimeForTests(): Promise<void> {
  if (discoveryStorePromise) {
    const store = await discoveryStorePromise;
    await store.close();
  }

  discoveryStorePromise = null;
}
