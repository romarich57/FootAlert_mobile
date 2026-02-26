import { httpGet } from '@data/api/http/client';

describe('http client timeout handling', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('cleans timeout timers after successful requests', async () => {
    globalThis.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ) as unknown as typeof fetch;

    await httpGet<{ ok: boolean }>('https://example.com/success');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('cleans timeout timers after failed requests', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;

    await expect(httpGet('https://example.com/failure')).rejects.toThrow('network down');
    expect(jest.getTimerCount()).toBe(0);
  });
});
