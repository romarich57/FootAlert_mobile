import {
  RELEASED_LANGUAGE_CODES,
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGE_CODES,
} from '../../src/shared/i18n/languages';
import {
  buildValidationSummary,
  compareLocaleNamespaceRecords,
  DEFAULT_VALIDATION_OUTPUT_PATH,
  loadLocaleNamespaces,
  parseCliArgs,
  parseLanguageArgument,
  resolveCliPath,
  shouldFailValidation,
  toValidationConsoleSummary,
  writeJsonFile,
} from './shared.ts';

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));
  const strictAllLanguages = Boolean(args['strict-all']);
  const reportPath = resolveCliPath(args.output, DEFAULT_VALIDATION_OUTPUT_PATH);
  const targetLanguages =
    typeof args.language === 'string'
      ? [parseLanguageArgument(args.language)]
      : [...SUPPORTED_LANGUAGE_CODES];

  const englishLocale = await loadLocaleNamespaces(DEFAULT_LANGUAGE);
  const reports = await Promise.all(
    targetLanguages.map(async language => {
      const locale = await loadLocaleNamespaces(language);
      return compareLocaleNamespaceRecords(englishLocale, locale, language);
    }),
  );

  await writeJsonFile(reportPath, buildValidationSummary(reports));

  reports.forEach(report => {
    console.log(`[i18n:validate] ${toValidationConsoleSummary(report)}`);
  });

  const failingReports = reports.filter(report =>
    shouldFailValidation(report, strictAllLanguages),
  );

  if (failingReports.length > 0) {
    const failingLanguages = failingReports.map(report => report.language).join(', ');
    throw new Error(
      `Validation failed for ${failingLanguages}. Released languages must be complete; use --strict-all to enforce every locale.`,
    );
  }

  console.log(
    `[i18n:validate] report written to ${reportPath}. Released languages checked: ${RELEASED_LANGUAGE_CODES.join(', ')}`,
  );

  process.exit(0);
}

main().catch(error => {
  console.error('[i18n:validate] failed');
  console.error(error);
  process.exit(1);
});
