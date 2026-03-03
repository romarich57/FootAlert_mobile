import { useTranslation } from 'react-i18next';

import { LegalDocumentPage } from './LegalDocumentPage';

const TERMS_OF_USE_BY_LOCALE = {
  fr: {
    title: "Conditions d'utilisation FootAlert",
    summary: 'Conditions applicables à l’utilisation des applications mobile et web FootAlert.',
    policyVersion: 'terms-fr-v1.0.0',
    lastUpdated: '2026-03-02',
    sections: [
      {
        title: '1. Objet du service',
        paragraphs: ['FootAlert fournit des informations et alertes football en temps quasi-réel.', 'Le service est fourni "en l’état", selon disponibilité des fournisseurs de données.'],
      },
      {
        title: '2. Usage autorisé',
        paragraphs: ['Vous vous engagez à utiliser l’application conformément aux lois applicables.', 'Toute tentative de fraude, scraping agressif, ou contournement technique peut entraîner un blocage.'],
      },
      {
        title: '3. Propriété intellectuelle',
        paragraphs: ['Le code, les contenus éditoriaux et la marque FootAlert restent protégés.', 'Certaines données sportives proviennent de fournisseurs tiers soumis à leurs propres licences.'],
      },
      {
        title: '4. Limitation de responsabilité',
        paragraphs: ['Les scores et statistiques peuvent contenir des décalages ou erreurs de source.', 'Les contenus prédictifs sont purement informatifs et ne constituent pas un conseil de pari.'],
      },
      {
        title: '5. Âge minimal',
        paragraphs: ['Le service est destiné à un public 13+.', 'Les parents ou représentants légaux sont responsables de l’usage par les mineurs.'],
      },
      {
        title: '6. Résiliation',
        paragraphs: ['Vous pouvez supprimer vos données depuis l’application mobile.', 'Nous pouvons suspendre l’accès en cas de violation manifeste des présentes conditions.'],
      },
    ],
    note: "Version en vigueur au 2 mars 2026. Une validation juridique externe est requise avant diffusion production.",
  },
  en: {
    title: 'FootAlert Terms of Use',
    summary: 'Terms governing the use of FootAlert mobile and web applications.',
    policyVersion: 'terms-en-v1.0.0',
    lastUpdated: '2026-03-02',
    sections: [
      {
        title: '1. Service scope',
        paragraphs: ['FootAlert provides near real-time football information and alerts.', 'The service is provided "as is", subject to upstream data provider availability.'],
      },
      {
        title: '2. Acceptable use',
        paragraphs: ['You agree to use the app in compliance with applicable laws.', 'Fraud attempts, abusive scraping, or technical bypasses may lead to access suspension.'],
      },
      {
        title: '3. Intellectual property',
        paragraphs: ['FootAlert code, editorial content, and brand assets remain protected.', 'Some sports data is sourced from third parties under separate licensing terms.'],
      },
      {
        title: '4. Liability limitation',
        paragraphs: ['Scores and stats may occasionally be delayed or inaccurate due to source variance.', 'Predictive content is informational only and is not betting advice.'],
      },
      {
        title: '5. Minimum age',
        paragraphs: ['The service targets a 13+ audience.', 'Parents or legal guardians remain responsible for minors using the app.'],
      },
      {
        title: '6. Termination',
        paragraphs: ['You can delete your data from the mobile app settings.', 'We may suspend access in case of material breach of these terms.'],
      },
    ],
    note: 'Effective version dated March 2, 2026. External legal review is required before production publication.',
  },
} as const;

export function TermsOfUsePage() {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('fr') ? 'fr' : 'en';

  return <LegalDocumentPage document={TERMS_OF_USE_BY_LOCALE[locale]} />;
}
