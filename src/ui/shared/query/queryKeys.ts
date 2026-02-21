import type { FollowEntityTab } from '@ui/features/follows/types/follows.types';

export const queryKeys = {
  matches: (date: string, timezone: string) => ['matches', date, timezone] as const,
  competitions: {
    catalog: () => ['competitions', 'catalog'] as const,
    search: (query: string) => ['competitions', 'search', query] as const,
    followedIds: () => ['competitions', 'followed-ids'] as const,
    followedDetails: (ids: string[]) => ['competitions', 'followed-details', ...ids] as const,
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
