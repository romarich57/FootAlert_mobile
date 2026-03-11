import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

import { withManagedEnv } from '../helpers/appTestHarness.ts';

type StubServer = {
  baseUrl: string;
  close: () => Promise<void>;
};

function isSocketBindingUnavailable(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === 'EPERM';
}

async function canBindLoopbackSocket(): Promise<boolean> {
  const probe = createServer();

  return new Promise<boolean>((resolve, reject) => {
    probe.once('error', error => {
      if (isSocketBindingUnavailable(error)) {
        resolve(false);
        return;
      }
      reject(error);
    });

    probe.listen(0, '127.0.0.1', () => {
      probe.close(closeError => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolve(true);
      });
    });
  });
}

async function startApiFootballStub(): Promise<StubServer> {
  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
    const pathname = requestUrl.pathname;

    response.setHeader('content-type', 'application/json');

    if (pathname === '/fixtures') {
      response.writeHead(200);
      response.end(JSON.stringify({ response: [{ fixture: { id: 101 } }] }));
      return;
    }

    if (pathname === '/teams') {
      response.writeHead(503);
      response.end(JSON.stringify({ message: 'upstream unavailable' }));
      return;
    }

    if (pathname === '/leagues') {
      response.writeHead(200);
      response.end(JSON.stringify({ response: [{ league: { id: 39 } }] }));
      return;
    }

    response.writeHead(200);
    response.end(JSON.stringify({ response: [] }));
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(0, '127.0.0.1', error => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Unable to resolve API stub address.');
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    baseUrl,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close(error => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}

test('BFF black-box e2e validates happy path, validation errors and upstream normalization', async t => {
  if (!(await canBindLoopbackSocket())) {
    t.skip('Socket binding unavailable in sandbox.');
    return;
  }

  let apiStub: StubServer;

  try {
    apiStub = await startApiFootballStub();
  } catch (error) {
    if (isSocketBindingUnavailable(error)) {
      t.skip('Socket binding unavailable in sandbox.');
      return;
    }
    throw error;
  }

  try {
    try {
      await withManagedEnv(
        {
          API_FOOTBALL_KEY: 'e2e-api-key',
          API_FOOTBALL_BASE_URL: apiStub.baseUrl,
          CORS_ALLOWED_ORIGINS: 'https://app.footalert.test',
        },
        async () => {
          const { buildServer } = await import(`../../src/server.ts?e2e=${Math.random().toString(36).slice(2)}`);
          const app = await buildServer();

          try {
            const matchesResponse = await app.inject({
              method: 'GET',
              url: '/v1/matches?date=2026-02-21&timezone=Europe/Paris',
            });
            assert.equal(matchesResponse.statusCode, 200);
            assert.deepEqual(matchesResponse.json(), {
              response: [{ fixture: { id: 101 } }],
            });

            const matchesValidationResponse = await app.inject({
              method: 'GET',
              url: '/v1/matches?date=2026-02-21',
            });
            assert.equal(matchesValidationResponse.statusCode, 400);

            const competitionsResponse = await app.inject({
              method: 'GET',
              url: '/v1/competitions',
            });
            assert.equal(competitionsResponse.statusCode, 200);
            assert.deepEqual(competitionsResponse.json(), {
              response: [{ league: { id: 39 } }],
            });

            const teamsUpstreamFailure = await app.inject({
              method: 'GET',
              url: '/v1/teams/529',
            });
            assert.equal(teamsUpstreamFailure.statusCode, 503);
            assert.equal(teamsUpstreamFailure.json().error, 'UPSTREAM_HTTP_ERROR');
          } finally {
            await app.close();
          }
        },
      );
    } catch (error) {
      if (isSocketBindingUnavailable(error)) {
        t.skip('Socket binding unavailable in sandbox.');
        return;
      }
      throw error;
    }
  } finally {
    await apiStub.close();
  }
});
