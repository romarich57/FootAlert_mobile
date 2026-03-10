export const TRENDS_MAX_LEAGUE_IDS = 10;
export const TRENDS_MAX_CONCURRENCY = 3;
export const FOLLOW_CARDS_MAX_IDS = 50;
export const FOLLOW_CARDS_CONCURRENCY = 3;
export const FOLLOW_DISCOVERY_DEFAULT_LIMIT = 8;
export const FOLLOW_DISCOVERY_MAX_LIMIT = 20;
export const FOLLOW_DISCOVERY_CACHE_TTL_MS = 60_000;
export const FOLLOW_DISCOVERY_METADATA_STALE_MS = 24 * 60 * 60 * 1000;
export const FOLLOW_DISCOVERY_PARTIAL_REFRESH_AFTER_MS = 1_500;
export const FOLLOW_DISCOVERY_SYNC_BUDGET_MS = 700;
export const FOLLOW_DISCOVERY_TEAMS_BLOCKING_LEAGUE_COUNT = 5;
export const FOLLOW_DISCOVERY_PLAYERS_BLOCKING_LEAGUE_COUNT = 3;
export const FOLLOW_DISCOVERY_MAX_LEAGUE_COUNT = 5;
export const FOLLOW_EVENT_SOURCES = [
    'follows_trending',
    'follows_search',
    'onboarding_trending',
    'onboarding_search',
    'team_details',
    'player_details',
    'search_tab',
];
export const TOP_COMPETITIONS = [
    {
        competitionId: '39',
        competitionName: 'Premier League',
        competitionLogo: 'https://media.api-sports.io/football/leagues/39.png',
        country: 'England',
        type: 'League',
    },
    {
        competitionId: '140',
        competitionName: 'La Liga',
        competitionLogo: 'https://media.api-sports.io/football/leagues/140.png',
        country: 'Spain',
        type: 'League',
    },
    {
        competitionId: '135',
        competitionName: 'Serie A',
        competitionLogo: 'https://media.api-sports.io/football/leagues/135.png',
        country: 'Italy',
        type: 'League',
    },
    {
        competitionId: '78',
        competitionName: 'Bundesliga',
        competitionLogo: 'https://media.api-sports.io/football/leagues/78.png',
        country: 'Germany',
        type: 'League',
    },
    {
        competitionId: '61',
        competitionName: 'Ligue 1',
        competitionLogo: 'https://media.api-sports.io/football/leagues/61.png',
        country: 'France',
        type: 'League',
    },
    {
        competitionId: '2',
        competitionName: 'UEFA Champions League',
        competitionLogo: 'https://media.api-sports.io/football/leagues/2.png',
        country: 'World',
        type: 'Cup',
    },
    {
        competitionId: '3',
        competitionName: 'UEFA Europa League',
        competitionLogo: 'https://media.api-sports.io/football/leagues/3.png',
        country: 'World',
        type: 'Cup',
    },
    {
        competitionId: '848',
        competitionName: 'UEFA Conference League',
        competitionLogo: 'https://media.api-sports.io/football/leagues/848.png',
        country: 'World',
        type: 'Cup',
    },
    {
        competitionId: '88',
        competitionName: 'Eredivisie',
        competitionLogo: 'https://media.api-sports.io/football/leagues/88.png',
        country: 'Netherlands',
        type: 'League',
    },
    {
        competitionId: '94',
        competitionName: 'Primeira Liga',
        competitionLogo: 'https://media.api-sports.io/football/leagues/94.png',
        country: 'Portugal',
        type: 'League',
    },
    {
        competitionId: '144',
        competitionName: 'Jupiler Pro League',
        competitionLogo: 'https://media.api-sports.io/football/leagues/144.png',
        country: 'Belgium',
        type: 'League',
    },
    {
        competitionId: '71',
        competitionName: 'Brasileirao Serie A',
        competitionLogo: 'https://media.api-sports.io/football/leagues/71.png',
        country: 'Brazil',
        type: 'League',
    },
    {
        competitionId: '128',
        competitionName: 'Liga Profesional Argentina',
        competitionLogo: 'https://media.api-sports.io/football/leagues/128.png',
        country: 'Argentina',
        type: 'League',
    },
    {
        competitionId: '253',
        competitionName: 'MLS',
        competitionLogo: 'https://media.api-sports.io/football/leagues/253.png',
        country: 'USA',
        type: 'League',
    },
    {
        competitionId: '1',
        competitionName: 'FIFA World Cup',
        competitionLogo: 'https://media.api-sports.io/football/leagues/1.png',
        country: 'World',
        type: 'Cup',
    },
    {
        competitionId: '4',
        competitionName: 'UEFA Euro',
        competitionLogo: 'https://media.api-sports.io/football/leagues/4.png',
        country: 'World',
        type: 'Cup',
    },
    {
        competitionId: '9',
        competitionName: 'Copa America',
        competitionLogo: 'https://media.api-sports.io/football/leagues/9.png',
        country: 'World',
        type: 'Cup',
    },
    {
        competitionId: '45',
        competitionName: 'FA Cup',
        competitionLogo: 'https://media.api-sports.io/football/leagues/45.png',
        country: 'England',
        type: 'Cup',
    },
    {
        competitionId: '143',
        competitionName: 'Copa del Rey',
        competitionLogo: 'https://media.api-sports.io/football/leagues/143.png',
        country: 'Spain',
        type: 'Cup',
    },
    {
        competitionId: '137',
        competitionName: 'Coppa Italia',
        competitionLogo: 'https://media.api-sports.io/football/leagues/137.png',
        country: 'Italy',
        type: 'Cup',
    },
];
