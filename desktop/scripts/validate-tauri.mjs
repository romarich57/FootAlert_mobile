import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve('.');
const webDist = path.resolve(root, '../web/dist/index.html');
const tauriConfigPath = path.resolve(root, 'src-tauri/tauri.conf.json');

try {
  await access(webDist);
} catch {
  console.error('[desktop:validate] Missing web build artifact at ../web/dist/index.html');
  process.exit(1);
}

const rawConfig = await readFile(tauriConfigPath, 'utf8');
const config = JSON.parse(rawConfig);

const frontendDist = config?.build?.frontendDist;
const devUrl = config?.build?.devUrl;

if (!frontendDist || !devUrl) {
  console.error('[desktop:validate] Invalid tauri.conf.json: build.frontendDist and build.devUrl are required.');
  process.exit(1);
}

console.log('[desktop:validate] Tauri config and web artifacts look valid.');
