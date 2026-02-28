import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

import { withManagedEnv } from '../helpers/appTestHarness.ts';

type StubServer = {
  baseUrl: string;
  close: () => Promise<void>;
};

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

test('BFF black-box e2e validates happy path, validation errors and upstream normalization', async () => {
  const apiStub = await startApiFootballStub();

  try {
    await withManagedEnv(
      {
        API_FOOTBALL_KEY: 'e2e-api-key',
        API_FOOTBALL_BASE_URL: apiStub.baseUrl,
        MOBILE_REQUEST_SIGNING_KEY: 'e2e-mobile-signing-key',
        CORS_ALLOWED_ORIGINS: 'https://app.footalert.test',
      },
      async () => {
        const { buildServer } = await import(`../../src/server.ts?e2e=${Math.random().toString(36).slice(2)}`);
        const app = await buildServer();
        await app.listen({ port: 0, host: '127.0.0.1' });

        try {
          const address = app.server.address();
          if (!address || typeof address === 'string') {
            throw new Error('Unable to resolve BFF server address.');
          }

          const bffBaseUrl = `http://127.0.0.1:${address.port}`;

          const matchesResponse = await fetch(
            `${bffBaseUrl}/v1/matches?date=2026-02-21&timezone=Europe/Paris`,
          );
          assert.equal(matchesResponse.status, 200);
          assert.deepEqual(await matchesResponse.json(), {
            response: [{ fixture: { id: 101 } }],
          });

          const matchesValidationResponse = await fetch(`${bffBaseUrl}/v1/matches?date=2026-02-21`);
          assert.equal(matchesValidationResponse.status, 400);

          const competitionsResponse = await fetch(`${bffBaseUrl}/v1/competitions`);
          assert.equal(competitionsResponse.status, 200);
          assert.deepEqual(await competitionsResponse.json(), {
            response: [{ league: { id: 39 } }],
          });

          const teamsUpstreamFailure = await fetch(`${bffBaseUrl}/v1/teams/529`);
          assert.equal(teamsUpstreamFailure.status, 503);
          assert.equal((await teamsUpstreamFailure.json()).error, 'UPSTREAM_HTTP_ERROR');
        } finally {
          await app.close();
        }
      },
    );
  } finally {
    await apiStub.close();
  }
});
