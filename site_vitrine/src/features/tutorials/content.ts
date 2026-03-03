export type TutorialStep = {
  id: string;
  title: string;
  description: string;
  points: string[];
};

export const tutorialSteps: TutorialStep[] = [
  {
    id: 'onboarding',
    title: '1. Démarrage rapide',
    description:
      'Configure ton profil en moins de 2 minutes pour recevoir les informations qui t’intéressent vraiment.',
    points: [
      'Choisir tes équipes et compétitions favorites',
      'Activer les rappels de match importants',
      'Définir le fuseau horaire pour les coups d’envoi',
    ],
  },
  {
    id: 'follow',
    title: '2. Suivre un match intelligemment',
    description:
      'Accède aux scores essentiels en direct, sans te noyer dans les détails inutiles.',
    points: [
      'Lecture instantanée du score domicile/extérieur',
      'Statut de match clair (NS, HT, FT, etc.)',
      'Mise à jour régulière pour rester synchronisé',
    ],
  },
  {
    id: 'notifications',
    title: '3. Notifications ciblées',
    description:
      'Reste informé au bon moment avec des notifications utiles et personnalisées.',
    points: [
      'Alertes but, mi-temps, fin de match',
      'Paramétrage par équipe/compétition',
      'Contrôle complet depuis les réglages',
    ],
  },
  {
    id: 'privacy',
    title: '4. Confidentialité maîtrisée',
    description:
      'Le cadre légal est transparent: politiques publiques, accès direct depuis l’app.',
    points: [
      'Politique de confidentialité publique',
      'Conditions d’utilisation accessibles',
      'Canal support clair pour toute demande',
    ],
  },
];
