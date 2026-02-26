type GenericPasswordCredentials = {
  username: string;
  password: string;
};

type GenericPasswordOptions = {
  service: string;
  accessible?: string;
};

type KeychainModule = {
  ACCESSIBLE?: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY?: string;
  };
  getGenericPassword: (
    options: GenericPasswordOptions,
  ) => Promise<false | GenericPasswordCredentials>;
  setGenericPassword: (
    username: string,
    password: string,
    options: GenericPasswordOptions,
  ) => Promise<boolean>;
  resetGenericPassword: (options: GenericPasswordOptions) => Promise<boolean>;
};

const SECURE_STORAGE_USERNAME = 'footalert-mobile';
const FALLBACK_MEMORY_STORE = new Map<string, string>();

export class SecureStorageUnavailableError extends Error {
  constructor() {
    super(
      'Secure storage unavailable. Install and configure react-native-keychain for production builds.',
    );
    this.name = 'SecureStorageUnavailableError';
  }
}

function isDevRuntime(): boolean {
  return typeof __DEV__ === 'boolean' ? __DEV__ : false;
}

function resolveServiceName(key: string): string {
  return `footalert.secure.${key}`;
}

function loadKeychainModule(): KeychainModule | null {
  try {
    const runtimeModule = require('react-native-keychain') as KeychainModule;
    if (
      typeof runtimeModule?.getGenericPassword !== 'function' ||
      typeof runtimeModule?.setGenericPassword !== 'function' ||
      typeof runtimeModule?.resetGenericPassword !== 'function'
    ) {
      return null;
    }

    return runtimeModule;
  } catch {
    return null;
  }
}

function resolveAccessibleLevel(module: KeychainModule): string | undefined {
  return module.ACCESSIBLE?.WHEN_UNLOCKED_THIS_DEVICE_ONLY;
}

function assertSecureStorageAvailability(): never {
  throw new SecureStorageUnavailableError();
}

export function isSecureStorageUnavailableError(error: unknown): boolean {
  return error instanceof SecureStorageUnavailableError;
}

export async function getSecureString(key: string): Promise<string | null> {
  const keychain = loadKeychainModule();
  if (keychain) {
    const credentials = await keychain.getGenericPassword({
      service: resolveServiceName(key),
    });
    if (!credentials) {
      return null;
    }

    return credentials.password;
  }

  if (isDevRuntime()) {
    return FALLBACK_MEMORY_STORE.get(key) ?? null;
  }

  assertSecureStorageAvailability();
}

export async function setSecureString(key: string, value: string): Promise<void> {
  const keychain = loadKeychainModule();
  if (keychain) {
    await keychain.setGenericPassword(SECURE_STORAGE_USERNAME, value, {
      service: resolveServiceName(key),
      accessible: resolveAccessibleLevel(keychain),
    });
    return;
  }

  if (isDevRuntime()) {
    FALLBACK_MEMORY_STORE.set(key, value);
    return;
  }

  assertSecureStorageAvailability();
}

export async function removeSecureString(key: string): Promise<void> {
  const keychain = loadKeychainModule();
  if (keychain) {
    await keychain.resetGenericPassword({
      service: resolveServiceName(key),
    });
    return;
  }

  if (isDevRuntime()) {
    FALLBACK_MEMORY_STORE.delete(key);
    return;
  }

  assertSecureStorageAvailability();
}

export function resetSecureStorageFallbackForTests(): void {
  FALLBACK_MEMORY_STORE.clear();
}
