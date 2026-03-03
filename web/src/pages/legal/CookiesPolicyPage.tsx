import { useTranslation } from 'react-i18next';

import { LegalDocumentPage } from './LegalDocumentPage';

const COOKIES_POLICY_BY_LOCALE = {
  fr: {
    title: 'Politique cookies FootAlert Web',
    summary: 'Version web en mode no-tracker: uniquement des usages techniques nécessaires.',
    policyVersion: 'cookies-fr-v1.0.0',
    lastUpdated: '2026-03-02',
    sections: [
      {
        title: '1. Principe',
        paragraphs: ['Le site web FootAlert n’active aucun script publicitaire ni analytics tiers dans cette version.', 'Aucune CMP web n’est affichée tant qu’aucun traceur non essentiel n’est déployé.'],
      },
      {
        title: '2. Stockage local technique',
        paragraphs: ['Le navigateur peut stocker des préférences strictement techniques (ex: langue).', 'Ces éléments sont nécessaires au fonctionnement attendu de l’interface.'],
      },
      {
        title: '3. Traceurs non essentiels',
        paragraphs: ['Tout futur ajout de traceurs non essentiels déclenchera un recueil de consentement préalable.'],
      },
    ],
    note: "Contrôle CI actif: l'introduction de scripts analytics/ads tiers sans validation explicite échoue.",
  },
  en: {
    title: 'FootAlert Web Cookie Policy',
    summary: 'Web currently runs in no-tracker mode with strictly necessary technical storage only.',
    policyVersion: 'cookies-en-v1.0.0',
    lastUpdated: '2026-03-02',
    sections: [
      {
        title: '1. Principle',
        paragraphs: ['FootAlert web currently runs without third-party analytics or advertising scripts.', 'No web CMP is displayed while non-essential trackers remain disabled.'],
      },
      {
        title: '2. Technical local storage',
        paragraphs: ['Your browser may store strictly technical preferences (for example language).', 'These items are required for expected interface behavior.'],
      },
      {
        title: '3. Non-essential trackers',
        paragraphs: ['Any future non-essential tracker rollout will require prior consent collection.'],
      },
    ],
    note: 'CI enforcement is active: adding third-party analytics/ads scripts without explicit approval fails checks.',
  },
} as const;

export function CookiesPolicyPage() {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('fr') ? 'fr' : 'en';

  return <LegalDocumentPage document={COOKIES_POLICY_BY_LOCALE[locale]} />;
}
