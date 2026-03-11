import path from 'node:path';

import {
  DEFAULT_I18N_ARTIFACTS_DIR,
  DEFAULT_LOCALES_ROOT,
  assertCsvHeaders,
  assertStringOption,
  buildLocaleNamespacesFromImportRows,
  compareLocaleNamespaceRecords,
  ensureDirectory,
  hasBlockingValidationIssues,
  loadLocaleNamespaces,
  parseCliArgs,
  parseLanguageArgument,
  readCsvFile,
  resolveCliPath,
  resolveImportValueColumn,
  toImportTranslationRows,
  toValidationConsoleSummary,
  writeJsonFile,
  writeLocaleModules,
} from './shared.ts';

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));
  const language = parseLanguageArgument(
    assertStringOption(args, 'language', 'Missing required option --language=<code>.'),
  );
  const inputPath = resolveCliPath(
    assertStringOption(args, 'input', 'Missing required option --input=<csv-path>.'),
    '',
  );
  const localesRoot = resolveCliPath(args['locales-root'], DEFAULT_LOCALES_ROOT);
  const reportPath = resolveCliPath(
    args.output,
    path.resolve(DEFAULT_I18N_ARTIFACTS_DIR, `import-${language}.qa.json`),
  );

  const csv = await readCsvFile(inputPath);
  assertCsvHeaders(csv.headers, ['namespace', 'key']);

  const explicitValueColumn =
    typeof args['value-column'] === 'string' ? args['value-column'] : undefined;
  const valueColumn = resolveImportValueColumn(csv.headers, language, explicitValueColumn);
  const importRows = toImportTranslationRows(csv.rows, valueColumn);
  const importedLocale = buildLocaleNamespacesFromImportRows(importRows);
  const englishLocale = await loadLocaleNamespaces('en');
  const beforeImport = compareLocaleNamespaceRecords(englishLocale, importedLocale, language);

  if (hasBlockingValidationIssues(beforeImport)) {
    throw new Error(
      `Import payload for ${language} is incomplete: ${toValidationConsoleSummary(beforeImport)}.`,
    );
  }

  const writeResult = await writeLocaleModules(localesRoot, language, importedLocale);
  const persistedLocale = await loadLocaleNamespaces(language, localesRoot);
  const afterImport = compareLocaleNamespaceRecords(englishLocale, persistedLocale, language);

  if (hasBlockingValidationIssues(afterImport)) {
    throw new Error(
      `Generated locale files for ${language} do not validate: ${toValidationConsoleSummary(afterImport)}.`,
    );
  }

  await ensureDirectory(path.dirname(reportPath));
  await writeJsonFile(reportPath, {
    generatedAt: new Date().toISOString(),
    inputPath,
    valueColumn,
    beforeImport,
    afterImport,
    generatedFiles: writeResult.generatedFiles,
  });

  console.log(
    `[i18n:import] ${language} imported from ${inputPath}. QA report: ${reportPath}`,
  );

  process.exit(0);
}

main().catch(error => {
  console.error('[i18n:import] failed');
  console.error(error);
  process.exit(1);
});
