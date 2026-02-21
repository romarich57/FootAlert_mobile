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
