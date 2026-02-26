import { z } from 'zod';

import { parseRuntimePayloadOrFallback } from '@data/endpoints/runtimeValidation';

const mockTrackError = jest.fn();
const mockAddBreadcrumb = jest.fn();

jest.mock('@data/telemetry/mobileTelemetry', () => ({
  getMobileTelemetry: () => ({
    trackEvent: jest.fn(),
    trackError: mockTrackError,
    setUserContext: jest.fn(),
    addBreadcrumb: mockAddBreadcrumb,
    trackBatch: jest.fn(),
    flush: jest.fn(async () => undefined),
  }),
}));

describe('runtimeValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns parsed payload when schema is valid', () => {
    const schema = z.object({ response: z.array(z.number()) });
    const payload = parseRuntimePayloadOrFallback({
      schema,
      payload: { response: [1, 2, 3] },
      fallback: { response: [] },
      feature: 'matches.fixtures',
      endpoint: '/matches',
    });

    expect(payload.response).toEqual([1, 2, 3]);
    expect(mockTrackError).not.toHaveBeenCalled();
    expect(mockAddBreadcrumb).not.toHaveBeenCalled();
  });

  it('returns fallback and reports telemetry when payload is malformed', () => {
    const schema = z.object({ response: z.array(z.string()) });
    const payload = parseRuntimePayloadOrFallback({
      schema,
      payload: { response: 42 },
      fallback: { response: [] },
      feature: 'players.details',
      endpoint: '/players/1',
    });

    expect(payload).toEqual({ response: [] });
    expect(mockTrackError).toHaveBeenCalledTimes(1);
    expect(mockAddBreadcrumb).toHaveBeenCalledWith('network.payload_validation_failed', {
      feature: 'players.details',
      endpoint: '/players/1',
    });
  });
});
