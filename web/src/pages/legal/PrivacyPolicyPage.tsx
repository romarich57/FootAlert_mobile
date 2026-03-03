import { useTranslation } from 'react-i18next';

import { LegalDocumentPage } from './LegalDocumentPage';

const PRIVACY_POLICY_BY_LOCALE = {
  fr: {
    title: 'Politique de confidentialité FootAlert',
    summary:
      "FootAlert traite uniquement les données nécessaires au fonctionnement de l'app et des notifications.",
    policyVersion: 'privacy-fr-v1.0.0',
    lastUpdated: '2026-03-02',
    sections: [
      {
        title: '1. Données traitées',
        paragraphs: [
          "Nous utilisons un identifiant technique d'appareil (auth_subject), des tokens push chiffrés, et des préférences de notifications.",
          'Aucune création de compte utilisateur n’est requise dans cette version du produit.',
        ],
      },
      {
        title: '2. Finalités',
        paragraphs: ['Les données servent à sécuriser les sessions mobiles, délivrer les notifications choisies, et protéger la plateforme.'],
      },
      {
        title: '3. Base légale',
        paragraphs: ['Exécution du service demandé et intérêt légitime de sécurité.', 'Les usages publicitaires non essentiels restent désactivés tant que le consentement explicite n’est pas collecté.'],
      },
      {
        title: '4. Durées et minimisation',
        paragraphs: ['Les journaux techniques sont minimisés et conservés pour une durée limitée.', 'Les données liées aux notifications sont supprimables à tout moment depuis le menu "Supprimer mes données".'],
      },
      {
        title: '5. Vos droits',
        paragraphs: ['Vous disposez des droits d’accès, de rectification, de limitation et d’effacement.', 'Le droit à l’effacement (RGPD art. 17) est disponible en self-service sur mobile.'],
      },
      {
        title: '6. Contact',
        paragraphs: ['Contact support: support@footalert.example'],
      },
      {
        title: '7. Positionnement contenu',
        paragraphs: ['FootAlert fournit un contenu sportif informatif 13+.', 'Les prédictions ne constituent pas un conseil de pari.'],
      },
    ],
    note: "Ce document est une base opérationnelle de conformité et ne remplace pas un avis juridique personnalisé.",
  },
  en: {
    title: 'FootAlert Privacy Policy',
    summary:
      'FootAlert only processes data required to run the app and send user-selected notifications.',
    policyVersion: 'privacy-en-v1.0.0',
    lastUpdated: '2026-03-02',
    sections: [
      {
        title: '1. Data we process',
        paragraphs: [
          'We use a technical device subject identifier (auth_subject), encrypted push tokens, and notification preferences.',
          'No end-user account is required in the current product version.',
        ],
      },
      {
        title: '2. Purposes',
        paragraphs: ['Data is used to secure mobile sessions, deliver selected alerts, and protect platform integrity.'],
      },
      {
        title: '3. Legal basis',
        paragraphs: ['Service delivery and legitimate security interests.', 'Non-essential advertising or analytics remains disabled until explicit consent is collected.'],
      },
      {
        title: '4. Retention and minimization',
        paragraphs: ['Technical logs are minimized and kept for limited periods.', 'Notification-bound data can be deleted at any time from the "Delete my data" action in mobile settings.'],
      },
      {
        title: '5. Your rights',
        paragraphs: ['You have rights of access, rectification, restriction, and erasure.', 'GDPR Art. 17 erasure is available as a self-service mobile flow.'],
      },
      {
        title: '6. Contact',
        paragraphs: ['Support contact: support@footalert.example'],
      },
      {
        title: '7. Content positioning',
        paragraphs: ['FootAlert provides informational 13+ sports content.', 'Predictions are informational only and are not betting advice.'],
      },
    ],
    note: 'This document is an operational compliance baseline and is not legal advice.',
  },
} as const;

export function PrivacyPolicyPage() {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('fr') ? 'fr' : 'en';

  return <LegalDocumentPage document={PRIVACY_POLICY_BY_LOCALE[locale]} />;
}
