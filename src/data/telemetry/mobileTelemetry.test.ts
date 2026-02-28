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

  it('suppresses expected network 429 errors in dev telemetry', () => {
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

      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      globalWithDev.__DEV__ = previousDevValue;
    }
  });

  it('logs recoverable network 5xx errors as warnings in dev telemetry', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const globalWithDev = globalThis as typeof globalThis & { __DEV__?: boolean };
    const previousDevValue = globalWithDev.__DEV__;
    globalWithDev.__DEV__ = true;

    try {
      const telemetry = createDefaultMobileTelemetry();
      telemetry.trackError(new Error('HTTP 500'), {
        feature: 'network',
        method: 'GET',
        status: 500,
        url: 'https://footalert.romdev.cloud/v1/teams/standings?leagueId=39&season=2022',
      });

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      globalWithDev.__DEV__ = previousDevValue;
    }
  });

  it('suppresses transport-level network failures in dev telemetry', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const globalWithDev = globalThis as typeof globalThis & { __DEV__?: boolean };
    const previousDevValue = globalWithDev.__DEV__;
    globalWithDev.__DEV__ = true;

    try {
      const telemetry = createDefaultMobileTelemetry();
      telemetry.trackError(new TypeError('Network request failed'), {
        feature: 'network',
        method: 'GET',
        url: 'https://footalert.romdev.cloud/v1/matches?date=2026-02-27&timezone=Europe%2FParis',
      });

      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      globalWithDev.__DEV__ = previousDevValue;
    }
  });

  it('suppresses runtime errors in dev telemetry to avoid duplicate logbox entries', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const globalWithDev = globalThis as typeof globalThis & { __DEV__?: boolean };
    const previousDevValue = globalWithDev.__DEV__;
    globalWithDev.__DEV__ = true;

    try {
      const telemetry = createDefaultMobileTelemetry();
      telemetry.trackError(new Error('Maximum update depth exceeded'), {
        feature: 'runtime',
        details: {
          isFatal: true,
        },
      });

      expect(warnSpy).not.toHaveBeenCalled();
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
