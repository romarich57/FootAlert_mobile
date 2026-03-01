import { appEnv } from '@data/config/env';

import { normalizeAssetImageUri, rewriteAssetUrl } from './assetCdn';

describe('assetCdn', () => {
  const originalEnabled = appEnv.assetCdnRewriteEnabled;
  const originalBaseUrl = appEnv.assetCdnBaseUrl;

  afterEach(() => {
    appEnv.assetCdnRewriteEnabled = originalEnabled;
    appEnv.assetCdnBaseUrl = originalBaseUrl;
  });

  it('keeps original url when rewrite flag is disabled', () => {
    appEnv.assetCdnRewriteEnabled = false;
    appEnv.assetCdnBaseUrl = 'https://assets.example.com';

    const source = 'https://media.api-sports.io/football/players/42.png';
    expect(rewriteAssetUrl(source)).toBe(source);
  });

  it('rewrites media.api-sports urls when feature flag is enabled', () => {
    appEnv.assetCdnRewriteEnabled = true;
    appEnv.assetCdnBaseUrl = 'https://assets.example.com';

    const source = 'https://media.api-sports.io/football/players/42.png?size=small';
    expect(rewriteAssetUrl(source)).toBe('https://assets.example.com/football/players/42.png?size=small');
  });

  it('does not rewrite non api-sports hosts', () => {
    appEnv.assetCdnRewriteEnabled = true;
    appEnv.assetCdnBaseUrl = 'https://assets.example.com';

    const source = 'https://cdn.example.com/players/42.png';
    expect(normalizeAssetImageUri(source)).toBe(source);
  });
});
