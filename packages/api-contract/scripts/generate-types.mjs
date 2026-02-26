import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import openapiTS, { astToString } from 'openapi-typescript';
import { parse } from 'yaml';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const OPENAPI_PATH = path.resolve(scriptDir, '../openapi/footalert.v1.yaml');
const GENERATED_DIR = path.resolve(scriptDir, '../generated');
const GENERATED_PATH = path.resolve(scriptDir, '../generated/types.ts');

const rawDocument = await readFile(OPENAPI_PATH, 'utf8');
const openapiDocument = parse(rawDocument);
const ast = await openapiTS(openapiDocument, {
  exportType: true,
  alphabetize: true,
});
const generated = astToString(ast);

const content = [
  '// AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.',
  '// Source: packages/api-contract/openapi/footalert.v1.yaml',
  '',
  generated,
  '',
].join('\n');

await mkdir(GENERATED_DIR, { recursive: true });
await writeFile(GENERATED_PATH, content, 'utf8');
console.log('[api-contract:generate] Generated types at packages/api-contract/generated/types.ts');
