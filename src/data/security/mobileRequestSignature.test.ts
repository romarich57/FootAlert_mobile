import {
  buildMobileRequestSecurityHeaders,
  computeMobileRequestSignature,
} from '@data/security/mobileRequestSignature';

jest.mock('react-native-config', () => ({
  MOBILE_REQUEST_SIGNING_KEY: 'test-mobile-signing-key',
}));

describe('mobileRequestSignature', () => {
  it('builds signature headers when a signing key is configured', () => {
    const headers = buildMobileRequestSecurityHeaders({
      method: 'POST',
      url: 'https://api.footalert.test/v1/telemetry/events',
      body: { foo: 'bar' },
    });

    expect(headers['x-mobile-request-timestamp']).toBeDefined();
    expect(headers['x-mobile-request-nonce']).toBeDefined();
    expect(headers['x-mobile-request-signature']).toBeDefined();
  });

  it('computes deterministic signatures for the same payload', () => {
    const payload = 'POST\n/v1/telemetry/events\n1700000000000\nnonce-1\n{"a":1}';
    const first = computeMobileRequestSignature(payload, 'secret');
    const second = computeMobileRequestSignature(payload, 'secret');

    expect(first).toBe(second);
  });

  it('uses HMAC-SHA256 signatures', () => {
    const payload = 'POST\n/v1/telemetry/events\n1700000000000\nnonce-1\n{"a":1}';
    const expected = '3b5c9c5bf2de995ca5db5aa1dcf28f8205b0d1d4ec44b0114f9cfa8442791683';

    expect(computeMobileRequestSignature(payload, 'secret')).toBe(expected);
  });
});
