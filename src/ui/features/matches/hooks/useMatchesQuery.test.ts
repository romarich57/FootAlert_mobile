import { ApiError } from '@data/api/http/client';
import { MobileAttestationProviderUnavailableError } from '@data/security/mobileAttestationProvider';

import {
  MATCHES_QUERY_STALE_TIME_MS,
  shouldRetryMatchesQuery,
} from '@ui/features/matches/hooks/useMatchesQuery';

describe('useMatchesQuery retry strategy', () => {
  it('does not retry when quota/rate-limit returns 429', () => {
    const shouldRetry = shouldRetryMatchesQuery(0, new ApiError('HTTP 429', 429, '{}'));
    expect(shouldRetry).toBe(false);
  });

  it('retries on transient API errors (5xx)', () => {
    const shouldRetry = shouldRetryMatchesQuery(0, new ApiError('HTTP 503', 503, '{}'));
    expect(shouldRetry).toBe(true);
  });

  it('stops retrying after max attempts', () => {
    const shouldRetry = shouldRetryMatchesQuery(2, new ApiError('HTTP 500', 500, '{}'));
    expect(shouldRetry).toBe(false);
  });

  it('retries unknown runtime errors before max attempts', () => {
    const shouldRetry = shouldRetryMatchesQuery(
      0,
      new Error('Unexpected runtime failure'),
    );
    expect(shouldRetry).toBe(true);
  });

  it('does not retry transport-level network failures', () => {
    const shouldRetry = shouldRetryMatchesQuery(
      0,
      new TypeError('Network request failed'),
    );
    expect(shouldRetry).toBe(false);
  });

  it('does not retry when the mobile attestation provider bridge is unavailable', () => {
    const shouldRetry = shouldRetryMatchesQuery(
      0,
      new MobileAttestationProviderUnavailableError(),
    );
    expect(shouldRetry).toBe(false);
  });

  it('uses a 60s stale time budget', () => {
    expect(MATCHES_QUERY_STALE_TIME_MS).toBe(60_000);
  });
});
