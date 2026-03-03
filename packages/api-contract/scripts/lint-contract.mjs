import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const CONTRACT_PATH = path.resolve(scriptDir, '../openapi/footalert.v1.yaml');

const REQUIRED_PATHS = [
  '/v1/matches',
  '/v1/matches/{id}',
  '/v1/competitions',
  '/v1/competitions/search',
  '/v1/competitions/{id}',
  '/v1/competitions/{id}/standings',
  '/v1/competitions/{id}/matches',
  '/v1/competitions/{id}/player-stats',
  '/v1/competitions/{id}/transfers',
  '/v1/teams/standings',
  '/v1/teams/{id}',
  '/v1/teams/{id}/leagues',
  '/v1/teams/{id}/fixtures',
  '/v1/teams/{id}/next-fixture',
  '/v1/teams/{id}/advanced-stats',
  '/v1/teams/{id}/stats',
  '/v1/teams/{id}/players',
  '/v1/teams/{id}/squad',
  '/v1/teams/{id}/transfers',
  '/v1/teams/{id}/trophies',
  '/v1/players/{id}',
  '/v1/players/{id}/seasons',
  '/v1/players/{id}/trophies',
  '/v1/players/{id}/career',
  '/v1/players/team/{teamId}/fixtures',
  '/v1/players/fixtures/{fixtureId}/team/{teamId}/stats',
  '/v1/players/{id}/matches',
  '/v1/follows/search/teams',
  '/v1/follows/search/players',
  '/v1/search/global',
  '/v1/mobile/session/challenge',
  '/v1/mobile/session/attest',
  '/v1/mobile/session/refresh',
  '/v1/mobile/session/revoke',
  '/v1/mobile/privacy/erase',
  '/v1/follows/teams/{teamId}',
  '/v1/follows/teams/{teamId}/next-fixture',
  '/v1/follows/players/{playerId}/season/{season}',
  '/v1/follows/trends/teams',
  '/v1/follows/trends/players',
  '/v1/notifications/tokens',
  '/v1/notifications/tokens/{token}',
  '/v1/telemetry/events',
  '/v1/telemetry/errors',
  '/v1/telemetry/breadcrumbs',
];

function fail(message) {
  console.error(`[api-contract:lint] ${message}`);
  process.exit(1);
}

const raw = await readFile(CONTRACT_PATH, 'utf8');
const doc = parse(raw);

if (!doc || typeof doc !== 'object') {
  fail('Contract file is empty or invalid YAML object.');
}

if (doc.openapi !== '3.1.0') {
  fail('OpenAPI version must be 3.1.0.');
}

if (!doc.info || typeof doc.info !== 'object') {
  fail('Missing info section.');
}

if (!doc.paths || typeof doc.paths !== 'object') {
  fail('Missing paths section.');
}

const contractPaths = Object.keys(doc.paths);
const missingPaths = REQUIRED_PATHS.filter(requiredPath => !contractPaths.includes(requiredPath));
if (missingPaths.length > 0) {
  fail(`Missing required paths: ${missingPaths.join(', ')}`);
}

const nonVersionedPaths = contractPaths.filter(route => route !== '/health' && !route.startsWith('/v1/'));
if (nonVersionedPaths.length > 0) {
  fail(`Found non versioned routes: ${nonVersionedPaths.join(', ')}`);
}

console.log(`[api-contract:lint] Contract is valid. ${contractPaths.length} paths checked.`);
