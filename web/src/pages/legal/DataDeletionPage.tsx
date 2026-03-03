import { useTranslation } from 'react-i18next';

import { LegalDocumentPage } from './LegalDocumentPage';

const DATA_DELETION_BY_LOCALE = {
  fr: {
    title: 'Suppression des données (RGPD Art. 17)',
    summary: 'Procédure self-service de suppression des données liées à un appareil mobile.',
    policyVersion: 'data-deletion-fr-v1.0.0',
    lastUpdated: '2026-03-02',
    sections: [
      {
        title: '1. Accès depuis l’app',
        paragraphs: ['Dans l’application mobile, ouvrez Plus > Supprimer mes données.', 'Une confirmation explicite est demandée avant exécution.'],
      },
      {
        title: '2. Vérification de sécurité',
        paragraphs: ['La suppression exige un jeton de session valide, un challenge frais et une preuve d’attestation mobile récente.'],
      },
      {
        title: '3. Périmètre supprimé',
        paragraphs: ['Les sessions refresh et données push associées à l’auth_subject sont supprimées.', 'La réponse API ne divulgue pas de compteurs internes sensibles.'],
      },
      {
        title: '4. Preuve et audit',
        paragraphs: ['Chaque requête crée une trace d’audit pseudonymisée basée sur un hash de sujet.', 'Aucune donnée personnelle brute n’est stockée dans la table d’audit.'],
      },
    ],
    note: 'En cas de difficulté, contactez support@footalert.example.',
  },
  en: {
    title: 'Data Deletion (GDPR Art. 17)',
    summary: 'Self-service flow to erase mobile device-bound data.',
    policyVersion: 'data-deletion-en-v1.0.0',
    lastUpdated: '2026-03-02',
    sections: [
      {
        title: '1. In-app access',
        paragraphs: ['In the mobile app, open More > Delete my data.', 'An explicit confirmation step is required before execution.'],
      },
      {
        title: '2. Security verification',
        paragraphs: ['Deletion requires a valid session bearer token, a fresh challenge, and recent mobile attestation proof.'],
      },
      {
        title: '3. Deletion scope',
        paragraphs: ['Refresh sessions and push-related records linked to the auth_subject are removed.', 'The API response does not expose sensitive internal counters.'],
      },
      {
        title: '4. Evidence and audit',
        paragraphs: ['Each request writes a pseudonymized audit record using a subject hash.', 'No raw personal subject identifier is stored in the audit table.'],
      },
    ],
    note: 'If needed, contact support@footalert.example.',
  },
} as const;

export function DataDeletionPage() {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('fr') ? 'fr' : 'en';

  return <LegalDocumentPage document={DATA_DELETION_BY_LOCALE[locale]} />;
}
