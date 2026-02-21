import fs from 'node:fs';
import path from 'node:path';

const METADATA_PATH = path.resolve(process.cwd(), 'docs/aso/metadata.json');

const RULES = [
  { path: 'apple.en_US.title', max: 30 },
  { path: 'apple.en_US.subtitle', max: 30 },
  { path: 'apple.en_US.promotional_text', max: 170 },
  { path: 'apple.en_US.keywords', max: 100 },
  { path: 'apple.en_US.description', max: 4000 },
  { path: 'apple.fr_FR.title', max: 30 },
  { path: 'apple.fr_FR.subtitle', max: 30 },
  { path: 'apple.fr_FR.promotional_text', max: 170 },
  { path: 'apple.fr_FR.keywords', max: 100 },
  { path: 'apple.fr_FR.description', max: 4000 },
  { path: 'google.en_US.title', max: 50 },
  { path: 'google.en_US.short_description', max: 80 },
  { path: 'google.en_US.full_description', max: 4000 },
  { path: 'google.fr_FR.title', max: 50 },
  { path: 'google.fr_FR.short_description', max: 80 },
  { path: 'google.fr_FR.full_description', max: 4000 },
];

function getByPath(obj, dottedPath) {
  return dottedPath.split('.').reduce((current, key) => current?.[key], obj);
}

function safeReadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error(`[aso:validate] Failed to read/parse ${filePath}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function main() {
  const metadata = safeReadJson(METADATA_PATH);
  const errors = [];
  const checks = [];

  if (typeof metadata.app_name !== 'string' || metadata.app_name.trim().length === 0) {
    errors.push('app_name is required and must be a non-empty string.');
  }

  for (const rule of RULES) {
    const value = getByPath(metadata, rule.path);

    if (typeof value !== 'string') {
      errors.push(`${rule.path} is missing or not a string.`);
      continue;
    }

    const length = value.length;
    checks.push({ path: rule.path, length, max: rule.max });

    if (length === 0) {
      errors.push(`${rule.path} must not be empty.`);
    }

    if (length > rule.max) {
      errors.push(`${rule.path} exceeds max length (${length}/${rule.max}).`);
    }
  }

  for (const check of checks) {
    console.log(`[aso:validate] ${check.path}: ${check.length}/${check.max}`);
  }

  if (errors.length > 0) {
    console.error('\n[aso:validate] Validation failed:');
    for (const err of errors) {
      console.error(`- ${err}`);
    }
    process.exit(1);
  }

  console.log('\n[aso:validate] All ASO metadata limits are valid.');
}

main();
