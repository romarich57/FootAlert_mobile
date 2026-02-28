import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { buildApp } from './helpers/appTestHarness.ts';

type RouteEntry = {
  method: string;
  path: string;
};

type RouteMatrixEntry = RouteEntry & {
  critical: boolean;
  testFile: string;
};

function parsePrintableRoutes(printableRoutes: string): RouteEntry[] {
  const stack: string[] = [];
  const routes: RouteEntry[] = [];

  for (const line of printableRoutes.split('\n')) {
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

    methods.forEach(method => {
      routes.push({ method, path: fullPath });
    });
  }

  return routes;
}

function toRouteKey(route: RouteEntry): string {
  return `${route.method} ${route.path}`;
}

test('route catalog and route matrix stay in sync with buildServer routes', async t => {
  const catalogPath = path.resolve('test/fixtures/route-catalog.json');
  const matrixPath = path.resolve('test/fixtures/route-test-matrix.json');

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as RouteEntry[];
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8')) as RouteMatrixEntry[];

  const app = await buildApp(t);
  const runtimeRoutes = parsePrintableRoutes(app.printRoutes({ commonPrefix: false }));

  const runtimeKeys = new Set(runtimeRoutes.map(toRouteKey));
  const catalogKeys = new Set(catalog.map(toRouteKey));
  const matrixKeys = new Set(matrix.map(toRouteKey));

  assert.deepEqual([...catalogKeys].sort(), [...runtimeKeys].sort());
  assert.deepEqual([...matrixKeys].sort(), [...catalogKeys].sort());

  matrix.forEach(entry => {
    assert.equal(typeof entry.critical, 'boolean');
    assert.equal(Boolean(entry.method), true);
    assert.equal(Boolean(entry.path), true);
    assert.equal(Boolean(entry.testFile), true);

    const testFilePath = path.resolve(entry.testFile);
    assert.equal(fs.existsSync(testFilePath), true, `${entry.testFile} must exist`);
  });
});
