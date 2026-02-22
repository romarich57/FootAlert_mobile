import { resolveExternalUrl, resolveMobileApiBaseUrl } from '@data/config/env';

describe('resolveMobileApiBaseUrl', () => {
  it('allows localhost HTTP URLs in dev runtime', () => {
    expect(resolveMobileApiBaseUrl('http://localhost:3001/v1', true)).toBe(
      'http://localhost:3001/v1',
    );
    expect(resolveMobileApiBaseUrl('http://10.0.2.2:3001/v1/', true)).toBe(
      'http://10.0.2.2:3001/v1',
    );
  });

  it('rejects non-localhost HTTP URLs in dev runtime', () => {
    expect(() => resolveMobileApiBaseUrl('http://staging.footalert.com/v1', true)).toThrow(
      'MOBILE_API_BASE_URL can use HTTP only for localhost/127.0.0.1/10.0.2.2 in dev.',
    );
  });

  it('requires explicit URL in non-dev runtime', () => {
    expect(() => resolveMobileApiBaseUrl(undefined, false)).toThrow(
      'Missing MOBILE_API_BASE_URL. Set it in your env file for non-dev builds.',
    );
  });

  it('enforces HTTPS in non-dev runtime', () => {
    expect(() => resolveMobileApiBaseUrl('http://localhost:3001/v1', false)).toThrow(
      'MOBILE_API_BASE_URL must use HTTPS for non-dev builds.',
    );
  });

  it('accepts HTTPS URL in non-dev runtime and normalizes trailing slash', () => {
    expect(resolveMobileApiBaseUrl('https://footalert.romdev.cloud/v1/', false)).toBe(
      'https://footalert.romdev.cloud/v1',
    );
  });
});

describe('resolveExternalUrl', () => {
  it('allows missing URL in dev runtime', () => {
    expect(
      resolveExternalUrl(undefined, 'MOBILE_PRIVACY_POLICY_URL', {
        isDevRuntime: true,
        requiredOutsideDev: true,
      }),
    ).toBeUndefined();
  });

  it('requires URL in non-dev runtime when marked as required', () => {
    expect(() =>
      resolveExternalUrl(undefined, 'MOBILE_PRIVACY_POLICY_URL', {
        isDevRuntime: false,
        requiredOutsideDev: true,
      }),
    ).toThrow('Missing MOBILE_PRIVACY_POLICY_URL. Set it in your env file for non-dev builds.');
  });

  it('enforces HTTPS when URL is provided', () => {
    expect(() =>
      resolveExternalUrl('http://example.com/privacy', 'MOBILE_PRIVACY_POLICY_URL', {
        isDevRuntime: true,
      }),
    ).toThrow('MOBILE_PRIVACY_POLICY_URL must use HTTPS.');
  });

  it('accepts HTTPS URLs and normalizes trailing slash', () => {
    expect(
      resolveExternalUrl('https://example.com/privacy/', 'MOBILE_PRIVACY_POLICY_URL', {
        isDevRuntime: false,
        requiredOutsideDev: true,
      }),
    ).toBe('https://example.com/privacy');
  });
});
