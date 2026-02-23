export const fr = {
  tabs: {
    matches: 'Matchs',
    competitions: 'Ligues',
    follows: 'Suivis',
    more: 'Plus',
  },
  actions: {
    retry: 'Réessayer',
    cancel: 'Annuler',
    save: 'Enregistrer',
  },
  placeholders: {
    inProgress: 'Section en cours d’implémentation',
    inProgressSubtitle:
      'Cette section sera disponible dans une prochaine itération produit.',
  },
  notifications: {
    match: {
      title: 'Choix des notifications du match',
      options: {
        goal: 'Buts',
        redCard: 'Cartons rouges',
        start: 'Début de match',
        end: 'Fin de match',
      },
    },
  },
  matches: {
    liveLabel: 'EN DIRECT',
    topCompetitionBadge: 'TOP',
    followsSectionTitle: 'Suivis',
    followsEmpty: 'Aucun match lié à vos suivis pour le moment.',
    demoFallback: {
      title: 'Mode démo activé',
      message:
        'Affichage d’un exemple de matchs et scores (API indisponible, quota atteint ou mode démo).',
    },
    filters: {
      all: 'Tous',
      live: 'Live',
      upcoming: 'À venir',
      finished: 'Terminé',
    },
    status: {
      upcoming: 'À venir',
    },
    broadcast: {
      available: 'Diffusion disponible',
      unknown: 'Diffusion non confirmée',
    },
    partner: {
      label: 'Contenu partenaire',
      message: 'Obtenez le pass saisonnier avec 20% de réduction.',
      cta: 'Découvrir',
    },
    states: {
      loading: {
        title: 'Chargement des matchs',
        message: 'Récupération des données en cours.',
      },
      empty: {
        title: 'Aucun match',
        message: 'Aucun match disponible pour cette date ou ce filtre.',
      },
      error: {
        title: 'Impossible de charger les matchs',
        message: 'API indisponible, quota atteint ou erreur réseau.',
      },
      offline: {
        title: 'Mode hors ligne',
        message: 'Affichage des dernières données en cache.',
        lastUpdate: 'Dernière mise à jour : {{value}}',
      },
      slow: {
        title: 'Réseau lent détecté',
        message: 'Le rafraîchissement passe temporairement en fréquence réduite.',
      },
    },
  },
  matchDetails: {
    labels: {
      status: 'Statut',
      kickoff: "Coup d'envoi",
      venue: 'Stade',
    },
    states: {
      loading: 'Chargement des détails du match...',
      error: 'Impossible de charger les détails du match.',
    },
  },
  follows: {
    title: 'Suivis',
    tabs: {
      teams: 'Équipes',
      players: 'Joueurs',
    },
    actions: {
      follow: 'Suivre',
      unfollow: 'Ne plus suivre',
      edit: 'Modifier',
      done: 'Terminer',
    },
    cards: {
      addToFavorites: 'Ajouter aux favoris',
      noNextMatch: 'Aucun prochain match',
      goals: 'Buts',
      assists: 'Passes',
    },
    trends: {
      title: 'Tendances',
      hide: 'Ne plus afficher',
      show: 'Afficher',
    },
    states: {
      loading: 'Chargement en cours...',
      noTrends: 'Aucune tendance disponible pour le moment.',
    },
    search: {
      title: 'Recherche',
      openSearch: 'Ouvrir la recherche',
      back: 'Retour',
      placeholderTeams: 'Rechercher une équipe',
      placeholderPlayers: 'Rechercher un joueur',
      minChars: 'Saisissez au moins {{count}} caractères.',
      loading: 'Recherche en cours...',
      empty: 'Aucun résultat trouvé.',
    },
    errors: {
      maxTeams: 'Limite atteinte: {{count}} équipes maximum.',
      maxPlayers: 'Limite atteinte: {{count}} joueurs maximum.',
    },
  },
  teamDetails: {
    actions: {
      back: 'Retour',
      follow: 'Suivre',
      unfollow: 'Suivi',
    },
    tabs: {
      overview: 'Aperçu',
      matches: 'Matchs',
      standings: 'Classement',
      stats: 'Statistiques',
      transfers: 'Transferts',
      squad: 'Effectif',
      trophies: 'Trophées',
    },
    filters: {
      competition: 'Compétition',
      season: 'Saison',
    },
    states: {
      loading: 'Chargement des données API...',
      error: 'Impossible de charger les données API.',
      empty: 'Aucune donnée API',
      noSelection: 'Aucune compétition/saison disponible pour ce club.',
    },
    overview: {
      nextMatch: 'Prochain match',
      recentForm: '5 derniers matchs',
      seasonStats: 'Stats saison',
      clubInfo: 'Infos club',
    },
    matches: {
      liveSection: 'Matchs en cours',
      upcomingSection: 'Matchs à venir',
      pastSection: 'Matchs passés',
      filters: {
        all: 'Tous',
        home: 'Domicile',
        away: 'Extérieur',
      },
    },
    stats: {
      pointsCard: 'Points',
      goalsBreakdown: 'Répartition des buts',
      topPlayers: 'Meilleurs joueurs',
    },
    transfers: {
      arrivals: 'Arrivées',
      departures: 'Départs',
    },
    squad: {
      searchPlaceholder: 'Rechercher un joueur',
      coach: 'Entraîneur',
      roles: {
        all: 'Tout',
        goalkeepers: 'Gardiens',
        defenders: 'Défenseurs',
        midfielders: 'Milieux',
        attackers: 'Attaquants',
        other: 'Autres',
      },
    },
    trophies: {
      title: 'Palmarès',
    },
    labels: {
      rank: 'Rang',
      points: 'Pts',
      played: 'J',
      goalDiff: 'DB',
      stadium: 'Stade',
      capacity: 'Capacité',
      trophies: 'Trophées',
      team: 'Équipe',
      goalsForAgainst: 'Buts +/-',
      rating: 'Note',
      transferType: 'Type',
      age: 'Âge',
      yearsSuffix: 'ans',
      totalTrophies: 'Total trophées',
      totalWins: 'Titres gagnés',
    },
  },
  competitionDetails: {
    tabs: {
      standings: 'Classement',
      matches: 'Matchs',
      playerStats: 'Stats joueurs',
      teamStats: 'Stats équipes',
      transfers: 'Transferts',
      totw: 'Équipe de la semaine',
      seasons: 'Saisons',
    },
    states: {
      loading: 'Chargement des données API...',
      loadError: 'Impossible de charger les données de la compétition.',
    },
    labels: {
      season: 'Saison {{start}}/{{end}}',
    },
    teamStats: {
      bestAttack: 'Meilleure attaque',
      bestDefense: 'Meilleure défense',
      goalsScoredRanking: 'Classement buts marqués',
      goalsConcededRanking: 'Classement buts encaissés',
      unavailable: 'Statistiques non disponibles',
    },
    matches: {
      unavailable: 'Matchs non disponibles',
      finished: 'Terminé',
      status: {
        rank: '#',
        team: 'ÉQUIPE',
        played: 'J',
        goalDiff: 'DB',
        points: 'PTS',
        form: 'FORME',
      },
    },
    standings: {
      unavailable: 'Classement non disponible',
      defaultGroup: 'Classement',
      table: {
        rank: '#',
        team: 'ÉQUIPE',
        played: 'J',
        goalDiff: 'DB',
        points: 'PTS',
        form: 'FORME',
      },
    },
    seasons: {
      unavailable: 'Saisons non disponibles',
      history: 'Historique des saisons',
      label: 'Saison {{start}}/{{end}}',
      current: '(En cours)',
    },
    playerStats: {
      unavailable: 'Statistiques non disponibles pour cette saison.',
      rankingTitle: 'Classement - {{label}}',
      statTypes: {
        goals: 'Buteurs',
        assists: 'Passeurs',
        yellowCards: 'Cartons jaunes',
        redCards: 'Cartons rouges',
      },
      statLabels: {
        goals: 'Buts',
        assists: 'Passes déc.',
        yellowCards: 'Cartons',
        redCards: 'Cartons',
      },
    },
    transfers: {
      unavailable:
        "Les transferts globaux d'une ligue ne sont pas disponibles via l'API (limitation endpoint).",
      notImplemented:
        "Le flux transferts est disponible mais son affichage détaillé n'est pas encore implémenté.",
    },
    totw: {
      title: 'Équipe de la semaine',
      unavailable:
        "L'Équipe de la semaine n'est pas disponible pour cette compétition à cause des limites de l'API.",
    },
  },
  playerDetails: {
    tabs: {
      profile: 'Profil',
      matches: 'Matchs',
      stats: 'Stats',
      career: 'Carrière',
    },
    profile: {
      labels: {
        height: 'Taille',
        age: 'Âge',
        country: 'Pays',
        dominantFoot: 'Pied fort',
        marketValue: 'Valeur marchande',
        season: 'Saison {{start}}/{{end}}',
        matches: 'Matchs',
        goals: 'Buts',
        assists: 'Passes D.',
        characteristics: 'Caractéristiques',
      },
      units: {
        centimeters: 'cm',
        years: 'ans',
      },
    },
    stats: {
      labels: {
        goals: 'Buts',
        assists: 'Passes',
        rating: 'Note',
        matches: 'Matchs',
        starts: 'Titularisations',
        minutes: 'Min.',
        shots: 'Tirs',
        xg: 'xG',
        shotDetails: 'Détails des tirs',
        seasonShotMap: 'Carte des tirs de la saison',
        accuracy: 'précision',
      },
    },
    matches: {
      labels: {
        recentMatches: 'Matchs récents',
        filters: 'Filtres',
        yellowCard: 'Carton jaune',
        redCard: 'Carton rouge',
        rating: 'NOTE',
      },
      badges: {
        goals: '{{count}} But',
        goals_plural: '{{count}} Buts',
        assists: '{{count}} Passe',
        assists_plural: '{{count}} Passes',
      },
    },
    career: {
      tabs: {
        season: 'Saison',
        team: 'Équipe',
      },
      table: {
        logo: 'LOGO',
        season: 'SAISON',
        matches: 'M',
        goals: 'B',
        assists: 'P',
        rating: 'NOTE',
      },
      labels: {
        seeAllSeasons: 'Voir toutes les saisons',
        professionalCareer: 'Carrière professionnelle',
        matchesPlayed: 'MATCHS JOUÉS',
        goals: 'BUTS',
      },
    },
    states: {
      loadError: 'Impossible de charger le joueur.',
    },
  },
  playerPositions: {
    goalkeeper: 'Gardien',
    defender: 'Défenseur',
    midfielder: 'Milieu',
    attacker: 'Attaquant',
    forward: 'Avant-centre',
    centerBack: 'Défenseur central',
    leftBack: 'Arrière gauche',
    rightBack: 'Arrière droit',
    wingBack: 'Piston',
    defensiveMidfielder: 'Milieu défensif',
    centralMidfielder: 'Milieu central',
    attackingMidfielder: 'Milieu offensif',
    leftMidfielder: 'Milieu gauche',
    rightMidfielder: 'Milieu droit',
    leftWinger: 'Ailier gauche',
    rightWinger: 'Ailier droit',
    striker: 'Buteur',
    secondStriker: 'Second attaquant',
    centreForward: 'Avant-centre',
  },
  more: {
    title: 'Plus',
    sections: {
      preferences: 'Préférences',
      information: 'Informations',
    },
    states: {
      loading: 'Chargement des préférences...',
    },
    rows: {
      theme: 'Thème',
      language: 'Langue',
      currency: 'Devise',
      measurement: 'Système de mesures',
      notifications: 'Notifications',
      followUs: 'Suivez-nous',
      tipsSupport: 'Astuces et assistance',
      privacyPolicy: 'Politique de confidentialité',
      rateApp: "Noter l'application",
      appVersion: "Version de l'application",
    },
    values: {
      theme: {
        system: 'Système',
        light: 'Clair',
        dark: 'Sombre',
      },
      language: {
        fr: 'Français',
        en: 'Anglais',
      },
      measurement: {
        metric: 'Métrique',
        imperial: 'Impérial',
      },
      notifications: {
        on: 'Activées',
        off: 'Désactivées',
      },
    },
    badges: {
      comingSoon: 'Bientôt disponible',
    },
    modals: {
      selectTheme: 'Choisir un thème',
      selectLanguage: 'Choisir une langue',
      selectCurrency: 'Choisir une devise',
      selectMeasurement: 'Choisir un système de mesures',
    },
    currency: {
      searchPlaceholder: 'Rechercher une devise',
    },
    notifications: {
      permissionDenied:
        "Les notifications ne sont pas autorisées. Activez-les dans les réglages système.",
      openSettings: 'Ouvrir les réglages',
    },
  },
  screens: {
    matches: {
      title: 'Matchs',
      subtitle: 'Écran principal des matchs',
    },
    competitions: {
      title: 'Ligues',
      subtitle: 'Catalogue, classements et statistiques.',
      searchPlaceholder: 'Rechercher des ligues',
      follows: 'Suivis',
      edit: 'Modifier',
      suggested: 'Suggérés',
      follow: 'Suivre',
      unfollow: 'Ne plus suivre',
      allCompetitions: 'Toutes les compétitions',
      loading: 'Chargement des compétitions...',
      emptyFollowed: 'Aucune compétition suivie.',
    },
    follows: {
      title: 'Suivis',
      subtitle: 'Suivez joueurs et équipes sans créer de compte.',
    },
    more: {
      title: 'Plus',
      subtitle: 'Paramètres, langue, notifications et cache.',
    },
    search: {
      title: 'Recherche',
    },
  },
} as const;
