export const freshnessLocaleFragments = {
  en: {
    freshness: {
      updated: 'Updated {{value}}',
      refreshing: 'Refreshing in background',
      relative: {
        now: 'just now',
        past: {
          minute_one: '{{count}} min ago',
          minute_other: '{{count}} min ago',
          hour_one: '{{count}} h ago',
          hour_other: '{{count}} h ago',
          day_one: '{{count}} d ago',
          day_other: '{{count}} d ago',
        },
        future: {
          minute_one: 'in {{count}} min',
          minute_other: 'in {{count}} min',
          hour_one: 'in {{count}} h',
          hour_other: 'in {{count}} h',
          day_one: 'in {{count}} d',
          day_other: 'in {{count}} d',
        },
      },
    },
  },
  fr: {
    freshness: {
      updated: 'Mis a jour {{value}}',
      refreshing: 'Rafraichissement en arriere-plan',
      relative: {
        now: "a l'instant",
        past: {
          minute_one: 'il y a {{count}} min',
          minute_other: 'il y a {{count}} min',
          hour_one: 'il y a {{count}} h',
          hour_other: 'il y a {{count}} h',
          day_one: 'il y a {{count}} j',
          day_other: 'il y a {{count}} j',
        },
        future: {
          minute_one: 'dans {{count}} min',
          minute_other: 'dans {{count}} min',
          hour_one: 'dans {{count}} h',
          hour_other: 'dans {{count}} h',
          day_one: 'dans {{count}} j',
          day_other: 'dans {{count}} j',
        },
      },
    },
  },
} as const;
