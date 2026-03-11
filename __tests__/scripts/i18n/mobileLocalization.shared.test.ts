import {
  buildLocaleNamespacesFromImportRows,
  buildTranslationCsvRows,
  compareLocaleNamespaceRecords,
  parseCsv,
  stringifyCsv,
  TRANSLATION_CSV_HEADERS,
  type LocaleNamespaceRecord,
} from '../../../scripts/i18n/shared';

const sourceLocale: LocaleNamespaceRecord = {
  translation: {
    matchDetails: {
      summary: '{{home}} vs {{away}}',
    },
    more: {
      rows: {
        language: 'Language',
      },
    },
  },
  common: {
    calendar: {
      todayShort: 'TOD',
    },
  },
  matches: {
    status: {
      live: 'LIVE',
    },
  },
  settings: {
    languageSelector: {
      title: 'Select language',
    },
  },
  teams: {},
};

describe('mobile localization shared helpers', () => {
  it('exports flattened rows with placeholder metadata', () => {
    const rows = buildTranslationCsvRows(sourceLocale);

    expect(rows).toHaveLength(5);
    expect(rows).toContainEqual(
      expect.objectContaining({
        namespace: 'translation',
        key: 'matchDetails.summary',
        en: '{{home}} vs {{away}}',
        placeholders: 'away|home',
        screen_ref: 'matchDetails',
      }),
    );
  });

  it('round-trips CSV rows through the parser', () => {
    const csv = stringifyCsv(
      buildTranslationCsvRows(sourceLocale) as readonly Record<string, string>[],
      TRANSLATION_CSV_HEADERS,
    );
    const parsed = parseCsv(csv);

    expect(parsed.headers).toEqual(TRANSLATION_CSV_HEADERS);
    expect(parsed.rows[0]?.namespace).toBe('common');
    expect(parsed.rows).toContainEqual(
      expect.objectContaining({
        namespace: 'translation',
        key: 'matchDetails.summary',
      }),
    );
  });

  it('detects missing keys, empty required namespaces and placeholder mismatches', () => {
    const importedLocale = buildLocaleNamespacesFromImportRows([
      {
        namespace: 'translation',
        key: 'matchDetails.summary',
        value: '{{home}} vs {{opponent}}',
      },
      {
        namespace: 'translation',
        key: 'more.rows.language',
        value: 'Langue',
      },
      {
        namespace: 'matches',
        key: 'status.live',
        value: 'DIRECT',
      },
    ]);

    const report = compareLocaleNamespaceRecords(sourceLocale, importedLocale, 'fr');

    expect(report.missingKeyCount).toBe(2);
    expect(report.placeholderMismatchCount).toBe(1);
    expect(report.emptyRequiredNamespaces).toEqual(['common', 'settings']);
    expect(report.namespaceReports.find(namespace => namespace.namespace === 'translation'))
      .toEqual(
        expect.objectContaining({
          missingKeys: [],
          placeholderMismatches: [
            {
              key: 'matchDetails.summary',
              source: ['away', 'home'],
              target: ['home', 'opponent'],
            },
          ],
        }),
      );
  });
});
