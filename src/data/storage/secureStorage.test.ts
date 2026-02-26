type SecureStorageModule = typeof import('@data/storage/secureStorage');

type GlobalWithDevFlag = typeof globalThis & {
  __DEV__?: boolean;
};

const runtimeGlobal = globalThis as GlobalWithDevFlag;
const initialDevFlag = runtimeGlobal.__DEV__;

function requireSecureStorageWithKeychainMock(
  keychainFactory: () => unknown,
): SecureStorageModule {
  jest.resetModules();
  jest.doMock('react-native-keychain', keychainFactory);
  return require('@data/storage/secureStorage') as SecureStorageModule;
}

describe('secureStorage', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    if (typeof initialDevFlag === 'undefined') {
      delete runtimeGlobal.__DEV__;
      return;
    }

    runtimeGlobal.__DEV__ = initialDevFlag;
  });

  it('uses keychain when available', async () => {
    runtimeGlobal.__DEV__ = false;

    let storedValue: string | null = null;
    const keychainMock = {
      ACCESSIBLE: {
        WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
      },
      getGenericPassword: jest.fn(async () => {
        if (!storedValue) {
          return false;
        }

        return {
          username: 'footalert-mobile',
          password: storedValue,
        };
      }),
      setGenericPassword: jest.fn(async (_username: string, password: string) => {
        storedValue = password;
        return true;
      }),
      resetGenericPassword: jest.fn(async () => {
        storedValue = null;
        return true;
      }),
    };

    const secureStorage = requireSecureStorageWithKeychainMock(() => keychainMock);

    await secureStorage.setSecureString('push_key', 'token-123');
    await expect(secureStorage.getSecureString('push_key')).resolves.toBe('token-123');
    await secureStorage.removeSecureString('push_key');
    await expect(secureStorage.getSecureString('push_key')).resolves.toBeNull();

    expect(keychainMock.setGenericPassword).toHaveBeenCalledTimes(1);
    expect(keychainMock.getGenericPassword).toHaveBeenCalledTimes(2);
    expect(keychainMock.resetGenericPassword).toHaveBeenCalledTimes(1);
  });

  it('falls back to in-memory storage in dev when keychain is unavailable', async () => {
    runtimeGlobal.__DEV__ = true;

    const secureStorage = requireSecureStorageWithKeychainMock(() => ({}));

    await secureStorage.setSecureString('push_key', 'token-456');
    await expect(secureStorage.getSecureString('push_key')).resolves.toBe('token-456');
    await secureStorage.removeSecureString('push_key');
    await expect(secureStorage.getSecureString('push_key')).resolves.toBeNull();
  });

  it('throws a typed error in non-dev when keychain is unavailable', async () => {
    runtimeGlobal.__DEV__ = false;

    const secureStorage = requireSecureStorageWithKeychainMock(() => ({}));

    await expect(secureStorage.getSecureString('push_key')).rejects.toThrow(
      secureStorage.SecureStorageUnavailableError,
    );
    await expect(secureStorage.setSecureString('push_key', 'value')).rejects.toThrow(
      secureStorage.SecureStorageUnavailableError,
    );
  });
});
