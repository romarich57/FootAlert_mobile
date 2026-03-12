import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('loadEnvFile loads variables from the configured env file', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'footalert-load-env-'));
  const envFile = path.join(tempDir, '.worker.env');
  const markerKey = 'FOOTALERT_TEST_LOAD_ENV_MARKER';

  delete process.env[markerKey];
  process.env.ENVFILE = envFile;
  await writeFile(envFile, `${markerKey}=loaded-from-file\n`, 'utf8');

  try {
    await import(`../src/loadEnvFile.ts?case=${Math.random().toString(36).slice(2)}`);
    assert.equal(process.env[markerKey], 'loaded-from-file');
  } finally {
    delete process.env[markerKey];
    delete process.env.ENVFILE;
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('loadEnvFile ignores a missing env file', async () => {
  process.env.ENVFILE = path.join(
    os.tmpdir(),
    `footalert-missing-env-${Math.random().toString(36).slice(2)}.env`,
  );

  try {
    await import(`../src/loadEnvFile.ts?case=${Math.random().toString(36).slice(2)}`);
  } finally {
    delete process.env.ENVFILE;
  }
});
