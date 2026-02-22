import fs from 'node:fs';
import path from 'node:path';

const APP_ICON_DIR = path.resolve(
  process.cwd(),
  'ios/Mobile_Foot/Images.xcassets/AppIcon.appiconset',
);
const CONTENTS_PATH = path.join(APP_ICON_DIR, 'Contents.json');

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`[aso:validate:icon-ios] Unable to parse ${filePath}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function parseDimension(value) {
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function getPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 24) {
    throw new Error(`Invalid PNG header: ${filePath}`);
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

function validateEntry(entry, errors) {
  const size = parseDimension(String(entry.size || '').split('x')[0]);
  const scale = parseDimension(String(entry.scale || '').replace('x', ''));
  const filename = entry.filename;
  if (!filename) {
    errors.push(`Missing filename for ${entry.idiom} ${entry.size} @${entry.scale}.`);
    return;
  }

  const expectedSize = Math.round(size * scale);
  if (!Number.isFinite(expectedSize) || expectedSize <= 0) {
    errors.push(`Invalid size/scale in entry for ${filename}.`);
    return;
  }

  const filePath = path.join(APP_ICON_DIR, filename);
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing file referenced by Contents.json: ${filename}`);
    return;
  }

  try {
    const { width, height } = getPngDimensions(filePath);
    if (width !== expectedSize || height !== expectedSize) {
      errors.push(
        `${filename} has invalid dimensions ${width}x${height}, expected ${expectedSize}x${expectedSize}.`,
      );
      return;
    }

    console.log(
      `[aso:validate:icon-ios] ${filename}: ${width}x${height} (expected ${expectedSize}x${expectedSize})`,
    );
  } catch (error) {
    errors.push(
      `${filename} cannot be validated as PNG (${error instanceof Error ? error.message : String(error)}).`,
    );
  }
}

function main() {
  const contents = readJson(CONTENTS_PATH);
  const images = Array.isArray(contents.images) ? contents.images : [];
  const errors = [];

  if (images.length === 0) {
    errors.push('Contents.json has no image entries.');
  }

  for (const entry of images) {
    validateEntry(entry, errors);
  }

  if (errors.length > 0) {
    console.error('\n[aso:validate:icon-ios] Validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('\n[aso:validate:icon-ios] AppIcon set is valid.');
}

main();

