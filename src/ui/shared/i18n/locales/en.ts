export const en = {
  tabs: {
    matches: 'Matches',
    competitions: 'Competitions',
    follows: 'Follows',
    more: 'More',
  },
  actions: {
    retry: 'Retry',
    cancel: 'Cancel',
    save: 'Save',
  },
  placeholders: {
    inProgress: 'Section in progress',
    inProgressSubtitle: 'This section will be available in a next product iteration.',
  },
  notifications: {
    match: {
      title: 'Match notification options',
      options: {
        goal: 'Goals',
        redCard: 'Red cards',
        start: 'Match start',
        end: 'Match end',
      },
    },
  },
  matches: {
    liveLabel: 'LIVE',
    topCompetitionBadge: 'TOP',
    followsSectionTitle: 'Follows',
    followsEmpty: 'No followed match available yet.',
    demoFallback: {
      title: 'Demo mode enabled',
      message:
        'Showing sample matches and scores (API unavailable, quota reached or demo mode).',
    },
    filters: {
      all: 'All',
      live: 'Live',
      upcoming: 'Upcoming',
      finished: 'Finished',
    },
    status: {
      upcoming: 'Upcoming',
    },
    broadcast: {
      available: 'Broadcast available',
      unknown: 'Broadcast unknown',
    },
    partner: {
      label: 'Sponsored content',
      message: 'Get a season pass with a 20% discount.',
      cta: 'Discover',
    },
    states: {
      loading: {
        title: 'Loading matches',
        message: 'Fetching live football data.',
      },
      empty: {
        title: 'No match found',
        message: 'No match available for this date or filter.',
      },
      error: {
        title: 'Could not load matches',
        message: 'API is down, quota reached or network issue.',
      },
      offline: {
        title: 'Offline mode',
        message: 'Showing the latest cached data.',
        lastUpdate: 'Last update: {{value}}',
      },
      slow: {
        title: 'Slow network detected',
        message: 'Refresh cadence was temporarily reduced.',
      },
    },
  },
  matchDetails: {
    labels: {
      status: 'Status',
      kickoff: 'Kickoff',
      venue: 'Venue',
    },
    states: {
      loading: 'Loading match details...',
      error: 'Unable to load match details.',
    },
  },
  follows: {
    title: 'Follows',
    tabs: {
      teams: 'Teams',
      players: 'Players',
    },
    actions: {
      follow: 'Follow',
      unfollow: 'Unfollow',
      edit: 'Edit',
      done: 'Done',
    },
    cards: {
      addToFavorites: 'Add to favorites',
      noNextMatch: 'No upcoming match',
      goals: 'Goals',
      assists: 'Assists',
    },
    trends: {
      title: 'Trending',
      hide: 'Hide',
      show: 'Show',
    },
    states: {
      loading: 'Loading data...',
      noTrends: 'No trending item available for now.',
    },
    search: {
      title: 'Search',
      openSearch: 'Open search',
      back: 'Back',
      placeholderTeams: 'Search a team',
      placeholderPlayers: 'Search a player',
      minChars: 'Type at least {{count}} characters.',
      loading: 'Searching...',
      empty: 'No result found.',
    },
    errors: {
      maxTeams: 'Limit reached: max {{count}} teams.',
      maxPlayers: 'Limit reached: max {{count}} players.',
    },
  },
  teamDetails: {
    actions: {
      back: 'Back',
      follow: 'Follow',
      unfollow: 'Following',
    },
    tabs: {
      overview: 'Overview',
      matches: 'Matches',
      standings: 'Standings',
      stats: 'Stats',
      transfers: 'Transfers',
      squad: 'Squad',
      trophies: 'Trophies',
    },
    filters: {
      competition: 'Competition',
      season: 'Season',
    },
    states: {
      loading: 'Loading API data...',
      error: 'Unable to load API data.',
      empty: 'No API data',
      noSelection: 'No competition/season available for this club.',
    },
    overview: {
      nextMatch: 'Next match',
      recentForm: 'Last 5 matches',
      seasonStats: 'Season stats',
      clubInfo: 'Club info',
    },
    matches: {
      liveSection: 'Live matches',
      upcomingSection: 'Upcoming matches',
      pastSection: 'Past matches',
      filters: {
        all: 'All',
        home: 'Home',
        away: 'Away',
      },
    },
    stats: {
      pointsCard: 'Points',
      goalsBreakdown: 'Goals breakdown',
      topPlayers: 'Top players',
    },
    transfers: {
      arrivals: 'Arrivals',
      departures: 'Departures',
    },
    squad: {
      searchPlaceholder: 'Search player',
      coach: 'Coach',
      roles: {
        all: 'All',
        goalkeepers: 'Goalkeepers',
        defenders: 'Defenders',
        midfielders: 'Midfielders',
        attackers: 'Attackers',
        other: 'Other',
      },
    },
    trophies: {
      title: 'Honours',
    },
    labels: {
      rank: 'Rank',
      points: 'Pts',
      played: 'P',
      goalDiff: 'GD',
      stadium: 'Stadium',
      capacity: 'Capacity',
      trophies: 'Trophies',
      team: 'Team',
      goalsForAgainst: 'Goals +/-',
      rating: 'Rating',
      transferType: 'Type',
      age: 'Age',
      yearsSuffix: 'y',
      totalTrophies: 'Total trophies',
      totalWins: 'Won titles',
    },
  },
  competitionDetails: {
    tabs: {
      standings: 'Standings',
      matches: 'Matches',
      playerStats: 'Player stats',
      teamStats: 'Team stats',
      transfers: 'Transfers',
      totw: 'Team of the Week',
      seasons: 'Seasons',
    },
    states: {
      loading: 'Loading API data...',
      loadError: 'Unable to load competition data.',
    },
    transfers: {
      unavailable:
        'League-wide transfer data is not available from the API (endpoint limitation).',
      notImplemented:
        'Transfer feed available but detailed rendering is not implemented yet.',
    },
    totw: {
      title: 'Team of the Week',
      unavailable:
        'Team of the Week is not available for this competition due to API limits.',
    },
  },
  playerDetails: {
    states: {
      loadError: 'Unable to load player data.',
    },
  },
  more: {
    title: 'More',
    sections: {
      preferences: 'Preferences',
      information: 'Information',
    },
    states: {
      loading: 'Loading preferences...',
    },
    rows: {
      theme: 'Theme',
      language: 'Language',
      currency: 'Currency',
      measurement: 'Measurement system',
      notifications: 'Notifications',
      followUs: 'Follow us',
      tipsSupport: 'Tips & support',
      privacyPolicy: 'Privacy policy',
      appVersion: 'App version',
    },
    values: {
      theme: {
        system: 'System',
        light: 'Light',
        dark: 'Dark',
      },
      language: {
        fr: 'French',
        en: 'English',
      },
      measurement: {
        metric: 'Metric',
        imperial: 'Imperial',
      },
      notifications: {
        on: 'Enabled',
        off: 'Disabled',
      },
    },
    badges: {
      comingSoon: 'Coming soon',
    },
    modals: {
      selectTheme: 'Select a theme',
      selectLanguage: 'Select a language',
      selectCurrency: 'Select a currency',
      selectMeasurement: 'Select a measurement system',
    },
    currency: {
      searchPlaceholder: 'Search currency',
    },
    notifications: {
      permissionDenied:
        'Notifications are not allowed. Enable them in system settings.',
      openSettings: 'Open settings',
    },
  },
  screens: {
    matches: {
      title: 'Matches',
      subtitle: 'Main matches screen',
    },
    competitions: {
      title: 'Competitions',
      subtitle: 'League catalog, standings and statistics',
      searchPlaceholder: 'Search leagues',
      follows: 'Follows',
      edit: 'Edit',
      suggested: 'Suggested',
      follow: 'Follow',
      unfollow: 'Unfollow',
      allCompetitions: 'All competitions',
      loading: 'Loading competitions...',
      emptyFollowed: 'No followed competition yet.',
    },
    follows: {
      title: 'Follows',
      subtitle: 'Follow teams and players without creating an account',
    },
    more: {
      title: 'More',
      subtitle: 'Settings, language, notifications and cache',
    },
    search: {
      title: 'Search',
    },
  },
} as const;
