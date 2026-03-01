import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const routeManifestPath = path.resolve(root, '../docs/architecture/platform-route-manifests.v1.json');
const parityJourneysPath = path.resolve(root, '../docs/architecture/parity-journeys.v2.json');

const routeManifest = JSON.parse(await readFile(routeManifestPath, 'utf8'));
const parityJourneys = JSON.parse(await readFile(parityJourneysPath, 'utf8'));

const webRoutes = Array.isArray(routeManifest.web) ? routeManifest.web : null;
const desktopRoutes = Array.isArray(routeManifest.desktop) ? routeManifest.desktop : null;

if (!webRoutes || !desktopRoutes) {
  console.error('[desktop:smoke] Missing web/desktop route manifests.');
  process.exit(1);
}

const webSet = new Set(webRoutes);
const desktopSet = new Set(desktopRoutes);

if (webSet.size !== desktopSet.size || [...webSet].some(route => !desktopSet.has(route))) {
  console.error('[desktop:smoke] Desktop route manifest must match web route manifest for tauri2-web-shell mode.');
  process.exit(1);
}

const journeys = Array.isArray(parityJourneys.journeys) ? parityJourneys.journeys : [];
for (const journey of journeys) {
  const endpoints = Array.isArray(journey.endpoints) ? journey.endpoints : [];
  for (const endpoint of endpoints) {
    if (!desktopSet.has(endpoint)) {
      console.error(
        `[desktop:smoke] Missing endpoint "${endpoint}" from desktop route manifest for journey "${journey.id}".`,
      );
      process.exit(1);
    }
  }
}

console.log('[desktop:smoke] Desktop route parity checks passed.');
