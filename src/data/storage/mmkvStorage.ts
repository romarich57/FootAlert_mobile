import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AsyncStorageLike } from '@data/storage/asyncStorageTypes';

type MmkvInstance = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
};

type MmkvModule = {
  MMKV: new () => MmkvInstance;
};

function createMmkvBackedStorage(): AsyncStorageLike | null {
  try {
    const moduleValue = require('react-native-mmkv') as MmkvModule;
    const storage = new moduleValue.MMKV();

    return {
      async getItem(key) {
        return storage.getString(key) ?? null;
      },
      async setItem(key, value) {
        storage.set(key, value);
      },
      async removeItem(key) {
        storage.delete(key);
      },
    };
  } catch {
    return null;
  }
}

export const mmkvStorage: AsyncStorageLike = createMmkvBackedStorage() ?? AsyncStorage;
