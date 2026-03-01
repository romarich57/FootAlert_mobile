import fs from 'node:fs';
import path from 'node:path';

process.env.API_FOOTBALL_KEY ??= 'catalog-server-key';
process.env.API_FOOTBALL_BASE_URL ??= 'https://api-football.test';
process.env.MOBILE_SESSION_JWT_SECRET ??= 'catalog-mobile-session-secret';
process.env.MOBILE_ATTESTATION_ACCEPT_MOCK ??= 'true';
process.env.CORS_ALLOWED_ORIGINS ??= 'https://app.footalert.test';

const { buildServer } = await import('../../src/server.ts');
const app = await buildServer();
const printableRoutes = app.printRoutes({ commonPrefix: false });
await app.close();

function parsePrintableRoutes(printable) {
  const stack = [];
  const routes = [];

  for (const line of printable.split('\n')) {
    if (!line.includes('──') || !line.includes('(')) {
      continue;
    }

    const pathStart = line.indexOf('/');
    if (pathStart < 0) {
      continue;
    }

    const segment = line.slice(pathStart, line.indexOf(' (')).trim();
    const prefix = line.slice(0, pathStart);
    const depth = Math.max(0, Math.floor(prefix.length / 4) - 1);
    const fullPath = depth === 0 ? segment : `${stack[depth - 1]}${segment}`;
    stack[depth] = fullPath;
    stack.length = depth + 1;

    const methodsRaw = line.slice(line.indexOf('(') + 1, line.lastIndexOf(')'));
    const methods = methodsRaw
      .split(',')
      .map(method => method.trim())
      .filter(Boolean)
      .filter(method => method !== 'HEAD' && method !== 'OPTIONS');

    methods.forEach(method => routes.push({ method, path: fullPath }));
  }

  return routes;
}

const catalog = parsePrintableRoutes(printableRoutes);

function toTestFile(pathname) {
  if (pathname === '/health' || pathname === '/v1/capabilities') {
    return 'test/server.crosscutting.test.ts';
  }

  if (pathname.startsWith('/v1/matches')) {
    return 'test/routes/matches.routes.test.ts';
  }

  if (pathname.startsWith('/v1/competitions')) {
    return 'test/routes/competitions.routes.test.ts';
  }

  if (pathname.startsWith('/v1/follows')) {
    return 'test/routes/follows.routes.test.ts';
  }

  if (pathname.startsWith('/v1/teams')) {
    return 'test/routes/teams.routes.test.ts';
  }

  if (pathname.startsWith('/v1/players')) {
    return 'test/routes/players.routes.test.ts';
  }

  if (pathname.startsWith('/v1/notifications')) {
    return 'test/routes/notifications.routes.test.ts';
  }

  if (pathname.startsWith('/v1/telemetry')) {
    return 'test/routes/telemetry.routes.test.ts';
  }

  if (pathname.startsWith('/v1/mobile/session')) {
    return 'test/routes/mobileSession.routes.test.ts';
  }

  return 'test/server.crosscutting.test.ts';
}

const matrix = catalog.map(entry => ({
  ...entry,
  critical: (
    entry.path.startsWith('/v1/matches')
    || entry.path.startsWith('/v1/competitions')
    || entry.path.startsWith('/v1/notifications')
    || entry.path.startsWith('/v1/telemetry')
    || entry.path.startsWith('/v1/mobile/session')
  ),
  testFile: toTestFile(entry.path),
}));

const catalogPath = path.resolve('test/fixtures/route-catalog.json');
const matrixPath = path.resolve('test/fixtures/route-test-matrix.json');

fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
fs.writeFileSync(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`);

console.log(`Route catalog generated: ${catalogPath}`);
console.log(`Route matrix generated: ${matrixPath}`);
