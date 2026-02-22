import fs from 'node:fs';
import path from 'node:path';

const ASSETS_ROOT = path.resolve(process.cwd(), 'docs/aso/assets');
const MANIFEST_PATH = path.join(ASSETS_ROOT, 'manifest.json');

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`[aso:validate:assets] Unable to parse ${filePath}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function getPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 24) {
    throw new Error(`Invalid PNG header: ${filePath}`);
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function assertPng(filePath, expectedWidth, expectedHeight, errors) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing asset file: ${path.relative(ASSETS_ROOT, filePath)}`);
    return;
  }

  try {
    const { width, height } = getPngDimensions(filePath);
    if (width !== expectedWidth || height !== expectedHeight) {
      errors.push(
        `${path.relative(ASSETS_ROOT, filePath)} has ${width}x${height}, expected ${expectedWidth}x${expectedHeight}.`,
      );
      return;
    }

    console.log(
      `[aso:validate:assets] ${path.relative(ASSETS_ROOT, filePath)}: ${width}x${height}`,
    );
  } catch (error) {
    errors.push(
      `Unable to validate ${path.relative(ASSETS_ROOT, filePath)} (${error instanceof Error ? error.message : String(error)}).`,
    );
  }
}

function validateApple(manifest, errors) {
  const apple = manifest.apple ?? {};
  for (const locale of Object.keys(apple)) {
    const localeSpec = apple[locale] ?? {};
    for (const deviceSet of Object.keys(localeSpec)) {
      const setSpec = localeSpec[deviceSet];
      const files = Array.isArray(setSpec.files) ? setSpec.files : [];
      const width = Number.parseInt(String(setSpec.width), 10);
      const height = Number.parseInt(String(setSpec.height), 10);
      for (const file of files) {
        const filePath = path.join(ASSETS_ROOT, 'apple', locale, deviceSet, file);
        assertPng(filePath, width, height, errors);
      }
    }
  }
}

function validateGoogle(manifest, errors) {
  const google = manifest.google ?? {};
  for (const locale of Object.keys(google)) {
    const localeSpec = google[locale] ?? {};
    const phoneSpec = localeSpec.phone ?? {};
    const phoneFiles = Array.isArray(phoneSpec.files) ? phoneSpec.files : [];
    const phoneWidth = Number.parseInt(String(phoneSpec.width), 10);
    const phoneHeight = Number.parseInt(String(phoneSpec.height), 10);
    for (const file of phoneFiles) {
      const filePath = path.join(ASSETS_ROOT, 'google', locale, 'phone', file);
      assertPng(filePath, phoneWidth, phoneHeight, errors);
    }

    const featureSpec = localeSpec.featureGraphic ?? {};
    if (featureSpec.file) {
      const featurePath = path.join(ASSETS_ROOT, 'google', locale, featureSpec.file);
      const featureWidth = Number.parseInt(String(featureSpec.width), 10);
      const featureHeight = Number.parseInt(String(featureSpec.height), 10);
      assertPng(featurePath, featureWidth, featureHeight, errors);
    }
  }
}

function main() {
  const manifest = readJson(MANIFEST_PATH);
  const errors = [];
  validateApple(manifest, errors);
  validateGoogle(manifest, errors);

  if (errors.length > 0) {
    console.error('\n[aso:validate:assets] Validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('\n[aso:validate:assets] Store assets are valid.');
}

main();

