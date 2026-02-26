import {
  createDefaultMobileTelemetry,
  createBffMobileTelemetry,
  createNoopMobileTelemetry,
} from '@data/telemetry/mobileTelemetry';

describe('mobileTelemetry', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('posts events and breadcrumbs to BFF telemetry endpoints', async () => {
    const mockedFetch = jest.fn(async () => new Response('{}', { status: 200 }));
    globalThis.fetch = mockedFetch as unknown as typeof fetch;

    const telemetry = createBffMobileTelemetry();
    telemetry.setUserContext({ language: 'fr' });
    telemetry.trackEvent('navigation.route_change', { from: 'matches', to: 'team' });
    telemetry.addBreadcrumb('navigation.ready', { route: 'matches' });
    await telemetry.flush('manual');

    expect(mockedFetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/v1/telemetry/events/batch',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(mockedFetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3001/v1/telemetry/breadcrumbs/batch',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('never throws when using noop telemetry', () => {
    const telemetry = createNoopMobileTelemetry();

    expect(() => telemetry.trackEvent('event')).not.toThrow();
    expect(() => telemetry.addBreadcrumb('breadcrumb')).not.toThrow();
    expect(() =>
      telemetry.trackError(new Error('boom'), {
        feature: 'network',
      }),
    ).not.toThrow();
  });

  it('logs expected network 429 errors as warnings in dev telemetry', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const globalWithDev = globalThis as typeof globalThis & { __DEV__?: boolean };
    const previousDevValue = globalWithDev.__DEV__;
    globalWithDev.__DEV__ = true;

    try {
      const telemetry = createDefaultMobileTelemetry();
      telemetry.trackError(new Error('HTTP 429'), {
        feature: 'network',
        method: 'GET',
        status: 429,
        url: 'https://footalert.romdev.cloud/v1/teams/42/advanced-stats',
      });

      expect(warnSpy).toHaveBeenCalledWith(
        '[telemetry:warn]',
        expect.objectContaining({
          context: expect.objectContaining({
            status: 429,
            feature: 'network',
          }),
        }),
      );
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      globalWithDev.__DEV__ = previousDevValue;
    }
  });

  it('flushes telemetry queue when batch size is reached', async () => {
    const mockedFetch = jest.fn(async () => new Response('{}', { status: 200 }));
    globalThis.fetch = mockedFetch as unknown as typeof fetch;

    const telemetry = createBffMobileTelemetry();
    telemetry.trackBatch(
      Array.from({ length: 20 }, (_, index) => ({
        path: '/telemetry/events',
        payload: {
          name: `event-${index}`,
          timestamp: new Date().toISOString(),
        },
      })),
    );

    await telemetry.flush('manual');
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/v1/telemetry/events/batch',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('falls back to single-event endpoints when batch routes are unavailable', async () => {
    const mockedFetch = jest.fn(async (url: string) => {
      if (url.endsWith('/telemetry/events/batch')) {
        return new Response('{}', { status: 404 });
      }

      return new Response('{}', { status: 200 });
    });
    globalThis.fetch = mockedFetch as unknown as typeof fetch;

    const telemetry = createBffMobileTelemetry();
    telemetry.trackBatch(
      Array.from({ length: 3 }, (_, index) => ({
        path: '/telemetry/events',
        payload: {
          name: `event-${index}`,
          timestamp: new Date().toISOString(),
        },
      })),
    );

    await telemetry.flush('manual');

    expect(mockedFetch).toHaveBeenCalledTimes(4);
    expect(mockedFetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/v1/telemetry/events/batch',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(mockedFetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3001/v1/telemetry/events',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });
});
