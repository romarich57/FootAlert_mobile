import type { FollowEntityTab } from '@ui/features/follows/types/follows.types';

type CompetitionPlayerStatType = 'goals' | 'assists' | 'yellowCards' | 'redCards';

export const queryKeys = {
  matches: (date: string, timezone: string) => ['matches', date, timezone] as const,
  matchDetails: (matchId: string, timezone: string) =>
    ['match_details', matchId, timezone] as const,
  matchEvents: (matchId: string) => ['match_details', matchId, 'events'] as const,
  matchStatistics: (matchId: string) => ['match_details', matchId, 'statistics'] as const,
  matchLineups: (matchId: string) => ['match_details', matchId, 'lineups'] as const,
  matchPredictions: (matchId: string) => ['match_details', matchId, 'predictions'] as const,
  matchPlayersStatsByTeam: (matchId: string, teamId: string) =>
    ['match_details', matchId, 'team_players_stats', teamId] as const,
  matchAbsences: (matchId: string, timezone: string) =>
    ['match_details', matchId, 'absences', timezone] as const,
  matchHeadToHead: (matchId: string) => ['match_details', matchId, 'head_to_head'] as const,
  teams: {
    details: (teamId: string) => ['teams', 'details', teamId] as const,
    leagues: (teamId: string) => ['teams', 'leagues', teamId] as const,
    overview: (
      teamId: string,
      leagueId: string | null,
      season: number | null,
      timezone: string,
      historySeasonsKey: string,
    ) => ['team_overview', teamId, leagueId, season, timezone, historySeasonsKey] as const,
    matches: (
      teamId: string,
      leagueId: string | null,
      season: number | null,
      timezone: string,
    ) => ['team_matches', teamId, leagueId, season, timezone] as const,
    standings: (
      teamId: string,
      leagueId: string | null,
      season: number | null,
    ) => ['team_standings', teamId, leagueId, season] as const,
    stats: (
      teamId: string,
      leagueId: string | null,
      season: number | null,
    ) => ['team_stats', teamId, leagueId, season] as const,
    transfers: (teamId: string, season: number | null) =>
      ['team_transfers', teamId, season] as const,
    squad: (teamId: string) => ['team_squad', teamId] as const,
    trophies: (teamId: string) => ['team_trophies', teamId] as const,
  },
  players: {
    details: (playerId: string, season: number) => ['player_details', playerId, season] as const,
    stats: (playerId: string, season: number) => ['player_stats', 'v2', playerId, season] as const,
    statsCatalog: (playerId: string) => ['player_stats_catalog', playerId] as const,
    trophies: (playerId: string) => ['player_trophies', playerId] as const,
    careerAggregate: (playerId: string) => ['player_career_aggregate', playerId] as const,
    matchesAggregate: (
      playerId: string,
      teamId: string,
      season: number,
    ) => ['player_matches_aggregate', playerId, teamId, season] as const,
    matchesLegacy: (
      playerId: string,
      teamId: string,
      season: number,
    ) => ['player_matches', playerId, teamId, season, 'legacy'] as const,
  },
  competitions: {
    catalog: () => ['competitions', 'catalog'] as const,
    search: (query: string) => ['competitions', 'search', query] as const,
    detailsHeader: (competitionId: string) =>
      ['competitions', 'details', 'header', competitionId] as const,
    followedIds: () => ['competitions', 'followed-ids'] as const,
    followedDetails: (ids: string[]) => ['competitions', 'followed-details', ...ids] as const,
    fixtures: (leagueId: number | undefined, season: number | undefined) =>
      ['competition_fixtures', leagueId, season] as const,
    standings: (leagueId: number | undefined, season: number | undefined) =>
      ['competition_standings', leagueId, season] as const,
    transfers: (leagueId: number | undefined, season: number | undefined) =>
      ['competition_transfers', leagueId, season] as const,
    seasons: (leagueId: number | undefined) => ['competition_seasons', leagueId] as const,
    playerStats: (
      leagueId: number | undefined,
      season: number | undefined,
      statType: CompetitionPlayerStatType,
    ) => ['competition_player_stats', leagueId, season, statType] as const,
    teamStats: (leagueId: number | undefined, season: number | undefined) =>
      ['competition_team_stats', leagueId, season] as const,
    teamAdvancedStats: (
      leagueId: number | undefined,
      season: number | undefined,
      teamId: number | undefined,
    ) => ['competition_team_advanced_stats', leagueId, season, teamId] as const,
    teamAdvancedStatsBatch: (
      leagueId: number | undefined,
      season: number | undefined,
      teamIds: number[],
      concurrency: number,
    ) => ['competition_team_advanced_stats_batch', leagueId, season, concurrency, ...teamIds] as const,
    totw: (
      leagueId: number | undefined,
      season: number | undefined,
    ) => ['competition_totw', leagueId, season] as const,
  },
  follows: {
    followedTeamIds: () => ['follows', 'followed-team-ids'] as const,
    followedPlayerIds: () => ['follows', 'followed-player-ids'] as const,
    hideTrends: (tab: FollowEntityTab) => ['follows', 'hide-trends', tab] as const,
    search: (tab: FollowEntityTab, query: string, season: number) =>
      ['follows', 'search', tab, query, season] as const,
    followedTeamCards: (teamIds: string[], timezone: string) =>
      ['follows', 'team-cards', timezone, ...teamIds] as const,
    followedPlayerCards: (playerIds: string[], season: number) =>
      ['follows', 'player-cards', season, ...playerIds] as const,
    trends: (tab: FollowEntityTab, season: number, hidden: boolean) =>
      ['follows', 'trends', tab, season, hidden] as const,
  },
};
