import {
  buildRequestSignaturePayload,
  stableStringifyForSignature,
} from './requestSignaturePayload';

describe('requestSignaturePayload', () => {
  it('stableStringifyForSignature sorts object keys recursively', () => {
  const value = {
    b: 2,
    a: {
      z: true,
      y: 'ok',
    },
  };

  expect(
    stableStringifyForSignature(value),
  ).toBe('{"a":{"y":"ok","z":true},"b":2}');
  });

  it('stableStringifyForSignature normalizes non-primitive leaves to null', () => {
  const value = {
    a: undefined,
    b: () => 'noop',
    c: Symbol('x'),
  };

  expect(stableStringifyForSignature(value)).toBe('{"a":null,"b":null,"c":null}');
  });

  it('buildRequestSignaturePayload assembles canonical multiline payload', () => {
  const payload = buildRequestSignaturePayload({
    method: 'post',
    pathWithQuery: '/v1/telemetry/events?foo=bar',
    timestamp: '1700000000000',
    nonce: 'nonce-1',
    body: { b: 1, a: 'x' },
  });

  expect(
    payload,
  ).toBe(
    'POST\n/v1/telemetry/events?foo=bar\n1700000000000\nnonce-1\n{"a":"x","b":1}',
  );
  });
});
