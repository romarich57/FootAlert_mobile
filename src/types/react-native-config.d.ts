declare module 'react-native-config' {
  export interface NativeConfig {
    MOBILE_API_BASE_URL?: string;
    MOBILE_PRIVACY_POLICY_URL?: string;
    MOBILE_SUPPORT_URL?: string;
    MOBILE_FOLLOW_US_URL?: string;
    MOBILE_APP_STORE_URL?: string;
    MOBILE_PLAY_STORE_URL?: string;
    MATCHES_QUERY_STALE_TIME_MS?: string;
    MATCHES_LIVE_REFRESH_INTERVAL_MS?: string;
    MATCHES_SLOW_REFRESH_INTERVAL_MS?: string;
    MATCHES_MAX_REFRESH_BACKOFF_MS?: string;
    FOLLOWS_SEARCH_DEBOUNCE_MS?: string;
    FOLLOWS_SEARCH_MIN_CHARS?: string;
    FOLLOWS_SEARCH_RESULTS_LIMIT?: string;
    FOLLOWS_TEAM_NEXT_FIXTURE_TTL_MS?: string;
    FOLLOWS_PLAYER_STATS_TTL_MS?: string;
    FOLLOWS_TRENDS_TTL_MS?: string;
    FOLLOWS_TRENDS_LEAGUE_COUNT?: string;
    FOLLOWS_TRENDS_TEAMS_LIMIT?: string;
    FOLLOWS_TRENDS_PLAYERS_LIMIT?: string;
    FOLLOWS_MAX_FOLLOWED_TEAMS?: string;
    FOLLOWS_MAX_FOLLOWED_PLAYERS?: string;
    MOBILE_ENABLE_BFF_PLAYER_AGGREGATES?: string;
  }

  const Config: NativeConfig;
  export default Config;
}
