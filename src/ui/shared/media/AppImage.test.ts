import { getAppImageSourceIdentity } from '@ui/shared/media/AppImage';

describe('getAppImageSourceIdentity', () => {
  it('uses the remote uri as a stable identity', () => {
    expect(
      getAppImageSourceIdentity({ uri: 'https://example.com/player-a.png' }),
    ).toBe('uri:https://example.com/player-a.png');
  });

  it('returns the same identity for distinct objects pointing to the same uri', () => {
    const first = getAppImageSourceIdentity({
      uri: 'https://example.com/player-a.png',
    });
    const second = getAppImageSourceIdentity({
      uri: 'https://example.com/player-a.png',
    });

    expect(first).toBe(second);
  });

  it('returns a different identity when the remote uri changes', () => {
    expect(
      getAppImageSourceIdentity({ uri: 'https://example.com/player-a.png' }),
    ).not.toBe(
      getAppImageSourceIdentity({ uri: 'https://example.com/player-b.png' }),
    );
  });

  it('supports bundled assets and source arrays', () => {
    expect(getAppImageSourceIdentity(42)).toBe('asset:42');
    expect(
      getAppImageSourceIdentity([
        { uri: 'https://example.com/player-a.png' },
        { uri: 'https://example.com/player-b.png' },
      ]),
    ).toBe(
      'uri:https://example.com/player-a.png|uri:https://example.com/player-b.png',
    );
  });
});
