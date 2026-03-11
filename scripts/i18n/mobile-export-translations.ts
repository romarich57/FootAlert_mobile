import {
  DEFAULT_EXPORT_OUTPUT_PATH,
  DEFAULT_EXPORT_SUMMARY_PATH,
  exportEnglishSourcePack,
  parseCliArgs,
  resolveCliPath,
} from './shared.ts';

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));
  const outputPath = resolveCliPath(args.output, DEFAULT_EXPORT_OUTPUT_PATH);
  const summaryPath = resolveCliPath(args.summary, DEFAULT_EXPORT_SUMMARY_PATH);

  const result = await exportEnglishSourcePack(outputPath, summaryPath);

  console.log(
    `[i18n:export] ${result.rowCount} rows written to ${result.outputPath} (summary: ${result.summaryPath})`,
  );

  process.exit(0);
}

main().catch(error => {
  console.error('[i18n:export] failed');
  console.error(error);
  process.exit(1);
});
