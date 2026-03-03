import type {
  FollowsSearchResultPlayer,
  FollowsSearchResultTeam,
} from '@ui/features/follows/types/follows.types';

export type SearchEntityTab = 'all' | 'teams' | 'competitions' | 'players' | 'matches';

export type SearchTeamResult = FollowsSearchResultTeam;

export type SearchPlayerResult = FollowsSearchResultPlayer;

export type SearchCompetitionResult = {
  competitionId: string;
  competitionName: string;
  competitionLogo: string;
  country: string;
  type: string;
};

export type SearchMatchResult = {
  fixtureId: string;
  kickoffAt: string;
  statusShort: string;
  statusLong: string;
  competitionId: string;
  competitionName: string;
  competitionCountry: string;
  homeTeamId: string;
  homeTeamName: string;
  homeTeamLogo: string;
  awayTeamId: string;
  awayTeamName: string;
  awayTeamLogo: string;
  homeGoals: number | null;
  awayGoals: number | null;
};

export type SearchGlobalResults = {
  teams: SearchTeamResult[];
  players: SearchPlayerResult[];
  competitions: SearchCompetitionResult[];
  matches: SearchMatchResult[];
};
