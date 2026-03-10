describe('mmkvStorage', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('uses MMKV when the native module is available', async () => {
    const asyncStorage = {
      getItem: jest.fn(async () => null),
      setItem: jest.fn(async () => undefined),
      removeItem: jest.fn(async () => undefined),
    };
    const getString = jest.fn(() => 'cached');
    const set = jest.fn();
    const remove = jest.fn();

    jest.doMock('@react-native-async-storage/async-storage', () => asyncStorage);
    jest.doMock('react-native-mmkv', () => ({
      MMKV: jest.fn(() => ({
        getString,
        set,
        delete: remove,
      })),
    }));

    let mmkvStorage!: typeof import('@data/storage/mmkvStorage').mmkvStorage;
    jest.isolateModules(() => {
      mmkvStorage = require('@data/storage/mmkvStorage').mmkvStorage;
    });

    await expect(mmkvStorage.getItem('cache-key')).resolves.toBe('cached');
    await expect(mmkvStorage.setItem('cache-key', 'payload')).resolves.toBeUndefined();
    await expect(mmkvStorage.removeItem('cache-key')).resolves.toBeUndefined();

    expect(getString).toHaveBeenCalledWith('cache-key');
    expect(set).toHaveBeenCalledWith('cache-key', 'payload');
    expect(remove).toHaveBeenCalledWith('cache-key');
    expect(asyncStorage.getItem).not.toHaveBeenCalled();
  });

  it('falls back to AsyncStorage when MMKV cannot be required', async () => {
    const asyncStorage = {
      getItem: jest.fn(async () => 'fallback'),
      setItem: jest.fn(async () => undefined),
      removeItem: jest.fn(async () => undefined),
    };

    jest.doMock('@react-native-async-storage/async-storage', () => asyncStorage);
    jest.doMock('react-native-mmkv', () => {
      throw new Error('missing native binding');
    });

    let mmkvStorage!: typeof import('@data/storage/mmkvStorage').mmkvStorage;
    jest.isolateModules(() => {
      mmkvStorage = require('@data/storage/mmkvStorage').mmkvStorage;
    });

    await expect(mmkvStorage.getItem('cache-key')).resolves.toBe('fallback');
    await expect(mmkvStorage.setItem('cache-key', 'payload')).resolves.toBeUndefined();
    await expect(mmkvStorage.removeItem('cache-key')).resolves.toBeUndefined();

    expect(asyncStorage.getItem).toHaveBeenCalledWith('cache-key');
    expect(asyncStorage.setItem).toHaveBeenCalledWith('cache-key', 'payload');
    expect(asyncStorage.removeItem).toHaveBeenCalledWith('cache-key');
  });
});
