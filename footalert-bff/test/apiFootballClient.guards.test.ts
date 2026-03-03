import assert from 'node:assert/strict';
import test from 'node:test';

import { withManagedEnv } from './helpers/appTestHarness.ts';

function isErrorWithCode(error: unknown, code: string): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (error as { code?: string }).code === code;
}

test('apiFootballGet enforces global upstream quota budget', async () => {
  await withManagedEnv(
    {
      APP_ENV: 'test',
      REDIS_URL: '',
      API_MAX_RETRIES: '0',
      UPSTREAM_GLOBAL_RPM_LIMIT: '1',
      UPSTREAM_CIRCUIT_BREAKER_WINDOW_MS: '30000',
    },
    async () => {
      const fetchCalls: string[] = [];
      globalThis.fetch = (async () => {
        fetchCalls.push('called');
        return new Response(JSON.stringify({ response: [] }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        });
      }) as typeof fetch;

      const moduleRef = await import(`../src/lib/apiFootballClient.ts?case=${Math.random().toString(36).slice(2)}`);
      moduleRef.resetApiFootballClientGuardsForTests();

      await moduleRef.apiFootballGet('/fixtures');
      await assert.rejects(
        moduleRef.apiFootballGet('/fixtures'),
        error => isErrorWithCode(error, 'UPSTREAM_QUOTA_EXCEEDED'),
      );
      assert.equal(fetchCalls.length, 1);
    },
  );
});

test('apiFootballGet opens circuit breaker on upstream 429 and rejects subsequent misses', async () => {
  await withManagedEnv(
    {
      APP_ENV: 'test',
      REDIS_URL: '',
      API_MAX_RETRIES: '0',
      UPSTREAM_GLOBAL_RPM_LIMIT: '0',
      UPSTREAM_CIRCUIT_BREAKER_WINDOW_MS: '30000',
    },
    async () => {
      const fetchCalls: string[] = [];
      globalThis.fetch = (async () => {
        fetchCalls.push('called');
        return new Response('rate limit', {
          status: 429,
          headers: {
            'content-type': 'text/plain',
          },
        });
      }) as typeof fetch;

      const moduleRef = await import(`../src/lib/apiFootballClient.ts?case=${Math.random().toString(36).slice(2)}`);
      moduleRef.resetApiFootballClientGuardsForTests();

      await assert.rejects(
        moduleRef.apiFootballGet('/fixtures'),
        error => isErrorWithCode(error, 'UPSTREAM_HTTP_ERROR'),
      );
      const callsAfterFirstRequest = fetchCalls.length;
      assert.equal(callsAfterFirstRequest > 0, true);

      await assert.rejects(
        moduleRef.apiFootballGet('/fixtures'),
        error => isErrorWithCode(error, 'UPSTREAM_CIRCUIT_OPEN'),
      );
      assert.equal(fetchCalls.length, callsAfterFirstRequest);
    },
  );
});
