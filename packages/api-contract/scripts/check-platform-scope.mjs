import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contractPath = path.resolve(__dirname, '../openapi/footalert.v1.yaml');
const routeManifestPath = path.resolve(
  __dirname,
  '../../../docs/architecture/platform-route-manifests.v1.json',
);

const allowedPlatforms = new Set(['mobile', 'web', 'desktop', 'ops']);
const manifestPlatforms = ['web', 'desktop'];

function fail(errors) {
  if (errors.length === 0) {
    return;
  }

  const message = errors.map(error => `- ${error}`).join('\n');
  throw new Error(`Platform scope validation failed:\n${message}`);
}

function parseContract() {
  const raw = fs.readFileSync(contractPath, 'utf8');
  return YAML.parse(raw);
}

function parseRouteManifests() {
  const raw = fs.readFileSync(routeManifestPath, 'utf8');
  return JSON.parse(raw);
}

function validateScopeArray(endpoint, scope, errors) {
  if (!Array.isArray(scope) || scope.length === 0) {
    errors.push(`${endpoint} is missing a non-empty x-platform-scope array.`);
    return;
  }

  const seen = new Set();
  for (const platform of scope) {
    if (typeof platform !== 'string' || platform.trim().length === 0) {
      errors.push(`${endpoint} has a non-string platform scope value.`);
      continue;
    }

    if (!allowedPlatforms.has(platform)) {
      errors.push(`${endpoint} has unsupported x-platform-scope value "${platform}".`);
    }

    if (seen.has(platform)) {
      errors.push(`${endpoint} has duplicate x-platform-scope value "${platform}".`);
    }
    seen.add(platform);
  }
}

const contract = parseContract();
const paths = contract?.paths ?? {};
const errors = [];

for (const [endpoint, pathItem] of Object.entries(paths)) {
  if (!endpoint.startsWith('/v1/') && endpoint !== '/health') {
    continue;
  }

  const scope = pathItem?.['x-platform-scope'];
  validateScopeArray(endpoint, scope, errors);
}

const routeManifests = parseRouteManifests();
for (const platform of manifestPlatforms) {
  const endpoints = routeManifests[platform];
  if (!Array.isArray(endpoints)) {
    errors.push(`Route manifest is missing "${platform}" endpoint array.`);
    continue;
  }

  const seen = new Set();
  for (const endpoint of endpoints) {
    if (typeof endpoint !== 'string' || endpoint.trim().length === 0) {
      errors.push(`Route manifest "${platform}" contains an invalid endpoint entry.`);
      continue;
    }

    if (seen.has(endpoint)) {
      errors.push(`Route manifest "${platform}" contains duplicate endpoint "${endpoint}".`);
      continue;
    }
    seen.add(endpoint);

    const contractPathItem = paths[endpoint];
    if (!contractPathItem) {
      errors.push(
        `Route manifest "${platform}" references "${endpoint}" which is missing from OpenAPI paths.`,
      );
      continue;
    }

    const scope = contractPathItem['x-platform-scope'];
    if (!Array.isArray(scope) || !scope.includes(platform)) {
      errors.push(
        `Route manifest "${platform}" references "${endpoint}" but x-platform-scope does not include "${platform}".`,
      );
    }
  }
}

for (const [endpoint, pathItem] of Object.entries(paths)) {
  const scope = pathItem?.['x-platform-scope'];
  if (!Array.isArray(scope) || scope.length !== 1 || scope[0] !== 'mobile') {
    continue;
  }

  for (const platform of manifestPlatforms) {
    const endpoints = Array.isArray(routeManifests[platform]) ? routeManifests[platform] : [];
    if (endpoints.includes(endpoint)) {
      errors.push(
        `Mobile-only endpoint "${endpoint}" is referenced by "${platform}" route manifest.`,
      );
    }
  }
}

fail(errors);
console.log('Platform scope validation passed.');
