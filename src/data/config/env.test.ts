import {
  resolveExternalUrl,
  resolveMobileApiBaseUrl,
  resolveMobileAttestationStrategy,
  resolveMobileAuthAttestationMode,
  resolveMobileValidationMode,
} from '@data/config/env';

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

describe('resolveMobileAuthAttestationMode', () => {
  it('allows mock mode in dev runtime', () => {
    expect(resolveMobileAuthAttestationMode('mock', true)).toBe('mock');
  });

  it('allows mock mode outside dev runtime only for validation modes', () => {
    expect(resolveMobileAuthAttestationMode('mock', false, 'maestro')).toBe('mock');
    expect(resolveMobileAuthAttestationMode('mock', false, 'perf')).toBe('mock');
  });

  it('rejects mock mode outside dev runtime', () => {
    expect(() => resolveMobileAuthAttestationMode('mock', false)).toThrow(
      'MOBILE_AUTH_ATTESTATION_MODE=mock is not allowed outside dev runtime.',
    );
  });

  it('defaults to provider outside dev runtime', () => {
    expect(resolveMobileAuthAttestationMode(undefined, false)).toBe('provider');
  });
});

describe('resolveMobileAttestationStrategy', () => {
  it('supports explicit strict mode', () => {
    expect(resolveMobileAttestationStrategy('strict', true)).toBe('strict');
  });

  it('supports explicit best-effort mode', () => {
    expect(resolveMobileAttestationStrategy('best-effort', false)).toBe('best-effort');
  });

  it('allows disabled mode outside dev runtime only for validation modes', () => {
    expect(resolveMobileAttestationStrategy('disabled', false, 'maestro')).toBe('disabled');
    expect(resolveMobileAttestationStrategy('disabled', false, 'perf')).toBe('disabled');
  });

  it('rejects disabled mode outside dev runtime', () => {
    expect(() => resolveMobileAttestationStrategy('disabled', false)).toThrow(
      'MOBILE_ATTESTATION_STRATEGY=disabled is not allowed outside dev runtime.',
    );
  });

  it('defaults to disabled in dev runtime', () => {
    expect(resolveMobileAttestationStrategy(undefined, true)).toBe('disabled');
  });

  it('defaults to strict outside dev runtime', () => {
    expect(resolveMobileAttestationStrategy(undefined, false)).toBe('strict');
  });
});

describe('resolveMobileValidationMode', () => {
  it('supports explicit maestro and perf modes', () => {
    expect(resolveMobileValidationMode('maestro')).toBe('maestro');
    expect(resolveMobileValidationMode('perf')).toBe('perf');
  });

  it('falls back to off for missing or unknown values', () => {
    expect(resolveMobileValidationMode(undefined)).toBe('off');
    expect(resolveMobileValidationMode('unexpected')).toBe('off');
  });
});
