import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_DEFINITIONS,
  RELEASED_LANGUAGE_CODES,
  SUPPORTED_LANGUAGE_CODES,
  type AppLanguage,
  type LanguageAvailability,
} from '../../src/shared/i18n/languages';

export const MOBILE_I18N_NAMESPACES = [
  'translation',
  'common',
  'matches',
  'settings',
  'teams',
] as const;

export type MobileI18nNamespace = typeof MOBILE_I18N_NAMESPACES[number];

export type LocaleNamespaceRecord = Record<MobileI18nNamespace, Record<string, unknown>>;

export const TRANSLATION_CSV_HEADERS = [
  'namespace',
  'key',
  'en',
  'context',
  'placeholders',
  'notes',
  'max_length',
  'screen_ref',
] as const;

export type TranslationCsvHeader = typeof TRANSLATION_CSV_HEADERS[number];

export type MobileTranslationCsvRow = {
  namespace: MobileI18nNamespace;
  key: string;
  en: string;
  context: string;
  placeholders: string;
  notes: string;
  max_length: string;
  screen_ref: string;
};

export type FlatTranslationEntry = {
  key: string;
  value: string;
};

export type PlaceholderMismatch = {
  key: string;
  source: readonly string[];
  target: readonly string[];
};

export type NamespaceValidationReport = {
  namespace: MobileI18nNamespace;
  sourceKeyCount: number;
  targetKeyCount: number;
  missingKeys: readonly string[];
  extraKeys: readonly string[];
  placeholderMismatches: readonly PlaceholderMismatch[];
  emptyRequiredNamespace: boolean;
};

export type LocaleValidationReport = {
  language: AppLanguage;
  availability: LanguageAvailability;
  totalSourceKeys: number;
  totalTargetKeys: number;
  missingKeyCount: number;
  extraKeyCount: number;
  placeholderMismatchCount: number;
  emptyRequiredNamespaces: readonly MobileI18nNamespace[];
  namespaceReports: readonly NamespaceValidationReport[];
};

export type ValidationSummary = {
  generatedAt: string;
  sourceLanguage: AppLanguage;
  releasedLanguages: readonly AppLanguage[];
  reports: readonly LocaleValidationReport[];
};

export type TranslationInventorySummary = {
  generatedAt: string;
  sourceLanguage: AppLanguage;
  totalKeys: number;
  namespaceCounts: Record<MobileI18nNamespace, number>;
  translationTopLevelCounts: Record<string, number>;
  releasedLanguages: readonly AppLanguage[];
  languageAvailability: Record<AppLanguage, LanguageAvailability>;
};

export type CsvParseResult = {
  headers: readonly string[];
  rows: readonly Record<string, string>[];
};

export type ImportTranslationRow = {
  namespace: MobileI18nNamespace;
  key: string;
  value: string;
};

export type WriteLocaleModulesResult = {
  generatedFiles: readonly string[];
};

export type CliArgs = Record<string, string | boolean>;

const SCRIPT_ROOT = path.resolve(__dirname, '..');
export const MOBILE_ROOT = path.resolve(SCRIPT_ROOT, '..');
export const DEFAULT_LOCALES_ROOT = path.resolve(
  MOBILE_ROOT,
  'src/ui/shared/i18n/locales',
);
export const DEFAULT_I18N_ARTIFACTS_DIR = path.resolve(
  MOBILE_ROOT,
  'artifacts/i18n/mobile',
);
export const DEFAULT_EXPORT_OUTPUT_PATH = path.resolve(
  DEFAULT_I18N_ARTIFACTS_DIR,
  'en-source.csv',
);
export const DEFAULT_EXPORT_SUMMARY_PATH = path.resolve(
  DEFAULT_I18N_ARTIFACTS_DIR,
  'en-source.summary.json',
);
export const DEFAULT_VALIDATION_OUTPUT_PATH = path.resolve(
  DEFAULT_I18N_ARTIFACTS_DIR,
  'qa-report.json',
);

const SCREEN_REFERENCE_BY_SECTION: Record<string, string> = {
  actions: 'global',
  common: 'global',
  competitionDetails: 'competitionDetails',
  follows: 'follows',
  matchCard: 'matches',
  matchDetails: 'matchDetails',
  matches: 'matches',
  more: 'more',
  notifications: 'notifications',
  onboarding: 'onboarding',
  placeholders: 'global',
  playerDetails: 'playerDetails',
  screens: 'global',
  tabs: 'navigation',
  teamDetails: 'teamDetails',
};

const MAX_LENGTH_HINTS: ReadonlyArray<{
  namespace: MobileI18nNamespace;
  keyPrefix: string;
  maxLength: string;
}> = [
  { namespace: 'translation', keyPrefix: 'tabs.', maxLength: '12' },
  { namespace: 'translation', keyPrefix: 'actions.', maxLength: '28' },
  { namespace: 'translation', keyPrefix: 'notifications.options.', maxLength: '32' },
  { namespace: 'common', keyPrefix: 'calendar.todayShort', maxLength: '5' },
  { namespace: 'common', keyPrefix: 'status.comingSoon', maxLength: '20' },
  { namespace: 'matches', keyPrefix: 'status.', maxLength: '24' },
  { namespace: 'settings', keyPrefix: 'languageSelector.title', maxLength: '32' },
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertIsAppLanguage(value: string): AppLanguage {
  if ((SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(value)) {
    return value as AppLanguage;
  }

  throw new Error(`Unsupported app language "${value}".`);
}

function getLanguageAvailability(language: AppLanguage): LanguageAvailability {
  return LANGUAGE_DEFINITIONS[language].availability;
}

function toObjectKey(key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : `'${escapeTsString(key)}'`;
}

function getTranslationSection(namespace: MobileI18nNamespace, key: string): string {
  if (namespace !== 'translation') {
    return namespace;
  }

  const [section = namespace] = key.split('.');
  return section;
}

function inferScreenReference(namespace: MobileI18nNamespace, key: string): string {
  const section = getTranslationSection(namespace, key);
  return SCREEN_REFERENCE_BY_SECTION[section] ?? section;
}

function inferContext(namespace: MobileI18nNamespace, key: string): string {
  const screenRef = inferScreenReference(namespace, key);
  return `Mobile UI copy for ${screenRef} (${namespace} namespace)`;
}

function inferNotes(
  namespace: MobileI18nNamespace,
  key: string,
  placeholders: readonly string[],
): string {
  const notes: string[] = [];

  if (placeholders.length > 0) {
    notes.push(
      `Preserve placeholders exactly: ${placeholders
        .map(placeholder => `{{${placeholder}}}`)
        .join(', ')}.`,
    );
  }

  if (namespace === 'translation' && key.startsWith('tabs.')) {
    notes.push('Bottom tab label. Keep it concise.');
  }

  if (key.endsWith('todayShort') || key.endsWith('Short')) {
    notes.push('Compact UI label. Prefer a short translation.');
  }

  if (key.includes('partner.') || key.includes('broadcast.')) {
    notes.push('Product copy shown inside cards; avoid long lines.');
  }

  return notes.join(' ');
}

function resolveMaxLengthHint(namespace: MobileI18nNamespace, key: string): string {
  const matchedHint = MAX_LENGTH_HINTS.find(
    hint => hint.namespace === namespace && key.startsWith(hint.keyPrefix),
  );

  return matchedHint?.maxLength ?? '';
}

function escapeTsString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
}

export function serializeTsValue(value: unknown, depth = 0): string {
  if (typeof value === 'string') {
    return `'${escapeTsString(value)}'`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }

    const currentIndent = '  '.repeat(depth);
    const nextIndent = '  '.repeat(depth + 1);
    return `[\n${value
      .map(item => `${nextIndent}${serializeTsValue(item, depth + 1)}`)
      .join(',\n')}\n${currentIndent}]`;
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return '{}';
    }

    const currentIndent = '  '.repeat(depth);
    const nextIndent = '  '.repeat(depth + 1);
    const sortedEntries = [...entries].sort(([leftKey], [rightKey]) =>
      leftKey.localeCompare(rightKey),
    );

    return `{\n${sortedEntries
      .map(
        ([entryKey, entryValue]) =>
          `${nextIndent}${toObjectKey(entryKey)}: ${serializeTsValue(
            entryValue,
            depth + 1,
          )}`,
      )
      .join(',\n')}\n${currentIndent}}`;
  }

  throw new Error(`Unsupported translation value type: ${typeof value}`);
}

export function flattenTranslations(
  value: Record<string, unknown>,
  prefix = '',
): FlatTranslationEntry[] {
  return Object.entries(value)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .flatMap(([entryKey, entryValue]) => {
      const nextKey = prefix ? `${prefix}.${entryKey}` : entryKey;
      if (typeof entryValue === 'string') {
        return [{ key: nextKey, value: entryValue }];
      }

      if (isPlainObject(entryValue)) {
        return flattenTranslations(entryValue, nextKey);
      }

      throw new Error(`Unsupported translation entry at "${nextKey}".`);
    });
}

export function extractPlaceholders(value: string): readonly string[] {
  const matches = new Set<string>();
  const placeholderPattern = /{{\s*([^}]+?)\s*}}/g;

  for (const match of value.matchAll(placeholderPattern)) {
    const placeholder = match[1]?.trim();
    if (placeholder) {
      matches.add(placeholder);
    }
  }

  return [...matches].sort((left, right) => left.localeCompare(right));
}

export function buildTranslationCsvRows(
  localeNamespaces: LocaleNamespaceRecord,
): readonly MobileTranslationCsvRow[] {
  return MOBILE_I18N_NAMESPACES.flatMap(namespace => {
    const flattenedEntries = flattenTranslations(localeNamespaces[namespace] ?? {});

    return flattenedEntries.map(entry => {
      const placeholders = extractPlaceholders(entry.value);
      return {
        namespace,
        key: entry.key,
        en: entry.value,
        context: inferContext(namespace, entry.key),
        placeholders: placeholders.join('|'),
        notes: inferNotes(namespace, entry.key, placeholders),
        max_length: resolveMaxLengthHint(namespace, entry.key),
        screen_ref: inferScreenReference(namespace, entry.key),
      };
    });
  }).sort((left, right) => {
    if (left.namespace === right.namespace) {
      return left.key.localeCompare(right.key);
    }

    return left.namespace.localeCompare(right.namespace);
  });
}

export function buildTranslationInventorySummary(
  rows: readonly MobileTranslationCsvRow[],
): TranslationInventorySummary {
  const namespaceCounts = MOBILE_I18N_NAMESPACES.reduce<Record<MobileI18nNamespace, number>>(
    (counts, namespace) => ({
      ...counts,
      [namespace]: rows.filter(row => row.namespace === namespace).length,
    }),
    {
      translation: 0,
      common: 0,
      matches: 0,
      settings: 0,
      teams: 0,
    },
  );

  const translationTopLevelCounts = rows
    .filter(row => row.namespace === 'translation')
    .reduce<Record<string, number>>((counts, row) => {
      const [section = 'translation'] = row.key.split('.');
      return {
        ...counts,
        [section]: (counts[section] ?? 0) + 1,
      };
    }, {});

  const languageAvailability = SUPPORTED_LANGUAGE_CODES.reduce<
    Record<AppLanguage, LanguageAvailability>
  >((availability, language) => {
    availability[language] = getLanguageAvailability(language);
    return availability;
  }, {} as Record<AppLanguage, LanguageAvailability>);

  return {
    generatedAt: new Date().toISOString(),
    sourceLanguage: DEFAULT_LANGUAGE,
    totalKeys: rows.length,
    namespaceCounts,
    translationTopLevelCounts,
    releasedLanguages: RELEASED_LANGUAGE_CODES,
    languageAvailability,
  };
}

export function stringifyCsv(
  rows: readonly Record<string, string>[],
  headers: readonly string[],
): string {
  const escapeCell = (value: string): string => {
    const normalized = value.replace(/\r\n/g, '\n');
    if (/[",\n]/.test(normalized)) {
      return `"${normalized.replace(/"/g, '""')}"`;
    }
    return normalized;
  };

  const lines = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(header => escapeCell(String(row[header] ?? ''))).join(','),
    ),
  ];

  return `${lines.join('\n')}\n`;
}

export function parseCsv(content: string): CsvParseResult {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (inQuotes) {
      if (character === '"') {
        if (content[index + 1] === '"') {
          currentCell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += character;
      }
      continue;
    }

    if (character === '"') {
      inQuotes = true;
      continue;
    }

    if (character === ',') {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if (character === '\n') {
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
      continue;
    }

    if (character === '\r') {
      continue;
    }

    currentCell += character;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  const nonEmptyRows = rows.filter(row => !(row.length === 1 && row[0] === ''));
  if (nonEmptyRows.length === 0) {
    return { headers: [], rows: [] };
  }

  const [headerRow, ...dataRows] = nonEmptyRows;
  const headers = headerRow.map(header => header.trim());
  const recordRows = dataRows.map(row => {
    const record: Record<string, string> = {};
    headers.forEach((header, headerIndex) => {
      record[header] = row[headerIndex] ?? '';
    });
    return record;
  });

  return {
    headers,
    rows: recordRows,
  };
}

export function parseCliArgs(args: readonly string[]): CliArgs {
  const parsed: CliArgs = {};

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith('--')) {
      continue;
    }

    const normalized = argument.slice(2);
    const separatorIndex = normalized.indexOf('=');

    if (separatorIndex >= 0) {
      const key = normalized.slice(0, separatorIndex);
      const value = normalized.slice(separatorIndex + 1);
      parsed[key] = value;
      continue;
    }

    const nextValue = args[index + 1];
    if (nextValue && !nextValue.startsWith('--')) {
      parsed[normalized] = nextValue;
      index += 1;
      continue;
    }

    parsed[normalized] = true;
  }

  return parsed;
}

export function resolveCliPath(
  inputPath: string | boolean | undefined,
  fallbackPath: string,
): string {
  if (typeof inputPath !== 'string' || inputPath.length === 0) {
    return fallbackPath;
  }

  return path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(process.cwd(), inputPath);
}

export function assertStringOption(
  args: CliArgs,
  key: string,
  errorMessage: string,
): string {
  const value = args[key];
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  throw new Error(errorMessage);
}

export function resolveImportValueColumn(
  headers: readonly string[],
  language: AppLanguage,
  explicitValueColumn?: string,
): string {
  const candidateColumns = [
    explicitValueColumn,
    language,
    'translation',
    'target',
  ].filter((value): value is string => Boolean(value));

  const matchedColumn = candidateColumns.find(column => headers.includes(column));
  if (matchedColumn) {
    return matchedColumn;
  }

  throw new Error(
    `Missing translation value column for "${language}". Tried: ${candidateColumns.join(', ')}.`,
  );
}

export function toImportTranslationRows(
  csvRows: readonly Record<string, string>[],
  valueColumn: string,
): readonly ImportTranslationRow[] {
  const seenKeys = new Set<string>();

  return csvRows.map(row => {
    const namespace = row.namespace?.trim();
    const key = row.key?.trim();
    const value = row[valueColumn]?.trim();

    if (!namespace || !(MOBILE_I18N_NAMESPACES as readonly string[]).includes(namespace)) {
      throw new Error(`Invalid namespace "${row.namespace ?? ''}" in import CSV.`);
    }

    if (!key) {
      throw new Error('Missing translation key in import CSV.');
    }

    if (!value) {
      throw new Error(`Missing translation value for ${namespace}:${key}.`);
    }

    const uniquenessKey = `${namespace}:${key}`;
    if (seenKeys.has(uniquenessKey)) {
      throw new Error(`Duplicate translation row for ${uniquenessKey}.`);
    }
    seenKeys.add(uniquenessKey);

    return {
      namespace: namespace as MobileI18nNamespace,
      key,
      value,
    };
  });
}

export function buildLocaleNamespacesFromImportRows(
  rows: readonly ImportTranslationRow[],
): LocaleNamespaceRecord {
  return MOBILE_I18N_NAMESPACES.reduce<LocaleNamespaceRecord>(
    (localeNamespaces, namespace) => {
      const namespaceRows = rows
        .filter(row => row.namespace === namespace)
        .sort((left, right) => left.key.localeCompare(right.key));

      localeNamespaces[namespace] = nestTranslationEntries(namespaceRows);
      return localeNamespaces;
    },
    {
      translation: {},
      common: {},
      matches: {},
      settings: {},
      teams: {},
    },
  );
}

export function nestTranslationEntries(
  rows: readonly Pick<ImportTranslationRow, 'key' | 'value'>[],
): Record<string, unknown> {
  const root: Record<string, unknown> = {};

  rows.forEach(row => {
    const segments = row.key.split('.');
    let pointer = root;

    segments.forEach((segment, index) => {
      const isLeaf = index === segments.length - 1;
      const existingValue = pointer[segment];

      if (isLeaf) {
        if (existingValue && isPlainObject(existingValue)) {
          throw new Error(`Cannot overwrite nested translation at "${row.key}".`);
        }
        pointer[segment] = row.value;
        return;
      }

      if (existingValue === undefined) {
        pointer[segment] = {};
      } else if (!isPlainObject(existingValue)) {
        throw new Error(`Cannot create nested translation below leaf "${row.key}".`);
      }

      pointer = pointer[segment] as Record<string, unknown>;
    });
  });

  return root;
}

function buildTranslationModuleSource(
  language: AppLanguage,
  translationNamespace: Record<string, unknown>,
): string {
  return `// Généré par scripts/i18n/mobile-import-translations.ts
export const ${language} = ${serializeTsValue(translationNamespace)} as const;
`;
}

function buildNamespaceModuleSource(
  language: AppLanguage,
  namespace: Exclude<MobileI18nNamespace, 'translation'>,
  namespaceValue: Record<string, unknown>,
): string {
  const constName = `${language}${namespace.charAt(0).toUpperCase()}${namespace.slice(1)}`;
  return `// Généré par scripts/i18n/mobile-import-translations.ts
export const ${constName} = ${serializeTsValue(namespaceValue)} as const;
`;
}

function buildLocaleIndexSource(language: AppLanguage): string {
  const commonConst = `${language}Common`;
  const matchesConst = `${language}Matches`;
  const settingsConst = `${language}Settings`;
  const teamsConst = `${language}Teams`;

  return `// Généré par scripts/i18n/mobile-import-translations.ts
import { ${language} } from '../translation.${language}';
import { ${commonConst} } from './common';
import { ${matchesConst} } from './matches';
import { ${settingsConst} } from './settings';
import { ${teamsConst} } from './teams';

export const localeNamespaces = {
  translation: ${language},
  common: ${commonConst},
  matches: ${matchesConst},
  settings: ${settingsConst},
  teams: ${teamsConst},
} as const;

export default localeNamespaces;
`;
}

export async function ensureDirectory(directoryPath: string): Promise<void> {
  await fs.mkdir(directoryPath, { recursive: true });
}

export async function writeJsonFile(
  outputPath: string,
  payload: unknown,
): Promise<void> {
  await ensureDirectory(path.dirname(outputPath));
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export async function writeLocaleModules(
  localesRoot: string,
  language: AppLanguage,
  localeNamespaces: LocaleNamespaceRecord,
): Promise<WriteLocaleModulesResult> {
  const languageDirectory = path.resolve(localesRoot, language);
  await ensureDirectory(languageDirectory);

  const translationPath = path.resolve(localesRoot, `translation.${language}.ts`);
  const commonPath = path.resolve(languageDirectory, 'common.ts');
  const matchesPath = path.resolve(languageDirectory, 'matches.ts');
  const settingsPath = path.resolve(languageDirectory, 'settings.ts');
  const teamsPath = path.resolve(languageDirectory, 'teams.ts');
  const indexPath = path.resolve(languageDirectory, 'index.ts');

  await fs.writeFile(
    translationPath,
    buildTranslationModuleSource(language, localeNamespaces.translation),
    'utf8',
  );
  await fs.writeFile(
    commonPath,
    buildNamespaceModuleSource(language, 'common', localeNamespaces.common),
    'utf8',
  );
  await fs.writeFile(
    matchesPath,
    buildNamespaceModuleSource(language, 'matches', localeNamespaces.matches),
    'utf8',
  );
  await fs.writeFile(
    settingsPath,
    buildNamespaceModuleSource(language, 'settings', localeNamespaces.settings),
    'utf8',
  );
  await fs.writeFile(
    teamsPath,
    buildNamespaceModuleSource(language, 'teams', localeNamespaces.teams),
    'utf8',
  );
  await fs.writeFile(indexPath, buildLocaleIndexSource(language), 'utf8');

  return {
    generatedFiles: [
      translationPath,
      commonPath,
      matchesPath,
      settingsPath,
      teamsPath,
      indexPath,
    ],
  };
}

export async function loadLocaleNamespaces(
  language: AppLanguage,
  localesRoot = DEFAULT_LOCALES_ROOT,
): Promise<LocaleNamespaceRecord> {
  const modulePath = path.resolve(localesRoot, language, 'index.ts');
  const resolvedModulePath = require.resolve(modulePath);

  delete require.cache[resolvedModulePath];

  const importedModule = require(resolvedModulePath);
  const localeNamespaces = importedModule.default ?? importedModule.localeNamespaces;

  if (!isPlainObject(localeNamespaces)) {
    throw new Error(`Locale module for "${language}" does not expose locale namespaces.`);
  }

  return localeNamespaces as LocaleNamespaceRecord;
}

export function compareLocaleNamespaceRecords(
  sourceLocale: LocaleNamespaceRecord,
  targetLocale: LocaleNamespaceRecord,
  language: AppLanguage,
): LocaleValidationReport {
  const namespaceReports = MOBILE_I18N_NAMESPACES.map<NamespaceValidationReport>(namespace => {
    const sourceEntries = flattenTranslations(sourceLocale[namespace] ?? {});
    const targetEntries = flattenTranslations(targetLocale[namespace] ?? {});
    const sourceMap = new Map(sourceEntries.map(entry => [entry.key, entry.value]));
    const targetMap = new Map(targetEntries.map(entry => [entry.key, entry.value]));

    const missingKeys = sourceEntries
      .filter(entry => !targetMap.has(entry.key))
      .map(entry => entry.key);
    const extraKeys = targetEntries
      .filter(entry => !sourceMap.has(entry.key))
      .map(entry => entry.key);

    const placeholderMismatches = sourceEntries.flatMap<PlaceholderMismatch>(entry => {
      const targetValue = targetMap.get(entry.key);
      if (!targetValue) {
        return [];
      }

      const sourcePlaceholders = extractPlaceholders(entry.value);
      const targetPlaceholders = extractPlaceholders(targetValue);
      if (sourcePlaceholders.join('|') === targetPlaceholders.join('|')) {
        return [];
      }

      return [
        {
          key: entry.key,
          source: sourcePlaceholders,
          target: targetPlaceholders,
        },
      ];
    });

    return {
      namespace,
      sourceKeyCount: sourceEntries.length,
      targetKeyCount: targetEntries.length,
      missingKeys,
      extraKeys,
      placeholderMismatches,
      emptyRequiredNamespace: sourceEntries.length > 0 && targetEntries.length === 0,
    };
  });

  const missingKeyCount = namespaceReports.reduce(
    (count, report) => count + report.missingKeys.length,
    0,
  );
  const extraKeyCount = namespaceReports.reduce(
    (count, report) => count + report.extraKeys.length,
    0,
  );
  const placeholderMismatchCount = namespaceReports.reduce(
    (count, report) => count + report.placeholderMismatches.length,
    0,
  );
  const emptyRequiredNamespaces = namespaceReports
    .filter(report => report.emptyRequiredNamespace)
    .map(report => report.namespace);

  return {
    language,
    availability: getLanguageAvailability(language),
    totalSourceKeys: namespaceReports.reduce(
      (count, report) => count + report.sourceKeyCount,
      0,
    ),
    totalTargetKeys: namespaceReports.reduce(
      (count, report) => count + report.targetKeyCount,
      0,
    ),
    missingKeyCount,
    extraKeyCount,
    placeholderMismatchCount,
    emptyRequiredNamespaces,
    namespaceReports,
  };
}

export function hasBlockingValidationIssues(report: LocaleValidationReport): boolean {
  return (
    report.missingKeyCount > 0 ||
    report.extraKeyCount > 0 ||
    report.placeholderMismatchCount > 0 ||
    report.emptyRequiredNamespaces.length > 0
  );
}

export function shouldFailValidation(
  report: LocaleValidationReport,
  strictAllLanguages: boolean,
): boolean {
  if (!hasBlockingValidationIssues(report)) {
    return false;
  }

  return strictAllLanguages || report.availability === 'released';
}

export function buildValidationSummary(
  reports: readonly LocaleValidationReport[],
): ValidationSummary {
  return {
    generatedAt: new Date().toISOString(),
    sourceLanguage: DEFAULT_LANGUAGE,
    releasedLanguages: RELEASED_LANGUAGE_CODES,
    reports,
  };
}

export async function readCsvFile(inputPath: string): Promise<CsvParseResult> {
  const content = await fs.readFile(inputPath, 'utf8');
  return parseCsv(content);
}

export function assertCsvHeaders(
  headers: readonly string[],
  requiredHeaders: readonly string[],
): void {
  const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing CSV headers: ${missingHeaders.join(', ')}.`);
  }
}

export async function exportEnglishSourcePack(
  outputPath = DEFAULT_EXPORT_OUTPUT_PATH,
  summaryPath = DEFAULT_EXPORT_SUMMARY_PATH,
): Promise<{
  outputPath: string;
  summaryPath: string;
  rowCount: number;
}> {
  const englishLocale = await loadLocaleNamespaces(DEFAULT_LANGUAGE);
  const rows = buildTranslationCsvRows(englishLocale);

  await ensureDirectory(path.dirname(outputPath));
  await fs.writeFile(
    outputPath,
    stringifyCsv(rows as readonly Record<string, string>[], TRANSLATION_CSV_HEADERS),
    'utf8',
  );
  await writeJsonFile(summaryPath, buildTranslationInventorySummary(rows));

  return {
    outputPath,
    summaryPath,
    rowCount: rows.length,
  };
}

export function toValidationConsoleSummary(report: LocaleValidationReport): string {
  return [
    `${report.language} (${report.availability})`,
    `missing=${report.missingKeyCount}`,
    `extra=${report.extraKeyCount}`,
    `placeholders=${report.placeholderMismatchCount}`,
    `empty_required_namespaces=${report.emptyRequiredNamespaces.length}`,
  ].join(' | ');
}

export function parseLanguageArgument(languageValue: string): AppLanguage {
  return assertIsAppLanguage(languageValue);
}
